import fs from "fs";
import path from "path";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { GitCloner } from "@atom/github";
import { parseCodeFile, CodeChunk } from "@atom/parser";
import { generateEmbeddings } from "@atom/rag";

const SUPPORTED_EXTENSIONS = new Set([
  ".ts", ".js", ".tsx", ".jsx", ".py", ".go", ".rs", ".java", ".md", ".txt", ".json"
]);

const IGNORED_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", ".turbo", "coverage", "vendor"
]);

export interface IndexRepoInput {
  repoId: string;
  owner: string;
  repo: string;
  cloneUrl?: string;
}

export async function indexRepoTask(input: IndexRepoInput): Promise<{ chunksIndexed: number }> {
  const { repoId, owner, repo } = input;
  const repoUrl = input.cloneUrl || `https://github.com/${owner}/${repo}.git`;
  const tempDir = path.join(process.cwd(), "scratch", "repos", `${owner}_${repo}`);

  console.log(`[Indexer] Starting indexing for ${owner}/${repo} (ID: ${repoId})...`);

  // 1. Update status to indexing
  await db
    .update(schema.repositories)
    .set({ status: "indexing" })
    .where(eq(schema.repositories.id, repoId));

  try {
    // 2. Clone or pull repo
    const cloner = new GitCloner();
    await cloner.cloneOrPull({ repoUrl, targetDir: tempDir, depth: 1 });

    // 3. Scan & parse files
    const allFiles = scanFiles(tempDir);
    console.log(`[Indexer] Found ${allFiles.length} files to process.`);

    const allChunks: CodeChunk[] = [];
    for (const file of allFiles) {
      const relPath = path.relative(tempDir, file).replace(/\\/g, "/");
      const ext = path.extname(file).toLowerCase();
      const lang = getLanguageFromExt(ext);
      
      try {
        const content = fs.readFileSync(file, "utf-8");
        const parsed = parseCodeFile(relPath, content, lang);
        allChunks.push(...parsed);
      } catch (err) {
        console.warn(`[Indexer] Failed to read file ${relPath}:`, err);
      }
    }

    console.log(`[Indexer] Extracted ${allChunks.length} chunks across files.`);

    // 4. Clear old chunks for this repo if re-indexing
    await db.delete(schema.chunks).where(eq(schema.chunks.repoId, repoId));

    // 5. Generate embeddings in batch if OpenAI API key is set
    const contents = allChunks.map((c) => `${c.filePath}\n${c.content}`);
    let embeddings: number[][] = [];
    
    if (process.env.OPENAI_API_KEY) {
      console.log(`[Indexer] Generating vector embeddings via OpenAI...`);
      embeddings = await generateEmbeddings(contents);
    } else {
      console.warn(`[Indexer] OPENAI_API_KEY missing - skipping vector embedding generation.`);
    }

    // 6. Insert chunks into Database
    const recordsToInsert = allChunks.map((chunk, idx) => ({
      repoId,
      filePath: chunk.filePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      nodeType: chunk.nodeType,
      lang: chunk.lang,
      content: chunk.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    // Batch DB inserts (100 rows per batch)
    const BATCH_SIZE = 100;
    for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
      const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(schema.chunks).values(batch);
    }

    // 7. Update status to ready
    await db
      .update(schema.repositories)
      .set({
        status: "ready",
        indexedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schema.repositories.id, repoId));

    console.log(`[Indexer] Successfully indexed ${recordsToInsert.length} chunks for ${owner}/${repo}!`);
    return { chunksIndexed: recordsToInsert.length };

  } catch (error) {
    console.error(`[Indexer] Error indexing ${owner}/${repo}:`, error);
    await db
      .update(schema.repositories)
      .set({ status: "error" })
      .where(eq(schema.repositories.id, repoId));
    throw error;
  }
}

function scanFiles(dir: string, fileList: string[] = []): string[] {
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
    default:
      return "plaintext";
  }
}
