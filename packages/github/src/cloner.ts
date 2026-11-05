import { simpleGit, SimpleGit } from "simple-git";
import path from "path";
import fs from "fs";

export interface CloneOptions {
  repoUrl: string;
  targetDir: string;
  depth?: number;
}

export class GitCloner {
  async cloneOrPull(options: CloneOptions): Promise<string> {
    const { repoUrl, targetDir, depth = 1 } = options;

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const git: SimpleGit = simpleGit(targetDir);
    const isRepo = await git.checkIsRepo();

    if (isRepo) {
      await git.pull();
    } else {
      await simpleGit().clone(repoUrl, targetDir, ["--depth", depth.toString()]);
    }

    return targetDir;
  }

  async getBlameCommit(repoDir: string, filePath: string, line: number): Promise<string | null> {
    try {
      const git: SimpleGit = simpleGit(repoDir);
      const result = await git.raw(["blame", "-L", `${line},${line}`, "-p", "--", filePath]);
      const match = result.match(/^([0-9a-f]{40})/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async publishPatchBranch(options: {
    workDir: string;
    branchName: string;
    patchDiff: string;
    testPatch?: string;
    commitMessage: string;
    remoteUrlWithAuth?: string;
  }): Promise<void> {
    const { workDir, branchName, patchDiff, testPatch, commitMessage, remoteUrlWithAuth } = options;
    const git: SimpleGit = simpleGit(workDir);

    // Configure user info locally
    try {
      await git.addConfig("user.name", "ATOM Agent", false, "local");
      await git.addConfig("user.email", "atom-agent@users.noreply.github.com", false, "local");
    } catch {}

    // Checkout new branch
    try {
      await git.checkoutLocalBranch(branchName);
    } catch {
      await git.checkout(branchName);
    }

    // Apply patch
    const patchFilePath = path.join(workDir, ".atom_pr_temp.patch");
    try {
      fs.writeFileSync(patchFilePath, patchDiff, "utf-8");
      try {
        await git.raw(["apply", "--whitespace=fix", patchFilePath]);
      } catch (applyErr: any) {
        try {
          await git.raw(["apply", "--3way", patchFilePath]);
        } catch {
          console.warn("[GitCloner] git apply failed:", applyErr.message);
        }
      }
    } finally {
      if (fs.existsSync(patchFilePath)) {
        try {
          fs.unlinkSync(patchFilePath);
        } catch {}
      }
    }

    // Write test patch file if provided and not raw diff
    if (testPatch && testPatch.trim().length > 0) {
      if (!testPatch.startsWith("---") && !testPatch.startsWith("diff --git")) {
        const testFile = path.join(workDir, "atom_regression.test.ts");
        fs.writeFileSync(testFile, testPatch, "utf-8");
      }
    }

    // Stage and commit
    await git.add("-A");
    try {
      await git.commit(commitMessage);
    } catch (commitErr: any) {
      console.warn("[GitCloner] git commit note:", commitErr.message);
    }

    // Push to remote
    if (remoteUrlWithAuth) {
      await git.push(remoteUrlWithAuth, branchName, ["--force", "--set-upstream"]);
    } else {
      await git.push("origin", branchName, ["--force", "--set-upstream"]);
    }
  }
}
