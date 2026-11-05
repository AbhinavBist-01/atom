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
  Layers,
  Sparkles,
  Check,
  RefreshCw,
  GitCommit,
  FlaskConical,
  ShieldCheck,
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

interface Hypothesis {
  id: string;
  description: string;
  supportingEvidence: string[];
  counterEvidence: string[];
  likelihood: "low" | "medium" | "high";
  status: "investigating" | "confirmed" | "rejected";
}

interface FileModificationPlan {
  filePath: string;
  reason: string;
  functionsToModify: string[];
  expectedChange?: string;
}

interface PatchPlan {
  rootCause: string;
  filesToModify: FileModificationPlan[];
  expectedBehavior: string;
  regressionRisks: string;
  testStrategy: string;
}

interface TestExecution {
  command: string;
  passed: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  testCount?: number;
  passedCount?: number;
  failedCount?: number;
}

interface RcaResult {
  rootCause: string;
  confidence: "low" | "medium" | "high";
  citations: Citation[];
  patchDiff: string;
  testPatch: string;
  hypotheses?: Hypothesis[];
  patchPlan?: PatchPlan;
  isInconclusive?: boolean;
}

const PIPELINE_STEPS = [
  { id: "analyzing", label: "1. Intake & Context" },
  { id: "investigating", label: "2. Tool Investigation" },
  { id: "planning", label: "3. Patch Planning" },
  { id: "testing", label: "4. Sandbox Verification" },
  { id: "awaiting_approval", label: "5. Human Approval" },
  { id: "pr_created", label: "6. Pull Request" },
];

