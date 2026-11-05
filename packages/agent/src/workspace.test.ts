import { describe, it, expect } from "vitest";
import { WorkspaceManager } from "./workspace.js";
import path from "path";
import fs from "fs";

describe("WorkspaceManager", () => {
  const manager = new WorkspaceManager();

  it("sanitizes environment variables preventing credential leakage", () => {
    process.env.DATABASE_URL = "postgres://admin:secret@host/db";
    process.env.OPENAI_API_KEY = "sk-test-secret-key-123456789";

    const sanitized = manager.getSanitizedEnv();
    expect(sanitized.DATABASE_URL).toBeUndefined();
    expect(sanitized.OPENAI_API_KEY).toBeUndefined();
    expect(sanitized.NODE_ENV).toBe("test");
    expect(sanitized.CI).toBe("true");
    expect(sanitized.GIT_TERMINAL_PROMPT).toBe("0");
  });

  it("creates and cleans up an isolated temporary workspace directory", async () => {
    const fakeRepoDir = path.join(process.cwd(), "scratch", "test_fake_repo");
    if (!fs.existsSync(fakeRepoDir)) {
      fs.mkdirSync(fakeRepoDir, { recursive: true });
    }
    fs.writeFileSync(path.join(fakeRepoDir, "sample.txt"), "hello world", "utf-8");

    const context = await manager.createWorkspace({
      repoDir: fakeRepoDir,
      taskId: "test-task-1",
      issueNumber: 42,
    });

    expect(context.worktreePath).toBeDefined();
    expect(fs.existsSync(context.worktreePath)).toBe(true);

    // Execute safe command inside workspace
    const cmdRes = await manager.execCommand(context, "node -e \"console.log('workspace-ok')\"", { timeoutMs: 10000 });
    expect(cmdRes.stdout).toContain("workspace-ok");
    expect(cmdRes.exitCode).toBe(0);

    // Cleanup
    await manager.cleanupWorkspace(context);
    expect(fs.existsSync(context.worktreePath)).toBe(false);

    // Clean fake repo
    fs.rmSync(fakeRepoDir, { recursive: true, force: true });
  });
});
