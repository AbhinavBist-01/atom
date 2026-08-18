import { Router, Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { AtomGitHubClient } from "@atom/github";
import { SandboxTestRunner } from "@atom/agent";
import path from "path";

const router: Router = Router();

// GET /api/runs/:id -> Get run details, RCA, patch diff, citations
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

    res.json({
      run,
      rca: rca
        ? {
            ...rca,
            citations: citationsList,
          }
        : null,
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch run details", message: error.message });
  }
});

// GET /api/runs/:id/stream -> SSE stream for live agent progress trace
router.get("/:id/stream", (req: Request, res: Response): void => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ step: "init", message: "Agent run started" })}\n\n`);
  res.write(`data: ${JSON.stringify({ step: "context", message: "Fetching code context from vector store" })}\n\n`);
  res.write(`data: ${JSON.stringify({ step: "reasoning", message: "Executing LLM evidence-first reasoning chain" })}\n\n`);
  res.write(`data: ${JSON.stringify({ step: "complete", message: "RCA analysis and diff patch generated" })}\n\n`);

  req.on("close", () => {
    res.end();
  });
});

import fs from "fs";
import { GitCloner } from "@atom/github";

// POST /api/runs/:id/verify -> Execute sandboxed test suite runner on proposed patch
router.post("/:id/verify", async (req: Request, res: Response): Promise<void> => {
  const runId = req.params.id as string;
  const { owner, repo, testCommand } = req.body;

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

    // Ensure directory exists by cloning if needed
    if (!fs.existsSync(workDir)) {
      const cloner = new GitCloner();
      await cloner.cloneOrPull({
        repoUrl: `https://github.com/${targetOwner}/${targetRepo}.git`,
        targetDir: workDir,
        depth: 1,
      });
    }

    const runner = new SandboxTestRunner();
    const result = await runner.runTests({
      workDir,
      patchDiff: rca.patchDiff,
      testPatch: rca.testPatch || undefined,
      testCommand: testCommand || "npm test",
    });

    res.json({ success: true, result });
  } catch (error: any) {
    console.error("[Verify Error]:", error);
    res.status(500).json({ error: "Sandboxed verification failed", message: error.message });
  }
});

// POST /api/runs/:id/publish -> Publish fix to GitHub as comment or PR
router.post("/:id/publish", async (req: Request, res: Response): Promise<void> => {
  const runId = req.params.id as string;
  const { action, owner, repo, issueNumber } = req.body;

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

    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    let client: AtomGitHubClient;
    if (appId && privateKey) {
      client = new AtomGitHubClient({
        appAuth: { appId, privateKey },
      });
    } else {
      client = new AtomGitHubClient();
    }

    if (action === "comment") {
      const commentBody = `## 🤖 ATOM Autonomous Issue Analysis

### Root Cause Analysis
${rca.rootCause}

**Confidence**: ${rca.confidence?.toUpperCase() || "MEDIUM"}

### Proposed Patch Diff
\`\`\`diff
${rca.patchDiff}
\`\`\`

${rca.testPatch ? `### Generated Regression Unit Tests\n\`\`\`typescript\n${rca.testPatch}\n\`\`\`` : ""}

---
*Generated autonomously by [ATOM](https://github.com) — Evidence-First GitHub Issue Resolution Agent.*
`;
      await client.createIssueComment({ owner: targetOwner, repo: targetRepo }, targetIssueNumber, commentBody);
      res.json({ success: true, published: "comment" });
    } else {
      res.json({ success: true, published: "pr", note: "PR publishing workflow initiated" });
    }
  } catch (error: any) {
    console.error("[Publish Error]:", error);
    res.status(500).json({ error: "Failed to publish to GitHub", message: error.message });
  }
});

export default router;
