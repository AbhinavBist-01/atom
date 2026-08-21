"use client";

import React, { useState } from "react";
import { Github, ArrowRight, Loader2, Terminal, Check } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export default function HeroSection() {
  const [authenticating, setAuthenticating] = useState(false);

  const handleGitHubSignIn = async () => {
    try {
      setAuthenticating(true);
      const callbackURL =
        typeof window !== "undefined"
          ? `${window.location.origin}/workspace`
          : "http://localhost:3000/workspace";

      await signIn.social({
        provider: "github",
        callbackURL,
      });
    } catch (error) {
      console.error("Sign in failed:", error);
      setAuthenticating(false);
    }
  };

  return (
    <section className="pt-6 pb-10 md:pt-12 md:pb-14 max-w-4xl mx-auto text-center space-y-6">
      {/* Live Engine Status Pill */}
      <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#161b22] border border-[#30363d] text-xs font-mono text-zinc-300">
        <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
        <span className="text-zinc-400">ATOM</span>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-200">Autonomous GitHub Issue Resolution</span>
      </div>

      {/* Main Headline */}
      <div className="space-y-3">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
          From GitHub issue to verified PR{" "}
          <span className="text-[#3fb950]">with evidence.</span>
        </h1>
        <p className="text-sm sm:text-base text-[#8b949e] max-w-xl mx-auto leading-relaxed">
          ATOM isolates root causes to exact file and line ranges, generates unified diff patches, and runs automated tests before opening pull requests.
        </p>
      </div>

      {/* Action CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
        <button
          onClick={handleGitHubSignIn}
          disabled={authenticating}
          className="gh-btn-green px-6 py-3 text-xs sm:text-sm rounded-xl font-semibold flex items-center justify-center space-x-2 w-full sm:w-auto min-w-[200px] disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
        >
          {authenticating ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Github className="w-4 h-4 text-white" />
          )}
          <span>{authenticating ? "Connecting…" : "Sign in with GitHub"}</span>
          {!authenticating && (
            <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>

        <a
          href="#interactive-demo"
          className="glass-button-secondary px-5 py-3 text-xs sm:text-sm rounded-xl font-medium flex items-center justify-center space-x-2 w-full sm:w-auto hover:text-white transition"
        >
          <Terminal className="w-3.5 h-3.5 text-zinc-400" />
          <span>Interactive Demo</span>
        </a>
      </div>

      {/* 4 Minimal Metric Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-mono text-zinc-400">
        <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] flex items-center space-x-1.5">
          <Check className="w-3 h-3 text-[#3fb950]" />
          <span>Tree-sitter AST Chunks</span>
        </span>
        <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] flex items-center space-x-1.5">
          <Check className="w-3 h-3 text-[#3fb950]" />
          <span>Hybrid RAG + RRF</span>
        </span>
        <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] flex items-center space-x-1.5">
          <Check className="w-3 h-3 text-[#3fb950]" />
          <span>Sandboxed Test Runner</span>
        </span>
        <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] flex items-center space-x-1.5">
          <Check className="w-3 h-3 text-[#3fb950]" />
          <span>GitHub Bot PRs</span>
        </span>
      </div>
    </section>
  );
}
