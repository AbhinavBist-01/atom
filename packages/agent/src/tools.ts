import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { BM25Engine, cosineSimilarity } from "@atom/rag";
import { SymbolDefinition, DependencyRelation } from "@atom/core";

export interface RepoContext {
  workDir: string;
  chunks?: Array<{
    id?: string;
    filePath: string;
    content: string;
    startLine?: number | null;
    endLine?: number | null;
    nodeType?: string | null;
    symbolName?: string | null;
    embedding?: number[] | null;
  }>;
  symbols?: SymbolDefinition[];
  dependencies?: DependencyRelation[];
}

export interface ToolResult {
  tool: string;
  success: boolean;
  data: any;
  error?: string;
}

export const TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "searchCodebase",
      description: "Search the codebase using BM25 keyword matching and semantic matching for error messages, function calls, or logic.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query, keywords, or error message." },
          limit: { type: "number", description: "Max results to return (default 10, max 20)." },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "findSymbol",
      description: "Look up function, class, method, or interface definitions across the repository.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Name of the symbol (function, class, type, or variable)." },
          kind: { type: "string", description: "Optional filter by kind (e.g. function, class, interface)." },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "findUsages",
      description: "Find call sites and usages of a specific symbol across repository source files.",
      parameters: {
        type: "object",
        properties: {
          symbol: { type: "string", description: "Name of the symbol to find references for." },
          filePath: { type: "string", description: "Optional file path to restrict the search." },
        },
        required: ["symbol"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "findDependencies",
      description: "Find what modules a file imports and which other files import it.",
      parameters: {
        type: "object",
        properties: {
          file: { type: "string", description: "Relative file path (e.g. src/auth/refresh.ts)." },
        },
        required: ["file"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "findRelatedFiles",
      description: "Discover related files linked via imports, exports, or shared directory structure.",
      parameters: {
        type: "object",
        properties: {
          file: { type: "string", description: "Relative file path." },
        },
        required: ["file"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getFileContext",
      description: "Read exact source lines from a file with line numbers (max 100 lines at a time).",
      parameters: {
        type: "object",
        properties: {
          file: { type: "string", description: "Relative file path." },
          startLine: { type: "number", description: "Starting line number (1-based)." },
          endLine: { type: "number", description: "Ending line number (inclusive)." },
        },
        required: ["file", "startLine", "endLine"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getGitHistory",
      description: "Inspect recent git commits and blame changes for a file or line range.",
      parameters: {
        type: "object",
        properties: {
          file: { type: "string", description: "Relative file path." },
          limit: { type: "number", description: "Number of commits to retrieve (default 5)." },
        },
        required: ["file"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "getRepositoryStructure",
      description: "Get the directory and file tree of the repository.",
      parameters: {
        type: "object",
        properties: {
          depth: { type: "number", description: "Directory tree depth (default 3)." },
        },
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "inspectDiff",
      description: "Inspect git diff of local working tree or between two git commits/branches.",
      parameters: {
        type: "object",
        properties: {
          baseCommit: { type: "string", description: "Base commit or branch (optional)." },
          targetCommit: { type: "string", description: "Target commit or branch (optional)." },
        },
      },
    },
  },
];

export class RepositoryTools {
  private ctx: RepoContext;

  constructor(ctx: RepoContext) {
    this.ctx = ctx;
  }

  public async executeTool(name: string, args: Record<string, any>): Promise<ToolResult> {
    try {
      switch (name) {
        case "searchCodebase":
          return { tool: name, success: true, data: this.searchCodebase(args.query, args.limit) };
        case "findSymbol":
          return { tool: name, success: true, data: this.findSymbol(args.name, args.kind) };
        case "findUsages":
          return { tool: name, success: true, data: this.findUsages(args.symbol, args.filePath) };
        case "findDependencies":
          return { tool: name, success: true, data: this.findDependencies(args.file) };
        case "findRelatedFiles":
          return { tool: name, success: true, data: this.findRelatedFiles(args.file) };
        case "getFileContext":
          return { tool: name, success: true, data: this.getFileContext(args.file, args.startLine, args.endLine) };
        case "getGitHistory":
          return { tool: name, success: true, data: this.getGitHistory(args.file, args.limit) };
        case "getRepositoryStructure":
          return { tool: name, success: true, data: this.getRepositoryStructure(args.depth) };
        case "inspectDiff":
          return { tool: name, success: true, data: this.inspectDiff(args.baseCommit, args.targetCommit) };
        default:
          return { tool: name, success: false, data: null, error: `Unknown tool '${name}'` };
      }
    } catch (err: any) {
      return { tool: name, success: false, data: null, error: err.message || String(err) };
    }
  }

  public searchCodebase(query: string, limit: number = 10): any[] {
    const maxK = Math.min(Math.max(1, limit || 10), 20);
    const chunks = this.ctx.chunks || [];

    if (chunks.length === 0) {
      // Fallback: search disk directly if chunks not populated
      return this.grepDisk(query, maxK);
    }

    const engine = new BM25Engine();
    engine.index(chunks.map((c, i) => ({ id: String(i), text: `${c.filePath}\n${c.symbolName || ""}\n${c.content}` })));
    const matches = engine.search(query, maxK);

    return matches.map((m) => {
      const c = chunks[parseInt(m.id, 10)];
      return {
        filePath: c.filePath,
        startLine: c.startLine || 1,
        endLine: c.endLine || 1,
        symbolName: c.symbolName,
        score: Math.round(m.score * 100) / 100,
        content: this.truncateContent(c.content, 40),
      };
    });
  }

  public findSymbol(name: string, kind?: string): any[] {
    const symbols = this.ctx.symbols || [];
    const query = name.toLowerCase().trim();

    const matches = symbols.filter((s) => {
      const nameMatch = s.name.toLowerCase() === query || s.name.toLowerCase().includes(query);
      const kindMatch = !kind || s.kind.toLowerCase() === kind.toLowerCase();
      return nameMatch && kindMatch;
    });

    if (matches.length > 0) {
      return matches.slice(0, 15).map((s) => ({
        name: s.name,
        kind: s.kind,
        filePath: s.filePath,
        startLine: s.startLine,
        endLine: s.endLine,
        signature: s.signature,
        isExported: s.isExported,
      }));
    }

    // Fallback: regex search on disk for symbol definition
    return this.searchSymbolOnDisk(name);
  }

  public findUsages(symbol: string, filePath?: string): any[] {
    const results: any[] = [];
    const workDir = this.ctx.workDir;
    if (!fs.existsSync(workDir)) return [];

    try {
      const files = this.scanDir(workDir);
      const symbolRegex = new RegExp(`\\b${escapeRegExp(symbol)}\\b`);

      for (const f of files) {
        const rel = path.relative(workDir, f).replace(/\\/g, "/");
        if (filePath && !rel.includes(filePath)) continue;

        const content = fs.readFileSync(f, "utf8");
        const lines = content.split("\n");

        for (let i = 0; i < lines.length; i++) {
          if (symbolRegex.test(lines[i])) {
            results.push({
              filePath: rel,
              line: i + 1,
              code: lines[i].trim(),
            });
            if (results.length >= 25) return results;
          }
        }
      }
    } catch {}

    return results;
  }

  public findDependencies(file: string): any {
    const cleanFile = file.replace(/\\/g, "/");
    const deps = this.ctx.dependencies || [];

    const imports = deps
      .filter((d) => d.sourceFilePath === cleanFile || d.sourceFilePath.endsWith(cleanFile))
      .map((d) => ({
        target: d.targetFilePath,
        specifier: d.specifier,
        symbols: d.importedSymbols,
      }));

    const importedBy = deps
      .filter((d) => d.targetFilePath === cleanFile || d.targetFilePath.endsWith(cleanFile))
      .map((d) => ({
        source: d.sourceFilePath,
        symbols: d.importedSymbols,
      }));

    return { file: cleanFile, imports, importedBy };
  }

  public findRelatedFiles(file: string): string[] {
    const cleanFile = file.replace(/\\/g, "/");
    const dir = path.dirname(cleanFile);
    const related = new Set<string>();

    const depInfo = this.findDependencies(cleanFile);
    depInfo.imports.forEach((i: any) => related.add(i.target));
    depInfo.importedBy.forEach((i: any) => related.add(i.source));

    // Also include files in the same directory
    if (this.ctx.workDir && fs.existsSync(this.ctx.workDir)) {
      const fullDir = path.join(this.ctx.workDir, dir);
      if (fs.existsSync(fullDir)) {
        const entries = fs.readdirSync(fullDir, { withFileTypes: true });
        for (const e of entries) {
          if (e.isFile()) {
            related.add(path.join(dir, e.name).replace(/\\/g, "/"));
          }
        }
      }
    }

    return Array.from(related).slice(0, 15);
  }

  public getFileContext(file: string, startLine: number, endLine: number): any {
    const cleanFile = file.replace(/\\/g, "/");
    const fullPath = path.join(this.ctx.workDir, cleanFile);

    if (!fs.existsSync(fullPath)) {
      return { error: `File not found: ${cleanFile}` };
    }

    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n");

    const s = Math.max(1, startLine);
    const e = Math.min(lines.length, Math.max(s, endLine));

    // Limit to max 100 lines to preserve token budget
    const clampedEnd = Math.min(e, s + 99);
    const slice = lines.slice(s - 1, clampedEnd);

    const formatted = slice.map((line, idx) => `${String(s + idx).padStart(4, " ")} | ${line}`).join("\n");

    return {
      filePath: cleanFile,
      startLine: s,
      endLine: clampedEnd,
      totalLines: lines.length,
      lines: formatted,
    };
  }

  public getGitHistory(file: string, limit: number = 5): any[] {
    const cleanFile = file.replace(/\\/g, "/");
    const workDir = this.ctx.workDir;
    if (!fs.existsSync(workDir)) return [];

    try {
      const out = execSync(
        `git log -n ${Math.min(limit, 10)} --pretty=format:"%h|%an|%ad|%s" --date=short -- "${cleanFile}"`,
        { cwd: workDir, encoding: "utf8" }
      );

      return out
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const [hash, author, date, ...msg] = line.split("|");
          return { hash, author, date, message: msg.join("|") };
        });
    } catch {
      return [];
    }
  }

  public getRepositoryStructure(depth: number = 3): any {
    const workDir = this.ctx.workDir;
    if (!fs.existsSync(workDir)) return { error: "Repository checkout directory does not exist" };

    const buildTree = (dir: string, curDepth: number): any => {
      if (curDepth > depth) return "...";
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const tree: Record<string, any> = {};

      for (const e of entries) {
        if (["node_modules", ".git", "dist", "build", ".next", ".turbo"].includes(e.name)) continue;
        if (e.isDirectory()) {
          tree[e.name + "/"] = buildTree(path.join(dir, e.name), curDepth + 1);
        } else {
          tree[e.name] = null;
        }
      }
      return tree;
    };

    return { root: path.basename(workDir), tree: buildTree(workDir, 1) };
  }

  public inspectDiff(baseCommit?: string, targetCommit?: string): string {
    const workDir = this.ctx.workDir;
    if (!fs.existsSync(workDir)) return "";

    try {
      const cmd = baseCommit && targetCommit
        ? `git diff ${baseCommit}..${targetCommit}`
        : baseCommit
        ? `git diff ${baseCommit}`
        : `git diff`;
      return execSync(cmd, { cwd: workDir, encoding: "utf8", maxBuffer: 1024 * 1024 });
    } catch (err: any) {
      return `Diff error: ${err.message}`;
    }
  }

  private scanDir(dir: string, list: string[] = []): string[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      if (["node_modules", ".git", "dist", "build", ".next"].includes(e.name)) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        this.scanDir(full, list);
      } else if (e.isFile()) {
        const ext = path.extname(e.name).toLowerCase();
        if ([".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"].includes(ext)) {
          list.push(full);
        }
      }
    }
    return list;
  }

  private grepDisk(query: string, limit: number): any[] {
    const files = this.scanDir(this.ctx.workDir);
    const q = query.toLowerCase();
    const results: any[] = [];

    for (const f of files) {
      const rel = path.relative(this.ctx.workDir, f).replace(/\\/g, "/");
      const content = fs.readFileSync(f, "utf8");
      if (content.toLowerCase().includes(q)) {
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].toLowerCase().includes(q)) {
            results.push({
              filePath: rel,
              startLine: Math.max(1, i - 1),
              endLine: Math.min(lines.length, i + 5),
              content: lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 5)).join("\n"),
              score: 0.9,
            });
            if (results.length >= limit) return results;
          }
        }
      }
    }
    return results;
  }

  private searchSymbolOnDisk(name: string): any[] {
    const files = this.scanDir(this.ctx.workDir);
    const regex = new RegExp(`(?:function|class|interface|type|def|fn|func)\\s+(${escapeRegExp(name)})\\b`);
    const results: any[] = [];

    for (const f of files) {
      const rel = path.relative(this.ctx.workDir, f).replace(/\\/g, "/");
      const content = fs.readFileSync(f, "utf8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (regex.test(lines[i])) {
          results.push({
            name,
            kind: lines[i].includes("class") ? "class" : lines[i].includes("interface") ? "interface" : "function",
            filePath: rel,
            startLine: i + 1,
            endLine: Math.min(lines.length, i + 20),
            signature: lines[i].trim(),
            isExported: lines[i].includes("export") || lines[i].startsWith("pub "),
          });
          if (results.length >= 10) return results;
        }
      }
    }
    return results;
  }

  private truncateContent(content: string, maxLines: number): string {
    const lines = content.split("\n");
    if (lines.length <= maxLines) return content;
    return lines.slice(0, maxLines).join("\n") + `\n... [${lines.length - maxLines} lines truncated]`;
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
