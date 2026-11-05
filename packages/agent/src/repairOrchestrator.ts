import OpenAI from "openai";
import { VerificationReport } from "@atom/core";
import { VerificationEngine } from "./verificationEngine.js";
import { WorkspaceManager } from "./workspace.js";

export interface RepairAttempt {
  iteration: number;
  patchDiff: string;
  report: VerificationReport;
  failureAnalysis?: string;
}

export class RepairOrchestrator {
  private openai: OpenAI;
  private model: string;
  private verificationEngine: VerificationEngine;
  private workspaceManager: WorkspaceManager;

  constructor(apiKey?: string, model?: string) {
    const key = apiKey || process.env.OPENAI_API_KEY || "dummy";
    this.openai = new OpenAI({ apiKey: key });
    this.model = model || process.env.OPENAI_MODEL || "gpt-6-luna";
    this.workspaceManager = new WorkspaceManager();
    this.verificationEngine = new VerificationEngine(this.workspaceManager);
  }

  /**
   * Orchestrates the self-correction loop up to 3 attempts
   */
  async runSelfCorrectionLoop(input: {
    repoDir: string;
    taskId: string;
    runId: string;
    repoRef: string;
    issueTitle: string;
    issueBody: string;
    rootCause: string;
    initialPatchDiff: string;
    relevantCodeContext: string;
    regressionTestCode?: string;
    regressionTestPath?: string;
    maxAttempts?: number;
  }): Promise<{
    finalReport: VerificationReport;
    attempts: RepairAttempt[];
    resolved: boolean;
  }> {
    const maxAttempts = input.maxAttempts || 3;
    const attempts: RepairAttempt[] = [];
    let currentPatch = input.initialPatchDiff;

    for (let iteration = 1; iteration <= maxAttempts; iteration++) {
      console.log(`[RepairOrchestrator] Running verification iteration ${iteration}/${maxAttempts}...`);

      const { report, workspace } = await this.verificationEngine.runVerification(input.repoDir, {
        taskId: `${input.taskId}-iter-${iteration}`,
        runId: input.runId,
        repoRef: input.repoRef,
        patchDiff: currentPatch,
        regressionTestCode: input.regressionTestCode,
        regressionTestPath: input.regressionTestPath,
      });

      // Cleanup iteration workspace
      await this.workspaceManager.cleanupWorkspace(workspace);

      report.repairAttempts = iteration - 1;

      if (report.prEligible) {
        attempts.push({
          iteration,
          patchDiff: currentPatch,
          report,
        });
        return {
          finalReport: report,
          attempts,
          resolved: true,
        };
      }

      // Verification failed - analyze failure if more attempts remaining
      let failureAnalysis = "";
      if (iteration < maxAttempts) {
        failureAnalysis = await this.analyzeFailureAndRevisePatch({
          issueTitle: input.issueTitle,
          issueBody: input.issueBody,
          rootCause: input.rootCause,
          failedPatch: currentPatch,
          report,
          relevantCodeContext: input.relevantCodeContext,
        });

        // Extract new patch from analysis
        const match = failureAnalysis.match(/```diff\n([\s\S]+?)\n```/) || failureAnalysis.match(/--- a\/[\s\S]+/);
        if (match && match[0]) {
          currentPatch = match[1] || match[0];
        }
      }

      attempts.push({
        iteration,
        patchDiff: currentPatch,
        report,
        failureAnalysis,
      });
    }

    // All attempts exhausted
    const lastAttempt = attempts[attempts.length - 1];
    lastAttempt.report.summary += " All self-correction repair attempts exhausted. Human intervention required.";
    lastAttempt.report.humanApprovalRequired = true;

    return {
      finalReport: lastAttempt.report,
      attempts,
      resolved: false,
    };
  }

  private async analyzeFailureAndRevisePatch(params: {
    issueTitle: string;
    issueBody: string;
    rootCause: string;
    failedPatch: string;
    report: VerificationReport;
    relevantCodeContext: string;
  }): Promise<string> {
    const failedStages = params.report.stages
      .filter((s) => s.status === "failed")
      .map((s) => `Stage [${s.name}]: ${s.failureReason || ""}\nStdout: ${s.stdout}\nStderr: ${s.stderr}`)
      .join("\n\n");

    const prompt = `You are ATOM's Failure Analysis and Patch Correction Agent.
A previously generated patch failed the autonomous verification engine.

Issue: ${params.issueTitle}
Root Cause: ${params.rootCause}

Previous Patch:
\`\`\`diff
${params.failedPatch}
\`\`\`

Verification Failures:
${failedStages}

Original Code Context:
${params.relevantCodeContext}

Task:
1. Diagnose why the patch failed (syntax error, broken assertion, missing import, regression).
2. Generate an improved unified diff patch fixing the failure without introducing new regressions.
3. Wrap your revised unified diff patch in a \`\`\`diff ... \`\`\` codeblock.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: [
          { role: "system", content: "You analyze test failures and provide improved unified diffs." },
          { role: "user", content: prompt },
        ],
        temperature: 0.1,
      });

      return completion.choices[0]?.message?.content || "";
    } catch (err: any) {
      return `Failure analysis error: ${err.message}`;
    }
  }
}
