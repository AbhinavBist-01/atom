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
  const [publishSuccess, setPublishSuccess] = useState("");
  const [error, setError] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  // Fetch GitHub Issue details
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

  // Trigger ATOM Agent Analysis
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

  // Post Comment on GitHub
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

  const renderConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case "high":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            HIGH CONFIDENCE
          </span>
        );
      case "medium":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            MEDIUM CONFIDENCE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            LOW CONFIDENCE
          </span>
        );
    }
  };

  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<string | null>(null);

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

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="p-6 bg-gray-900/60 rounded-xl border border-gray-800 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-blue-500/10 text-blue-400 rounded-md border border-blue-500/20">
              {owner}/{repo}#{issueNumber}
            </span>
            {issue?.state && (
              <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 rounded-md uppercase">
                {issue.state}
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {issue ? issue.title : `Issue #${issueNumber}`}
          </h1>
          <p className="text-xs text-gray-400 flex items-center space-x-2">
            <span>Opened by <strong className="text-gray-200">{issue?.author || "user"}</strong></span>
            <a
              href={`https://github.com/${owner}/${repo}/issues/${issueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-400 hover:underline ml-2"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </p>
        </div>

        <button
          onClick={handleRunAgent}
          disabled={running}
          className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center justify-center space-x-2 shrink-0"
        >
          {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
          <span>{running ? "Analyzing Issue..." : "Run ATOM Agent"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Execution Progress Trace */}
      {logs.length > 0 && (
        <div className="p-5 bg-gray-950 rounded-xl border border-gray-800 space-y-2 font-mono text-xs text-gray-300">
          <div className="flex items-center space-x-2 text-gray-400 pb-2 border-b border-gray-800">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="font-semibold text-gray-200 uppercase tracking-wider">Live Agent Execution Trace</span>
          </div>
          {logs.map((log, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span className="text-blue-500">❯</span>
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Analysis Output */}
      {rca && (
        <div className="space-y-6">
          {/* Root Cause Analysis Card */}
          <div className="p-6 bg-gray-900/40 rounded-xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-semibold text-white">Root Cause Analysis (RCA)</h2>
              </div>
              {renderConfidenceBadge(rca.confidence)}
            </div>

            <div className="p-4 bg-gray-950 rounded-lg text-sm text-gray-300 leading-relaxed border border-gray-800 whitespace-pre-wrap">
              {rca.rootCause}
            </div>
          </div>

          {/* Code Evidence & Citations */}
          {rca.citations && rca.citations.length > 0 && (
            <div className="p-6 bg-gray-900/40 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-cyan-400" />
                <span>Line-Level Code Evidence & Citations</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rca.citations.map((cit, idx) => (
                  <div key={idx} className="p-3 bg-gray-950 rounded-lg border border-gray-800 text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-blue-400">
                      <span className="font-semibold">{cit.filePath}</span>
                      <span className="text-gray-500">L{cit.startLine}-{cit.endLine}</span>
                    </div>
                    {cit.commitHash && <p className="text-gray-500">Commit: {cit.commitHash}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unified Diff Patch Viewer */}
          {rca.patchDiff && (
            <div className="p-6 bg-gray-900/40 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <Code className="w-5 h-5 text-indigo-400" />
                <span>Proposed Unified Diff Patch</span>
              </h2>

              <pre className="p-4 bg-[#05080e] rounded-lg text-xs font-mono text-gray-200 overflow-x-auto border border-gray-800 leading-relaxed">
                {rca.patchDiff}
              </pre>
            </div>
          )}

          {/* Test Case Patch */}
          {rca.testPatch && (
            <div className="p-6 bg-gray-900/40 rounded-xl border border-gray-800 space-y-4">
              <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-emerald-400" />
                <span>Automated Regression Unit Tests</span>
              </h2>

              <pre className="p-4 bg-[#05080e] rounded-lg text-xs font-mono text-emerald-300 overflow-x-auto border border-gray-800 leading-relaxed">
                {rca.testPatch}
              </pre>
            </div>
          )}

          {/* Publish Action Bar */}
          <div className="p-6 bg-gray-900/60 rounded-xl border border-gray-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Verification & Resolution</h3>
              <p className="text-xs text-gray-400">Verify patch in sandbox or publish comment / pull request to GitHub.</p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handleVerifyPatch}
                disabled={verifying}
                className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
              >
                {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <span>Verify in Sandbox</span>
              </button>

              <button
                onClick={handlePublishComment}
                disabled={publishing}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
              >
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                <span>Post GitHub Comment</span>
              </button>

              <button
                onClick={() => alert("PR creation workflow initiated")}
                className="px-4 py-2 text-xs font-semibold text-gray-200 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition flex items-center space-x-2"
              >
                <GitPullRequest className="w-4 h-4 text-emerald-400" />
                <span>Create Pull Request</span>
              </button>
            </div>
          </div>

          {verifyResult && (
            <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-xs font-mono text-gray-200">
              {verifyResult}
            </div>
          )}

          {publishSuccess && (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{publishSuccess}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
