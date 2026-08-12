import React from "react";
import { Terminal, Cpu, ShieldCheck, GitPullRequest, Code2 } from "lucide-react";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <header className="flex items-center justify-between border-b border-gray-800 pb-6 mb-10">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wide">ATOM</h1>
            <p className="text-xs text-gray-400">Autonomous GitHub Issue Resolution Agent</p>
          </div>
        </div>
        <span className="px-3 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
          Phase 1: Active
        </span>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-700 transition">
          <Code2 className="w-8 h-8 text-indigo-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">AST Code Parsing</h2>
          <p className="text-sm text-gray-400">Tree-sitter powered AST parsing for multi-language semantic chunking.</p>
        </div>

        <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-700 transition">
          <Terminal className="w-8 h-8 text-cyan-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Hybrid Retrieval</h2>
          <p className="text-sm text-gray-400">Dense vector search (pgvector) + BM25 sparse keyword search with Cohere Rerank.</p>
        </div>

        <div className="p-6 bg-gray-900/50 rounded-xl border border-gray-800 hover:border-gray-700 transition">
          <ShieldCheck className="w-8 h-8 text-emerald-400 mb-4" />
          <h2 className="text-lg font-semibold mb-2">Evidence-First RCA</h2>
          <p className="text-sm text-gray-400">File & line-level citations backing root cause analysis and patch diffs.</p>
        </div>
      </main>

      <section className="p-6 bg-gray-900/40 rounded-xl border border-gray-800">
        <div className="flex items-center space-x-2 mb-4">
          <GitPullRequest className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold text-gray-200">System Architecture Overview</h3>
        </div>
        <pre className="p-4 bg-gray-950 rounded-lg text-xs font-mono text-gray-300 overflow-x-auto border border-gray-800">
{`Issue Intake (GitHub API/Webhook)
  └──> Context Fetcher (PRs, Commits, Blame)
        └──> HyDE Query Engine (OpenAI)
              └──> Hybrid Retriever (pgvector + BM25)
                    └──> Cohere Cross-Encoder Reranker
                          └──> Context Builder
                                └──> LLM Reasoning Engine (RCA + Unified Diff + Tests)
                                      └──> GitHub Action Publisher (PR / Comment)`}
        </pre>
      </section>
    </div>
  );
}
