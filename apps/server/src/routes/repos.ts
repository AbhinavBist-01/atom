import { Router, Request, Response } from "express";
import { AtomGitHubClient } from "@atom/github";

const router: Router = Router();

// Store connected repositories (mock/in-memory fallback until DB connection)
const mockRepos: Array<{ id: string; owner: string; repo: string; status: string; indexedAt: string | null }> = [];

router.get("/", (_req: Request, res: Response) => {
  res.json({ repos: mockRepos });
});

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { owner, repo } = req.body;
  if (!owner || !repo) {
    res.status(400).json({ error: "Owner and repo are required fields" });
    return;
  }

  const client = new AtomGitHubClient();
  try {
    const commits = await client.getRecentCommits({ owner: String(owner), repo: String(repo) }, 5);
    const newRepo = {
      id: `${owner}/${repo}`,
      owner: String(owner),
      repo: String(repo),
      status: "ready",
      indexedAt: new Date().toISOString(),
      recentCommitsCount: commits.length
    };

    mockRepos.push(newRepo);
    res.status(201).json({ repo: newRepo });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to connect GitHub repository", message: error.message });
  }
});

export default router;
