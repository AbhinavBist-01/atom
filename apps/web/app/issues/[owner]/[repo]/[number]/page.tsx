"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileCode2,
  Layers,
  Sparkles,
  GitPullRequest,
  MessageSquare,
  Search,
  Code,
  Cpu,
  Clock,
  Terminal,
  ChevronRight,
  Check,
  RefreshCw,
  GitCommit,
  FlaskConical,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
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

interface VerificationStage {
  name: string;
  status: "passed" | "failed" | "inconclusive" | "skipped" | "not_configured";
  command?: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  exitCode: number;
  failureReason?: string;
}

interface VerificationReport {
  taskId: string;
  runId: string;
  repoRef: string;
  prEligible: boolean;
  humanApprovalRequired: boolean;
  repairAttempts: number;
  stages: VerificationStage[];
  summary: string;
  createdAt: string;
}

interface RcaResult {
  rootCause: string;
  confidence: "low" | "medium" | "high";
  citations: Citation[];
  patchDiff: string;
  testPatch: string;
  hypotheses?: Hypothesis[];
  patchPlan?: PatchPlan;
  verificationReport?: VerificationReport;
  isInconclusive?: boolean;
}

const PIPELINE_STEPS = [
  { id: "analyzing", label: "1. Intake & Context" },
  { id: "investigating", label: "2. Tool Investigation" },
  { id: "planning", label: "3. Patch Planning" },
  { id: "testing", label: "4. Code Verification" },
  { id: "awaiting_approval", label: "5. Human Approval" },
  { id: "pr_created", label: "6. Draft PR" },
];

