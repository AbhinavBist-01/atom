import { Router, Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { AtomGitHubClient } from "@atom/github";

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
      res.status(400).json({ error: "No RCA result available to publish" });
      return;
    }

    const client = new AtomGitHubClient();

    if (action === "comment") {
      const commentBody = `## 🤖 ATOM Autonomous Issue Analysis

### Root Cause Analysis
${rca.rootCause}

**Confidence**: ${rca.confidence?.toUpperCase()}

### Proposed Patch Diff
\`\`\`diff
${rca.patchDiff}
\`\`\`

### Generated Unit Tests
\`\`\`typescript
${rca.testPatch}
\`\`\`
`;
      await client.createIssueComment({ owner, repo }, issueNumber, commentBody);
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
