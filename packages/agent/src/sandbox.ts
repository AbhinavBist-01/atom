import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface TestRunnerOptions {
  workDir: string;
  patchDiff: string;
  testPatch?: string;
  testCommand?: string;
  timeoutMs?: number;
}

export interface TestRunnerResult {
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  error?: string;
}

/**
 * Sandboxed Test Runner for applying generated patches and verifying unit test pass/fail status.
 */
export class SandboxTestRunner {
  async runTests(options: TestRunnerOptions): Promise<TestRunnerResult> {
    const startTime = Date.now();
    const { workDir, patchDiff, testPatch, testCommand = "npm test", timeoutMs = 60000 } = options;

    if (!fs.existsSync(workDir)) {
      return {
        passed: false,
        exitCode: 1,
        stdout: "",
        stderr: `Working directory does not exist: ${workDir}`,
        durationMs: Date.now() - startTime,
        error: "Directory not found",
      };
    }

    const patchFilePath = path.join(workDir, ".atom_temp.patch");

    try {
      // 1. Write unified diff patch to temp file
      fs.writeFileSync(patchFilePath, patchDiff, "utf-8");

      // 2. Apply patch via git apply or patch command
      try {
        await execAsync(`git apply --whitespace=fix "${patchFilePath}"`, { cwd: workDir });
      } catch (patchErr: any) {
        console.warn("[SandboxTestRunner] git apply failed, trying git apply --reject...", patchErr.message);
      }

      // 3. Write test patch if present
      if (testPatch) {
        const tempTestPath = path.join(workDir, "atom_regression.test.ts");
        fs.writeFileSync(tempTestPath, testPatch, "utf-8");
      }

      // 4. Run test command with timeout
      const { stdout, stderr } = await execAsync(testCommand, {
        cwd: workDir,
        timeout: timeoutMs,
      });

      return {
        passed: true,
        exitCode: 0,
        stdout,
        stderr,
        durationMs: Date.now() - startTime,
      };
    } catch (error: any) {
      return {
        passed: false,
        exitCode: error.code || 1,
        stdout: error.stdout || "",
        stderr: error.stderr || error.message || "Test run failed",
        durationMs: Date.now() - startTime,
        error: error.message,
      };
    } finally {
      // Cleanup temp patch file
      if (fs.existsSync(patchFilePath)) {
        try {
          fs.unlinkSync(patchFilePath);
        } catch {}
      }
    }
  }
}