export default function IssueWorkbenchPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const issueNumber = params.number as string;

  const [issue, setIssue] = useState<IssueData | null>(null);
  const [rca, setRca] = useState<RcaResult | null>(null);
  const [testExecution, setTestExecution] = useState<TestExecution | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>("idle");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [prResult, setPrResult] = useState<{ number?: number; url?: string; branch?: string } | null>(null);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [error, setError] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  // 1. Fetch initial issue details
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

  // 2. Real-time SSE streaming for live state updates
  useEffect(() => {
    if (!runId) return;

    const eventSource = new EventSource(`${SERVER_URL}/api/runs/${runId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.step) {
          setRunStatus(data.step);
        }
        if (data.message) {
          setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${data.message}`]);
        }
        if (data.data?.testExecution) {
          setTestExecution(data.data.testExecution);
        }
      } catch {}
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [runId, SERVER_URL]);

  const handleRunAgent = async () => {
    setRunning(true);
    setError("");
    setRca(null);
    setTestExecution(null);
    setPrResult(null);
    setPublishSuccess("");
    setRunStatus("analyzing");
    setLogs([`[${new Date().toLocaleTimeString()}] Initializing ATOM 2.0 Autonomous Investigation Engine...`]);

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
      setRunStatus(data.status || "awaiting_approval");
      setRca(data.rca);
      if (data.testExecution) {
        setTestExecution(data.testExecution);
      }
    } catch (err: any) {
      setError(err.message || "Failed to complete agent run.");
      setRunStatus("failed");
    } finally {
      setRunning(false);
    }
  };

  const handleVerifySandbox = async () => {
    if (!runId) return;
    setVerifying(true);
    setError("");

    try {
      const res = await fetch(`${SERVER_URL}/api/runs/${runId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner, repo }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || "Verification failed");
      }

      setTestExecution(data.result);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Sandboxed validation completed: ${
          data.result.passed ? "100% Passed" : `Failed with exit code ${data.result.exitCode}`
        }`,
      ]);
    } catch (err: any) {
      setError(err.message || "Verification execution failed.");
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
      setRunStatus("pr_created");
      setPublishSuccess(`Pull Request #${data.prNumber || ""} created successfully on GitHub!`);
    } catch (err: any) {
      setError(err.message || "Create Pull Request failed.");
    } finally {
      setCreatingPr(false);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-0.5 text-xs font-mono font-semibold bg-[#161b22] text-[#f0f6fc] rounded-md border border-[#30363d]">
              {owner}/{repo}#{issueNumber}
            </span>
            {issue?.state && (
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40 rounded uppercase">
                {issue.state}
              </span>
            )}
            <span className="text-[10px] font-mono text-[#8b949e]">ATOM 2.0 Engine</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {issue ? issue.title : `Issue #${issueNumber}`}
          </h1>
          <p className="text-xs text-[#8b949e] flex items-center space-x-2">
            <span>Opened by <strong className="text-white">{issue?.author || "user"}</strong></span>
            <a
              href={`https://github.com/${owner}/${repo}/issues/${issueNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#58a6ff] hover:underline ml-2"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </p>
        </div>

        <button
          onClick={handleRunAgent}
          disabled={running}
          className="gh-btn-green px-6 py-3 text-xs rounded-xl font-semibold flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50 cursor-pointer shadow-lg"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{running ? "Autonomous Investigation..." : "Run ATOM 2.0 Pipeline"}</span>
        </button>
      </div>

      {/* State Machine Stepper */}
      <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] text-xs font-mono">
          {PIPELINE_STEPS.map((s, idx) => {
            const isCurrent = runStatus === s.id;
            const isPassed =
              (runStatus === "awaiting_approval" && idx < 4) ||
              (runStatus === "pr_created") ||
              (runStatus === "testing" && idx < 3) ||
              (runStatus === "planning" && idx < 2);

            return (
              <div key={s.id} className="flex items-center space-x-2">
                <div
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border ${
                    isCurrent
                      ? "bg-[#238636]/20 border-[#238636] text-[#3fb950] font-bold"
                      : isPassed
                      ? "bg-[#161b22] border-[#30363d] text-[#8b949e]"
                      : "bg-transparent border-transparent text-[#484f58]"
                  }`}
                >
                  {isPassed ? (
                    <Check className="w-3.5 h-3.5 text-[#3fb950]" />
                  ) : isCurrent ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#3fb950]" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full bg-[#30363d] text-[10px] flex items-center justify-center text-[#8b949e]">
                      {idx + 1}
                    </span>
                  )}
                  <span>{s.label}</span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <span className="text-[#30363d]">➔</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {publishSuccess && (
        <div className="p-4 bg-[#0e2e1a] border border-[#238636]/50 rounded-xl text-[#3fb950] text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{publishSuccess}</span>
        </div>
      )}

      {/* Real-time Agent Execution Trace */}
      {logs.length > 0 && (
        <div className="p-5 bg-[#050507] rounded-2xl border border-[#30363d] space-y-2 font-mono text-xs text-[#c9d1d9] shadow-inner">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-[#3fb950]" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Live Investigation & Tool-Calling Trace
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d]">
              Status: {runStatus}
            </span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start space-x-2">
                <span className="text-[#3fb950] select-none">❯</span>
                <span className="break-all">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Investigation & RCA Output */}
      {rca && (
        <div className="space-y-6">
          {/* Root Cause Analysis */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-[#3fb950]" />
                <h2 className="text-base font-bold text-white">Root Cause Analysis (RCA)</h2>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase ${
                rca.confidence === "high"
                  ? "bg-[#0e2e1a] text-[#3fb950] border border-[#238636]/40"
                  : rca.confidence === "medium"
                  ? "bg-[#21262d] text-[#f0f6fc] border border-[#30363d]"
                  : "bg-red-950/40 text-red-300 border border-red-500/30"
              }`}>
                {rca.confidence} Confidence
              </span>
            </div>

            <div className="p-4 bg-[#050507] rounded-xl text-xs text-[#c9d1d9] leading-relaxed border border-[#30363d] whitespace-pre-wrap font-mono">
              {rca.rootCause}
            </div>
          </div>

          {/* Candidate Hypotheses Evaluated */}
          {rca.hypotheses && rca.hypotheses.length > 0 && (
            <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FlaskConical className="w-5 h-5 text-[#3fb950]" />
                <span>Multi-Hypothesis Evaluation</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rca.hypotheses.map((hyp) => (
                  <div
                    key={hyp.id}
                    className={`p-4 rounded-xl border text-xs space-y-2 ${
                      hyp.status === "confirmed"
                        ? "bg-[#0e2e1a]/40 border-[#238636]/50"
                        : "bg-[#161b22] border-[#30363d]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">{hyp.id}</span>
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded font-bold ${
                        hyp.status === "confirmed"
                          ? "bg-[#238636] text-white"
                          : "bg-[#21262d] text-[#8b949e]"
                      }`}>
                        {hyp.status}
                      </span>
                    </div>
                    <p className="text-[#f0f6fc]">{hyp.description}</p>
                    {hyp.supportingEvidence?.length > 0 && (
                      <div className="text-[11px] text-[#8b949e] font-mono">
                        <span className="text-[#3fb950] font-semibold">Evidence: </span>
                        {hyp.supportingEvidence.join("; ")}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Line-Level Code Evidence & Citations */}
          {rca.citations && rca.citations.length > 0 && (
            <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-[#3fb950]" />
                <span>Line-Level Code Evidence & Citations</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {rca.citations.map((cit, idx) => (
                  <div key={idx} className="p-3 bg-[#050507] rounded-xl border border-[#30363d] text-xs font-mono space-y-1">
                    <div className="flex items-center justify-between text-white">
                      <span className="font-bold text-[#3fb950]">{cit.filePath}</span>
                      <span className="text-[#8b949e]">L{cit.startLine}-{cit.endLine}</span>
                    </div>
                    {cit.commitHash && <p className="text-[#8b949e] text-[11px]">Commit: {cit.commitHash}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Structured Patch Plan */}
          {rca.patchPlan && (
            <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-[#3fb950]" />
                <span>Structured Patch Plan & Target Modifications</span>
              </h2>

              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3.5 bg-[#161b22] rounded-xl border border-[#30363d] space-y-1">
                    <span className="text-[11px] text-[#8b949e] font-mono">Expected Behavior:</span>
                    <p className="text-xs text-[#f0f6fc]">{rca.patchPlan.expectedBehavior}</p>
                  </div>
                  <div className="p-3.5 bg-[#161b22] rounded-xl border border-[#30363d] space-y-1">
                    <span className="text-[11px] text-[#8b949e] font-mono">Regression Risks:</span>
                    <p className="text-xs text-[#f0f6fc]">{rca.patchPlan.regressionRisks}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] text-[#8b949e] font-mono">Files to Modify:</span>
                  <div className="space-y-2">
                    {rca.patchPlan.filesToModify?.map((f, i) => (
                      <div key={i} className="p-3 bg-[#050507] rounded-xl border border-[#30363d] text-xs font-mono flex items-center justify-between">
                        <div>
                          <span className="text-white font-bold">{f.filePath}</span>
                          <p className="text-[#8b949e] text-[11px] mt-0.5">{f.reason}</p>
                        </div>
                        {f.functionsToModify?.length > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[#21262d] text-[#3fb950] border border-[#30363d]">
                            {f.functionsToModify.join(", ")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sandboxed Test Runner Console */}
          {testExecution && (
            <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#3fb950]" />
                  <span>Sandboxed Test Execution Verification</span>
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                  testExecution.passed
                    ? "bg-[#0e2e1a] text-[#3fb950] border border-[#238636]/40"
                    : "bg-red-950/40 text-red-300 border border-red-500/30"
                }`}>
                  {testExecution.passed ? "PASSED (100%)" : `FAILED (Exit ${testExecution.exitCode})`}
                </span>
              </div>

              <div className="flex items-center space-x-4 text-xs font-mono text-[#8b949e]">
                <span>Command: <code className="text-white">{testExecution.command}</code></span>
                <span>Duration: <strong className="text-white">{testExecution.durationMs}ms</strong></span>
              </div>

              <pre className="p-4 bg-[#050507] rounded-xl text-xs font-mono text-[#c9d1d9] overflow-x-auto border border-[#30363d] max-h-48 leading-relaxed">
                {testExecution.stdout || testExecution.stderr || "No test output recorded."}
              </pre>

              <button
                onClick={handleVerifySandbox}
                disabled={verifying}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white rounded-lg text-xs font-mono flex items-center space-x-2 transition border border-[#30363d] cursor-pointer"
              >
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Re-verify Patch in Sandbox</span>
              </button>
            </div>
          )}

          {/* Proposed Unified Diff Patch */}
          {rca.patchDiff && (
            <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Code className="w-5 h-5 text-[#3fb950]" />
                <span>Proposed Unified Diff Patch</span>
              </h2>

              <pre className="p-4 bg-[#050507] rounded-xl text-xs font-mono text-[#f0f6fc] overflow-x-auto border border-[#30363d] leading-relaxed">
                {rca.patchDiff}
              </pre>
            </div>
          )}

          {/* Regression Unit Tests */}
          {rca.testPatch && (
            <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Cpu className="w-5 h-5 text-[#3fb950]" />
                <span>Automated Regression Unit Tests</span>
              </h2>

              <pre className="p-4 bg-[#050507] rounded-xl text-xs font-mono text-[#c9d1d9] overflow-x-auto border border-[#30363d] leading-relaxed">
                {rca.testPatch}
              </pre>
            </div>
          )}

          {/* Human Approval & Publishing Action Bar */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] flex flex-wrap items-center justify-between gap-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#3fb950]" />
                <span>Human Approval Gate & GitHub PR Publisher</span>
              </h3>
              <p className="text-xs text-[#8b949e]">
                Review the RCA, patch plan, and test verification before approving deployment to GitHub.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={handlePublishComment}
                disabled={publishing}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#21262d] hover:bg-[#30363d] text-white border border-[#30363d] transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                {publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                <span>Post Comment</span>
              </button>

              <button
                onClick={handleCreatePR}
                disabled={creatingPr || !rca.patchDiff}
                className="gh-btn-green px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {creatingPr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                <span>Approve & Open Pull Request</span>
              </button>
            </div>
          </div>

          {/* PR Created Banner */}
          {prResult && (
            <div className="p-5 bg-[#0e2e1a] border border-[#238636] rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3fb950]" />
                  <span>Pull Request #{prResult.number} Successfully Created!</span>
                </span>
                {prResult.url && (
                  <a
                    href={prResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-[#3fb950] hover:underline font-mono"
                  >
                    <span>View PR on GitHub</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <p className="text-[#8b949e] font-mono">Branch: {prResult.branch}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
