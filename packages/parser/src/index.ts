import crypto from "node:crypto";
import { SymbolKind } from "@atom/core";

export interface CodeChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  nodeType: "function" | "class" | "module" | "method" | "paragraph" | "block" | "interface" | "type" | "endpoint" | "model";
  content: string;
  lang: string;
  symbolName?: string;
}

export interface ParsedSymbol {
  name: string;
  kind: SymbolKind;
  signature?: string;
  filePath: string;
  startLine: number;
  endLine: number;
  docstring?: string;
  isExported: boolean;
}

export interface ParsedDependency {
  sourceFilePath: string;
  targetFilePath: string;
  specifier: string;
  importedSymbols: string[];
  type: "import" | "export" | "call";
}

export interface ApiEndpoint {
  method: string;
  path: string;
  handlerSymbol?: string;
  line: number;
}

export interface DbModel {
  name: string;
  table?: string;
  line: number;
}

export interface StructuralFileAnalysis {
  filePath: string;
  contentHash: string;
  lang: string;
  chunks: CodeChunk[];
  symbols: ParsedSymbol[];
  dependencies: ParsedDependency[];
  apiEndpoints: ApiEndpoint[];
  dbModels: DbModel[];
}

export interface ChunkOptions {
  maxChunkLines?: number;
  minChunkLines?: number;
}

/**
 * Computes a SHA-256 hash of file content for fast change detection and incremental indexing.
 */
export function computeFileHash(content: string): string {
  return crypto.createHash("sha256").update(content, "utf8").digest("hex");
}

/**
 * Compares previous file hashes against current files to determine incremental indexing targets.
 */
export function detectChangedFiles(
  prevHashes: Record<string, string>,
  currentFiles: Record<string, string>
): {
  added: string[];
  modified: string[];
  deleted: string[];
  unchanged: string[];
} {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];
  const unchanged: string[] = [];

  for (const [filePath, currentContent] of Object.entries(currentFiles)) {
    const currentHash = computeFileHash(currentContent);
    const prevHash = prevHashes[filePath];

    if (!prevHash) {
      added.push(filePath);
    } else if (prevHash !== currentHash) {
      modified.push(filePath);
    } else {
      unchanged.push(filePath);
    }
  }

  for (const prevPath of Object.keys(prevHashes)) {
    if (!(prevPath in currentFiles)) {
      deleted.push(prevPath);
    }
  }

  return { added, modified, deleted, unchanged };
}

/**
 * Comprehensive AST & structural analyzer for source files.
 * Extracts symbols, function/class signatures, import dependencies, API routes, and DB models.
 */
export function analyzeFileStructure(
  filePath: string,
  content: string,
  lang: string,
  options: ChunkOptions = {}
): StructuralFileAnalysis {
  const contentHash = computeFileHash(content);
  const lines = content.split("\n");

  if (lines.length === 0 || content.trim().length === 0) {
    return {
      filePath,
      contentHash,
      lang,
      chunks: [],
      symbols: [],
      dependencies: [],
      apiEndpoints: [],
      dbModels: [],
    };
  }

  const chunks = parseCodeFile(filePath, content, lang, options);
  const symbols = extractSymbols(filePath, lines, lang);
  const dependencies = extractDependencies(filePath, lines, lang);
  const apiEndpoints = extractApiEndpoints(lines, lang);
  const dbModels = extractDbModels(lines, lang);

  return {
    filePath,
    contentHash,
    lang,
    chunks,
    symbols,
    dependencies,
    apiEndpoints,
    dbModels,
  };
}

/**
 * Smart Chunker for Source Code and Markdown files.
 * Preserves function, class, and block boundaries with line accuracy.
 */
