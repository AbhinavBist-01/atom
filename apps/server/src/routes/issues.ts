import { Router, Request, Response } from "express";
import { AtomGitHubClient } from "@atom/github";
import { analyzeIssue } from "@atom/agent";

const router: Router = Router();

router.get("/:owner/:repo/:number", async (req: Request, res: Response): Promise<void> => {
  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const number = req.params.number as string;
  const issueNumber = parseInt(number, 10);

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

router.post("/:owner/:repo/:number/run", async (req: Request, res: Response): Promise<void> => {
  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const number = req.params.number as string;
  const issueNumber = parseInt(number, 10);

  const client = new AtomGitHubClient();
  try {
    const issue = await client.getIssue({ owner, repo }, issueNumber);
    const rca = analyzeIssue(issue.body);

    res.json({
      runId: `run_${Date.now()}`,
      status: "completed",
      issueNumber,
      rca
    });
  } catch (error: any) {
    res.status(500).json({ error: "Failed to run agent analysis", message: error.message });
  }
});

export default router;
