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
  installation?: {
    id: number;
  };
}

export interface GitHubInstallationEventPayload {
  action: string;
  installation: {
    id: number;
    account: {
      login: string;
    };
  };
  repositories?: Array<{
    name: string;
    full_name: string;
  }>;
}

export class GitHubWebhookHandler {
  private webhooks: Webhooks;

  constructor(secret: string) {
    this.webhooks = new Webhooks({ secret });
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    return this.webhooks.verify(payload, signature);
  }

  parsePayload(payload: any): {
    eventType: string;
    issuePayload?: GitHubIssueEventPayload;
    installationPayload?: GitHubInstallationEventPayload;
  } {
    if (payload.issue) {
      return { eventType: "issues", issuePayload: payload as GitHubIssueEventPayload };
    }
    if (payload.installation && (payload.action === "created" || payload.action === "deleted")) {
      return { eventType: "installation", installationPayload: payload as GitHubInstallationEventPayload };
    }
    return {
      eventType: payload.pull_request ? "pull_request" : payload.commits ? "push" : "unknown"
    };
  }
}
