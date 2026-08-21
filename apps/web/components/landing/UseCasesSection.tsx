"use client";

import React, { useState } from "react";
import {
  GitPullRequest,
  Laptop,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  Terminal,
  Layers,
  Sparkles,
  GitCommit,
  Bot,
} from "lucide-react";

interface WorkflowStep {
  step: string;
  name: string;
  detail: string;
  output: string;
}

interface UseCaseData {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  steps: WorkflowStep[];
}

const USE_CASE_DATA: Record<string, UseCaseData> = {
  webhook: {
    id: "webhook",
    title: "Autonomous Webhook Triage",
    subtitle: "Zero-touch issue resolution when bugs are opened in GitHub.",
    badge: "Continuous Autonomous CI/CD",
    steps: [
      {
        step: "01",
        name: "Webhook Intake",
        detail: "GitHub App receives issues.opened webhook payload.",
        output: "event: issues.opened · repo: octo/auth · #402",
      },
      {
        step: "02",
        name: "AST & Blame Extraction",
        detail: "Shallow clone tree and parse functions with Tree-sitter.",
        output: "matched: src/auth/refresh.ts:42-81 (commit 8f31a2c)",
      },
      {
        step: "03",
        name: "Sandbox Verification",
        detail: "Applies unified diff patch and executes Vitest suite in isolation.",
        output: "vitest: 3 passed in 1.42s · 0 regressions",
      },
      {
        step: "04",
        name: "PR Bot Publication",
        detail: "Opens pull request with citations and test patch as atom-agent[bot].",
        output: "PR #403 opened with commit and test attachment",
      },
    ],
  },
  workbench: {
    id: "workbench",
    title: "Interactive Issue Workbench",
    subtitle: "Developer-in-the-loop debugging for complex microservices.",
    badge: "Developer Productivity",
    steps: [
      {
        step: "01",
        name: "Select Indexed Codebase",
        detail: "Choose any connected repository in your workspace.",
        output: "loaded: octo-corp/auth-service (1,248 AST chunks)",
      },
      {
        step: "02",
        name: "Browse Live Issues",
        detail: "ATOM fetches open issues via Octokit REST API.",
        output: "synced: 14 open GitHub issues ready for analysis",
      },
      {
        step: "03",
        name: "Trigger RCA Reasoning",
        detail: "Runs HyDE + Reciprocal Rank Fusion + gpt-4o structured reasoning.",
        output: "generated: RCA report + diff + unit tests in 3.1s",
      },
      {
        step: "04",
        name: "1-Click GitHub Publish",
        detail: "Review the side-by-side diff and publish PR or issue comment.",
        output: "published: Bot comment created on GitHub #402",
      },
    ],
  },
  regression: {
    id: "regression",
    title: "CI Regression Defense",
    subtitle: "Automated reproduction unit test synthesis before release.",
    badge: "Quality Engineering",
    steps: [
      {
        step: "01",
        name: "Bug Reproduction",
        detail: "LLM analyzes failure conditions and synthesizes concurrent unit tests.",
        output: "created: concurrent-refresh.test.ts (reproduces race condition)",
      },
      {
        step: "02",
        name: "Diff Generation",
        detail: "Creates minimal unified diff fixing the underlying root cause.",
        output: "diff: +8 lines, -4 lines in src/auth/refresh.ts",
      },
      {
        step: "03",
        name: "Sandbox Test Execution",
        detail: "Validates both regression test and full repo test suite pass.",
        output: "passed: test suite 100% green in sandbox",
      },
      {
        step: "04",
        name: "CI/CD Signoff",
        detail: "Attaches test artifacts directly to the GitHub Pull Request.",
        output: "status check: atom/regression-guard passed ✓",
      },
    ],
  },
};

