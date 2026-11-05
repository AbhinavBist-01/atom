import fs from "fs";
import path from "path";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import { TestExecutionResult } from "@atom/core";

const execAsync = promisify(exec);

export interface SandboxRunOptions {
  workDir: string;
  patchDiff: string;
  testPatch?: string;
  testCommand?: string;
  timeoutMs?: number;
}

export interface IterativeRepairOptions {
  workDir: string;
  initialPatch: string;
  initialTestPatch?: string;
  testCommand?: string;
  maxIterations?: number;
  repairFn: (currentPatch: string, failureLog: string, iteration: number) => Promise<{ patchDiff: string; testPatch?: string }>;
}

export class SandboxTestRunner {
  private defaultTimeout: number;

  constructor(defaultTimeoutMs: number = 30000) {
    this.defaultTimeout = defaultTimeoutMs;
  }

  /**
   * Applies patch diff in isolated repository directory and executes automated tests.
   */
  public async runTests(options: SandboxRunOptions): Promise<TestExecutionResult> {
    const { workDir, patchDiff, testPatch, testCommand, timeoutMs = this.defaultTimeout } = options;

    if (!fs.existsSync(workDir)) {
      throw new Error(`Sandbox directory does not exist: ${workDir}`);
    }

    const startTime = Date.now();
    let stdout = "";
    let stderr = "";
    let exitCode = 0;
    let passed = false;

    // 1. Ensure clean git state before applying patch
    this.rollback(workDir);

    try {
      // 2. Validate and apply the code patch diff
      if (patchDiff && patchDiff.trim().length > 0) {
        this.applyDiff(workDir, patchDiff);
      }

      // 3. Write test patch to disk if provided
      let testFilePath: string | null = null;
      if (testPatch && testPatch.trim().length > 0) {
        testFilePath = this.injectTestPatch(workDir, testPatch);
      }

      // 4. Determine test command
      const cmd = testCommand || this.detectTestCommand(workDir);

      console.log(`[Sandbox] Running test command in ${workDir}: ${cmd}`);

      // 5. Execute test suite with strict timeout
      try {
        const result = await execAsync(cmd, {
          cwd: workDir,
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
          env: {
            ...process.env,
            CI: "true",
            NODE_ENV: "test",
          },
        });
        stdout = result.stdout;
        stderr = result.stderr;
        exitCode = 0;
        passed = true;
      } catch (execError: any) {
        exitCode = execError.code ?? 1;
        stdout = execError.stdout || "";
        stderr = execError.stderr || execError.message || "Test execution failed";
        passed = false;
      }

      // 6. Clean up temporary test file if created
      if (testFilePath && fs.existsSync(testFilePath)) {
        try {
          fs.unlinkSync(testFilePath);
        } catch {}
      }

      const durationMs = Date.now() - startTime;
      const counts = this.parseTestCounts(stdout + "\n" + stderr);

      return {
        command: testCommand || this.detectTestCommand(workDir),
        passed,
        exitCode,
        stdout: this.truncateLog(stdout, 4000),
        stderr: this.truncateLog(stderr, 4000),
        durationMs,
        ...counts,
      };
    } finally {
      // Ensure changes are cleanly reset in sandbox after testing
      this.rollback(workDir);
    }
  }

