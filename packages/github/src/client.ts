import { Octokit } from "@octokit/rest";
import { createAppAuth } from "@octokit/auth-app";

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface IssueDetails {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  labels: string[];
  createdAt: string;
}

export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

export interface GitHubAppAuthConfig {
  appId: string;
  privateKey: string;
  installationId?: string;
}

export class AtomGitHubClient {
  private octokit: Octokit;

  constructor(config?: { token?: string; appAuth?: GitHubAppAuthConfig }) {
    if (config?.appAuth && config.appAuth.appId && config.appAuth.privateKey) {
      this.octokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
          appId: config.appAuth.appId,
          privateKey: config.appAuth.privateKey,
          installationId: config.appAuth.installationId
        }
      });
    } else {
      this.octokit = new Octokit({ auth: config?.token });
    }
  }

  async getIssue(ref: RepoRef, issueNumber: number): Promise<IssueDetails> {
    const { data } = await this.octokit.issues.get({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: issueNumber
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body || "",
      state: data.state,
      author: data.user?.login || "unknown",
      labels: data.labels.map((l) => (typeof l === "string" ? l : l.name || "")),
      createdAt: data.created_at
    };
  }

  async createIssueComment(ref: RepoRef, issueNumber: number, body: string): Promise<void> {
    await this.octokit.issues.createComment({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: issueNumber,
      body
    });
  }

  async createPullRequest(ref: RepoRef, title: string, head: string, base: string, body: string): Promise<{ number: number; url: string }> {
    const { data } = await this.octokit.pulls.create({
      owner: ref.owner,
      repo: ref.repo,
      title,
      head,
      base,
      body
    });

    return {
      number: data.number,
      url: data.html_url
    };
  }

  async getRecentCommits(ref: RepoRef, limit: number = 10): Promise<CommitInfo[]> {
    const { data } = await this.octokit.repos.listCommits({
      owner: ref.owner,
      repo: ref.repo,
      per_page: limit
    });

    return data.map((c) => ({
      hash: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || "unknown",
      date: c.commit.author?.date || ""
    }));
  }

  async getFileTree(ref: RepoRef, branch: string = "main"): Promise<string[]> {
    const { data } = await this.octokit.git.getTree({
      owner: ref.owner,
      repo: ref.repo,
      tree_sha: branch,
      recursive: "true"
    });

    return data.tree
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string);
  }
}
