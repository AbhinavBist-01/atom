import simpleGit, { SimpleGit } from "simple-git";
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
}
