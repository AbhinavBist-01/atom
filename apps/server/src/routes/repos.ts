import { Router, Request, Response } from "express";
import { db, schema } from "../db/index.js";
import { eq } from "drizzle-orm";
import { indexRepoTask } from "../jobs/indexRepo.js";

import { AtomGitHubClient } from "@atom/github";

const router: Router = Router();

// GET /api/repos/github-repos - Fetch user's GitHub repositories for the dropdown menu
router.get("/github-repos", async (req: Request, res: Response): Promise<void> => {
  const username = typeof req.query.username === "string" ? req.query.username.trim() : "";

  try {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;

    let githubClient: AtomGitHubClient;
    if (appId && privateKey) {
      githubClient = new AtomGitHubClient({
        appAuth: {
          appId,
          privateKey,
        },
      });
    } else {
      githubClient = new AtomGitHubClient();
    }

    const reposMap = new Map<string, {
      id: number;
      name: string;
      fullName: string;
      owner: string;
      private: boolean;
      description?: string | null;
      language?: string | null;
    }>();

    // 1. If GitHub App is configured, fetch all repos where the GitHub App is installed
    if (appId && privateKey) {
      try {
        const appRepos = await githubClient.listAllAppRepos();
        for (const r of appRepos) {
          reposMap.set(r.fullName.toLowerCase(), r);
        }
      } catch (err) {
        console.warn("[Repos Router] App repos fetch warning:", err);
      }
    }

    // 2. If username/handle provided, also fetch public repositories for that user/org
    if (username) {
      try {
        const userRepos = await githubClient.listUserRepos(username);
        for (const r of userRepos) {
          if (!reposMap.has(r.fullName.toLowerCase())) {
            reposMap.set(r.fullName.toLowerCase(), r);
          }
        }
      } catch (err) {
        console.warn(`[Repos Router] User repos fetch warning for ${username}:`, err);
      }
    }

    const reposList = Array.from(reposMap.values());
    res.json({ githubRepos: reposList });
  } catch (error: any) {
    console.error("[Repos Router] Failed to fetch GitHub repos:", error);
    res.status(500).json({ error: "Failed to fetch GitHub repositories", message: error.message });
  }
});

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
