import { Router, Request, Response } from "express";
import { GitHubWebhookHandler } from "@atom/github";

const router: Router = Router();

const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || "atom-webhook-secret";
const handler = new GitHubWebhookHandler(webhookSecret);

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["x-hub-signature-256"] as string;
  const event = req.headers["x-github-event"] as string;

  if (signature) {
    const rawPayload = JSON.stringify(req.body);
    const isValid = await handler.verifySignature(rawPayload, signature);
    if (!isValid) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  }

  const { eventType, issuePayload, installationPayload } = handler.parsePayload(req.body);

  if (eventType === "issues" && issuePayload) {
    console.log(`[GitHub App Webhook] Received issue event '${issuePayload.action}' for #${issuePayload.issue.number}: ${issuePayload.issue.title}`);
  } else if (eventType === "installation" && installationPayload) {
    console.log(`[GitHub App Webhook] GitHub App installation event '${installationPayload.action}' for account '${installationPayload.installation.account.login}' (Installation ID: ${installationPayload.installation.id})`);
  }

  res.json({ received: true, event: event || eventType });
});

export default router;