  /**
   * Executes iterative repair loop:
   * If tests fail, calls repairFn with failure logs to generate an improved patch, retrying up to maxIterations.
   */
  public async runIterativeRepair(options: IterativeRepairOptions): Promise<{
    finalPatch: string;
    finalTestPatch?: string;
    iterationsRun: number;
    lastResult: TestExecutionResult;
    succeeded: boolean;
  }> {
    const { workDir, initialPatch, initialTestPatch, testCommand, maxIterations = 3, repairFn } = options;
    let currentPatch = initialPatch;
    let currentTestPatch = initialTestPatch;
    let lastResult: TestExecutionResult | null = null;

    for (let iter = 1; iter <= maxIterations; iter++) {
      console.log(`[Iterative Repair] Iteration ${iter}/${maxIterations}...`);

      const result = await this.runTests({
        workDir,
        patchDiff: currentPatch,
        testPatch: currentTestPatch,
        testCommand,
      });
      lastResult = result;

      if (result.passed) {
        console.log(`[Iterative Repair] Patch passed all tests on iteration ${iter}!`);
        return {
          finalPatch: currentPatch,
          finalTestPatch: currentTestPatch,
          iterationsRun: iter,
          lastResult,
          succeeded: true,
        };
      }

      if (iter < maxIterations) {
        const failureLog = `${result.stdout}\n${result.stderr}`.slice(-2000);
        console.log(`[Iterative Repair] Iteration ${iter} failed. Requesting patch refinement from agent...`);
        const refined = await repairFn(currentPatch, failureLog, iter);
        currentPatch = refined.patchDiff || currentPatch;
        if (refined.testPatch) currentTestPatch = refined.testPatch;
      }
    }

    return {
      finalPatch: currentPatch,
      finalTestPatch: currentTestPatch,
      iterationsRun: maxIterations,
      lastResult: lastResult!,
      succeeded: false,
    };
  }

  /**
   * Reverts uncommitted changes in the sandbox directory.
   */
  public rollback(workDir: string): void {
    if (!fs.existsSync(workDir)) return;
    try {
      execSync("git checkout -- .", { cwd: workDir, stdio: "ignore" });
      execSync("git clean -fd", { cwd: workDir, stdio: "ignore" });
    } catch {}
  }

  private applyDiff(workDir: string, diff: string): void {
    const patchPath = path.join(workDir, `.atom_temp_patch_${Date.now()}.patch`);
    fs.writeFileSync(patchPath, diff, "utf8");

    try {
      // 1. Check if git apply works cleanly
      try {
        execSync(`git apply --check --whitespace=fix "${patchPath}"`, {
          cwd: workDir,
          stdio: "pipe",
        });
        execSync(`git apply --whitespace=fix "${patchPath}"`, {
          cwd: workDir,
          stdio: "pipe",
        });
      } catch (applyErr: any) {
        // Fallback with 3-way merge or relaxed whitespace
        execSync(`git apply --3way --ignore-whitespace "${patchPath}"`, {
          cwd: workDir,
          stdio: "pipe",
        });
      }
    } catch (err: any) {
      throw new Error(`Failed to apply unified diff patch: ${err.stderr?.toString() || err.message}`);
    } finally {
      if (fs.existsSync(patchPath)) {
        try {
          fs.unlinkSync(patchPath);
        } catch {}
      }
    }
  }

  private injectTestPatch(workDir: string, testPatch: string): string {
    const isTs = fs.existsSync(path.join(workDir, "tsconfig.json"));
    const ext = isTs ? ".test.ts" : ".test.js";
    const testPath = path.join(workDir, `atom_regression${ext}`);
    fs.writeFileSync(testPath, testPatch, "utf8");
    return testPath;
  }

  private detectTestCommand(workDir: string): string {
    const pkgPath = path.join(workDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
        if (pkg.scripts?.test) {
          return "npm test";
        }
      } catch {}
    }

    if (fs.existsSync(path.join(workDir, "pytest.ini")) || fs.existsSync(path.join(workDir, "setup.py"))) {
      return "pytest";
    }

    if (fs.existsSync(path.join(workDir, "Cargo.toml"))) {
      return "cargo test";
    }

    if (fs.existsSync(path.join(workDir, "go.mod"))) {
      return "go test ./...";
    }

    return "npm test";
  }

  private parseTestCounts(output: string): { testCount?: number; passedCount?: number; failedCount?: number } {
    const passMatch = output.match(/(\d+)\s+passed/i);
    const failMatch = output.match(/(\d+)\s+failed/i);
    const totalMatch = output.match(/(\d+)\s+total/i);

    const passedCount = passMatch ? parseInt(passMatch[1], 10) : undefined;
    const failedCount = failMatch ? parseInt(failMatch[1], 10) : undefined;
    const testCount = totalMatch ? parseInt(totalMatch[1], 10) : undefined;

    return { testCount, passedCount, failedCount };
  }

  private truncateLog(log: string, maxLength: number): string {
    if (!log || log.length <= maxLength) return log;
    return "... [truncated] ...\n" + log.slice(-maxLength);
  }
}