export function parseCodeFile(
  filePath: string,
  content: string,
  lang: string,
  options: ChunkOptions = {}
): CodeChunk[] {
  const maxLines = options.maxChunkLines || 80;
  const lines = content.split("\n");

  if (lines.length === 0 || content.trim().length === 0) {
    return [];
  }

  if (lang === "markdown" || filePath.endsWith(".md") || filePath.endsWith(".txt")) {
    return chunkMarkdown(filePath, lines);
  }

  const chunks: CodeChunk[] = [];
  const boundaries = findStructuralBoundaries(lines, lang);

  if (boundaries.length > 0) {
    let currentLine = 1;
    for (const boundary of boundaries) {
      // Module gap before boundary
      if (boundary.startLine > currentLine) {
        const gapLines = lines.slice(currentLine - 1, boundary.startLine - 1);
        const gapText = gapLines.join("\n").trim();
        if (gapText.length > 20) {
          chunks.push({
            filePath,
            startLine: currentLine,
            endLine: boundary.startLine - 1,
            nodeType: "module",
            content: gapLines.join("\n"),
            lang,
          });
        }
      }

      const blockLines = lines.slice(boundary.startLine - 1, boundary.endLine);
      chunks.push({
        filePath,
        startLine: boundary.startLine,
        endLine: boundary.endLine,
        nodeType: boundary.type,
        content: blockLines.join("\n"),
        lang,
        symbolName: boundary.name,
      });

      currentLine = boundary.endLine + 1;
    }

    if (currentLine <= lines.length) {
      const remainingLines = lines.slice(currentLine - 1);
      const remainingText = remainingLines.join("\n").trim();
      if (remainingText.length > 20) {
        chunks.push({
          filePath,
          startLine: currentLine,
          endLine: lines.length,
          nodeType: "module",
          content: remainingLines.join("\n"),
          lang,
        });
      }
    }
  }

  if (chunks.length === 0) {
    return windowChunk(filePath, lines, maxLines, lang);
  }

  return chunks;
}

interface Boundary {
  startLine: number;
  endLine: number;
  type: "function" | "class" | "method" | "interface" | "type";
  name?: string;
}

function findStructuralBoundaries(lines: string[], lang: string): Boundary[] {
  const boundaries: Boundary[] = [];
  const isPython = lang === "python" || lang === "py";

  if (isPython) {
    return findPythonBoundaries(lines);
  }

  const funcRegex = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)|^(?:export\s+)?(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z0-9_$]+)\s*=>|^func\s+(?:\([^)]+\)\s+)?([A-Za-z0-9_$]+)|^(?:pub\s+)?(?:async\s+)?fn\s+([A-Za-z0-9_$]+)/;
  const classRegex = /^(?:export\s+)?class\s+([A-Za-z0-9_$]+)|^type\s+([A-Za-z0-9_$]+)\s+struct|^(?:pub\s+)?struct\s+([A-Za-z0-9_$]+)/;
  const interfaceRegex = /^(?:export\s+)?interface\s+([A-Za-z0-9_$]+)|^type\s+([A-Za-z0-9_$]+)\s+interface|^(?:pub\s+)?trait\s+([A-Za-z0-9_$]+)/;

  let inBlock = false;
  let blockStart = 0;
  let blockType: "function" | "class" | "interface" = "function";
  let blockName: string | undefined;
  let openBrackets = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!inBlock) {
      const classMatch = classRegex.exec(trimmed);
      const funcMatch = funcRegex.exec(trimmed);
      const ifaceMatch = interfaceRegex.exec(trimmed);

      if (classMatch) {
        inBlock = true;
        blockStart = i + 1;
        blockType = "class";
        blockName = classMatch[1] || classMatch[2] || classMatch[3];
        openBrackets = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (ifaceMatch) {
        inBlock = true;
        blockStart = i + 1;
        blockType = "interface";
        blockName = ifaceMatch[1] || ifaceMatch[2] || ifaceMatch[3];
        openBrackets = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      } else if (funcMatch) {
        inBlock = true;
        blockStart = i + 1;
        blockType = "function";
        blockName = funcMatch[1] || funcMatch[2] || funcMatch[3] || funcMatch[4];
        openBrackets = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      }
    } else {
      const opens = (line.match(/\{/g) || []).length;
      const closes = (line.match(/\}/g) || []).length;
      openBrackets += opens - closes;

      if (openBrackets <= 0 && i >= blockStart) {
        boundaries.push({
          startLine: blockStart,
          endLine: i + 1,
          type: blockType,
          name: blockName,
        });
        inBlock = false;
        openBrackets = 0;
        blockName = undefined;
      }
    }
  }

  if (inBlock && blockStart < lines.length) {
    boundaries.push({
      startLine: blockStart,
      endLine: lines.length,
      type: blockType,
      name: blockName,
    });
  }

  return boundaries;
}

