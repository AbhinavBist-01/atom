import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface PatchValidationResult {
  valid: boolean;
  isClean: boolean;
  filesModified: string[];
  additions: number;
  deletions: number;
  safetyPassed: boolean;
  violations: string[];
  diffSummary: string;
}

// Sensitive file patterns that patches must NEVER modify autonomously
const SENSITIVE_FILE_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/i,
  /\.env$/i,
  /id_rsa/i,
  /id_ed25519/i,
  /\.pem$/i,
  /\.key$/i,
  /\.pfx$/i,
  /\.p12$/i,
  /^\.git\//i,
  /^\.gitmodules$/i,
  /^\.github\/workflows\//i,
  /credentials\.json$/i,
  /service-account.*\.json$/i,
  /\.npmrc$/i,
  /\.pypirc$/i,
];

// Suspicious command or payload patterns inside added patch lines
const SUSPICIOUS_ADDITIONS: { pattern: RegExp; description: string }[] = [
  {
    pattern: /curl\s+[^|\n]+\|\s*(ba)?sh/i,
    description: "Piped remote script execution via curl | sh",
  },
  {
    pattern: /wget\s+[^|\n]+\|\s*(ba)?sh/i,
    description: "Piped remote script execution via wget | sh",
  },
  {
    pattern: /powershell(\.exe)?\s+(-(enc|encodedcommand)\s+[A-Za-z0-9+/=]+)/i,
    description: "Encoded PowerShell command execution",
  },
  {
    pattern: /eval\s*\(\s*(Buffer\.from|atob|base64_decode)/i,
    description: "Obfuscated payload decoding via eval",
  },
  {
    pattern: /rm\s+-rf\s+[\/~]/i,
    description: "Dangerous recursive root deletion (rm -rf /)",
  },
  {
    pattern: /(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})/,
    description: "Hardcoded GitHub personal access token",
  },
  {
    pattern: /AKIA[0-9A-Z]{16}/,
    description: "Hardcoded AWS Access Key ID",
  },
  {
    pattern: /sk-[A-Za-z0-9_-]{32,}/,
    description: "Hardcoded OpenAI / API Secret Key",
  },
  {
    pattern: /-----BEGIN\s+(RSA|EC|DSA|OPENSSH)?\s*PRIVATE\s+KEY-----/,
    description: "Hardcoded private key certificate",
  },
];

export class PatchValidator {
  /**
   * Statically inspects a unified diff string:
   * 1. Validates diff format (headers, hunks)
   * 2. Extracts affected files, lines added, lines deleted
   * 3. Enforces safety rules on target filenames and added code lines
   */
  validatePatchContent(patchDiff: string): PatchValidationResult {
    const violations: string[] = [];
    const filesModified: string[] = [];
    let additions = 0;
    let deletions = 0;

    if (!patchDiff || patchDiff.trim().length === 0) {
      return {
        valid: false,
        isClean: false,
        filesModified: [],
        additions: 0,
        deletions: 0,
        safetyPassed: false,
        violations: ["Patch is completely empty."],
        diffSummary: "Empty patch",
      };
    }

    const lines = patchDiff.split(/\r?\n/);
    let hasDiffHeader = false;
    let hasHunkHeader = false;
    let currentFile = "";
    const addedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // File header: --- a/path or +++ b/path or diff --git a/path b/path
      if (line.startsWith("diff --git ")) {
        hasDiffHeader = true;
        const match = line.match(/^diff --git a\/(.+?) b\/(.+?)$/);
        if (match && match[1]) {
          currentFile = match[1];
          if (!filesModified.includes(currentFile)) {
            filesModified.push(currentFile);
          }
        }
      } else if (line.startsWith("+++ b/")) {
        hasDiffHeader = true;
        const filePath = line.replace(/^\+\+\+ b\//, "").trim();
        if (filePath && filePath !== "/dev/null" && !filesModified.includes(filePath)) {
          filesModified.push(filePath);
          currentFile = filePath;
        }
      } else if (line.startsWith("--- a/") && !currentFile) {
        hasDiffHeader = true;
        const filePath = line.replace(/^--- a\//, "").trim();
        if (filePath && filePath !== "/dev/null" && !filesModified.includes(filePath)) {
          filesModified.push(filePath);
          currentFile = filePath;
        }
      } else if (line.startsWith("@@ ")) {
        hasHunkHeader = true;
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        additions++;
        addedLines.push(line.slice(1));
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        deletions++;
      }
    }

    // Format validation
    if (!hasDiffHeader && !hasHunkHeader) {
      violations.push("Patch diff format invalid: missing standard unified diff headers ('---', '+++', '@@').");
    }

    if (filesModified.length === 0) {
      violations.push("No target files identified in patch.");
    }

    // Security check 1: Sensitive file paths
    for (const file of filesModified) {
      const normalized = file.replace(/\\/g, "/");
      for (const pattern of SENSITIVE_FILE_PATTERNS) {
        if (pattern.test(normalized) || pattern.test(path.basename(normalized))) {
          violations.push(`Modification of sensitive or protected file blocked: '${file}'`);
          break;
        }
      }
    }

    // Security check 2: Suspicious additions (secrets, malicious commands)
    const combinedAddedCode = addedLines.join("\n");
    for (const check of SUSPICIOUS_ADDITIONS) {
      if (check.pattern.test(combinedAddedCode)) {
        violations.push(`Security check violation: ${check.description}`);
      }
    }

    const valid = violations.length === 0;
    const summary = `${filesModified.length} file(s) changed, +${additions} insertion(s), -${deletions} deletion(s)`;

    return {
      valid,
      isClean: valid,
      filesModified,
      additions,
      deletions,
      safetyPassed: violations.length === 0,
      violations,
      diffSummary: summary,
    };
  }

  /**
   * Tests whether a patch applies cleanly against a target git repository using `git apply --check`
   */
  async checkPatchApplication(
    workDir: string,
    patchDiff: string,
  ): Promise<{ appliesCleanly: boolean; error?: string }> {
    const tempPatchFile = path.join(
      workDir,
      `.atom_verify_precheck_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.patch`,
    );

    try {
      fs.writeFileSync(tempPatchFile, patchDiff, "utf-8");

      try {
        await execAsync(`git apply --check --whitespace=fix "${tempPatchFile}"`, {
          cwd: workDir,
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          timeout: 10000,
        });
        return { appliesCleanly: true };
      } catch (err: any) {
        // Try with 3-way check or forward error
        try {
          await execAsync(`git apply --check --3way "${tempPatchFile}"`, {
            cwd: workDir,
            env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
            timeout: 10000,
          });
          return { appliesCleanly: true };
        } catch (threeWayErr: any) {
          const errMsg = threeWayErr.stderr || threeWayErr.stdout || threeWayErr.message || "git apply --check failed";
          return {
            appliesCleanly: false,
            error: errMsg.trim(),
          };
        }
      }
    } finally {
      if (fs.existsSync(tempPatchFile)) {
        try {
          fs.unlinkSync(tempPatchFile);
        } catch {}
      }
    }
  }
}
