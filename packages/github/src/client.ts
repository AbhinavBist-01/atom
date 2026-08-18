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
  private octokit!: Octokit;

  constructor(config?: { token?: string; appAuth?: GitHubAppAuthConfig }) {
    let initialized = false;

    if (config?.appAuth && config.appAuth.appId && config.appAuth.privateKey) {
      try {
        let cleanKey = config.appAuth.privateKey.trim();
        // Remove enclosing quotes if any
        if (
          (cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
          (cleanKey.startsWith("'") && cleanKey.endsWith("'"))
        ) {
          cleanKey = cleanKey.slice(1, -1);
        }
        // Unescape literal \n into real newlines
        cleanKey = cleanKey.replace(/\\n/g, "\n");

        if (cleanKey.includes("BEGIN") && cleanKey.includes("PRIVATE KEY")) {
          this.octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
              appId: config.appAuth.appId,
              privateKey: cleanKey,
              installationId: config.appAuth.installationId,
            },
          });
          initialized = true;
        }
      } catch (err) {
        console.warn("[AtomGitHubClient] App authentication initialization failed, falling back:", err);
      }
    }

    if (!initialized) {
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

  async listUserRepos(username: string): Promise<Array<{ id: number; name: string; fullName: string; owner: string; private: boolean; description?: string | null; language?: string | null }>> {
    const cleanUsername = username.trim().replace(/\s+/g, "");
    if (!cleanUsername) return [];

    try {
      const { data } = await this.octokit.repos.listForUser({
        username: cleanUsername,
        sort: "updated",
        per_page: 100,
      });

      return data.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        private: r.private,
        description: r.description,
        language: r.language,
      }));
    } catch (err) {
      console.warn(`[GitHub Client] listForUser failed for ${cleanUsername}, attempting raw fetch:`, err);
      try {
        const res = await fetch(`https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?per_page=100&sort=updated`, {
          headers: { "User-Agent": "ATOM-Agent" }
        });
        if (res.ok) {
          const raw = await res.json();
          if (Array.isArray(raw)) {
            return raw.map((r: any) => ({
              id: r.id,
              name: r.name,
              fullName: r.full_name,
              owner: r.owner?.login || cleanUsername,
              private: !!r.private,
              description: r.description,
              language: r.language,
            }));
          }
        }
      } catch (fetchErr) {
        console.warn(`[GitHub Client] Raw fetch failed for ${cleanUsername}:`, fetchErr);
      }
      return [];
    }
  }

  async listAllAppRepos(): Promise<Array<{ id: number; name: string; fullName: string; owner: string; private: boolean; description?: string | null; language?: string | null }>> {
    try {
      const { data: installations } = await this.octokit.apps.listInstallations();
      const allRepos: Array<{ id: number; name: string; fullName: string; owner: string; private: boolean; description?: string | null; language?: string | null }> = [];

      for (const inst of installations) {
        const repos = await this.listInstallationRepos(inst.id);
        allRepos.push(...repos);
      }
      return allRepos;
    } catch (err) {
      console.warn("[GitHub Client] Failed to list app installation repos:", err);
      return [];
    }
  }

  async listInstallationRepos(installationId: number): Promise<Array<{ id: number; name: string; fullName: string; owner: string; private: boolean; description?: string | null; language?: string | null }>> {
    try {
      const { data } = await this.octokit.apps.listReposAccessibleToInstallation({
        installation_id: installationId,
        per_page: 100,
      });

      return data.repositories.map((r) => ({
        id: r.id,
        name: r.name,
        fullName: r.full_name,
        owner: r.owner.login,
        private: r.private,
        description: r.description,
        language: r.language,
      }));
    } catch (err) {
      console.warn(`[GitHub Client] Failed to fetch repos for installation ${installationId}:`, err);
      return [];
    }
  }
}
