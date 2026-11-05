import { Router, Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq, desc } from "drizzle-orm";
import { AtomGitHubClient, GitCloner } from "@atom/github";
import {
  VerificationEngine,
  WorkspaceManager,
  VerificationGate,
} from "@atom/agent";
import { runEvents, RunEventPayload } from "./runEvents.js";
import path from "path";
import fs from "fs";

const router: Router = Router();

// GET /api/runs/:id -> Get run details, RCA, patch diff, citations, patchPlan, testExecutions, and verificationReport
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const runId = req.params.id as string;

  try {
    const run = await db.query.runs.findFirst({
      where: eq(schema.runs.id, runId),
    });

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const rca = await db.query.rcaResults.findFirst({
      where: eq(schema.rcaResults.runId, run.id),
    });

    let citationsList: any[] = [];
    if (rca) {
      citationsList = await db.query.citations.findMany({
        where: eq(schema.citations.rcaId, rca.id),
      });
    }

    const patchPlanRecord = await db.query.patchPlans.findFirst({
      where: eq(schema.patchPlans.runId, run.id),
    });

    const testRuns = await db.query.testExecutions.findMany({
      where: eq(schema.testExecutions.runId, run.id),
      orderBy: desc(schema.testExecutions.createdAt),
    });

    const vReportRecord = await db.query.verificationReports.findFirst({
      where: eq(schema.verificationReports.runId, run.id),
      orderBy: desc(schema.verificationReports.createdAt),
    });

    let verificationReport = null;
    if (vReportRecord) {
      try {
        verificationReport = {
          ...vReportRecord,
          prEligible: vReportRecord.prEligible === "true",
          humanApprovalRequired: vReportRecord.humanApprovalRequired === "true",
          stages: JSON.parse(vReportRecord.stages || "[]"),
          toolchain: JSON.parse(vReportRecord.toolchain || "{}"),
          security: JSON.parse(vReportRecord.security || "{}"),
          regressionTest: JSON.parse(vReportRecord.regressionTest || "{}"),
        };
      } catch (err) {
        console.warn("[Runs Router] Failed to parse verification report json:", err);
      }
    }

    res.json({
      run,
      rca: rca
        ? {
            ...rca,
            citations: citationsList,
            patchPlan: patchPlanRecord
              ? {
                  ...patchPlanRecord,
                  filesToModify: JSON.parse(patchPlanRecord.filesToModify || "[]"),
                }
              : undefined,
            verificationReport,
          }
        : null,
      testExecutions: testRuns,
      verificationReport,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch run details", message: error.message });
  }
});

// GET /api/runs/:id/stream -> SSE stream for live agent progress trace and state changes
router.get("/:id/stream", (req: Request, res: Response): void => {
  const runId = req.params.id as string;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ step: "connected", message: "Listening for agent updates..." })}\n\n`);

  const listener = (payload: RunEventPayload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  runEvents.on(`run:${runId}`, listener);

  req.on("close", () => {
    runEvents.off(`run:${runId}`, listener);
    res.end();
  });
});

// POST /api/runs/:id/verify -> Execute 8-Stage Autonomous Verification Engine
router.post("/:id/verify", async (req: Request, res: Response): Promise<void> => {
  const runId = req.params.id as string;
  const { owner, repo } = req.body;

  try {
    const run = await db.query.runs.findFirst({
      where: eq(schema.runs.id, runId),
    });

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const rca = await db.query.rcaResults.findFirst({
      where: eq(schema.rcaResults.runId, run.id),
    });

    if (!rca || !rca.patchDiff) {
      res.status(400).json({ error: "No patch diff available to verify yet. Please run the agent analysis first." });
      return;
    }

    let targetOwner = owner;
    let targetRepo = repo;

    if (!targetOwner || !targetRepo) {
      if (run.issueId) {
        const issue = await db.query.issues.findFirst({
          where: eq(schema.issues.id, run.issueId),
        });
        if (issue?.repoId) {
          const repoRec = await db.query.repositories.findFirst({
            where: eq(schema.repositories.id, issue.repoId),
          });
          if (repoRec) {
            targetOwner = repoRec.owner;
            targetRepo = repoRec.repo;
          }
        }
      }
    }

    if (!targetOwner || !targetRepo) {
      res.status(400).json({ error: "Repository owner and repo could not be identified for this run." });
      return;
    }

    const workDir = path.join(process.cwd(), "scratch", "repos", `${targetOwner}_${targetRepo}`);

    // Ensure directory exists by shallow cloning if needed
    if (!fs.existsSync(workDir)) {
      const cloner = new GitCloner();
      await cloner.cloneOrPull({
        repoUrl: `https://github.com/${targetOwner}/${targetRepo}.git`,
        targetDir: workDir,
        depth: 5,
      });
    }

    runEvents.emitRunEvent({
      runId,
      step: "testing",
      message: "Starting 8-stage autonomous code verification engine...",
    });

    const engine = new VerificationEngine();
    const wsManager = new WorkspaceManager();

    const { report, workspace } = await engine.runVerification(workDir, {
      taskId: `verify_${run.id.slice(0, 8)}`,
      runId: run.id,
      repoRef: `${targetOwner}/${targetRepo}`,
      patchDiff: rca.patchDiff,
      regressionTestCode: rca.testPatch || undefined,
      regressionTestPath: "tests/atom_regression.test.ts",
    });

    // Clean up temporary worktree
    await wsManager.cleanupWorkspace(workspace);

    // Save report to database
    await db.insert(schema.verificationReports).values({
      runId: run.id,
      prEligible: report.prEligible ? "true" : "false",
      humanApprovalRequired: report.humanApprovalRequired ? "true" : "false",
      repairAttempts: report.repairAttempts,
      stages: JSON.stringify(report.stages),
      toolchain: JSON.stringify(report.toolchain || {}),
      security: JSON.stringify(report.security || {}),
      regressionTest: JSON.stringify(report.regressionTest || {}),
      summary: report.summary,
    });

    // Also record test execution row for backward compatibility
    const testStage = report.stages.find((s) => s.name === "unit_tests");
    if (testStage) {
      await db.insert(schema.testExecutions).values({
        runId: run.id,
        command: testStage.command || "unit_tests",
        passed: testStage.status === "passed" ? "true" : "false",
        exitCode: testStage.exitCode,
        stdout: testStage.stdout,
        stderr: testStage.stderr,
        durationMs: testStage.durationMs,
      });
    }

    runEvents.emitRunEvent({
      runId,
      step: report.prEligible ? "awaiting_approval" : "testing",
      message: report.prEligible
        ? "All verification stages passed! Eligible for Draft Pull Request."
        : `Verification completed: ${report.summary}`,
      data: report,
    });

    res.json({ success: true, report });
  } catch (error: any) {
    console.error("[Verify Error]:", error);
    res.status(500).json({ error: "Verification engine execution failed", message: error.message });
  }
});

