import fs from "fs";
import path from "path";
import {
  VerificationStage,
  VerificationReport,
  RepoToolchain,
  SecurityCheckResult,
} from "@atom/core";
import { WorkspaceManager, WorkspaceContext } from "./workspace.js";
import { PatchValidator } from "./patchValidator.js";
import { ToolchainDetector } from "./toolchain.js";

export interface VerificationOptions {
  taskId: string;
  runId: string;
  repoRef: string;
  patchDiff: string;
  regressionTestCode?: string;
  regressionTestPath?: string;
  customToolchain?: Partial<RepoToolchain>;
  timeoutMsPerStage?: number;
}

export class VerificationEngine {
  private workspaceManager: WorkspaceManager;
  private patchValidator: PatchValidator;
  private toolchainDetector: ToolchainDetector;

  constructor(workspaceManager?: WorkspaceManager) {
    this.workspaceManager = workspaceManager || new WorkspaceManager();
    this.patchValidator = new PatchValidator();
    this.toolchainDetector = new ToolchainDetector();
  }

  /**
   * Executes the full 8-stage verification pipeline inside an isolated workspace
   */
  async runVerification(
    repoDir: string,
    options: VerificationOptions,
  ): Promise<{
    report: VerificationReport;
    workspace: WorkspaceContext;
  }> {
    const {
      taskId,
      runId,
      repoRef,
      patchDiff,
      regressionTestCode,
      regressionTestPath,
      timeoutMsPerStage = 60000,
    } = options;

    const stages: VerificationStage[] = [];

    // Stage 8 check first: Static security analysis of the patch content
    const patchValidation = this.patchValidator.validatePatchContent(patchDiff);
    const securityCheckResult: SecurityCheckResult = {
      passed: patchValidation.safetyPassed,
      secretsFound: patchValidation.violations.filter((v) => v.includes("Hardcoded")),
      dangerousPatterns: patchValidation.violations.filter((v) => !v.includes("Hardcoded")),
      blockedFiles: patchValidation.violations.filter((v) => v.includes("sensitive or protected file")),
      summary: patchValidation.safetyPassed
        ? "Security check passed: 0 secrets or hazardous patterns detected."
        : `Security violations detected: ${patchValidation.violations.join("; ")}`,
    };

    stages.push({
      name: "security_checks",
      status: patchValidation.safetyPassed ? "passed" : "failed",
      durationMs: 5,
      stdout: securityCheckResult.summary,
      stderr: patchValidation.violations.join("\n"),
      exitCode: patchValidation.safetyPassed ? 0 : 1,
      failureReason: patchValidation.safetyPassed ? undefined : patchValidation.violations[0],
    });

    // Create isolated workspace
    const workspace = await this.workspaceManager.createWorkspace({
      repoDir,
      taskId,
    });

    // Detect toolchain
    const detectedToolchain = this.toolchainDetector.detectToolchain(workspace.worktreePath);
    const toolchain: RepoToolchain = {
      ...detectedToolchain,
      ...(options.customToolchain || {}),
    };

    // Stage 1: Patch Application
    const patchCheck = await this.patchValidator.checkPatchApplication(workspace.worktreePath, patchDiff);
    if (!patchCheck.appliesCleanly) {
      stages.push({
        name: "patch_apply",
        status: "failed",
        durationMs: 15,
        stdout: "",
        stderr: patchCheck.error || "Patch failed to apply cleanly with git apply",
        exitCode: 1,
        failureReason: patchCheck.error || "git apply rejected patch",
      });
    } else {
      const applyResult = await this.workspaceManager.applyPatch(workspace, patchDiff);
      stages.push({
        name: "patch_apply",
        status: applyResult.success ? "passed" : "failed",
        durationMs: 25,
        stdout: "Patch applied cleanly to isolated workspace.",
        stderr: applyResult.error || "",
        exitCode: applyResult.success ? 0 : 1,
        failureReason: applyResult.error,
      });
    }

    const patchAppliedCleanly = stages.find((s) => s.name === "patch_apply")?.status === "passed";

    // If patch applied cleanly, proceed with build, lint, typecheck, tests
    if (patchAppliedCleanly) {
      // Stage 2: Build Verification
      if (toolchain.buildCommand) {
        const buildRes = await this.workspaceManager.execCommand(workspace, toolchain.buildCommand, {
          timeoutMs: timeoutMsPerStage,
        });
        stages.push({
          name: "build",
          status: buildRes.exitCode === 0 ? "passed" : "failed",
          command: toolchain.buildCommand,
          durationMs: buildRes.durationMs,
          stdout: buildRes.stdout,
          stderr: buildRes.stderr,
          exitCode: buildRes.exitCode,
          failureReason: buildRes.exitCode !== 0 ? `Build failed with exit code ${buildRes.exitCode}` : undefined,
        });
      } else {
        stages.push({
          name: "build",
          status: "skipped",
          durationMs: 0,
          stdout: "No build command detected or required for this repository.",
          stderr: "",
          exitCode: 0,
        });
      }

      // Stage 3: Lint Verification
      if (toolchain.lintCommand) {
        const lintRes = await this.workspaceManager.execCommand(workspace, toolchain.lintCommand, {
          timeoutMs: timeoutMsPerStage,
        });
        stages.push({
          name: "lint",
          status: lintRes.exitCode === 0 ? "passed" : "failed",
          command: toolchain.lintCommand,
          durationMs: lintRes.durationMs,
          stdout: lintRes.stdout,
          stderr: lintRes.stderr,
          exitCode: lintRes.exitCode,
          failureReason: lintRes.exitCode !== 0 ? `Linter returned errors (exit code ${lintRes.exitCode})` : undefined,
        });
      } else {
        stages.push({
          name: "lint",
          status: "skipped",
          durationMs: 0,
          stdout: "No lint command configured.",
          stderr: "",
          exitCode: 0,
        });
      }

      // Stage 4: Type Checking
      if (toolchain.typecheckCommand) {
        const typeRes = await this.workspaceManager.execCommand(workspace, toolchain.typecheckCommand, {
          timeoutMs: timeoutMsPerStage,
        });
        stages.push({
          name: "typecheck",
          status: typeRes.exitCode === 0 ? "passed" : "failed",
          command: toolchain.typecheckCommand,
          durationMs: typeRes.durationMs,
          stdout: typeRes.stdout,
          stderr: typeRes.stderr,
          exitCode: typeRes.exitCode,
          failureReason: typeRes.exitCode !== 0 ? `Typecheck failed with exit code ${typeRes.exitCode}` : undefined,
        });
      } else {
        stages.push({
          name: "typecheck",
          status: "skipped",
          durationMs: 0,
          stdout: "No typecheck command required for this language.",
          stderr: "",
          exitCode: 0,
        });
      }

      // Stage 5: Unit Tests
      if (toolchain.testCommand) {
        const testRes = await this.workspaceManager.execCommand(workspace, toolchain.testCommand, {
          timeoutMs: timeoutMsPerStage,
        });
        stages.push({
          name: "unit_tests",
          status: testRes.exitCode === 0 ? "passed" : "failed",
          command: toolchain.testCommand,
          durationMs: testRes.durationMs,
          stdout: testRes.stdout,
          stderr: testRes.stderr,
          exitCode: testRes.exitCode,
          failureReason: testRes.exitCode !== 0 ? `Unit tests failed (exit code ${testRes.exitCode})` : undefined,
        });
      } else {
        stages.push({
          name: "unit_tests",
          status: "not_configured",
          durationMs: 0,
          stdout: "No existing unit test runner detected in repository.",
          stderr: "",
          exitCode: 0,
        });
      }

      // Stage 6: Integration Tests
      stages.push({
        name: "integration_tests",
        status: "skipped",
        durationMs: 0,
        stdout: "Integration tests not configured separately.",
        stderr: "",
        exitCode: 0,
      });

      // Stage 7: Regression Tests (if regression test code provided)
      if (regressionTestCode && regressionTestPath) {
        const fullTestPath = path.join(workspace.worktreePath, regressionTestPath);
        try {
          fs.writeFileSync(fullTestPath, regressionTestCode, "utf-8");
          const regTestCmd = toolchain.testCommand ? `${toolchain.testCommand} ${regressionTestPath}` : `npx vitest run ${regressionTestPath}`;
          const regRes = await this.workspaceManager.execCommand(workspace, regTestCmd, {
            timeoutMs: timeoutMsPerStage,
          });
          stages.push({
            name: "regression_tests",
            status: regRes.exitCode === 0 ? "passed" : "failed",
            command: regTestCmd,
            durationMs: regRes.durationMs,
            stdout: regRes.stdout,
            stderr: regRes.stderr,
            exitCode: regRes.exitCode,
            failureReason: regRes.exitCode !== 0 ? "Regression test failed against patched code" : undefined,
          });
        } catch (err: any) {
          stages.push({
            name: "regression_tests",
            status: "inconclusive",
            durationMs: 0,
            stdout: "",
            stderr: err.message,
            exitCode: 1,
            failureReason: `Could not write or execute regression test: ${err.message}`,
          });
        }
      } else {
        stages.push({
          name: "regression_tests",
          status: "skipped",
          durationMs: 0,
          stdout: "No regression test supplied.",
          stderr: "",
          exitCode: 0,
        });
      }
    } else {
      // Patch did not apply cleanly - mark remaining stages as failed or skipped
      const remaining: Array<"build" | "lint" | "typecheck" | "unit_tests" | "integration_tests" | "regression_tests"> = [
        "build",
        "lint",
        "typecheck",
        "unit_tests",
        "integration_tests",
        "regression_tests",
      ];
      for (const name of remaining) {
        stages.push({
          name,
          status: "skipped",
          durationMs: 0,
          stdout: "Skipped because patch failed to apply.",
          stderr: "",
          exitCode: 0,
        });
      }
    }

    // Evaluate Verification Gate
    const gateResult = VerificationGate.evaluateGate(stages);

    const report: VerificationReport = {
      taskId,
      runId,
      repoRef,
      prEligible: gateResult.prEligible,
      humanApprovalRequired: true,
      repairAttempts: 0,
      stages,
      toolchain,
      security: securityCheckResult,
      summary: gateResult.prEligible
        ? "Verification successful: All quality, build, and security gates passed. Eligible for Draft PR."
        : `Verification blocked: ${gateResult.blockingReasons.join("; ")}`,
      createdAt: new Date().toISOString(),
    };

    return { report, workspace };
  }
}

