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
  private appAuthConfig?: GitHubAppAuthConfig;
  private token?: string;

  constructor(config?: { token?: string; appAuth?: GitHubAppAuthConfig }) {
    let initialized = false;
    this.token =
      config?.token || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;

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

        // Handle base64 encoded private key
        if (!cleanKey.includes("-----BEGIN") && cleanKey.length > 100) {
          try {
            const decoded = Buffer.from(cleanKey, "base64").toString("utf-8");
            if (decoded.includes("-----BEGIN")) {
              cleanKey = decoded;
            }
          } catch {
            // not base64, proceed
          }
        }

        // Unescape literal \n into real newlines
        cleanKey = cleanKey.replace(/\\n/g, "\n").replace(/\r/g, "");

        if (cleanKey.includes("BEGIN") && cleanKey.includes("PRIVATE KEY")) {
          this.appAuthConfig = {
            appId: config.appAuth.appId,
            privateKey: cleanKey,
            installationId: config.appAuth.installationId,
          };

          this.octokit = new Octokit({
            authStrategy: createAppAuth,
            auth: {
              appId: config.appAuth.appId,
              privateKey: cleanKey,
              ...(config.appAuth.installationId
                ? { installationId: config.appAuth.installationId }
                : {}),
            },
          });
          initialized = true;
        }
      } catch (err) {
        console.warn(
          "[AtomGitHubClient] App authentication initialization failed, falling back:",
          err,
        );
      }
    }

    if (!initialized) {
      this.octokit = new Octokit({ auth: config?.token });
    }
  }

  private getFallbackOctokit(): Octokit {
    return new Octokit({ auth: this.token });
  }

  private async getInstallationOctokit(ref: RepoRef): Promise<Octokit> {
    if (this.appAuthConfig) {
      try {
        const { data: installation } =
          await this.octokit.apps.getRepoInstallation({
            owner: ref.owner,
            repo: ref.repo,
          });

        if (installation?.id) {
          return new Octokit({
            authStrategy: createAppAuth,
            auth: {
              appId: this.appAuthConfig.appId,
              privateKey: this.appAuthConfig.privateKey,
              installationId: installation.id,
            },
          });
        }
      } catch (err: any) {
        // App is not installed on this repo or app auth failed; fallback to token / unauthenticated
      }
    }
    return this.getFallbackOctokit();
  }

  async getIssue(ref: RepoRef, issueNumber: number): Promise<IssueDetails> {
    const octokit = await this.getInstallationOctokit(ref);
    try {
      const { data } = await octokit.issues.get({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: issueNumber,
      });

      return {
        number: data.number,
        title: data.title,
        body: data.body || "",
        state: data.state,
        author: data.user?.login || "unknown",
        labels: data.labels.map((l) =>
          typeof l === "string" ? l : l.name || "",
        ),
        createdAt: data.created_at,
      };
    } catch (err: any) {
      // Direct REST fallback for public repos if octokit auth failed
      const res = await fetch(
        `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues/${issueNumber}`,
        {
          headers: {
            "User-Agent": "ATOM-Agent",
            ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
          },
        },
      );
      if (res.ok) {
        const data = await res.json();
        return {
          number: data.number,
          title: data.title,
          body: data.body || "",
          state: data.state,
          author: data.user?.login || "unknown",
          labels: (data.labels || []).map((l: any) =>
            typeof l === "string" ? l : l.name || "",
          ),
          createdAt: data.created_at,
        };
      }
      throw err;
    }
  }

  async listIssues(
    ref: RepoRef,
    state: "open" | "closed" | "all" = "open",
  ): Promise<IssueDetails[]> {
    try {
      const octokit = await this.getInstallationOctokit(ref);
      const { data } = await octokit.issues.listForRepo({
        owner: ref.owner,
        repo: ref.repo,
        state,
        per_page: 50,
        sort: "updated",
      });

      return data
        .filter((item) => !item.pull_request)
        .map((d) => ({
          number: d.number,
          title: d.title,
          body: d.body || "",
          state: d.state,
          author: d.user?.login || "unknown",
          labels: d.labels.map((l) =>
            typeof l === "string" ? l : l.name || "",
          ),
          createdAt: d.created_at,
        }));
    } catch (err) {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${ref.owner}/${ref.repo}/issues?state=${state}&per_page=50&sort=updated`,
          {
            headers: {
              "User-Agent": "ATOM-Agent",
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            return data
              .filter((item: any) => !item.pull_request)
              .map((d: any) => ({
                number: d.number,
                title: d.title,
                body: d.body || "",
                state: d.state,
                author: d.user?.login || "unknown",
                labels: (d.labels || []).map((l: any) =>
                  typeof l === "string" ? l : l.name || "",
                ),
                createdAt: d.created_at,
              }));
          }
        }
      } catch (fallbackErr) {
        // ignore
      }
      console.warn(
        `[GitHub Client] Failed to list issues for ${ref.owner}/${ref.repo}:`,
        err,
      );
      return [];
    }
  }

  async createIssueComment(
    ref: RepoRef,
    issueNumber: number,
    body: string,
  ): Promise<void> {
    const octokit = await this.getInstallationOctokit(ref);
    await octokit.issues.createComment({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: issueNumber,
      body,
    });
  }

  async createPullRequest(
    ref: RepoRef,
    title: string,
    head: string,
    base: string,
    body: string,
  ): Promise<{ number: number; url: string }> {
    const octokit = await this.getInstallationOctokit(ref);
    const { data } = await octokit.pulls.create({
      owner: ref.owner,
      repo: ref.repo,
      title,
      head,
      base,
      body,
    });

    return {
      number: data.number,
      url: data.html_url,
    };
  }

  async getDefaultBranch(ref: RepoRef): Promise<string> {
    try {
      const octokit = await this.getInstallationOctokit(ref);
      const { data } = await octokit.repos.get({
        owner: ref.owner,
        repo: ref.repo,
      });
      return data.default_branch || "main";
    } catch {
      return "main";
    }
  }

  async getRecentCommits(
    ref: RepoRef,
    limit: number = 10,
  ): Promise<CommitInfo[]> {
    const octokit = await this.getInstallationOctokit(ref);
    const { data } = await octokit.repos.listCommits({
      owner: ref.owner,
      repo: ref.repo,
      per_page: limit,
    });

    return data.map((c) => ({
      hash: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || c.author?.login || "unknown",
      date: c.commit.author?.date || "",
    }));
  }

  async getFileTree(ref: RepoRef, branch: string = "main"): Promise<string[]> {
    const octokit = await this.getInstallationOctokit(ref);
    const { data } = await octokit.git.getTree({
      owner: ref.owner,
      repo: ref.repo,
      tree_sha: branch,
      recursive: "true",
    });

    return data.tree
      .filter((item) => item.type === "blob" && item.path)
      .map((item) => item.path as string);
  }

  async resolveUserLogin(input: {
    username?: string;
    email?: string;
    image?: string;
  }): Promise<string | null> {
    const { username, email, image } = input;

    // 1. Try extracting numeric user ID from avatar URL (e.g. https://avatars.githubusercontent.com/u/178583190?v=4)
    if (image) {
      const match = image.match(/\/u\/(\d+)/);
      if (match && match[1]) {
        try {
          const res = await fetch(`https://api.github.com/user/${match[1]}`, {
            headers: { "User-Agent": "ATOM-Agent" },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.login) return data.login;
          }
        } catch (e) {
          // ignore
        }
      }
    }

    // 2. If username is given directly, check if https://api.github.com/users/${username} exists
    if (username) {
      const clean = username.trim().replace(/\s+/g, "");
      try {
        const res = await fetch(
          `https://api.github.com/users/${encodeURIComponent(clean)}`,
          {
            headers: { "User-Agent": "ATOM-Agent" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.login) return data.login;
        }
      } catch (e) {
        // ignore
      }

      // 3. Search users by query
      try {
        const res = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(username)}`,
          {
            headers: { "User-Agent": "ATOM-Agent" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0 && data.items[0].login) {
            return data.items[0].login;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Try email prefix search
    if (email) {
      const prefix = email.split("@")[0];
      try {
        const res = await fetch(
          `https://api.github.com/search/users?q=${encodeURIComponent(prefix)}`,
          {
            headers: { "User-Agent": "ATOM-Agent" },
          },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.items && data.items.length > 0 && data.items[0].login) {
            return data.items[0].login;
          }
        }
      } catch (e) {
        // ignore
      }
    }

    return null;
  }

  async listUserRepos(
    username: string,
  ): Promise<
    Array<{
      id: number;
      name: string;
      fullName: string;
      owner: string;
      private: boolean;
      description?: string | null;
      language?: string | null;
    }>
  > {
    const cleanUsername = username.trim().replace(/\s+/g, "");
    if (!cleanUsername) return [];

    try {
      const octokit = this.getFallbackOctokit();
      const { data } = await octokit.repos.listForUser({
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
      try {
        const res = await fetch(
          `https://api.github.com/users/${encodeURIComponent(cleanUsername)}/repos?per_page=100&sort=updated`,
          {
            headers: {
              "User-Agent": "ATOM-Agent",
              ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
          },
        );
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
        console.warn(
          `[GitHub Client] Raw fetch failed for ${cleanUsername}:`,
          fetchErr,
        );
      }
      return [];
    }
  }

  async listAllAppRepos(): Promise<
    Array<{
      id: number;
      name: string;
      fullName: string;
      owner: string;
      private: boolean;
      description?: string | null;
      language?: string | null;
    }>
  > {
    try {
      const { data: installations } =
        await this.octokit.apps.listInstallations();
      const allRepos: Array<{
        id: number;
        name: string;
        fullName: string;
        owner: string;
        private: boolean;
        description?: string | null;
        language?: string | null;
      }> = [];

      for (const inst of installations) {
        const repos = await this.listInstallationRepos(inst.id);
        allRepos.push(...repos);
      }
      return allRepos;
    } catch (err) {
      console.warn(
        "[GitHub Client] Failed to list app installation repos:",
        err,
      );
      return [];
    }
  }

  async listInstallationRepos(
    installationId: number,
  ): Promise<
    Array<{
      id: number;
      name: string;
      fullName: string;
      owner: string;
      private: boolean;
      description?: string | null;
      language?: string | null;
    }>
  > {
    try {
      let instOctokit = this.octokit;
      if (this.appAuthConfig) {
        instOctokit = new Octokit({
          authStrategy: createAppAuth,
          auth: {
            appId: this.appAuthConfig.appId,
            privateKey: this.appAuthConfig.privateKey,
            installationId,
          },
        });
      }

      const { data } = await instOctokit.apps.listReposAccessibleToInstallation(
        {
          installation_id: installationId,
          per_page: 100,
        },
      );

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
      console.warn(
        `[GitHub Client] Failed to fetch repos for installation ${installationId}:`,
        err,
      );
      return [];
    }
  }
}
