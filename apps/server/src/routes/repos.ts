import { Router, Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { indexRepoTask } from "../jobs/indexRepo.js";

const router: Router = Router();

// GET /api/repos - List connected repositories
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    const repos = await db.select().from(schema.repositories);
    res.json({ repos });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to fetch repositories", message: error.message });
  }
});

// POST /api/repos - Connect a repository & trigger indexing
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { owner, repo } = req.body;
  if (!owner || !repo) {
    res.status(400).json({ error: "Owner and repo are required fields" });
    return;
  }

  try {
    // Check if repo already registered
    const existing = await db
      .select()
      .from(schema.repositories)
      .where(eq(schema.repositories.owner, String(owner)))
      .then((rows) => rows.find((r) => r.repo === String(repo)));

    let repoRecord = existing;

    if (!repoRecord) {
      const [inserted] = await db
        .insert(schema.repositories)
        .values({
          owner: String(owner),
          repo: String(repo),
          status: "pending",
        })
        .returning();
      repoRecord = inserted;
    }

    // Trigger indexer task asynchronously
    indexRepoTask({
      repoId: repoRecord.id,
      owner: repoRecord.owner,
      repo: repoRecord.repo,
    }).catch((err) => {
      console.error(`[Repos Router] Indexing background task error:`, err);
    });

    res.status(201).json({
      message: "Repository connected and indexing started",
      repo: repoRecord,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ error: "Failed to connect repository", message: error.message });
  }
});

// POST /api/repos/:id/index - Manually trigger re-index
router.post(
  "/:id/index",
  async (req: Request, res: Response): Promise<void> => {
    const repoId = String(req.params.id);
    try {
      const [repoRecord] = await db
        .select()
        .from(schema.repositories)
        .where(eq(schema.repositories.id, repoId));

      if (!repoRecord) {
        res.status(404).json({ error: "Repository not found" });
        return;
      }

      indexRepoTask({
        repoId: repoRecord.id,
        owner: repoRecord.owner,
        repo: repoRecord.repo,
      }).catch((err) => {
        console.error(`[Repos Router] Re-indexing background task error:`, err);
      });

      res.json({ message: "Re-indexing triggered", repoId: repoId });
    } catch (error: any) {
      res
        .status(500)
        .json({
          error: "Failed to trigger re-indexing",
          message: error.message,
        });
    }
  },
);

export default router;
