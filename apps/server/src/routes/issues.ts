import { Router, Request, Response } from "express";
import { AtomGitHubClient } from "@atom/github";
import { runRcaEngine, CodeContextChunk } from "@atom/agent";
import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";

const router: Router = Router();

// GET /api/issues/:owner/:repo/:number -> Get issue details
router.get("/:owner/:repo/:number", async (req: Request, res: Response): Promise<void> => {
  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const issueNumber = parseInt(req.params.number as string, 10);

  if (isNaN(issueNumber)) {
    res.status(400).json({ error: "Invalid issue number" });
    return;
  }

  const client = new AtomGitHubClient();
  try {
    const issue = await client.getIssue({ owner, repo }, issueNumber);
    res.json({ issue });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch issue from GitHub", message: error.message });
  }
});

// POST /api/issues/:owner/:repo/:number/run -> Run ATOM agentic RCA on an issue
router.post("/:owner/:repo/:number/run", async (req: Request, res: Response): Promise<void> => {
  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const issueNumber = parseInt(req.params.number as string, 10);

  if (isNaN(issueNumber)) {
    res.status(400).json({ error: "Invalid issue number" });
    return;
  }

  const client = new AtomGitHubClient();

  try {
    // 1. Fetch issue details from GitHub
    const issue = await client.getIssue({ owner, repo }, issueNumber);

    // 2. Ensure repository is registered in DB
    let repoRecord = await db.query.repositories.findFirst({
      where: and(eq(schema.repositories.owner, owner), eq(schema.repositories.repo, repo)),
    });

    if (!repoRecord) {
      const [inserted] = await db
        .insert(schema.repositories)
        .values({ owner, repo, status: "pending" })
        .returning();
      repoRecord = inserted;
    }

    // 3. Ensure issue is saved in DB
    let issueRecord = await db.query.issues.findFirst({
      where: and(
        eq(schema.issues.repoId, repoRecord.id),
        eq(schema.issues.githubNumber, issueNumber)
      ),
    });

    if (!issueRecord) {
      const [insertedIssue] = await db
        .insert(schema.issues)
        .values({
          repoId: repoRecord.id,
          githubNumber: issueNumber,
          title: issue.title,
          body: issue.body,
          state: issue.state,
        })
        .returning();
      issueRecord = insertedIssue;
    }

    // 4. Create a Run record
    const [runRecord] = await db
      .insert(schema.runs)
      .values({
        issueId: issueRecord.id,
        status: "running",
        startedAt: new Date(),
      })
      .returning();

    // 5. Fetch code chunks for RCA context
    const dbChunks = await db.query.chunks.findMany({
      where: eq(schema.chunks.repoId, repoRecord.id),
      limit: 30,
    });

    const codeChunks: CodeContextChunk[] = dbChunks.map((c) => ({
      filePath: c.filePath,
      startLine: c.startLine || 1,
      endLine: c.endLine || 1,
      content: c.content,
      lang: c.lang || undefined,
      commitHash: c.gitBlameCommit || undefined,
    }));

    // 6. Execute ATOM RCA Engine
    const rca = await runRcaEngine({
      issueTitle: issue.title,
      issueBody: issue.body,
      codeChunks,
    });

    // 7. Save RCA Result
    const [rcaRecord] = await db
      .insert(schema.rcaResults)
      .values({
        runId: runRecord.id,
        rootCause: rca.rootCause,
        confidence: rca.confidence,
        patchDiff: rca.patchDiff,
        testPatch: rca.testPatch,
      })
      .returning();

    // 8. Save Citations
    if (rca.citations && rca.citations.length > 0) {
      await db.insert(schema.citations).values(
        rca.citations.map((cit) => ({
          rcaId: rcaRecord.id,
          filePath: cit.filePath,
          startLine: cit.startLine,
          endLine: cit.endLine,
          commitHash: cit.commitHash,
          relevanceScore: cit.relevanceScore || 1.0,
        }))
      );
    }

    // 9. Update Run status to done
    await db
      .update(schema.runs)
      .set({
        status: "done",
        completedAt: new Date(),
      })
      .where(eq(schema.runs.id, runRecord.id));

    res.json({
      runId: runRecord.id,
      status: "done",
      issueNumber,
      rca,
    });
  } catch (error: any) {
    console.error("[Issue Run] Error processing issue run:", error);
    res.status(500).json({ error: "Failed to run agent analysis", message: error.message });
  }
});

export default router;
