"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Github,
  ArrowRight,
  Code2,
  ShieldCheck,
  Terminal,
  Sparkles,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useSession, signIn } from "@/lib/auth-client";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [authenticating, setAuthenticating] = useState(false);

  // If already authenticated, redirect to workspace immediately
  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/workspace");
    }
  }, [session, isPending, router]);

  const handleGitHubSignIn = async () => {
    setAuthenticating(true);
    await signIn.social({
      provider: "github",
      callbackURL: "/workspace",
    });
  };

  // Show nothing while checking session or redirecting
  if (isPending || session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-16 py-6">
      {/* Hero Section */}
      <section className="text-center space-y-8 max-w-4xl mx-auto py-12">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full glass-pill border border-white/10 text-xs text-zinc-300 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-white" />
          <span>ATOM Autonomous GitHub Issue Resolution Agent</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
          Evidence-First Bug Fixing for{" "}
          <span className="text-zinc-400">Autonomous Software Engineering</span>
        </h1>

        <p className="text-base md:text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          ATOM ingests GitHub issues, fetches line-level code context from AST
          vector chunking, and produces verified unified diff patches with unit
          test suites.
        </p>

        {/* Single CTA — GitHub Sign In only */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={handleGitHubSignIn}
            disabled={authenticating}
            className="glass-button-primary px-8 py-3.5 text-sm rounded-xl font-semibold flex items-center space-x-3 w-full sm:w-auto justify-center disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {authenticating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Github className="w-5 h-5" />
            )}
            <span>
              {authenticating ? "Redirecting to GitHub…" : "Sign in with GitHub"}
            </span>
            {!authenticating && <ArrowRight className="w-4 h-4 ml-1" />}
          </button>
        </div>

        <p className="text-xs text-zinc-600">
          GitHub OAuth · No passwords · ATOM only reads repositories you grant access to
        </p>
      </section>

      {/* Architecture Pipeline */}
      <section className="glass-panel p-8 rounded-2xl border border-white/10 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center space-x-3">
            <Terminal className="w-5 h-5 text-white" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-white">
              ATOM Autonomous Agent Execution Pipeline
            </h2>
          </div>
          <span className="px-2.5 py-1 text-[11px] font-mono font-medium bg-white/5 text-zinc-300 rounded border border-white/10">
            Real-time RAG + LLM Chain
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
          {[
            { step: "01", title: "1. GitHub Webhook", desc: "Intake issue event & clone tree using GitHub App credentials." },
            { step: "02", title: "2. AST Chunking", desc: "Tree-sitter structural parsing + OpenAI 1536-dim embeddings." },
            { step: "03", title: "3. Hybrid RAG", desc: "Reciprocal Rank Fusion (RRF) vector + BM25 keyword search." },
            { step: "04", title: "4. RCA & Patch", desc: "File:line evidence citations, unified diff, & unit test patch." },
          ].map((s) => (
            <div key={s.step} className="p-4 bg-white/[0.02] rounded-xl border border-white/5 space-y-2">
              <div className="text-zinc-500 font-semibold uppercase text-[10px]">Step {s.step}</div>
              <h3 className="text-white font-bold">{s.title}</h3>
              <p className="text-zinc-400 text-[11px]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Feature Grid */}
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
            Every conclusion is anchored to specific file line ranges (auth.ts:42-81) and git blame commits.
          </p>
        </div>
      </section>

      {/* Bottom CTA Banner */}
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
          onClick={handleGitHubSignIn}
          disabled={authenticating}
          className="glass-button-primary px-6 py-3 text-xs rounded-xl font-semibold flex items-center space-x-2 shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <Github className="w-4 h-4" />
          <span>Get Started with GitHub</span>
        </button>
      </section>
    </div>
  );
}