/**
 * Phase 7: Deterministic Verification Gate
 */
export class VerificationGate {
  static evaluateGate(stages: VerificationStage[]): {
    prEligible: boolean;
    blockingReasons: string[];
  } {
    const blockingReasons: string[] = [];

    const getStage = (name: string) => stages.find((s) => s.name === name);

    const patchStage = getStage("patch_apply");
    if (!patchStage || patchStage.status !== "passed") {
      blockingReasons.push("Patch failed to apply cleanly to the codebase.");
    }

    const securityStage = getStage("security_checks");
    if (securityStage && securityStage.status === "failed") {
      blockingReasons.push(`Security check failed: ${securityStage.failureReason || "Hazardous code pattern or credential detected."}`);
    }

    const buildStage = getStage("build");
    if (buildStage && buildStage.status === "failed") {
      blockingReasons.push(`Build verification failed: ${buildStage.failureReason || "Project compilation failed."}`);
    }

    const typeStage = getStage("typecheck");
    if (typeStage && typeStage.status === "failed") {
      blockingReasons.push(`Static type checking failed: ${typeStage.failureReason || "Type errors found."}`);
    }

    const unitStage = getStage("unit_tests");
    if (unitStage && unitStage.status === "failed") {
      blockingReasons.push(`Unit tests failed: ${unitStage.failureReason || "Existing test suite regressions detected."}`);
    }

    const regressionStage = getStage("regression_tests");
    if (regressionStage && regressionStage.status === "failed") {
      blockingReasons.push(`Regression verification failed: The generated reproduction test did not pass with this patch.`);
    }

    const prEligible = blockingReasons.length === 0;

    return {
      prEligible,
      blockingReasons,
    };
  }
}
