"use client";

import React from "react";
import {
  Code2,
  Database,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  GitBranch,
  Terminal,
  Layers,
} from "lucide-react";

export default function CoreCapabilitiesGrid() {
  return (
    <section className="max-w-5xl mx-auto space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#30363d] pb-3">
        <div>
          <span className="text-[11px] font-mono text-[#3fb950] font-semibold">
            ENGINE ARCHITECTURE
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Core Components
          </h2>
        </div>
        <span className="text-xs text-[#8b949e] font-mono">
          4-stage deterministic pipeline
        </span>
      </div>

      {/* Bento Grid with visual component widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bento 1: AST Chunker */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">AST Structural Indexer</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-zinc-400 border border-[#30363d]">
              Tree-sitter
            </span>
          </div>

          {/* Visual Component: Mini AST Code Tree */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] space-y-1.5">
            <div className="flex items-center space-x-2 text-zinc-400">
              <span className="text-[#3fb950]">▾</span>
              <span className="text-white">src/auth/refresh.ts</span>
            </div>
            <div className="pl-4 flex items-center justify-between text-zinc-300 bg-[#161b22] px-2 py-1 rounded border border-[#30363d]/60">
              <span className="text-[#3fb950]">fn</span>
              <span className="text-white truncate">refreshToken(userId)</span>
              <span className="text-zinc-500 text-[10px]">L42-81</span>
            </div>
            <div className="pl-4 text-[10px] text-zinc-500 flex items-center space-x-1.5">
              <GitBranch className="w-3 h-3 text-[#3fb950]" />
              <span>Blame: commit 8f31a2c</span>
            </div>
          </div>
        </div>

        {/* Bento 2: Hybrid RAG Fusion */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Hybrid Retrieval Engine</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-zinc-400 border border-[#30363d]">
              Dense + Sparse
            </span>
          </div>

          {/* Visual Component: RRF Fusion Flow */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] space-y-2">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="p-1.5 rounded bg-[#161b22] border border-[#30363d] text-zinc-300">
                <span className="text-[10px] text-zinc-500 block">Dense Vector</span>
                <span>pgvector (1536d)</span>
              </div>
              <div className="p-1.5 rounded bg-[#161b22] border border-[#30363d] text-zinc-300">
                <span className="text-[10px] text-zinc-500 block">Sparse Keywords</span>
                <span>BM25 Index</span>
              </div>
            </div>
            <div className="p-1.5 rounded bg-[#161b22] border border-[#238636]/40 text-center text-[#3fb950] font-semibold text-[11px]">
              Reciprocal Rank Fusion (RRF) ➔ Top 10 Chunks
            </div>
          </div>
        </div>

        {/* Bento 3: Evidence-First vs Guesswork */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Evidence vs Hallucination</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-zinc-400 border border-[#30363d]">
              Deterministic
            </span>
          </div>

          {/* Visual Component: Side-by-side claim comparison */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] space-y-2 font-mono text-[11px]">
            <div className="flex items-center space-x-2 text-zinc-400 p-1.5 bg-[#161b22] rounded border border-red-900/30">
              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="line-through text-zinc-500 truncate">&ldquo;I think the bug is in auth.ts&rdquo;</span>
            </div>
            <div className="flex items-center space-x-2 text-white p-1.5 bg-[#161b22] rounded border border-[#238636]/40">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#3fb950] shrink-0" />
              <span className="text-[#3fb950] font-semibold">src/auth/refresh.ts:42-81</span>
              <span className="text-zinc-400 text-[10px]">[PR #392]</span>
            </div>
          </div>
        </div>

        {/* Bento 4: Sandboxed Test Runner */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Sandboxed Verification</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-[#3fb950] border border-[#238636]/40">
              Verified
            </span>
          </div>

          {/* Visual Component: Mini Terminal verification output */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] space-y-1">
            <div className="text-zinc-400 flex items-center space-x-2">
              <span className="text-[#3fb950]">$</span>
              <span>git apply patch.diff</span>
              <span className="text-[#3fb950] text-[10px]">✓ OK</span>
            </div>
            <div className="text-zinc-400 flex items-center space-x-2">
              <span className="text-[#3fb950]">$</span>
              <span>vitest run concurrent-refresh.test.ts</span>
            </div>
            <div className="text-[#3fb950] font-semibold text-[10px] pt-0.5">
              ✓ 3 passed in 1.42s ➔ Ready to publish PR
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
