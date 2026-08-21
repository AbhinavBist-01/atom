"use client";

import React, { useState } from "react";
import {
  AlertCircle,
  FileCode2,
  GitPullRequest,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  GitCommit,
  Copy,
  Check,
  Play,
  ArrowUpRight,
  Search,
  Sparkles,
} from "lucide-react";

interface SampleIssue {
  id: string;
  number: number;
  repo: string;
  title: string;
  state: "open" | "resolved";
  fileCitation: string;
  commitBlame: string;
  confidence: string;
  rootCause: string;
  diff: string;
  testCode: string;
  sandboxDuration: string;
}

const SAMPLE_ISSUES: SampleIssue[] = [
  {
    id: "auth-refresh",
    number: 402,
    repo: "octo-corp/auth-service",
    title: "Race condition in token refresh mutex under high concurrent request volume",
    state: "resolved",
    fileCitation: "src/auth/refresh.ts:42-81",
    commitBlame: "commit 8f31a2c (PR #392: Add distributed refresh support)",
    confidence: "99.4% (High)",
    rootCause:
      "The refresh() function does not acquire an exclusive lock before checking expiry timestamp, causing multiple concurrent threads to issue duplicate token exchange requests against the provider.",
    diff: `--- a/src/auth/refresh.ts
+++ b/src/auth/refresh.ts
@@ -42,12 +42,18 @@ export async function refreshToken(userId: string): Promise<AuthToken> {
-  if (Date.now() >= session.expiresAt) {
-    const newToken = await provider.exchange(session.refreshToken);
-    await saveSession(userId, newToken);
-    return newToken;
-  }
+  return await tokenLock.acquire(userId, async () => {
+    const current = await getSession(userId);
+    if (Date.now() < current.expiresAt) {
+      return current.token;
+    }
+    const newToken = await provider.exchange(current.refreshToken);
+    await saveSession(userId, newToken);
+    return newToken;
+  });
 }`,
    testCode: `describe("concurrent token refresh", () => {
  it("only executes provider exchange once under parallel invocation", async () => {
    const userId = "usr_9984";
    const exchangeSpy = vi.spyOn(provider, "exchange");
    
    // Simulate 10 simultaneous refresh triggers
    const results = await Promise.all(
      Array.from({ length: 10 }).map(() => refreshToken(userId))
    );

    expect(exchangeSpy).toHaveBeenCalledTimes(1);
    expect(results.every(r => r.token === results[0].token)).toBe(true);
  });
});`,
    sandboxDuration: "1.42s",
  },
  {
    id: "net-parser",
    number: 188,
    repo: "engine-stack/websocket-gateway",
    title: "Memory leak from unbounded chunk buffer during fragmented frame parsing",
    state: "resolved",
    fileCitation: "src/net/frame-parser.ts:114-142",
    commitBlame: "commit c4901b2 (PR #170: Streaming parser optimizations)",
    confidence: "98.1% (High)",
    rootCause:
      "Fragmented WebSocket frames accumulate chunks in an unconstrained internal array without resetting buffer capacity after frame dispatch.",
    diff: `--- a/src/net/frame-parser.ts
+++ b/src/net/frame-parser.ts
@@ -118,7 +118,9 @@ export class FrameParser {
   public pushChunk(chunk: Buffer): void {
     this.chunks.push(chunk);
     this.totalBytes += chunk.length;
-    // Buffer growth unbounded until socket close
+    if (this.totalBytes > this.maxFrameSize) {
+      throw new FrameLimitExceededError(this.totalBytes);
+    }
   }
   
   public reset(): void {
+    this.chunks = [];
+    this.totalBytes = 0;
   }`,
    testCode: `test("rejects frames exceeding configured threshold", () => {
  const parser = new FrameParser({ maxFrameSize: 1024 * 1024 });
  const oversizedChunk = Buffer.alloc(1024 * 1024 + 1);
  
  expect(() => parser.pushChunk(oversizedChunk)).toThrow(FrameLimitExceededError);
});`,
    sandboxDuration: "0.89s",
  },
];

type TabType = "rca" | "diff" | "tests" | "sandbox";

