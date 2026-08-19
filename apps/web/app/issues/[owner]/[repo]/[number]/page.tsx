"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  Play,
  CheckCircle2,
  FileCode,
  GitPullRequest,
  MessageSquare,
  ShieldAlert,
  Loader2,
  ExternalLink,
  Code,
  Terminal,
  Cpu,
} from "lucide-react";

interface IssueData {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  labels: string[];
  createdAt: string;
}

interface Citation {
  id?: string;
  filePath: string;
  startLine: number;
  endLine: number;
  commitHash?: string;
  relevanceScore?: number;
}

interface RcaResult {
  rootCause: string;
  confidence: "low" | "medium" | "high";
  citations: Citation[];
  patchDiff: string;
  testPatch: string;
}

export default function IssueWorkbenchPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const issueNumber = params.number as string;

  const [issue, setIssue] = useState<IssueData | null>(null);
  const [rca, setRca] = useState<RcaResult | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<{ number?: number; url?: string; branch?: string } | null>(null);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);
  const [error, setError] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  useEffect(() => {
    async function fetchIssue() {
      try {
        const res = await fetch(`${SERVER_URL}/api/issues/${owner}/${repo}/${issueNumber}`);
        if (res.ok) {
          const data = await res.json();
          setIssue(data.issue);
        } else {
          setError("Failed to fetch issue details from GitHub.");
        }
      } catch (err: any) {
        setError(err.message || "Network error fetching issue.");
      }
    }
    if (owner && repo && issueNumber) {
      fetchIssue();
    }
  }, [owner, repo, issueNumber, SERVER_URL]);

  const handleRunAgent = async () => {
    setRunning(true);
    setError("");
    setRca(null);
    setLogs(["[00:00] Initializing ATOM Autonomous Agent run..."]);

    try {
      const res = await fetch(`${SERVER_URL}/api/issues/${owner}/${repo}/${issueNumber}/run`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || errData.message || "Agent execution failed");
      }

      const data = await res.json();
      setRunId(data.runId);
      setRca(data.rca);

      setLogs((prev) => [
        ...prev,
        "[00:01] Fetched code chunks from repository index.",
        "[00:02] Executed LLM evidence-first reasoning chain.",
        "[00:03] Root cause analysis and diff patch generated successfully!",
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to complete agent run.");
    } finally {
      setRunning(false);
    }
  };

  const handleVerifyPatch = async () => {
    if (!runId) return;
    setVerifying(true);
    setVerifyResult(null);

    try {
      const res = await fetch(`${SERVER_URL}/api/runs/${runId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        if (data.result.passed) {
          setVerifyResult("✅ Sandbox Test Verification PASSED!");
        } else {
          setVerifyResult(`❌ Sandbox Test Verification FAILED: ${data.result.error || data.result.stderr}`);
        }
      } else {
        throw new Error(data.message || "Verification failed");
      }
    } catch (err: any) {
      setVerifyResult(`❌ Verification Error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handlePublishComment = async () => {
    if (!runId) return;
    setPublishing(true);
    setPublishSuccess("");

    try {
      const res = await fetch(`${SERVER_URL}/api/runs/${runId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", owner, repo, issueNumber: parseInt(issueNumber, 10) }),
      });

      if (res.ok) {
        setPublishSuccess("Comment posted successfully to GitHub issue!");
      } else {
        throw new Error("Failed to post comment");
      }
    } catch (err: any) {
      setError(err.message || "Publish comment failed.");
    } finally {
      setPublishing(false);
    }
  };

  const handleCreatePR = async () => {
    if (!runId) return;
    setCreatingPr(true);
    setError("");
    setPublishSuccess("");
    setPrResult(null);

    try {
      const res = await fetch(`${SERVER_URL}/api/runs/${runId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pr", owner, repo, issueNumber: parseInt(issueNumber, 10) }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to create Pull Request");
      }

      setPrResult({
        number: data.prNumber,
        url: data.prUrl,
        branch: data.branch,
      });
      setPublishSuccess(`Pull Request #${data.prNumber || ""} created successfully on GitHub!`);
    } catch (err: any) {
      setError(err.message || "Create Pull Request failed.");
    } finally {
      setCreatingPr(false);
    }
  };

  const renderConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white border border-white/20">
            HIGH CONFIDENCE
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
            MEDIUM CONFIDENCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-red-500/10 text-red-400 border border-red-500/20">
            LOW CONFIDENCE
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-white/10 text-white rounded-md border border-white/10">
              {owner}/{repo}#{issueNumber}
            </span>
            {issue?.state && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-white/10 text-zinc-300 rounded uppercase">
                {issue.state}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {issue ? issue.title : `Issue #${issueNumber}`}
          </h1>
          <p className="text-xs text-zinc-400 flex items-center space-x-2">
            <span>Opened by <strong className="text-white">{issue?.author || "user"}</strong></span>
            <a
              href={`https://github.com/${owner}/${repo}/issues/${issueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-zinc-300 hover:text-white underline ml-2"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </p>
        </div>

        <button
          onClick={handleRunAgent}
          disabled={running}
          className="glass-button-primary px-6 py-3 text-xs rounded-xl font-semibold flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{running ? "Analyzing Issue..." : "Run ATOM Agent"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Execution Progress Console */}
      {logs.length > 0 && (
        <div className="p-5 bg-black/80 rounded-2xl border border-white/10 space-y-2 font-mono text-xs text-zinc-300">
          <div className="flex items-center space-x-2 text-zinc-400 pb-2 border-b border-white/10">
            <Terminal className="w-4 h-4 text-white" />
            <span className="font-bold text-white uppercase tracking-wider text-[11px]">Live Agent Execution Trace</span>
          </div>
          {logs.map((log, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="text-white">❯</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main RCA Output */}
      {rca && (
        <div className="space-y-6">
          {/* Root Cause Analysis */}
          <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-white" />
                <h2 className="text-base font-bold text-white">Root Cause Analysis (RCA)</h2>
              </div>
              {renderConfidenceBadge(rca.confidence)}
            </div>

            <div className="p-4 bg-black/60 rounded-xl text-xs text-zinc-300 leading-relaxed border border-white/5 whitespace-pre-wrap font-mono">
              {rca.rootCause}
            </div>
          </div>

          {/* Line-Level Code Evidence */}
          {rca.citations && rca.citations.length > 0 && (
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-white" />
                <span>Line-Level Code Evidence & Citations</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rca.citations.map((cit, idx) => (
                  <div key={idx} className="p-3 bg-black/60 rounded-xl border border-white/10 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-white">
                      <span className="font-bold">{cit.filePath}</span>
                      <span className="text-zinc-500">L{cit.startLine}-{cit.endLine}</span>
                    </div>
                    {cit.commitHash && <p className="text-zinc-500 text-[11px]">Commit: {cit.commitHash}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proposed Unified Diff Patch */}
          {rca.patchDiff && (
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Code className="w-5 h-5 text-white" />
                <span>Proposed Unified Diff Patch</span>
              </h2>

              <pre className="p-4 bg-black rounded-xl text-xs font-mono text-zinc-200 overflow-x-auto border border-white/10 leading-relaxed">
                {rca.patchDiff}
              </pre>
            </div>
          )}

          {/* Regression Unit Tests */}
          {rca.testPatch && (
            <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-white" />
                <span>Automated Regression Unit Tests</span>
              </h2>

              <pre className="p-4 bg-black rounded-xl text-xs font-mono text-zinc-300 overflow-x-auto border border-white/10 leading-relaxed">
                {rca.testPatch}
              </pre>
            </div>
          )}

          {/* Resolution Action Bar */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-white">Verification & Resolution</h3>
              <p className="text-xs text-zinc-400">Verify patch in sandboxed runner or publish comment / pull request to GitHub.</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleVerifyPatch}
                disabled={verifying}
                className="glass-button-secondary px-4 py-2 text-xs rounded-xl font-semibold flex items-center space-x-2 disabled:opacity-50"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Verify in Sandbox</span>
              </button>

              <button
                onClick={handlePublishComment}
                disabled={publishing}
                className="glass-button-primary px-4 py-2 text-xs rounded-xl font-semibold flex items-center space-x-2 disabled:opacity-50"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                <span>Post GitHub Comment</span>
              </button>

              <button
                onClick={handleCreatePR}
                disabled={creatingPr}
                className="glass-button-secondary px-4 py-2 text-xs rounded-xl font-semibold flex items-center space-x-2 disabled:opacity-50"
              >
                {creatingPr ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitPullRequest className="w-4 h-4 text-white" />}
                <span>{creatingPr ? "Creating PR..." : "Create Pull Request"}</span>
              </button>
            </div>
          </div>

          {verifyResult && (
            <div className="p-4 bg-black border border-white/10 rounded-xl text-xs font-mono text-zinc-200">
              {verifyResult}
            </div>
          )}

          {prResult && (
            <div className="p-4 bg-white/5 border border-white/20 rounded-xl text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                <span className="text-zinc-200">
                  Pull Request <strong className="text-white">#{prResult.number}</strong> opened successfully{prResult.branch ? ` on branch ` : ""}
                  {prResult.branch && <code className="text-zinc-400 bg-white/10 px-1.5 py-0.5 rounded font-mono">{prResult.branch}</code>}
                </span>
              </div>
              {prResult.url && (
                <a
                  href={prResult.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass-button-primary px-3 py-1.5 text-xs rounded-lg font-semibold flex items-center space-x-1.5"
                >
                  <span>View Pull Request #{prResult.number}</span>
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              )}
            </div>
          )}

          {publishSuccess && !prResult && (
            <div className="p-4 bg-white/10 border border-white/20 rounded-xl text-white text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{publishSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
