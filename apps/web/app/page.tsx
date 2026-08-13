"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Github, ArrowRight, Code2, ShieldCheck, Terminal, Sparkles, CheckCircle2, Cpu } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [authenticating, setAuthenticating] = useState(false);

  const handleGitHubAuth = () => {
    setAuthenticating(true);
    // Trigger Better Auth GitHub OAuth redirection
    const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
    window.location.href = `${SERVER_URL}/api/auth/sign-in/github?callbackUrl=${encodeURIComponent(
      window.location.origin + "/workspace"
    )}`;
  };

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto py-12">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-pill border border-white/10 text-xs text-zinc-300 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>ATOM Autonomous GitHub Issue Resolution Agent</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          Evidence-First Bug Fixing for <span className="text-zinc-400">Autonomous Software Engineering</span>
        </h1>

        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          ATOM ingests GitHub issues, fetches line-level code context from AST vector chunking, and produces verified unified diff patches with unit test suites.
        </p>

        {/* Auth & CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleGitHubAuth}
            disabled={authenticating}
            className="glass-button-primary px-8 py-3.5 text-sm rounded-xl font-semibold flex items-center space-x-3 w-full sm:w-auto justify-center"
          >
            <Github className="w-5 h-5" />
            <span>{authenticating ? "Redirecting to GitHub..." : "Sign in with GitHub"}</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>

          <Link
            href="/workspace"
            className="glass-button-secondary px-8 py-3.5 text-sm rounded-xl font-semibold flex items-center space-x-2 w-full sm:w-auto justify-center"
          >
            <Cpu className="w-4 h-4 text-zinc-300" />
            <span>Open Main Workspace</span>
          </Link>
        </div>
      </section>

      {/* Interactive Glassmorphic Architecture Visualizer */}
      <section className="glass-panel p-8 rounded-2xl border border-white/10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-white" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">ATOM Autonomous Agent Execution Pipeline</h2>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono font-medium bg-white/5 text-zinc-300 rounded border border-white/10">
            Real-time RAG + LLM Chain
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
            <div className="text-zinc-500 font-semibold uppercase text-[10px]">Step 01</div>
            <h3 className="text-white font-bold">1. GitHub Webhook</h3>
            <p className="text-zinc-400 text-[11px]">Intake issue event & clone tree using GitHub App credentials.</p>
          </div>

          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
            <div className="text-zinc-500 font-semibold uppercase text-[10px]">Step 02</div>
            <h3 className="text-white font-bold">2. AST Chunking</h3>
            <p className="text-zinc-400 text-[11px]">Tree-sitter structural parsing + OpenAI 1536-dim embeddings.</p>
          </div>

          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
            <div className="text-zinc-500 font-semibold uppercase text-[10px]">Step 03</div>
            <h3 className="text-white font-bold">3. Hybrid RAG</h3>
            <p className="text-zinc-400 text-[11px]">Reciprocal Rank Fusion (RRF) vector + BM25 keyword search.</p>
          </div>

          <div className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
            <div className="text-zinc-500 font-semibold uppercase text-[10px]">Step 04</div>
            <h3 className="text-white font-bold">4. RCA & Patch</h3>
            <p className="text-zinc-400 text-[11px]">File:line evidence citations, unified diff, & unit test patch.</p>
          </div>
        </div>
      </section>

      {/* 3-Column Glassmorphic Feature Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 w-fit">
            <Code2 className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">AST Structural Parsing</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Extracts exact function, class, and method bounds across TypeScript, JavaScript, Python, Go, Rust, and Java.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 w-fit">
            <Terminal className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">Reciprocal Rank Fusion</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Combines dense vector similarity with BM25 sparse search for high-precision code context retrieval.
          </p>
        </div>

        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="p-3 bg-white/5 rounded-xl border border-white/10 w-fit">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-lg font-bold text-white">Evidence-First RCA</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Every conclusion is anchored to specific file line ranges (`auth.ts:42-81`) and git blame commits.
          </p>
        </div>
      </section>

      {/* GitHub App Connection Banner */}
      <section className="glass-panel p-8 rounded-2xl border border-white/10 max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-white" />
            <span>Ready to automate issue resolution?</span>
          </h3>
          <p className="text-sm text-zinc-400">
            Sign in with GitHub and install the ATOM GitHub App on your target repositories.
          </p>
        </div>

        <button
          onClick={handleGitHubAuth}
          className="glass-button-primary px-6 py-3 text-xs rounded-xl font-semibold flex items-center space-x-2 shrink-0"
        >
          <Github className="w-4 h-4" />
          <span>Connect GitHub App</span>
        </button>
      </section>
    </div>
  );
}
