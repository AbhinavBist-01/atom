import { describe, it, expect } from "vitest";
import { ToolchainDetector } from "./toolchain.js";
import { VerificationGate } from "./verificationEngine.js";
import { VerificationStage } from "@atom/core";
import path from "path";
import fs from "fs";

describe("ToolchainDetector", () => {
  const detector = new ToolchainDetector();

  it("detects TypeScript npm / vitest configuration from repository files", () => {
    const fakeDir = path.join(process.cwd(), "scratch", "test_fake_ts_repo");
    if (!fs.existsSync(fakeDir)) fs.mkdirSync(fakeDir, { recursive: true });

    fs.writeFileSync(
      path.join(fakeDir, "package.json"),
      JSON.stringify({
        name: "test-pkg",
        scripts: {
          build: "tsc",
          test: "vitest run",
          lint: "eslint .",
        },
      }),
      "utf-8",
    );
    fs.writeFileSync(path.join(fakeDir, "tsconfig.json"), "{}", "utf-8");

    const toolchain = detector.detectToolchain(fakeDir);
    expect(toolchain.language).toBe("typescript");
    expect(toolchain.buildCommand).toBe("npm run build");
    expect(toolchain.testCommand).toBe("npm test");
    expect(toolchain.lintCommand).toBe("npm run lint");

    fs.rmSync(fakeDir, { recursive: true, force: true });
  });

  it("detects Python pytest repository", () => {
    const fakeDir = path.join(process.cwd(), "scratch", "test_fake_py_repo");
    if (!fs.existsSync(fakeDir)) fs.mkdirSync(fakeDir, { recursive: true });

    fs.writeFileSync(path.join(fakeDir, "pyproject.toml"), "[tool.poetry]", "utf-8");
    fs.writeFileSync(path.join(fakeDir, "pytest.ini"), "[pytest]", "utf-8");

    const toolchain = detector.detectToolchain(fakeDir);
    expect(toolchain.language).toBe("python");
    expect(toolchain.testCommand).toContain("pytest");

    fs.rmSync(fakeDir, { recursive: true, force: true });
  });
});

describe("VerificationGate", () => {
  it("permits PR eligibility only when all required stages pass", () => {
    const stages: VerificationStage[] = [
      { name: "patch_apply", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "build", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "lint", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "typecheck", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "unit_tests", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "integration_tests", status: "skipped", durationMs: 0, stdout: "", stderr: "", exitCode: 0 },
      { name: "regression_tests", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "security_checks", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
    ];

    const result = VerificationGate.evaluateGate(stages);
    expect(result.prEligible).toBe(true);
    expect(result.blockingReasons.length).toBe(0);
  });

  it("blocks PR eligibility when build or regression test fails", () => {
    const stages: VerificationStage[] = [
      { name: "patch_apply", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "build", status: "failed", failureReason: "Syntax error", durationMs: 10, stdout: "", stderr: "", exitCode: 1 },
      { name: "regression_tests", status: "failed", durationMs: 10, stdout: "", stderr: "", exitCode: 1 },
      { name: "security_checks", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
    ];

    const result = VerificationGate.evaluateGate(stages);
    expect(result.prEligible).toBe(false);
    expect(result.blockingReasons.length).toBeGreaterThanOrEqual(2);
    expect(result.blockingReasons.some((r) => r.includes("Build verification failed"))).toBe(true);
  });

  it("blocks PR eligibility when a critical security violation is detected", () => {
    const stages: VerificationStage[] = [
      { name: "patch_apply", status: "passed", durationMs: 10, stdout: "", stderr: "", exitCode: 0 },
      { name: "security_checks", status: "failed", failureReason: "Hardcoded secret", durationMs: 10, stdout: "", stderr: "", exitCode: 1 },
    ];

    const result = VerificationGate.evaluateGate(stages);
    expect(result.prEligible).toBe(false);
    expect(result.blockingReasons.some((r) => r.includes("Security check failed"))).toBe(true);
  });
});