export default function UseCasesSection() {
  const [activeUseCase, setActiveUseCase] = useState<string>("webhook");
  const [activeStepIdx, setActiveStepIdx] = useState<number>(0);

  const current = USE_CASE_DATA[activeUseCase];

  return (
    <section className="max-w-5xl mx-auto space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#30363d] pb-3">
        <div>
          <span className="text-[11px] font-mono text-[#3fb950] font-semibold flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PRIMARY WORKFLOWS</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            How Engineering Teams Deploy ATOM
          </h2>
        </div>
        <span className="text-xs text-[#8b949e] font-mono">
          Interactive workflow lifecycle
        </span>
      </div>

      {/* Interactive Workflow Container */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-6">
        {/* Top Workflow Selector Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#050507] p-1.5 rounded-xl border border-[#30363d]">
          <button
            onClick={() => {
              setActiveUseCase("webhook");
              setActiveStepIdx(0);
            }}
            className={`p-2.5 rounded-lg text-left transition flex items-center space-x-2.5 ${
              activeUseCase === "webhook"
                ? "bg-[#21262d] text-white border border-[#30363d] shadow-sm"
                : "text-[#8b949e] hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <GitPullRequest className={`w-4 h-4 ${activeUseCase === "webhook" ? "text-[#3fb950]" : "text-zinc-500"}`} />
            <div>
              <div className="text-xs font-bold truncate">1. Autonomous Triage</div>
              <div className="text-[10px] text-zinc-500 font-mono">Webhook ➔ PR</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveUseCase("workbench");
              setActiveStepIdx(0);
            }}
            className={`p-2.5 rounded-lg text-left transition flex items-center space-x-2.5 ${
              activeUseCase === "workbench"
                ? "bg-[#21262d] text-white border border-[#30363d] shadow-sm"
                : "text-[#8b949e] hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <Laptop className={`w-4 h-4 ${activeUseCase === "workbench" ? "text-[#3fb950]" : "text-zinc-500"}`} />
            <div>
              <div className="text-xs font-bold truncate">2. Developer Workbench</div>
              <div className="text-[10px] text-zinc-500 font-mono">Interactive RCA</div>
            </div>
          </button>

          <button
            onClick={() => {
              setActiveUseCase("regression");
              setActiveStepIdx(0);
            }}
            className={`p-2.5 rounded-lg text-left transition flex items-center space-x-2.5 ${
              activeUseCase === "regression"
                ? "bg-[#21262d] text-white border border-[#30363d] shadow-sm"
                : "text-[#8b949e] hover:text-white hover:bg-white/[0.02]"
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeUseCase === "regression" ? "text-[#3fb950]" : "text-zinc-500"}`} />
            <div>
              <div className="text-xs font-bold truncate">3. Regression Defense</div>
              <div className="text-[10px] text-zinc-500 font-mono">Unit Test Synthesis</div>
            </div>
          </button>
        </div>

        {/* Selected Workflow Headline & Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#30363d]/60 pb-3">
          <div>
            <h3 className="text-base font-bold text-white">{current.title}</h3>
            <p className="text-xs text-[#8b949e]">{current.subtitle}</p>
          </div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-[#161b22] text-[#3fb950] border border-[#238636]/40 font-semibold w-fit">
            {current.badge}
          </span>
        </div>

        {/* 4 Interactive Horizontal Timeline Steps */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 font-mono text-xs">
          {current.steps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setActiveStepIdx(idx)}
              className={`p-3.5 rounded-xl text-left transition space-y-2 border ${
                activeStepIdx === idx
                  ? "bg-[#161b22] border-[#3fb950] shadow-md ring-1 ring-[#3fb950]/30"
                  : "bg-[#050507] border-[#30363d] hover:border-zinc-500"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-bold ${activeStepIdx === idx ? "text-[#3fb950]" : "text-zinc-500"}`}>
                  Step {step.step}
                </span>
                {activeStepIdx === idx && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
                )}
              </div>
              <div className="font-bold text-white text-xs">{step.name}</div>
              <div className="text-[11px] text-[#8b949e] font-sans leading-tight">
                {step.detail}
              </div>
            </button>
          ))}
        </div>

        {/* Live Step Execution Output Terminal */}
        <div className="p-4 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-xs space-y-2">
          <div className="flex items-center justify-between text-zinc-500 text-[10px] pb-1 border-b border-[#30363d]/40">
            <div className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>Step {current.steps[activeStepIdx].step} Execution Trace</span>
            </div>
            <span className="text-[#3fb950]">Status: OK</span>
          </div>

          <div className="flex items-center space-x-2 text-zinc-200">
            <span className="text-[#3fb950] font-bold">❯</span>
            <span className="text-zinc-300 font-semibold">{current.steps[activeStepIdx].output}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
