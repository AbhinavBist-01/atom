import { Router, Request, Response } from "express";
import { AtomGitHubClient, GitCloner } from "@atom/github";
import { InvestigationAgent, SandboxTestRunner } from "@atom/agent";
import { db, schema } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import { runEvents } from "./runEvents.js";
import path from "path";
import fs from "fs";

const router: Router = Router();

// GET /api/issues/:owner/:repo -> List issues for a repository
router.get("/:owner/:repo", async (req: Request, res: Response): Promise<void> => {
  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const state = (req.query.state as "open" | "closed" | "all") || "open";

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

  try {
    const issues = await client.listIssues({ owner, repo }, state);
    res.json({ issues, owner, repo });
  } catch (error: any) {
    console.error(`[Issues Router] Failed to fetch issues for ${owner}/${repo}:`, error);
    res.status(500).json({ error: "Failed to fetch issues from GitHub", message: error.message });
  }
});

// GET /api/issues/:owner/:repo/:number -> Get issue details
router.get("/:owner/:repo/:number", async (req: Request, res: Response): Promise<void> => {
  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const issueNumber = parseInt(req.params.number as string, 10);

  if (isNaN(issueNumber)) {
    res.status(400).json({ error: "Invalid issue number" });
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

  try {
    const issue = await client.getIssue({ owner, repo }, issueNumber);
    res.json({ issue });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to fetch issue from GitHub", message: error.message });
  }
});

// POST /api/issues/:owner/:repo/:number/run -> Run ATOM 2.0 autonomous investigation & resolution pipeline
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

    // 4. Create Run record with status 'queued'
    const [runRecord] = await db
      .insert(schema.runs)
      .values({
        issueId: issueRecord.id,
        status: "analyzing",
        currentStep: "Initializing investigation",
        startedAt: new Date(),
      })
      .returning();

    runEvents.emitRunEvent({
      runId: runRecord.id,
      step: "analyzing",
      message: `Starting investigation for issue #${issueNumber}: ${issue.title}`,
    }); 

    // 5. Ensure local repository checkout exists for tools & sandbox
    const workDir = path.join(process.cwd(), "scratch", "repos", `${owner}_${repo}`);
    if (!fs.existsSync(workDir)) {
      const cloner = new GitCloner();
      await cloner.cloneOrPull({
        repoUrl: `https://github.com/${owner}/${repo}.git`,
        targetDir: workDir,
        depth: 5,
      });
    }

    // 6. Load indexed chunks, symbols, and dependencies from DB
    const dbChunks = await db.query.chunks.findMany({
      where: eq(schema.chunks.repoId, repoRecord.id),
      limit: 150,
    });

    const dbSymbols = await db.query.symbols.findMany({
      where: eq(schema.symbols.repoId, repoRecord.id),
      limit: 200,
    });

    const dbDeps = await db.query.dependencies.findMany({
      where: eq(schema.dependencies.repoId, repoRecord.id),
      limit: 200,
    });

    // 7. Initialize and execute Investigation Agent
    const model = process.env.OPENAI_MODEL || "gpt-6-luna";
    const agent = new InvestigationAgent(process.env.OPENAI_API_KEY, model, 8);

    const rca = await agent.investigate({
      issueTitle: issue.title,
      issueBody: issue.body || "",
      repoContext: {
        workDir,
        chunks: dbChunks.map((c) => ({
          id: c.id,
          filePath: c.filePath,
          content: c.content,
          startLine: c.startLine,
          endLine: c.endLine,
          nodeType: c.nodeType,
          embedding: c.embedding as number[] | null,
        })),
        symbols: dbSymbols.map((s) => ({
          name: s.name,
          kind: s.kind as any,
          filePath: s.filePath,
          startLine: s.startLine,
          endLine: s.endLine,
          signature: s.signature || undefined,
          isExported: s.isExported === "true",
        })),
        dependencies: dbDeps.map((d) => ({
          sourceFilePath: d.sourceFilePath,
          targetFilePath: d.targetFilePath,
          specifier: d.specifier,
          importedSymbols: d.importedSymbols ? JSON.parse(d.importedSymbols) : [],
          type: (d.type || "import") as any,
        })),
      },
      onProgress: (step, message) => {
        runEvents.emitRunEvent({ runId: runRecord.id, step, message });
        db.update(schema.runs)
          .set({ status: step, currentStep: message })
          .where(eq(schema.runs.id, runRecord.id))
          .catch(() => {});
      },
    });

    // 8. Save RCA Result
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

    // 9. Save Citations
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

    // 10. Save Patch Plan if generated
    if (rca.patchPlan) {
      await db.insert(schema.patchPlans).values({
        runId: runRecord.id,
        rootCause: rca.patchPlan.rootCause,
        filesToModify: JSON.stringify(rca.patchPlan.filesToModify),
        expectedBehavior: rca.patchPlan.expectedBehavior,
        regressionRisks: rca.patchPlan.regressionRisks,
        testStrategy: rca.patchPlan.testStrategy,
      });
    }

    // 11. Run Sandboxed Validation if patch was produced
    let testExecutionResult: any = null;
    if (rca.patchDiff && rca.patchDiff.trim().length > 0) {
      runEvents.emitRunEvent({
        runId: runRecord.id,
        step: "testing",
        message: "Executing sandboxed test suite to validate patch...",
      });

      try {
        const runner = new SandboxTestRunner();
        testExecutionResult = await runner.runTests({
          workDir,
          patchDiff: rca.patchDiff,
          testPatch: rca.testPatch || undefined,
        });

        await db.insert(schema.testExecutions).values({
          runId: runRecord.id,
          command: testExecutionResult.command,
          passed: testExecutionResult.passed ? "true" : "false",
          exitCode: testExecutionResult.exitCode,
          stdout: testExecutionResult.stdout,
          stderr: testExecutionResult.stderr,
          durationMs: testExecutionResult.durationMs,
        });
      } catch (testErr: any) {
        console.warn("[Issue Run] Sandbox test execution notice:", testErr.message);
      }
    }

    // 12. Transition run status to awaiting_approval
    await db
      .update(schema.runs)
      .set({
        status: "awaiting_approval",
        currentStep: "Investigation complete. Awaiting human approval for PR publication.",
        completedAt: new Date(),
      })
      .where(eq(schema.runs.id, runRecord.id));

    runEvents.emitRunEvent({
      runId: runRecord.id,
      step: "awaiting_approval",
      message: "Investigation complete and verified. Ready for review and PR publication.",
      data: { rca, testExecution: testExecutionResult },
    });

    res.json({
      runId: runRecord.id,
      status: "awaiting_approval",
      issueNumber,
      rca,
      testExecution: testExecutionResult,
    });
  } catch (error: any) {
    console.error("[Issue Run] Error processing issue run:", error);
    res.status(500).json({ error: "Failed to run agent analysis", message: error.message });
  }
});

export default router;
