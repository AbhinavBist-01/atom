"use client";

import React from "react";
import { GitPullRequest, Laptop, ShieldCheck, ArrowRight } from "lucide-react";

export default function UseCasesSection() {
  const cases = [
    {
      icon: <GitPullRequest className="w-4 h-4 text-[#3fb950]" />,
      title: "Automated Issue Triage",
      desc: "Webhook triggers shallow clone, finds line-level root cause, and generates ready-to-merge PRs.",
      tag: "Autonomous",
    },
    {
      icon: <Laptop className="w-4 h-4 text-[#3fb950]" />,
      title: "Interactive Workbench",
      desc: "Step-by-step developer workbench to inspect evidence citations and approve patches in 1 click.",
      tag: "Developer Tool",
    },
    {
      icon: <ShieldCheck className="w-4 h-4 text-[#3fb950]" />,
      title: "Regression Test Suite",
      desc: "Synthesizes unit tests reproducing the exact bug and verifies 100% pass before opening PRs.",
      tag: "Verification",
    },
  ];

  return (
    <section className="max-w-5xl mx-auto space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#30363d] pb-3">
        <div>
          <span className="text-[11px] font-mono text-[#3fb950] font-semibold">
            WORKFLOWS
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Primary Use Cases
          </h2>
        </div>
        <span className="text-xs text-[#8b949e] font-mono">
          How engineering teams use ATOM
        </span>
      </div>

      {/* 3 Simple Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cases.map((c, i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3 hover:border-[#3fb950]/30 transition"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d]">
                {c.icon}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-zinc-400 border border-[#30363d]">
                {c.tag}
              </span>
            </div>
            <h3 className="text-sm font-bold text-white">{c.title}</h3>
            <p className="text-xs text-[#8b949e] leading-relaxed">{c.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