// POST /api/runs/:id/publish -> Publish fix to GitHub as comment or DRAFT Pull Request
router.post("/:id/publish", async (req: Request, res: Response): Promise<void> => {
  const runId = req.params.id as string;
  const { action, owner, repo, issueNumber, forceOverride, humanApprovalReason } = req.body;

  try {
    const run = await db.query.runs.findFirst({
      where: eq(schema.runs.id, runId),
    });

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const rca = await db.query.rcaResults.findFirst({
      where: eq(schema.rcaResults.runId, run.id),
    });

    if (!rca) {
      res.status(400).json({ error: "No RCA result available to publish. Please run analysis first." });
      return;
    }

    let targetOwner = owner;
    let targetRepo = repo;
    let targetIssueNumber = typeof issueNumber === "number" ? issueNumber : parseInt(issueNumber, 10);

    if (!targetOwner || !targetRepo || isNaN(targetIssueNumber)) {
      if (run.issueId) {
        const issue = await db.query.issues.findFirst({
          where: eq(schema.issues.id, run.issueId),
        });
        if (issue) {
          targetIssueNumber = issue.githubNumber;
          if (issue.repoId) {
            const repoRec = await db.query.repositories.findFirst({
              where: eq(schema.repositories.id, issue.repoId),
            });
            if (repoRec) {
              targetOwner = repoRec.owner;
              targetRepo = repoRec.repo;
            }
          }
        }
      }
    }

    if (!targetOwner || !targetRepo || isNaN(targetIssueNumber)) {
      res.status(400).json({ error: "Could not resolve repository or issue number for publishing." });
      return;
    }

    // Phase 7 & 10 Verification Gate Check before opening PR
    if (action !== "comment") {
      const vReportRecord = await db.query.verificationReports.findFirst({
        where: eq(schema.verificationReports.runId, run.id),
        orderBy: desc(schema.verificationReports.createdAt),
      });

      const isEligible = vReportRecord?.prEligible === "true";

      if (!isEligible && !forceOverride) {
        res.status(403).json({
          error: "Verification Gate Blocked PR Creation",
          message: vReportRecord
            ? `Patch has not passed deterministic verification: ${vReportRecord.summary}`
            : "No verification report found. You must run verification before creating a Pull Request.",
          prEligible: false,
          requiresHumanOverride: true,
        });
        return;
      }
    }

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

    const client = new AtomGitHubClient({
      token,
      ...(appId && privateKey ? { appAuth: { appId, privateKey } } : {}),
    });

    if (action === "comment") {
      const commentBody = `## 🤖 ATOM Autonomous Issue Analysis

### 🔍 Root Cause Analysis
${rca.rootCause}

**Confidence**: ${rca.confidence?.toUpperCase() || "MEDIUM"}

### 📝 Proposed Patch Diff
\`\`\`diff
${rca.patchDiff}
\`\`\`

${rca.testPatch ? `### 🧪 Generated Regression Unit Tests\n\`\`\`typescript\n${rca.testPatch}\n\`\`\`` : ""}

---
*Generated autonomously by [ATOM](https://github.com) — Evidence-First Autonomous Issue Resolution Agent.*
`;
      await client.createIssueComment({ owner: targetOwner, repo: targetRepo }, targetIssueNumber, commentBody);
      res.json({ success: true, published: "comment" });
    } else {
      if (!rca.patchDiff) {
        res.status(400).json({ error: "No patch diff available to create PR. Please run analysis first." });
        return;
      }

      let issueTitle = "";
      try {
        const issueData = await client.getIssue({ owner: targetOwner, repo: targetRepo }, targetIssueNumber);
        if (issueData?.title) {
          issueTitle = issueData.title;
        }
      } catch {}

      const defaultBranch = await client.getDefaultBranch({ owner: targetOwner, repo: targetRepo });
      const branchName = `atom/fix-issue-${targetIssueNumber}-${Date.now().toString().slice(-4)}`;
      const workDir = path.join(process.cwd(), "scratch", "repos", `${targetOwner}_${targetRepo}`);

      // Ensure local clone exists
      const cloner = new GitCloner();
      const repoUrl = `https://github.com/${targetOwner}/${targetRepo}.git`;
      await cloner.cloneOrPull({
        repoUrl,
        targetDir: workDir,
        depth: 5,
      });

      // Prepare authenticated remote URL if token is available
      const remoteUrlWithAuth = token
        ? `https://${token}@github.com/${targetOwner}/${targetRepo}.git`
        : undefined;

      const commitMessage = `fix: resolve issue #${targetIssueNumber}${issueTitle ? ` (${issueTitle})` : ""} via ATOM`;

      // Branch, apply patch, and push to GitHub
      await cloner.publishPatchBranch({
        workDir,
        branchName,
        patchDiff: rca.patchDiff,
        testPatch: rca.testPatch || undefined,
        commitMessage,
        remoteUrlWithAuth,
      });

      // Fetch latest verification scorecard
      const vReportRecord = await db.query.verificationReports.findFirst({
        where: eq(schema.verificationReports.runId, run.id),
        orderBy: desc(schema.verificationReports.createdAt),
      });

      let scorecardTable = "| Verification Stage | Status |\n| :--- | :--- |\n";
      if (vReportRecord?.stages) {
        try {
          const parsedStages = JSON.parse(vReportRecord.stages);
          scorecardTable += parsedStages
            .map((s: any) => `| \`${s.name}\` | **${s.status.toUpperCase()}** |`)
            .join("\n");
        } catch {}
      } else {
        scorecardTable += "| `verification_gate` | **MANUAL OVERRIDE** |";
      }

      // Generate Draft PR description with Evidence Scorecard
      const prTitle = `fix: resolve issue #${targetIssueNumber}${issueTitle ? ` - ${issueTitle}` : ""}`;
      const prBody = `## 🤖 ATOM Autonomous Issue Resolution (DRAFT)

Closes #${targetIssueNumber}

> ⚠️ **Draft Pull Request**: Requires human review before merging.

### 🔍 Root Cause Analysis
${rca.rootCause}

**Confidence**: ${rca.confidence?.toUpperCase() || "HIGH"}

### 🛡️ Verification Gate Scorecard
${scorecardTable}

${forceOverride ? `\n> ⚠️ **Manual Authorization**: Verification gate was manually overridden by user: ${humanApprovalReason || "No reason specified"}\n` : ""}

### 📝 Proposed Code Modifications
\`\`\`diff
${rca.patchDiff}
\`\`\`

${rca.testPatch ? `### 🧪 Regression Tests\n\`\`\`typescript\n${rca.testPatch}\n\`\`\`` : ""}

---
*Created autonomously as a Draft PR by [ATOM](https://github.com) — Evidence-First Software Engineering Agent.*`;

      const prResult = await client.createPullRequest(
        { owner: targetOwner, repo: targetRepo },
        prTitle,
        branchName,
        defaultBranch,
        prBody,
      );

      // Transition run status to pr_created
      await db
        .update(schema.runs)
        .set({
          status: "pr_created",
          completedAt: new Date(),
        })
        .where(eq(schema.runs.id, run.id));

      runEvents.emitRunEvent({
        runId,
        step: "pr_created",
        message: `Draft Pull Request #${prResult.number} opened on GitHub!`,
        data: prResult,
      });

      res.json({
        success: true,
        published: "pr",
        prNumber: prResult.number,
        prUrl: prResult.url,
        branch: branchName,
        draft: true,
      });
    }
  } catch (error: any) {
    console.error("[Publish Error]:", error);
    res.status(500).json({ error: "Failed to publish to GitHub", message: error.message });
  }
});

export default router;
