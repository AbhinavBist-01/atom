"use client";

import React, { useState } from "react";
import {
  Code2,
  Database,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  GitBranch,
  Terminal,
  Play,
  RotateCcw,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";

// Card 1 Mock AST Data
const AST_FILES = [
  {
    name: "auth/refresh.ts",
    nodes: [
      { type: "fn", name: "refreshToken(userId)", lines: "L42-81", commit: "8f31a2c (PR #392)" },
      { type: "fn", name: "verifyToken(token)", lines: "L84-112", commit: "4b210ea (PR #370)" },
    ],
  },
  {
    name: "db/session.ts",
    nodes: [
      { type: "class", name: "SessionStore", lines: "L12-90", commit: "9c118aa (PR #210)" },
      { type: "fn", name: "saveSession(id, data)", lines: "L92-120", commit: "9c118aa (PR #210)" },
    ],
  },
  {
    name: "net/socket.ts",
    nodes: [
      { type: "fn", name: "handleFrame(frame)", lines: "L25-68", commit: "1e550bd (PR #180)" },
      { type: "fn", name: "flushBuffer()", lines: "L70-95", commit: "1e550bd (PR #180)" },
    ],
  },
];

// Card 2 RRF Data
const RRF_MODES = {
  dense: {
    label: "Dense Cosine (pgvector)",
    desc: "1536-dim embeddings capture semantic intent and synonyms.",
    rank: [
      { id: "chunk_841", file: "src/auth/refresh.ts", score: "0.892 similarity" },
      { id: "chunk_102", file: "src/auth/session.ts", score: "0.814 similarity" },
    ],
  },
  sparse: {
    label: "Sparse BM25 (Keywords)",
    desc: "Keyword matching catches exact token variables & function signatures.",
    rank: [
      { id: "chunk_841", file: "src/auth/refresh.ts", score: "BM25: 14.8" },
      { id: "chunk_330", file: "src/net/socket.ts", score: "BM25: 9.4" },
    ],
  },
  rrf: {
    label: "Fused RRF (Reciprocal Rank)",
    desc: "RRF combines Dense + Sparse ranks for deterministic top-K retrieval.",
    rank: [
      { id: "chunk_841", file: "src/auth/refresh.ts", score: "RRF Score: 0.0328 (Rank #1)" },
      { id: "chunk_102", file: "src/auth/session.ts", score: "RRF Score: 0.0161 (Rank #2)" },
    ],
  },
};

export default function CoreCapabilitiesGrid() {
  // Card 1 State
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);

  // Card 2 State
  const [rrfMode, setRrfMode] = useState<"dense" | "sparse" | "rrf">("rrf");

  // Card 3 State (Before/After Evidence Switch)
  const [evidenceMode, setEvidenceMode] = useState<"standard" | "atom">("atom");

  // Card 4 State (Interactive Sandbox Runner)
  const [runningTest, setRunningTest] = useState(false);
  const [testOutputStep, setTestOutputStep] = useState(2); // 2 = finished

  const runSandboxSimulation = () => {
    setRunningTest(true);
    setTestOutputStep(0);
    setTimeout(() => {
      setTestOutputStep(1);
      setTimeout(() => {
        setTestOutputStep(2);
        setRunningTest(false);
      }, 700);
    }, 600);
  };

  return (
    <section className="max-w-5xl mx-auto space-y-6 pt-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-[#30363d] pb-3">
        <div>
          <span className="text-[11px] font-mono text-[#3fb950] font-semibold flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE CORE CAPABILITIES</span>
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Engine Architecture in Action
          </h2>
        </div>
        <span className="text-xs text-[#8b949e] font-mono">
          Click any card to interact with real engine modules
        </span>
      </div>

      {/* 4 Interactive Bento Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CARD 1: Interactive AST Structural Indexer */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <Code2 className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">AST Structural Indexer</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-[#3fb950] border border-[#238636]/40">
              Interactive
            </span>
          </div>

          {/* Interactive File Selector */}
          <div className="flex items-center space-x-1.5 bg-[#050507] p-1 rounded-lg border border-[#30363d]">
            {AST_FILES.map((file, idx) => (
              <button
                key={file.name}
                onClick={() => setSelectedFileIdx(idx)}
                className={`px-2.5 py-1 text-[11px] font-mono rounded-md transition ${
                  selectedFileIdx === idx
                    ? "bg-[#21262d] text-white border border-[#30363d] shadow-sm"
                    : "text-[#8b949e] hover:text-white"
                }`}
              >
                {file.name.split("/")[1]}
              </button>
            ))}
          </div>

          {/* Interactive Code Tree Viewer */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] space-y-2">
            <div className="text-zinc-400 flex items-center justify-between">
              <span className="text-[#3fb950]">src/{AST_FILES[selectedFileIdx].name}</span>
              <span className="text-zinc-600 text-[10px]">Tree-sitter AST</span>
            </div>

            <div className="space-y-1.5">
              {AST_FILES[selectedFileIdx].nodes.map((node, nIdx) => (
                <div
                  key={nIdx}
                  className="flex items-center justify-between p-1.5 rounded bg-[#161b22] border border-[#30363d]/60 text-zinc-300"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-[#3fb950] font-bold px-1 rounded bg-[#238636]/20">
                      {node.type}
                    </span>
                    <span className="text-white text-xs truncate">{node.name}</span>
                  </div>
                  <span className="text-zinc-500 text-[10px]">{node.lines}</span>
                </div>
              ))}
            </div>

            <div className="text-[10px] text-zinc-500 flex items-center space-x-1 pt-1 border-t border-[#30363d]/40">
              <GitBranch className="w-3 h-3 text-[#3fb950]" />
              <span>Blame: {AST_FILES[selectedFileIdx].nodes[0].commit}</span>
            </div>
          </div>
        </div>

        {/* CARD 2: Interactive Hybrid RRF Retrieval */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Hybrid Retrieval Engine</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-[#3fb950] border border-[#238636]/40">
              RRF Tuner
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-3 gap-1 bg-[#050507] p-1 rounded-lg border border-[#30363d] text-[11px] font-mono">
            <button
              onClick={() => setRrfMode("dense")}
              className={`py-1 rounded text-center transition ${
                rrfMode === "dense" ? "bg-[#21262d] text-white" : "text-[#8b949e] hover:text-white"
              }`}
            >
              Dense
            </button>
            <button
              onClick={() => setRrfMode("sparse")}
              className={`py-1 rounded text-center transition ${
                rrfMode === "sparse" ? "bg-[#21262d] text-white" : "text-[#8b949e] hover:text-white"
              }`}
            >
              BM25
            </button>
            <button
              onClick={() => setRrfMode("rrf")}
              className={`py-1 rounded text-center transition font-semibold ${
                rrfMode === "rrf" ? "bg-[#238636] text-white shadow-sm" : "text-[#8b949e] hover:text-white"
              }`}
            >
              RRF Fusion
            </button>
          </div>

          {/* Interactive RRF Simulation Results */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] space-y-2">
            <div className="text-[11px] text-zinc-400">
              {RRF_MODES[rrfMode].desc}
            </div>

            <div className="space-y-1.5">
              {RRF_MODES[rrfMode].rank.map((item, rIdx) => (
                <div
                  key={rIdx}
                  className="flex items-center justify-between p-1.5 rounded bg-[#161b22] border border-[#30363d]/60 text-zinc-300"
                >
                  <span className="text-white truncate">{item.file}</span>
                  <span className="text-[#3fb950] text-[10px] font-semibold">{item.score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD 3: Interactive Evidence vs Hallucination Comparison */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Evidence vs Hallucination</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161b22] text-[#3fb950] border border-[#238636]/40">
              Comparison
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1 bg-[#050507] p-1 rounded-lg border border-[#30363d] text-[11px] font-mono">
            <button
              onClick={() => setEvidenceMode("standard")}
              className={`py-1 rounded text-center transition ${
                evidenceMode === "standard"
                  ? "bg-red-950/60 text-red-300 border border-red-800/40"
                  : "text-[#8b949e] hover:text-white"
              }`}
            >
              Standard LLM Guess
            </button>
            <button
              onClick={() => setEvidenceMode("atom")}
              className={`py-1 rounded text-center transition font-semibold ${
                evidenceMode === "atom"
                  ? "bg-[#238636] text-white shadow-sm"
                  : "text-[#8b949e] hover:text-white"
              }`}
            >
              ATOM Evidence Citation
            </button>
          </div>

          {/* Interactive Output Viewer */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] min-h-[92px] flex flex-col justify-center">
            {evidenceMode === "standard" ? (
              <div className="space-y-1.5 text-zinc-400">
                <div className="flex items-center space-x-1.5 text-red-400 text-xs">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Vague / Speculative Output:</span>
                </div>
                <p className="text-[11px] text-zinc-500 italic">
                  &ldquo;The issue appears to be caused by a token refresh error somewhere in your auth logic.&rdquo;
                </p>
                <div className="text-[10px] text-zinc-600">No file or line numbers provided.</div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center space-x-1.5 text-[#3fb950] text-xs font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Anchored File & Line Evidence:</span>
                </div>
                <div className="p-1.5 bg-[#161b22] rounded border border-[#238636]/40 flex items-center justify-between">
                  <span className="text-white font-semibold">src/auth/refresh.ts:42-81</span>
                  <span className="text-[#3fb950] text-[10px]">Confidence: 99.4%</span>
                </div>
                <div className="text-[10px] text-zinc-400">
                  Introduced in: <span className="text-zinc-200">commit 8f31a2c (PR #392)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CARD 4: Interactive Sandboxed Test Runner */}
        <div className="p-5 rounded-2xl bg-[#0d1117] border border-[#30363d] space-y-3.5 hover:border-[#3fb950]/40 transition group">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
                <Terminal className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Sandboxed Verification</h3>
            </div>

            <button
              onClick={runSandboxSimulation}
              disabled={runningTest}
              className="px-2.5 py-1 text-[11px] font-mono rounded bg-[#238636] hover:bg-[#2ea043] text-white flex items-center space-x-1 transition active:scale-95 disabled:opacity-60 cursor-pointer"
            >
              {runningTest ? (
                <RotateCcw className="w-3 h-3 animate-spin" />
              ) : (
                <Play className="w-3 h-3 fill-current" />
              )}
              <span>{runningTest ? "Running…" : "Run Test"}</span>
            </button>
          </div>

          {/* Interactive Console Window */}
          <div className="p-3 rounded-xl bg-[#050507] border border-[#30363d] font-mono text-[11px] space-y-1.5 min-h-[120px]">
            <div className="flex items-center justify-between text-zinc-500 text-[10px] pb-1 border-b border-[#30363d]/40">
              <span>scratch/repos/sandbox_auth</span>
              <span>isolated child_process</span>
            </div>

            <div className="text-zinc-400 flex items-center space-x-2">
              <span className="text-[#3fb950]">$</span>
              <span>git apply /tmp/patch_402.diff</span>
              {testOutputStep >= 1 && <span className="text-[#3fb950] text-[10px]">✓</span>}
            </div>

            {testOutputStep >= 1 && (
              <div className="text-zinc-400 flex items-center space-x-2">
                <span className="text-[#3fb950]">$</span>
                <span>vitest run refresh-concurrency.test.ts</span>
              </div>
            )}

            {testOutputStep >= 2 && (
              <div className="p-1.5 bg-[#161b22] rounded border border-[#238636]/40 text-[#3fb950] font-semibold text-[10px] flex items-center justify-between">
                <span>✓ 3 passed in 1.42s</span>
                <span className="px-1.5 py-0.5 rounded bg-[#238636]/30 text-white text-[9px]">
                  PR Ready
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