export default function InteractiveWorkbenchDemo() {
  const [selectedIssue, setSelectedIssue] = useState<SampleIssue>(SAMPLE_ISSUES[0]);
  const [activeTab, setActiveTab] = useState<TabType>("rca");
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="interactive-demo" className="max-w-5xl mx-auto space-y-6 pt-6">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#30363d] pb-5">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#3fb950]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>INTERACTIVE WORKBENCH PREVIEW</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            See how ATOM isolates and fixes real bugs.
          </h2>
          <p className="text-xs sm:text-sm text-[#8b949e]">
            Select an issue scenario below to inspect ATOM&apos;s AST evidence citations, unified diff, and verified test runner.
          </p>
        </div>

        {/* Issue Selector Pills */}
        <div className="flex items-center space-x-2 bg-[#0d1117] p-1 rounded-xl border border-[#30363d]">
          {SAMPLE_ISSUES.map((issue) => (
            <button
              key={issue.id}
              onClick={() => setSelectedIssue(issue)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono transition flex items-center space-x-2 ${
                selectedIssue.id === issue.id
                  ? "bg-[#21262d] text-white border border-[#30363d] shadow-sm"
                  : "text-[#8b949e] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <span className="text-[#3fb950]">#{issue.number}</span>
              <span className="truncate max-w-[120px]">{issue.repo.split("/")[1]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Demo Container */}
      <div className="bg-[#0d1117] rounded-2xl border border-[#30363d] shadow-2xl overflow-hidden">
        {/* Top Workbench Bar */}
        <div className="bg-[#161b22] px-4 sm:px-6 py-3.5 border-b border-[#30363d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 text-xs font-mono font-semibold bg-[#238636]/20 text-[#3fb950] rounded-md border border-[#238636]/40 flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Issue #{selectedIssue.number}</span>
            </span>
            <span className="text-xs sm:text-sm font-medium text-white truncate max-w-md">
              {selectedIssue.title}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-xs font-mono text-[#8b949e]">
            <span className="flex items-center space-x-1">
              <GitCommit className="w-3.5 h-3.5 text-[#8b949e]" />
              <span>{selectedIssue.repo}</span>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#21262d] text-zinc-300 border border-[#30363d]">
              Confidence: {selectedIssue.confidence}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-[#0d1117] px-4 sm:px-6 border-b border-[#30363d] flex items-center justify-between overflow-x-auto">
          <div className="flex items-center space-x-1 sm:space-x-2 py-2">
            <button
              onClick={() => setActiveTab("rca")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-2 ${
                activeTab === "rca"
                  ? "bg-[#21262d] text-white border border-[#30363d]"
                  : "text-[#8b949e] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>1. Root Cause Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab("diff")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-2 ${
                activeTab === "diff"
                  ? "bg-[#21262d] text-white border border-[#30363d]"
                  : "text-[#8b949e] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <FileCode2 className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>2. Unified Diff Patch</span>
            </button>

            <button
              onClick={() => setActiveTab("tests")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-2 ${
                activeTab === "tests"
                  ? "bg-[#21262d] text-white border border-[#30363d]"
                  : "text-[#8b949e] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>3. Synthesized Unit Tests</span>
            </button>

            <button
              onClick={() => setActiveTab("sandbox")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-2 ${
                activeTab === "sandbox"
                  ? "bg-[#21262d] text-white border border-[#30363d]"
                  : "text-[#8b949e] hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <GitPullRequest className="w-3.5 h-3.5 text-[#3fb950]" />
              <span>4. Sandbox & Bot PR</span>
            </button>
          </div>

          <button
            onClick={() =>
              handleCopy(
                activeTab === "diff"
                  ? selectedIssue.diff
                  : activeTab === "tests"
                  ? selectedIssue.testCode
                  : activeTab === "sandbox"
                  ? `[ATOM Sandbox Test Verification]\n100% Passed in ${selectedIssue.sandboxDuration}\nPR #${selectedIssue.number + 1} Opened Ready for Review`
                  : selectedIssue.rootCause
              )
            }
            className="hidden sm:flex items-center space-x-1.5 text-xs text-[#8b949e] hover:text-white px-2.5 py-1 rounded bg-[#161b22] border border-[#30363d] transition cursor-pointer"
            title="Copy current tab content"
          >
            {copied ? <Check className="w-3 h-3 text-[#3fb950]" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Tab Content Display */}
        <div className="p-5 sm:p-7 min-h-[290px] font-mono text-xs">
          {/* TAB 1: RCA */}
          {activeTab === "rca" && (
            <div className="space-y-5 animate-fadeIn">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold flex items-center space-x-1.5">
                    <FileCode2 className="w-3.5 h-3.5 text-[#3fb950]" />
                    <span>Exact Code Evidence Citation</span>
                  </div>
                  <div className="text-white font-semibold text-sm bg-[#0d1117] px-3 py-2 rounded-lg border border-[#30363d]">
                    {selectedIssue.fileCitation}
                  </div>
                  <p className="text-[11px] text-[#8b949e]">
                    Isolated via Tree-sitter AST structural parsing &amp; RRF hybrid search.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
                  <div className="text-[11px] uppercase tracking-wider text-[#8b949e] font-semibold flex items-center space-x-1.5">
                    <GitCommit className="w-3.5 h-3.5 text-[#3fb950]" />
                    <span>Last Modifying Blame Commit</span>
                  </div>
                  <div className="text-[#f0f6fc] text-xs bg-[#0d1117] px-3 py-2 rounded-lg border border-[#30363d] truncate">
                    {selectedIssue.commitBlame}
                  </div>
                  <p className="text-[11px] text-[#8b949e]">
                    Blame trace identified the PR where the vulnerability was first introduced.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
                <div className="text-[11px] uppercase tracking-wider text-[#3fb950] font-semibold">
                  Root Cause Explanation
                </div>
                <p className="text-sm font-sans text-[#f0f6fc] leading-relaxed font-normal">
                  {selectedIssue.rootCause}
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: UNIFIED DIFF */}
          {activeTab === "diff" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-[#8b949e] text-[11px]">
                <span>Format: Unified Git Diff (`git apply` compliant)</span>
                <span className="text-[#3fb950] font-mono">● Clean patch verified</span>
              </div>
              <div className="rounded-xl bg-[#050507] border border-[#30363d] text-[#f0f6fc] overflow-hidden">
                <div className="px-4 py-2 bg-[#0d1117] border-b border-[#30363d] text-[11px] text-[#8b949e] flex items-center justify-between font-mono">
                  <span>{selectedIssue.fileCitation.split(":")[0]}</span>
                  <span>Unified Patch</span>
                </div>
                <pre className="p-4 overflow-x-auto leading-relaxed text-[12px] font-mono">
                  {selectedIssue.diff.split("\n").map((line, idx) => {
                    if (line.startsWith("+")) {
                      return (
                        <div key={idx} className="diff-add px-2 py-0.5 rounded flex gap-3">
                          <span className="text-[#3fb950]/50 select-none w-6 text-right shrink-0">{idx + 1}</span>
                          <span>{line}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("-")) {
                      return (
                        <div key={idx} className="diff-del px-2 py-0.5 rounded flex gap-3">
                          <span className="text-[#f85149]/50 select-none w-6 text-right shrink-0">{idx + 1}</span>
                          <span>{line}</span>
                        </div>
                      );
                    }
                    if (line.startsWith("@")) {
                      return (
                        <div key={idx} className="text-[#8b949e] py-1 flex gap-3 font-semibold">
                          <span className="text-[#8b949e]/30 select-none w-6 text-right shrink-0">...</span>
                          <span>{line}</span>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="px-2 py-0.5 flex gap-3 text-[#f0f6fc]/80">
                        <span className="text-[#8b949e]/30 select-none w-6 text-right shrink-0">{idx + 1}</span>
                        <span>{line}</span>
                      </div>
                    );
                  })}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: TESTS */}
          {activeTab === "tests" && (
            <div className="space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between text-[#8b949e] text-[11px]">
                <span>Synthesized Regression Test Suite</span>
                <span className="text-[#3fb950] font-mono">Framework: Vitest / Jest</span>
              </div>
              <pre className="p-4 rounded-xl bg-[#050507] border border-[#30363d] text-[#f0f6fc] overflow-x-auto leading-relaxed text-[12px] font-mono">
                <code>{selectedIssue.testCode}</code>
              </pre>
            </div>
          )}

          {/* TAB 4: SANDBOX & BOT PR */}
          {activeTab === "sandbox" && (
            <div className="space-y-4 animate-fadeIn">
              {/* Sandbox Execution Status */}
              <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-lg bg-[#0e2e1a] border border-[#238636]/40 text-[#3fb950]">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white">
                      Sandbox Test Suite Passed (100%)
                    </div>
                    <div className="text-xs text-[#8b949e]">
                      Applied patch in isolated scratch repo · Executed test suite in {selectedIssue.sandboxDuration}
                    </div>
                  </div>
                </div>

                <span className="px-3 py-1 bg-[#238636] text-white rounded-md text-xs font-semibold shadow-sm">
                  Verified
                </span>
              </div>

              {/* Bot PR Simulation Card */}
              <div className="p-5 rounded-xl bg-[#050507] border border-[#30363d] space-y-3">
                <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#238636] text-white flex items-center justify-center text-[10px] font-bold">
                      A
                    </span>
                    <span className="text-xs font-bold text-white">atom-agent[bot]</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                      GitHub App Bot
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8b949e]">Just now</span>
                </div>

                <div className="space-y-2 text-xs font-sans text-[#f0f6fc]">
                  <p className="font-semibold text-white">
                    🤖 ATOM Autonomous Fix for Issue #{selectedIssue.number}
                  </p>
                  <p className="text-[#8b949e]">
                    ATOM identified root cause at <code className="text-[#3fb950] font-mono">{selectedIssue.fileCitation}</code>.
                    All automated regression tests passed in sandbox environment.
                  </p>
                  <div className="pt-2 flex items-center space-x-3">
                    <span className="text-[#3fb950] flex items-center space-x-1 font-mono text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>PR #{selectedIssue.number + 1} Opened Ready for Review</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
