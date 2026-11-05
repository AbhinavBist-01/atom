import { describe, it, expect } from "vitest";
import {
  parseCodeFile,
  analyzeFileStructure,
  computeFileHash,
  detectChangedFiles,
} from "./index.js";

describe("ATOM 2.0 Parser Engine", () => {
  const sampleTs = `
import { z } from "zod";
import { other } from "./other";

export interface Config {
  port: number;
}

/**
 * Handles user token refresh
 */
export async function refreshToken(userId: string): Promise<string> {
  const token = "abc";
  return token;
}

export class AuthManager {
  private secret: string;

  constructor(secret: string) {
    this.secret = secret;
  }
}
`;

  it("extracts symbols, signatures, and line bounds with AST accuracy", () => {
    const analysis = analyzeFileStructure("src/auth.ts", sampleTs, "typescript");

    expect(analysis.filePath).toBe("src/auth.ts");
    expect(analysis.symbols.length).toBeGreaterThanOrEqual(3);

    const func = analysis.symbols.find((s) => s.name === "refreshToken");
    expect(func).toBeDefined();
    expect(func?.kind).toBe("function");
    expect(func?.isExported).toBe(true);
    expect(func?.signature).toContain("function refreshToken");
    expect(func?.docstring).toContain("Handles user token refresh");

    const cls = analysis.symbols.find((s) => s.name === "AuthManager");
    expect(cls).toBeDefined();
    expect(cls?.kind).toBe("class");
  });

  it("extracts import dependency relationships", () => {
    const analysis = analyzeFileStructure("src/auth.ts", sampleTs, "typescript");
    expect(analysis.dependencies.length).toBe(2);

    const zodDep = analysis.dependencies.find((d) => d.specifier === "zod");
    expect(zodDep).toBeDefined();
    expect(zodDep?.importedSymbols).toContain("z");

    const relDep = analysis.dependencies.find((d) => d.specifier === "./other");
    expect(relDep).toBeDefined();
    expect(relDep?.importedSymbols).toContain("other");
  });

  it("computes content hashes and detects changed files for incremental indexing", () => {
    const hashA = computeFileHash("content A");
    const hashB = computeFileHash("content B");
    expect(hashA).not.toBe(hashB);

    const prevHashes = {
      "src/unchanged.ts": computeFileHash("same content"),
      "src/modified.ts": computeFileHash("old content"),
      "src/deleted.ts": computeFileHash("will be deleted"),
    };

    const currentFiles = {
      "src/unchanged.ts": "same content",
      "src/modified.ts": "new modified content",
      "src/added.ts": "brand new file",
    };

    const diff = detectChangedFiles(prevHashes, currentFiles);
    expect(diff.unchanged).toContain("src/unchanged.ts");
    expect(diff.modified).toContain("src/modified.ts");
    expect(diff.deleted).toContain("src/deleted.ts");
    expect(diff.added).toContain("src/added.ts");
  });
});