function findPythonBoundaries(lines: string[]): Boundary[] {
  const boundaries: Boundary[] = [];
  const pyDefRegex = /^(async\s+)?def\s+([A-Za-z0-9_]+)\s*\(/;
  const pyClassRegex = /^class\s+([A-Za-z0-9_]+)(\s*\(.*?\))?\s*:/;

  let inBlock = false;
  let blockStart = 0;
  let blockIndent = 0;
  let blockType: "function" | "class" = "function";
  let blockName: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const indent = rawLine.search(/\S/);

    if (inBlock) {
      if (indent <= blockIndent && (pyDefRegex.test(trimmed) || pyClassRegex.test(trimmed))) {
        boundaries.push({
          startLine: blockStart,
          endLine: i,
          type: blockType,
          name: blockName,
        });
        inBlock = false;
      }
    }

    if (!inBlock) {
      const defMatch = pyDefRegex.exec(trimmed);
      const classMatch = pyClassRegex.exec(trimmed);

      if (classMatch) {
        inBlock = true;
        blockStart = i + 1;
        blockIndent = indent;
        blockType = "class";
        blockName = classMatch[1];
      } else if (defMatch) {
        inBlock = true;
        blockStart = i + 1;
        blockIndent = indent;
        blockType = "function";
        blockName = defMatch[2];
      }
    }
  }

  if (inBlock) {
    boundaries.push({
      startLine: blockStart,
      endLine: lines.length,
      type: blockType,
      name: blockName,
    });
  }

  return boundaries;
}

function extractSymbols(filePath: string, lines: string[], lang: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const boundaries = findStructuralBoundaries(lines, lang);

  for (const b of boundaries) {
    if (!b.name) continue;
    const firstLine = lines[b.startLine - 1] || "";
    const isExported = firstLine.includes("export") || firstLine.startsWith("pub ");
    const signature = firstLine.trim();

    // Look back up to 5 lines for a docstring or comment block
    let docstring: string | undefined;
    const docLines: string[] = [];
    for (let k = b.startLine - 2; k >= Math.max(0, b.startLine - 7); k--) {
      const l = lines[k].trim();
      if (l.startsWith("//") || l.startsWith("#") || l.startsWith("*") || l.startsWith("/*") || l.startsWith("*/") || l.startsWith('"""')) {
        docLines.unshift(l);
      } else {
        break;
      }
    }
    if (docLines.length > 0) {
      docstring = docLines.join("\n");
    }

    symbols.push({
      name: b.name,
      kind: b.type === "interface" ? "interface" : b.type === "class" ? "class" : "function",
      signature,
      filePath,
      startLine: b.startLine,
      endLine: b.endLine,
      docstring,
      isExported,
    });
  }

  // Also extract type declarations (e.g. `export type Foo = ...`)
  const typeRegex = /^(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    const typeMatch = typeRegex.exec(trimmed);
    if (typeMatch) {
      symbols.push({
        name: typeMatch[1],
        kind: "type",
        signature: trimmed,
        filePath,
        startLine: i + 1,
        endLine: i + 1,
        isExported: trimmed.includes("export"),
      });
    }
  }

  return symbols;
}

function extractDependencies(filePath: string, lines: string[], lang: string): ParsedDependency[] {
  const deps: ParsedDependency[] = [];

  // JS/TS: import { A, B } from './path' or import C from 'path'
  const esImportRegex = /import\s+(?:\{([^}]+)\}|\*\s+as\s+([A-Za-z0-9_$]+)|([A-Za-z0-9_$]+))\s+from\s+['"]([^'"]+)['"]/;
  // JS/TS: const X = require('path')
  const cjsRequireRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|([A-Za-z0-9_$]+))\s*=\s*require\(['"]([^'"]+)['"]\)/;
  // Python: from .module import a, b OR import module
  const pyFromRegex = /^from\s+([A-Za-z0-9_.]+)\s+import\s+(.+)$/;
  const pyImportRegex = /^import\s+([A-Za-z0-9_.,\s]+)$/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const esMatch = esImportRegex.exec(trimmed);
    if (esMatch) {
      const named = esMatch[1] ? esMatch[1].split(",").map((s) => s.trim().split(" as ")[0].trim()).filter(Boolean) : [];
      const defaultImport = esMatch[3] ? [esMatch[3].trim()] : [];
      const wildcard = esMatch[2] ? [esMatch[2].trim()] : [];
      const specifier = esMatch[4];

      deps.push({
        sourceFilePath: filePath,
        targetFilePath: specifier,
        specifier,
        importedSymbols: [...named, ...defaultImport, ...wildcard],
        type: "import",
      });
      continue;
    }

    const cjsMatch = cjsRequireRegex.exec(trimmed);
    if (cjsMatch) {
      const named = cjsMatch[1] ? cjsMatch[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
      const single = cjsMatch[2] ? [cjsMatch[2].trim()] : [];
      const specifier = cjsMatch[3];

      deps.push({
        sourceFilePath: filePath,
        targetFilePath: specifier,
        specifier,
        importedSymbols: [...named, ...single],
        type: "import",
      });
      continue;
    }

    if (lang === "python" || lang === "py") {
      const pyFrom = pyFromRegex.exec(trimmed);
      if (pyFrom) {
        const specifier = pyFrom[1];
        const symbols = pyFrom[2].split(",").map((s) => s.trim()).filter(Boolean);
        deps.push({
          sourceFilePath: filePath,
          targetFilePath: specifier,
          specifier,
          importedSymbols: symbols,
          type: "import",
        });
        continue;
      }

      const pyImp = pyImportRegex.exec(trimmed);
      if (pyImp) {
        const modules = pyImp[1].split(",").map((s) => s.trim()).filter(Boolean);
        for (const mod of modules) {
          deps.push({
            sourceFilePath: filePath,
            targetFilePath: mod,
            specifier: mod,
            importedSymbols: [mod],
            type: "import",
          });
        }
      }
    }
  }

  return deps;
}

