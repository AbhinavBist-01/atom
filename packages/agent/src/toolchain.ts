import fs from "fs";
import path from "path";
import { RepoToolchain } from "@atom/core";

export class ToolchainDetector {
  /**
   * Analyzes an isolated repository directory to discover language, package manager,
   * build commands, test commands, lint commands, and typecheck commands.
   */
  detectToolchain(worktreeDir: string): RepoToolchain {
    const detectedFiles: string[] = [];

    // Helper to check file existence
    const hasFile = (relPath: string): boolean => {
      const fullPath = path.join(worktreeDir, relPath);
      if (fs.existsSync(fullPath)) {
        detectedFiles.push(relPath);
        return true;
      }
      return false;
    };

    // Helper to inspect CI workflows for actual executed test commands
    const ciWorkflowCommands = this.inspectCiWorkflows(worktreeDir);

    // 1. Node.js / TypeScript / JavaScript Detection
    if (hasFile("package.json")) {
      let pkg: any = {};
      try {
        const raw = fs.readFileSync(path.join(worktreeDir, "package.json"), "utf-8");
        pkg = JSON.parse(raw);
      } catch {}

      const scripts = pkg.scripts || {};
      const isTs = hasFile("tsconfig.json") || pkg.devDependencies?.typescript || pkg.dependencies?.typescript;

      // Determine package manager
      let pm: "pnpm" | "yarn" | "npm" = "npm";
      if (hasFile("pnpm-lock.yaml")) pm = "pnpm";
      else if (hasFile("yarn.lock")) pm = "yarn";
      else if (hasFile("package-lock.json")) pm = "npm";

      // Detect commands from scripts
      const buildCommand = scripts.build ? `${pm} run build` : undefined;

      let testCommand = ciWorkflowCommands.testCommand;
      if (!testCommand) {
        if (scripts.test && !scripts.test.includes("no test specified")) {
          testCommand = `${pm} test`;
        } else if (scripts["test:unit"]) {
          testCommand = `${pm} run test:unit`;
        }
      }

      const lintCommand = scripts.lint ? `${pm} run lint` : undefined;
      let typecheckCommand: string | undefined = undefined;
      if (scripts.typecheck) typecheckCommand = `${pm} run typecheck`;
      else if (scripts["type-check"]) typecheckCommand = `${pm} run type-check`;
      else if (isTs) typecheckCommand = "npx tsc --noEmit";

      return {
        language: isTs ? "typescript" : "javascript",
        packageManager: pm,
        buildCommand,
        testCommand,
        lintCommand,
        typecheckCommand,
        detectedFiles,
      };
    }

    // 2. Python Detection
    const hasPyProject = hasFile("pyproject.toml");
    const hasRequirements = hasFile("requirements.txt");
    const hasPytestIni = hasFile("pytest.ini") || hasFile("setup.cfg");
    const hasSetupPy = hasFile("setup.py");
    const hasPipfile = hasFile("Pipfile");

    if (hasPyProject || hasRequirements || hasPytestIni || hasSetupPy || hasPipfile) {
      let pm: "poetry" | "pip" = hasFile("poetry.lock") ? "poetry" : "pip";
      let testCommand = ciWorkflowCommands.testCommand;
      if (!testCommand) {
        if (pm === "poetry") testCommand = "poetry run pytest";
        else testCommand = "pytest";
      }

      let typecheckCommand = undefined;
      if (hasFile("mypy.ini") || hasPyProject) {
        typecheckCommand = pm === "poetry" ? "poetry run mypy ." : "mypy .";
      }

      let lintCommand = undefined;
      if (hasFile(".flake8") || hasFile("ruff.toml")) {
        lintCommand = pm === "poetry" ? "poetry run ruff check ." : "ruff check .";
      }

      return {
        language: "python",
        packageManager: pm,
        buildCommand: undefined,
        testCommand,
        lintCommand,
        typecheckCommand,
        detectedFiles,
      };
    }

    // 3. Java Detection
    if (hasFile("pom.xml")) {
      return {
        language: "java",
        packageManager: "maven",
        buildCommand: "mvn compile -DskipTests",
        testCommand: ciWorkflowCommands.testCommand || "mvn test",
        lintCommand: undefined,
        typecheckCommand: undefined,
        detectedFiles,
      };
    }

    if (hasFile("build.gradle") || hasFile("build.gradle.kts")) {
      const isGradlew = hasFile("gradlew");
      const cmd = isGradlew ? (process.platform === "win32" ? "gradlew.bat" : "./gradlew") : "gradle";
      return {
        language: "java",
        packageManager: "gradle",
        buildCommand: `${cmd} assemble -x test`,
        testCommand: ciWorkflowCommands.testCommand || `${cmd} test`,
        lintCommand: undefined,
        typecheckCommand: undefined,
        detectedFiles,
      };
    }

    // 4. C++ Detection
    if (hasFile("CMakeLists.txt")) {
      return {
        language: "cpp",
        packageManager: "cmake",
        buildCommand: "cmake -B build && cmake --build build",
        testCommand: ciWorkflowCommands.testCommand || "ctest --test-dir build --output-on-failure",
        lintCommand: undefined,
        typecheckCommand: undefined,
        detectedFiles,
      };
    }

    if (hasFile("Makefile")) {
      return {
        language: "cpp",
        packageManager: "make",
        buildCommand: "make",
        testCommand: ciWorkflowCommands.testCommand || "make test",
        lintCommand: undefined,
        typecheckCommand: undefined,
        detectedFiles,
      };
    }

    // Fallback: Unknown
    return {
      language: "unknown",
      packageManager: "none",
      buildCommand: undefined,
      testCommand: ciWorkflowCommands.testCommand,
      lintCommand: undefined,
      typecheckCommand: undefined,
      detectedFiles,
    };
  }

  /**
   * Scans .github/workflows/*.yml for test commands executed in CI
   */
  private inspectCiWorkflows(worktreeDir: string): {
    testCommand?: string;
  } {
    const workflowsDir = path.join(worktreeDir, ".github", "workflows");
    if (!fs.existsSync(workflowsDir)) return {};

    try {
      const files = fs.readdirSync(workflowsDir);
      for (const file of files) {
        if (!file.endsWith(".yml") && !file.endsWith(".yaml")) continue;
        const content = fs.readFileSync(path.join(workflowsDir, file), "utf-8");

        // Simple regex scan for common test command step patterns
        const match = content.match(/run:\s*(pnpm\s+test|npm\s+test|yarn\s+test|pytest|mvn\s+test|\.\/gradlew\s+test)/i);
        if (match && match[1]) {
          return { testCommand: match[1].trim() };
        }
      }
    } catch {}

    return {};
  }
}
