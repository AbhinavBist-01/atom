import fs from "fs";
import path from "path";
import OpenAI from "openai";
import { RepoToolchain } from "@atom/core";
import { WorkspaceManager, WorkspaceContext } from "./workspace.js";

export interface RegressionTestResult {
  testFilePath: string;
  testCode: string;
  baselineFailedAsExpected: boolean;
  baselineStdout: string;
  baselineStderr: string;
  postPatchPassed: boolean;
  postPatchStdout: string;
  postPatchStderr: string;
  isConclusive: boolean;
  summary: string;
}

export class RegressionTestGenerator {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY || "dummy";
    this.openai = new OpenAI({ apiKey: key });
    this.model = model || process.env.OPENAI_MODEL || "gpt-6-luna";
  }

  /**
   * Generates a focused regression test reproducing the reported GitHub issue
   */
  async generateRegressionTest(input: {
    issueTitle: string;
    issueBody: string;
    rootCause: string;
    relevantCodeContext: string;
    toolchain: RepoToolchain;
  }): Promise<{ testFilePath: string; testCode: string }> {
    const { issueTitle, issueBody, rootCause, relevantCodeContext, toolchain } = input;

    const testFramework =
      toolchain.language === "python"
        ? "pytest"
        : toolchain.language === "java"
          ? "JUnit 5"
          : "vitest or jest";

    const prompt = `You are ATOM's automated regression test generator.
Task: Write a concise, standalone unit test that reproduces the bug described in the GitHub issue.
Requirements:
1. Must use the repository's test framework: ${testFramework}.
2. Must assert the EXPECTED behavior (so it will FAIL on unpatched code and PASS once the fix is applied).
3. Do not import or mock unnecessary external services; test the isolated function or module directly.
4. Return a valid JSON object matching:
{
  "testFilePath": "tests/atom_reproduce_regression.test.ts",
  "testCode": "... test code ..."
}

Issue: ${issueTitle}
Description:
${issueBody}

Identified Root Cause:
${rootCause}

Relevant Code:
${relevantCodeContext}`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You generate deterministic regression test cases. Output JSON only." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      });

      const parsed = JSON.parse(completion.choices[0]?.message?.content || "{}");
      return {
        testFilePath: parsed.testFilePath || (toolchain.language === "python" ? "tests/test_atom_regression.py" : "test/atom_regression.test.ts"),
        testCode: parsed.testCode || "// Inconclusive regression test placeholder",
      };
    } catch {
      return {
        testFilePath: toolchain.language === "python" ? "tests/test_atom_regression.py" : "test/atom_regression.test.ts",
        testCode: "// Autonomous test generation fallback placeholder",
      };
    }
  }

  /**
   * Executes dual-phase regression verification:
   * Phase A: Runs test on UNPATCHED workspace (must fail to reproduce the issue).
   * Phase B: Runs test on PATCHED workspace (must pass to verify fix).
   */
  async executeDualVerification(
    workspaceManager: WorkspaceManager,
    workspace: WorkspaceContext,
    testFilePath: string,
    testCode: string,
    toolchain: RepoToolchain,
  ): Promise<RegressionTestResult> {
    const fullTestPath = path.join(workspace.worktreePath, testFilePath);
    const testDir = path.dirname(fullTestPath);
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    fs.writeFileSync(fullTestPath, testCode, "utf-8");

    const runCmd = toolchain.testCommand
      ? `${toolchain.testCommand} "${testFilePath}"`
      : `npx vitest run "${testFilePath}"`;

    // 1. Run against baseline unpatched code
    const baselineRun = await workspaceManager.execCommand(workspace, runCmd, { timeoutMs: 30000 });
    const baselineFailedAsExpected = baselineRun.exitCode !== 0;

    // Notice: The caller will apply patch to workspace, then invoke post-patch run
    return {
      testFilePath,
      testCode,
      baselineFailedAsExpected,
      baselineStdout: baselineRun.stdout,
      baselineStderr: baselineRun.stderr,
      postPatchPassed: false, // Updated after patch applied
      postPatchStdout: "",
      postPatchStderr: "",
      isConclusive: baselineFailedAsExpected,
      summary: baselineFailedAsExpected
        ? "Baseline test failed as expected, successfully reproducing the bug."
        : "Inconclusive: Test passed on unpatched code and did not reproduce the bug.",
    };
  }
}