function extractApiEndpoints(lines: string[], _lang: string): ApiEndpoint[] {
  const endpoints: ApiEndpoint[] = [];
  // Express/Router endpoints: router.get("/path", ...) or app.post('/path', ...)
  const expressRegex = /(?:app|router)\.(get|post|put|delete|patch|options)\(\s*['"]([^'"]+)['"]/;
  // Next.js App Router export async function GET / POST
  const nextAppRouterRegex = /^export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(/;
  // Python FastAPI/Flask: @app.get("/path") or @router.post('/path')
  const pyRouteRegex = /@(?:app|router)\.(get|post|put|delete|patch)\(\s*['"]([^'"]+)['"]/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const expMatch = expressRegex.exec(trimmed);
    if (expMatch) {
      endpoints.push({
        method: expMatch[1].toUpperCase(),
        path: expMatch[2],
        line: i + 1,
      });
      continue;
    }

    const nextMatch = nextAppRouterRegex.exec(trimmed);
    if (nextMatch) {
      endpoints.push({
        method: nextMatch[1].toUpperCase(),
        path: "route",
        line: i + 1,
      });
      continue;
    }

    const pyMatch = pyRouteRegex.exec(trimmed);
    if (pyMatch) {
      endpoints.push({
        method: pyMatch[1].toUpperCase(),
        path: pyMatch[2],
        line: i + 1,
      });
    }
  }

  return endpoints;
}

function extractDbModels(lines: string[], _lang: string): DbModel[] {
  const models: DbModel[] = [];
  // Drizzle ORM: export const users = pgTable("users", { ... })
  const drizzleRegex = /(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:pgTable|sqliteTable|mysqlTable)\(\s*['"]([^'"]+)['"]/;
  // Prisma / TypeORM / SQLAlchemy
  const prismaRegex = /^model\s+([A-Za-z0-9_$]+)\s*\{/;
  const sqlaRegex = /^class\s+([A-Za-z0-9_$]+)\s*\(\s*(?:Base|db\.Model|models\.Model)\s*\):/;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();

    const dMatch = drizzleRegex.exec(trimmed);
    if (dMatch) {
      models.push({
        name: dMatch[1],
        table: dMatch[2],
        line: i + 1,
      });
      continue;
    }

    const pMatch = prismaRegex.exec(trimmed);
    if (pMatch) {
      models.push({
        name: pMatch[1],
        line: i + 1,
      });
      continue;
    }

    const sMatch = sqlaRegex.exec(trimmed);
    if (sMatch) {
      models.push({
        name: sMatch[1],
        line: i + 1,
      });
    }
  }

  return models;
}

function chunkMarkdown(filePath: string, lines: string[]): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  let currentStart = 1;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith("# ") || line.startsWith("## ") || line.startsWith("### ")) {
      if (currentLines.length > 0) {
        chunks.push({
          filePath,
          startLine: currentStart,
          endLine: i,
          nodeType: "paragraph",
          content: currentLines.join("\n"),
          lang: "markdown",
        });
        currentLines = [];
      }
      currentStart = i + 1;
    }
    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    chunks.push({
      filePath,
      startLine: currentStart,
      endLine: lines.length,
      nodeType: "paragraph",
      content: currentLines.join("\n"),
      lang: "markdown",
    });
  }

  return chunks;
}

function windowChunk(filePath: string, lines: string[], maxLines: number, lang: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const total = lines.length;
  const step = Math.max(1, maxLines - 10);

  for (let i = 0; i < total; i += step) {
    const end = Math.min(i + maxLines, total);
    const chunkLines = lines.slice(i, end);
    chunks.push({
      filePath,
      startLine: i + 1,
      endLine: end,
      nodeType: "module",
      content: chunkLines.join("\n"),
      lang,
    });
  }

  return chunks;
}
