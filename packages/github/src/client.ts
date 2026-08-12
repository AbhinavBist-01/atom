import { Octokit } from "@octokit/rest";

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

export class AtomGitHubClient {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token });
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
