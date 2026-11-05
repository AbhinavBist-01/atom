import fs from "fs";
import path from "path";
import { db, schema } from "../db/index.js";
import { eq, inArray } from "drizzle-orm";
import { GitCloner } from "@atom/github";
import {
  analyzeFileStructure,
  computeFileHash,
  CodeChunk,
  ParsedSymbol,
  ParsedDependency,
} from "@atom/parser";
import { generateEmbeddings } from "@atom/rag";

const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".md", ".txt", ".json",
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", "vendor",
]);

export interface IndexRepoInput {
  repoId: string;
  owner: string;
  repo: string;
  cloneUrl?: string;
  isIncremental?: boolean;
}

export async function indexRepoTask(input: IndexRepoInput): Promise<{
  chunksIndexed: number;
  symbolsIndexed: number;
  dependenciesIndexed: number;
}> {
  const { repoId, owner, repo, isIncremental = false } = input;
  const repoUrl = input.cloneUrl || `https://github.com/${owner}/${repo}.git`;
  const tempDir = path.join(process.cwd(), "scratch", "repos", `${owner}_${repo}`);

  console.log(`[Indexer] Starting ${isIncremental ? "incremental " : ""}indexing for ${owner}/${repo} (ID: ${repoId})...`);

  // 1. Update status to indexing
  await db
    .update(schema.repositories)
    .set({ status: "indexing", updatedAt: new Date() })
    .where(eq(schema.repositories.id, repoId));

  try {
    // 2. Clone or pull repo
    const cloner = new GitCloner();
    await cloner.cloneOrPull({ repoUrl, targetDir: tempDir, depth: 5 });

    // 3. Scan & parse files with AST structural intelligence
    const allFiles = scanFiles(tempDir);
    console.log(`[Indexer] Found ${allFiles.length} files to process.`);

    const allChunks: CodeChunk[] = [];
    const allSymbols: ParsedSymbol[] = [];
    const allDependencies: ParsedDependency[] = [];
    const fileHashes: Map<string, string> = new Map();

    for (const file of allFiles) {
      const relPath = path.relative(tempDir, file).replace(/\\/g, "/");
      const ext = path.extname(file).toLowerCase();
      const lang = getLanguageFromExt(ext);

      try {
        const content = fs.readFileSync(file, "utf-8");
        const analysis = analyzeFileStructure(relPath, content, lang);

        fileHashes.set(relPath, analysis.contentHash);
        allChunks.push(...analysis.chunks);
        allSymbols.push(...analysis.symbols);
        allDependencies.push(...analysis.dependencies);
      } catch (err) {
        console.warn(`[Indexer] Failed to parse file ${relPath}:`, err);
      }
    }

    console.log(
      `[Indexer] Extracted ${allChunks.length} chunks, ${allSymbols.length} symbols, ${allDependencies.length} dependencies.`
    );

    // 4. Generate embeddings in batch if OpenAI API key is set
    const contents = allChunks.map((c) => `${c.filePath}\n${c.symbolName ? `Symbol: ${c.symbolName}\n` : ""}${c.content}`);
    let embeddings: number[][] = [];

    if (process.env.OPENAI_API_KEY) {
      try {
        console.log(`[Indexer] Generating vector embeddings via OpenAI for ${contents.length} chunks...`);
        embeddings = await generateEmbeddings(contents);
      } catch (embErr) {
        console.warn("[Indexer] Embedding generation warning:", embErr);
      }
    } else {
      console.warn(`[Indexer] OPENAI_API_KEY missing - skipping vector embedding generation.`);
    }

    // 5. Clean up old records for this repo
    await db.delete(schema.dependencies).where(eq(schema.dependencies.repoId, repoId));
    await db.delete(schema.symbols).where(eq(schema.symbols.repoId, repoId));
    await db.delete(schema.chunks).where(eq(schema.chunks.repoId, repoId));

    // 6. Insert Chunks with embeddings and content hashes
    const chunkRecords = allChunks.map((chunk, idx) => ({
      repoId,
      filePath: chunk.filePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      nodeType: chunk.nodeType,
      lang: chunk.lang,
      content: chunk.content,
      contentHash: fileHashes.get(chunk.filePath) || computeFileHash(chunk.content),
      embedding: embeddings[idx] || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    const BATCH_SIZE = 100;
    for (let i = 0; i < chunkRecords.length; i += BATCH_SIZE) {
      const batch = chunkRecords.slice(i, i + BATCH_SIZE);
      await db.insert(schema.chunks).values(batch);
    }

    // 7. Insert Symbols
    const symbolRecords = allSymbols.map((s) => ({
      repoId,
      filePath: s.filePath,
      name: s.name,
      kind: s.kind,
      signature: s.signature || null,
      startLine: s.startLine,
      endLine: s.endLine,
      docstring: s.docstring || null,
      isExported: s.isExported ? "true" : "false",
      createdAt: new Date(),
    }));

    for (let i = 0; i < symbolRecords.length; i += BATCH_SIZE) {
      const batch = symbolRecords.slice(i, i + BATCH_SIZE);
      await db.insert(schema.symbols).values(batch);
    }

    // 8. Insert Dependencies
    const depRecords = allDependencies.map((d) => ({
      repoId,
      sourceFilePath: d.sourceFilePath,
      targetFilePath: d.targetFilePath,
      specifier: d.specifier,
      importedSymbols: JSON.stringify(d.importedSymbols),
      type: d.type,
      createdAt: new Date(),
    }));

    for (let i = 0; i < depRecords.length; i += BATCH_SIZE) {
      const batch = depRecords.slice(i, i + BATCH_SIZE);
      await db.insert(schema.dependencies).values(batch);
    }

    // 9. Update status to ready
    await db
      .update(schema.repositories)
      .set({
        status: "ready",
        indexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.repositories.id, repoId));

    console.log(
      `[Indexer] Successfully indexed repository ${owner}/${repo}: ${chunkRecords.length} chunks, ${symbolRecords.length} symbols, ${depRecords.length} dependencies.`
    );

    return {
      chunksIndexed: chunkRecords.length,
      symbolsIndexed: symbolRecords.length,
      dependenciesIndexed: depRecords.length,
    };
  } catch (error) {
    console.error(`[Indexer] Error indexing ${owner}/${repo}:`, error);
    await db
      .update(schema.repositories)
      .set({ status: "error", updatedAt: new Date() })
      .where(eq(schema.repositories.id, repoId));
    throw error;
  }
}

function scanFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) {
        scanFiles(fullPath, fileList);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        fileList.push(fullPath);
      }
    }
  }

  return fileList;
}

function getLanguageFromExt(ext: string): string {
  switch (ext) {
    case ".ts":
    case ".tsx":
      return "typescript";
    case ".js":
    case ".jsx":
      return "javascript";
    case ".py":
      return "python";
    case ".go":
      return "go";
    case ".rs":
      return "rust";
    case ".java":
      return "java";
    case ".md":
      return "markdown";
    case ".json":
      return "json";
    default:
      return "text";
  }
}
