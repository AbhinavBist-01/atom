import { describe, it, expect } from "vitest";
import { RepositoryTools } from "./tools.js";

describe("ATOM 2.0 Repository Tools", () => {
  const mockContext = {
    workDir: process.cwd(),
    chunks: [
      {
        id: "chunk_1",
        filePath: "src/auth/refresh.ts",
        content: "export async function refreshToken() { /* lock */ }",
        startLine: 1,
        endLine: 20,
        symbolName: "refreshToken",
      },
      {
        id: "chunk_2",
        filePath: "src/db/session.ts",
        content: "export class SessionStore { /* storage */ }",
        startLine: 1,
        endLine: 15,
        symbolName: "SessionStore",
      },
    ],
    symbols: [
      {
        name: "refreshToken",
        kind: "function" as const,
        signature: "export async function refreshToken()",
        filePath: "src/auth/refresh.ts",
        startLine: 1,
        endLine: 20,
        isExported: true,
      },
    ],
    dependencies: [
      {
        sourceFilePath: "src/auth/refresh.ts",
        targetFilePath: "src/db/session.ts",
        specifier: "../db/session",
        importedSymbols: ["SessionStore"],
        type: "import" as const,
      },
    ],
  };

  it("finds symbols with exact signature and line ranges", () => {
    const tools = new RepositoryTools(mockContext);
    const matches = tools.findSymbol("refreshToken");
    expect(matches.length).toBe(1);
    expect(matches[0].filePath).toBe("src/auth/refresh.ts");
    expect(matches[0].kind).toBe("function");
  });

  it("finds module dependencies and importers", () => {
    const tools = new RepositoryTools(mockContext);
    const deps = tools.findDependencies("src/auth/refresh.ts");
    expect(deps.imports.length).toBe(1);
    expect(deps.imports[0].target).toBe("src/db/session.ts");
  });

  it("searches codebase with BM25 keyword matching", () => {
    const tools = new RepositoryTools(mockContext);
    const results = tools.searchCodebase("refreshToken lock");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].filePath).toBe("src/auth/refresh.ts");
  });
});
