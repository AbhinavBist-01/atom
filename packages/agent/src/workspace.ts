import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface WorkspaceContext {
  id: string;
  repoDir: string;
  worktreePath: string;
  branchName: string;
  isWorktree: boolean;
  createdAt: Date;
}

export interface CommandExecutionResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
}

/**
 * Variables that MUST NOT be exposed to untrusted repository test execution
 */
const SENSITIVE_ENV_KEYS = [
  "DATABASE_URL",
  "OPENAI_API_KEY",
  "GITHUB_APP_PRIVATE_KEY",
  "GITHUB_APP_ID",
  "GITHUB_WEBHOOK_SECRET",
  "GITHUB_CLIENT_ID",
  "GITHUB_CLIENT_SECRET",
  "GITHUB_TOKEN",
  "GITHUB_PAT",
  "BETTER_AUTH_SECRET",
  "COHERE_API_KEY",
  "PINECONE_API_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
];

export class WorkspaceManager {
  private baseScratchDir: string;

  constructor(customScratchDir?: string) {
    this.baseScratchDir =
      customScratchDir || path.join(process.cwd(), "scratch", "worktrees");
    if (!fs.existsSync(this.baseScratchDir)) {
      fs.mkdirSync(this.baseScratchDir, { recursive: true });
    }
  }

  /**
   * Builds a sanitized environment object stripping all server/database/LLM credentials
   */
  getSanitizedEnv(customEnv?: Record<string, string>): NodeJS.ProcessEnv {
    const safeEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || "",
      HOME: process.env.HOME || process.env.USERPROFILE || "",
      USERPROFILE: process.env.USERPROFILE || "",
      SYSTEMROOT: process.env.SYSTEMROOT || "",
      TEMP: process.env.TEMP || "",
      TMP: process.env.TMP || "",
      NODE_ENV: "test",
      CI: "true",
      GIT_TERMINAL_PROMPT: "0",
      ...(customEnv || {}),
    };

    // Explicitly delete any secret keys that might leak
    for (const key of Object.keys(process.env)) {
      if (
        SENSITIVE_ENV_KEYS.includes(key) ||
        key.includes("SECRET") ||
        key.includes("KEY") ||
        key.includes("TOKEN") ||
        key.includes("PASSWORD")
      ) {
        delete safeEnv[key];
      }
    }

    return safeEnv;
  }

  /**
   * Creates an isolated workspace using Git worktrees with fallback to isolated copy
   */
  async createWorkspace(options: {
    repoDir: string;
    taskId: string;
    issueNumber?: number;
  }): Promise<WorkspaceContext> {
    const { repoDir, taskId, issueNumber } = options;
    const cleanId = taskId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 16);
    const branchName = `atom/verify-${issueNumber ? `issue-${issueNumber}-` : ""}${cleanId}-${Date.now().toString(36)}`;
    const worktreePath = path.join(
      this.baseScratchDir,
      `atom_wt_${cleanId}_${Date.now().toString(36)}`,
    );

    let isWorktree = false;

    try {
      // 1. Try git worktree add
      await execAsync(
        `git worktree add -b "${branchName}" "${worktreePath}" HEAD`,
        {
          cwd: repoDir,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          timeout: 20000,
        },
      );
      isWorktree = true;
    } catch (wtErr: any) {
      console.warn(
        `[WorkspaceManager] git worktree creation failed (${wtErr.message}). Falling back to isolated checkout copy.`,
      );

      // Fallback: Copy repository files into isolated folder
      if (!fs.existsSync(worktreePath)) {
        fs.mkdirSync(worktreePath, { recursive: true });
      }

      try {
        await execAsync(`git clone --depth 1 "file://${repoDir.replace(/\\/g, "/")}" "${worktreePath}"`, {
          timeout: 30000,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
        });
      } catch (cloneErr) {
        // Direct file copy excluding node_modules / dist / .git
        this.copyDirRecursive(repoDir, worktreePath, new Set(["node_modules", "dist", ".next", ".git"]));
      }
    }

    return {
      id: taskId,
      repoDir,
      worktreePath,
      branchName,
      isWorktree,
      createdAt: new Date(),
    };
  }

  /**
   * Applies a patch inside the isolated workspace
   */
  async applyPatch(
    context: WorkspaceContext,
    patchDiff: string,
  ): Promise<{ success: boolean; error?: string }> {
    const tempPatch = path.join(
      context.worktreePath,
      `.atom_apply_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.patch`,
    );

    try {
      fs.writeFileSync(tempPatch, patchDiff, "utf-8");

      try {
        await execAsync(`git apply --whitespace=fix "${tempPatch}"`, {
          cwd: context.worktreePath,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          timeout: 15000,
        });
        return { success: true };
      } catch (firstErr: any) {
        // Fallback to 3-way merge
        try {
          await execAsync(`git apply --3way "${tempPatch}"`, {
            cwd: context.worktreePath,
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
            timeout: 15000,
          });
          return { success: true };
        } catch (threeWayErr: any) {
          const errMsg = threeWayErr.stderr || threeWayErr.stdout || threeWayErr.message;
          return { success: false, error: errMsg };
        }
      }
    } finally {
      if (fs.existsSync(tempPatch)) {
        try {
          fs.unlinkSync(tempPatch);
        } catch {}
      }
    }
  }

  /**
   * Executes a command inside the isolated workspace under a sanitized environment with a hard timeout
   */
  async execCommand(
    context: WorkspaceContext,
    command: string,
    options?: {
      timeoutMs?: number;
      env?: Record<string, string>;
    },
  ): Promise<CommandExecutionResult> {
    const timeoutMs = options?.timeoutMs || 60000;
    const startTime = Date.now();
    const env = this.getSanitizedEnv(options?.env);

    return new Promise((resolve) => {
      exec(
        command,
        {
          cwd: context.worktreePath,
          env,
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          const durationMs = Date.now() - startTime;
          const timedOut = !!(error && (error as any).killed && (error as any).signal === "SIGTERM");
          const exitCode = error ? (typeof error.code === "number" ? error.code : 1) : 0;

          resolve({
            command,
            exitCode,
            stdout: stdout ? stdout.trim() : "",
            stderr: timedOut
              ? `Execution timed out after ${timeoutMs}ms\n${stderr ? stderr.trim() : ""}`
              : stderr ? stderr.trim() : "",
            durationMs,
            timedOut,
          });
        },
      );
    });
  }

  /**
   * Destroys and cleans up the temporary workspace
   */
  async cleanupWorkspace(context: WorkspaceContext): Promise<void> {
    try {
      if (context.isWorktree) {
        try {
          await execAsync(`git worktree remove --force "${context.worktreePath}"`, {
            cwd: context.repoDir,
            timeout: 10000,
          });
        } catch {}

        try {
          await execAsync(`git worktree prune`, {
            cwd: context.repoDir,
            timeout: 5000,
          });
        } catch {}

        try {
          await execAsync(`git branch -D "${context.branchName}"`, {
            cwd: context.repoDir,
            timeout: 5000,
          });
        } catch {}
      }

      if (fs.existsSync(context.worktreePath)) {
        fs.rmSync(context.worktreePath, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn(`[WorkspaceManager] Cleanup error for ${context.worktreePath}:`, err);
    }
  }

  private copyDirRecursive(src: string, dest: string, ignoreSet: Set<string>) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreSet.has(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        this.copyDirRecursive(srcPath, destPath, ignoreSet);
      } else if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
}