export default function IssueWorkbenchPage() {
  const params = useParams();
  const owner = params.owner as string;
  const repo = params.repo as string;
  const issueNumber = params.number as string;

  const [issue, setIssue] = useState<IssueData | null>(null);
  const [rca, setRca] = useState<RcaResult | null>(null);
  const [verificationReport, setVerificationReport] = useState<VerificationReport | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string>("idle");
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [verifying, setVerifying] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [creatingPr, setCreatingPr] = useState(false);
  const [forceOverride, setForceOverride] = useState(false);
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
        if (data.data?.stages) {
          setVerificationReport(data.data);
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
    setVerificationReport(null);
    setPrResult(null);
    setPublishSuccess("");
    setRunStatus("analyzing");
    setLogs([`[${new Date().toLocaleTimeString()}] Initializing ATOM Autonomous Investigation Engine...`]);

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
      if (data.verificationReport) {
        setVerificationReport(data.verificationReport);
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

      setVerificationReport(data.report);
      setLogs((prev) => [
        ...prev,
        `[${new Date().toLocaleTimeString()}] Verification completed: ${data.report.summary}`,
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
        body: JSON.stringify({
          action: "pr",
          owner,
          repo,
          issueNumber: parseInt(issueNumber, 10),
          forceOverride,
          humanApprovalReason: forceOverride ? "Authorized manual PR creation by user" : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to create Draft Pull Request");
      }

      setPrResult({
        number: data.prNumber,
        url: data.prUrl,
        branch: data.branch,
      });
      setRunStatus("pr_created");
      setPublishSuccess(`Draft Pull Request #${data.prNumber || ""} created successfully on GitHub!`);
    } catch (err: any) {
      setError(err.message || "Create Pull Request failed.");
    } finally {
      setCreatingPr(false);
    }
  };

  const getStageBadgeColor = (status: string) => {
    switch (status) {
      case "passed":
        return "bg-emerald-950/40 text-emerald-300 border-emerald-500/40";
      case "failed":
        return "bg-red-950/40 text-red-300 border-red-500/40";
      case "inconclusive":
        return "bg-amber-950/40 text-amber-300 border-amber-500/40";
      default:
        return "bg-[#161b22] text-[#8b949e] border-[#30363d]";
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
            <span className="text-[10px] font-mono text-[#8b949e]">ATOM Autonomous Engine</span>
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
              className="text-[#58a6ff] hover:underline flex items-center space-x-1 font-mono text-[11px]"
            >
              <span>View Issue</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        <button
          onClick={handleRunAgent}
          disabled={running}
          className="gh-btn-green px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50 text-sm whitespace-nowrap self-start md:self-auto"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
          <span>{running ? "Investigating..." : "Launch ATOM Agent"}</span>
        </button>
      </div>

      {/* 6-Stage Visual Pipeline Stepper */}
      <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] overflow-x-auto">
        <div className="flex items-center justify-between min-w-[650px] gap-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const stepOrder = ["idle", "analyzing", "investigating", "planning", "testing", "awaiting_approval", "pr_created"];
            const currentIndex = stepOrder.indexOf(runStatus);
            const thisIndex = stepOrder.indexOf(step.id);
            const isDone = currentIndex > thisIndex || runStatus === "pr_created";
            const isCurrent = runStatus === step.id;

            return (
              <React.Fragment key={step.id}>
                <div className="flex items-center space-x-2">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition ${
                      isDone
                        ? "bg-[#238636] text-white"
                        : isCurrent
                        ? "bg-[#1f6feb] text-white ring-2 ring-[#58a6ff]/40 animate-pulse"
                        : "bg-[#21262d] text-[#8b949e] border border-[#30363d]"
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-mono whitespace-nowrap ${
                      isCurrent ? "text-white font-bold" : isDone ? "text-[#3fb950]" : "text-[#8b949e]"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 ${isDone ? "bg-[#238636]" : "bg-[#21262d]"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Notifications / Feedback */}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center space-x-3 text-red-200 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {publishSuccess && (
        <div className="p-4 bg-[#0e2e1a] border border-[#238636] rounded-xl flex items-center space-x-3 text-[#3fb950] text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#3fb950] shrink-0" />
          <span>{publishSuccess}</span>
        </div>
      )}

      {/* Live Agent Execution Logs */}
      {logs.length > 0 && (
        <div className="bg-[#050507] p-4 rounded-xl border border-[#30363d] space-y-2">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#8b949e]">
            <Terminal className="w-3.5 h-3.5 text-[#3fb950]" />
            <span>Autonomous Execution Trace</span>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 text-[11px] font-mono text-[#c9d1d9] pr-2">
            {logs.map((log, i) => (
              <div key={i} className="leading-tight">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Output Panels */}
      {rca && (
        <div className="space-y-6">
          {/* Root Cause Analysis Banner */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Search className="w-5 h-5 text-[#3fb950]" />
                <span>Root Cause Diagnosis</span>
              </h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
                rca.confidence === "high"
                  ? "bg-[#0e2e1a] text-[#3fb950] border border-[#238636]/40"
                  : "bg-yellow-950/40 text-yellow-300 border border-yellow-500/30"
              }`}>
                {rca.confidence} Confidence
              </span>
            </div>
            <p className="text-xs text-[#c9d1d9] leading-relaxed bg-[#161b22] p-4 rounded-xl border border-[#30363d]">
              {rca.rootCause}
            </p>
          </div>

          {/* 8-Stage Autonomous Verification Scorecard */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#3fb950]" />
                  <span>8-Stage Autonomous Verification Engine</span>
                </h2>
                <p className="text-xs text-[#8b949e] mt-1">
                  Patches are verified in an isolated Git worktree before draft PR eligibility.
                </p>
              </div>

              <button
                onClick={handleVerifySandbox}
                disabled={verifying}
                className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-white rounded-lg text-xs font-mono flex items-center space-x-2 transition border border-[#30363d] cursor-pointer"
              >
                {verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>{verifying ? "Verifying..." : "Run Isolated Verification"}</span>
              </button>
            </div>

            {/* Matrix of 8 stages */}
            {verificationReport?.stages && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {verificationReport.stages.map((stage, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${getStageBadgeColor(stage.status)}`}
                  >
                    <span className="text-[11px] font-mono font-semibold uppercase">{stage.name.replace(/_/g, " ")}</span>
                    <span className="text-xs font-bold font-mono uppercase">{stage.status}</span>
                    <span className="text-[10px] text-[#8b949e] font-mono">{stage.durationMs}ms</span>
                  </div>
                ))}
              </div>
            )}

            {/* Verification Gate Result Banner */}
            {verificationReport && (
              <div className={`p-4 rounded-xl border flex flex-col space-y-2 ${
                verificationReport.prEligible
                  ? "bg-[#0e2e1a] border-[#238636] text-[#3fb950]"
                  : "bg-red-950/30 border-red-500/40 text-red-200"
              }`}>
                <div className="flex items-center space-x-2 font-bold text-xs">
                  {verificationReport.prEligible ? (
                    <CheckCircle2 className="w-4 h-4 text-[#3fb950]" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-red-400" />
                  )}
                  <span>
                    {verificationReport.prEligible
                      ? "Deterministic Verification Gate: PASSED — Eligible for Draft PR"
                      : "Deterministic Verification Gate: BLOCKED"}
                  </span>
                </div>
                <p className="text-xs text-[#c9d1d9]">{verificationReport.summary}</p>
              </div>
            )}
          </div>

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
                <span>Automated Regression Test Case</span>
              </h2>

              <pre className="p-4 bg-[#050507] rounded-xl text-xs font-mono text-[#c9d1d9] overflow-x-auto border border-[#30363d] leading-relaxed">
                {rca.testPatch}
              </pre>
            </div>
          )}

          {/* Human Approval & Draft PR Action Bar */}
          <div className="bg-[#0d1117] p-6 rounded-2xl border border-[#30363d] flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[#3fb950]" />
                <span>Verification Gate & GitHub Draft PR Publisher</span>
              </h3>
              <p className="text-xs text-[#8b949e]">
                Draft PR creation requires all 8 verification stages to pass, or explicit human override authorization.
              </p>
              {verificationReport && !verificationReport.prEligible && (
                <label className="flex items-center space-x-2 text-xs text-amber-300 font-mono mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceOverride}
                    onChange={(e) => setForceOverride(e.target.checked)}
                    className="rounded border-[#30363d] text-[#238636] focus:ring-0"
                  />
                  <span>Authorize manual human override to create Draft PR anyway</span>
                </label>
              )}
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
                disabled={Boolean(
                  creatingPr ||
                    !rca.patchDiff ||
                    (verificationReport &&
                      !verificationReport.prEligible &&
                      !forceOverride),
                )}
                className="gh-btn-green px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {creatingPr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitPullRequest className="w-3.5 h-3.5" />}
                <span>Approve & Open Draft PR</span>
              </button>
            </div>
          </div>

          {/* Draft PR Created Banner */}
          {prResult && (
            <div className="p-5 bg-[#0e2e1a] border border-[#238636] rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#3fb950]" />
                  <span>Draft Pull Request #{prResult.number} Successfully Created!</span>
                </span>
                {prResult.url && (
                  <a
                    href={prResult.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 text-[#3fb950] hover:underline font-mono"
                  >
                    <span>View Draft PR on GitHub</span>
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
