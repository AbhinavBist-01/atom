import { Webhooks } from "@octokit/webhooks";

export interface GitHubIssueEventPayload {
  action: string;
  issue: {
    number: number;
    title: string;
    body: string | null;
    state: string;
    html_url: string;
  };
  repository: {
    owner: {
      login: string;
    };
    name: string;
    full_name: string;
  };
}

export class GitHubWebhookHandler {
  private webhooks: Webhooks;

  constructor(secret: string) {
    this.webhooks = new Webhooks({ secret });
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    return this.webhooks.verify(payload, signature);
  }

  parsePayload(payload: any): { eventType: string; issuePayload?: GitHubIssueEventPayload } {
    return {
      eventType: payload.issue ? "issues" : payload.pull_request ? "pull_request" : "unknown",
      issuePayload: payload.issue ? (payload as GitHubIssueEventPayload) : undefined
    };
  }
}
