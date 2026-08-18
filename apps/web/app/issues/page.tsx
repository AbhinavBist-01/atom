"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Search,
  ArrowRight,
  Sparkles,
  FolderGit2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Github,
  Tag,
  Calendar,
  User,
  Plus,
  ExternalLink,
  Layers,
} from "lucide-react";
import { useSession } from "@/lib/auth-client";

interface Repository {
  id: string;
  owner: string;
  repo: string;
  status: "pending" | "indexing" | "ready" | "error";
  indexedAt?: string;
  createdAt: string;
}

interface IssueItem {
  number: number;
  title: string;
  body: string;
  state: string;
  author: string;
  labels: string[];
  createdAt: string;
}

export default function IssuesWorkbenchDirectoryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();

  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [selectedRepoId, setSelectedRepoId] = useState<string>("");

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issueSearch, setIssueSearch] = useState("");

  const [manualIssueNum, setManualIssueNum] = useState("");
  const [issueUrl, setIssueUrl] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  // Client-side auth guard
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/");
    }
  }, [session, isPending, router]);

  // 1. Fetch connected/indexed repositories from database
  const fetchRepos = async () => {
    setLoadingRepos(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/repos`);
      if (res.ok) {
        const data = await res.json();
        const repoList: Repository[] = data.repos || [];
        setRepos(repoList);

        // Check if owner & repo query params match an existing repo
        const paramOwner = searchParams.get("owner");
        const paramRepo = searchParams.get("repo");

        if (paramOwner && paramRepo) {
          const matched = repoList.find(
            (r) =>
              r.owner.toLowerCase() === paramOwner.toLowerCase() &&
              r.repo.toLowerCase() === paramRepo.toLowerCase()
          );
          if (matched) {
            setSelectedRepoId(matched.id);
          } else if (repoList.length > 0) {
            setSelectedRepoId(repoList[0].id);
          }
        } else if (repoList.length > 0 && !selectedRepoId) {
          setSelectedRepoId(repoList[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch connected repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  // Currently selected repository object
  const activeRepo = useMemo(() => {
    return repos.find((r) => r.id === selectedRepoId) || null;
  }, [repos, selectedRepoId]);

  // 2. Fetch issues for the currently selected indexed repository
  useEffect(() => {
    if (!activeRepo) {
      setIssues([]);
      return;
    }

    const fetchRepoIssues = async () => {
      setLoadingIssues(true);
      try {
        const res = await fetch(`${SERVER_URL}/api/issues/${activeRepo.owner}/${activeRepo.repo}`);
        if (res.ok) {
          const data = await res.json();
          setIssues(data.issues || []);
        } else {
          setIssues([]);
        }
      } catch (err) {
        console.error(`Failed to fetch issues for ${activeRepo.owner}/${activeRepo.repo}:`, err);
        setIssues([]);
      } finally {
        setLoadingIssues(false);
      }
    };

    fetchRepoIssues();
  }, [activeRepo]);

  // Filter issues by title / label
  const filteredIssues = useMemo(() => {
    if (!issueSearch) return issues;
    const term = issueSearch.toLowerCase();
    return issues.filter(
      (iss) =>
        iss.title.toLowerCase().includes(term) ||
        String(iss.number).includes(term) ||
        iss.labels.some((l) => l.toLowerCase().includes(term)) ||
        iss.author.toLowerCase().includes(term)
    );
  }, [issues, issueSearch]);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueUrl) return;

    try {
      const urlObj = new URL(issueUrl);
      const parts = urlObj.pathname.split("/").filter(Boolean);
      if (parts.length >= 4 && parts[2] === "issues") {
        const parsedOwner = parts[0];
        const parsedRepo = parts[1];
        const parsedNum = parts[3];
        router.push(`/issues/${parsedOwner}/${parsedRepo}/${parsedNum}`);
      } else {
        alert("Invalid GitHub Issue URL. Expected format: https://github.com/owner/repo/issues/123");
      }
    } catch {
      alert("Invalid URL string provided.");
    }
  };

  const handleManualIssueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRepo || !manualIssueNum) return;
    router.push(`/issues/${activeRepo.owner}/${activeRepo.repo}/${manualIssueNum.trim()}`);
  };

  if (isPending || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 py-2">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
            <AlertCircle className="w-7 h-7 text-white" />
            <span>Issue Workbench</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Browse and inspect issues across your indexed codebases. Launch evidence-first Root Cause Analysis (RCA) and generate test-backed patches.
          </p>
        </div>

        <Link
          href="/workspace"
          className="glass-button-secondary px-4 py-2 text-xs rounded-xl font-semibold flex items-center space-x-2 shrink-0 self-start md:self-auto"
        >
          <FolderGit2 className="w-4 h-4 text-zinc-300" />
          <span>Manage Repositories</span>
        </Link>
      </div>

      {/* Main Layout: Repository Selector & Issues Explorer */}
      {loadingRepos ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      ) : repos.length === 0 ? (
        /* Empty state: No indexed repositories */
        <div className="glass-panel p-12 text-center rounded-2xl border border-white/10 space-y-4 max-w-2xl mx-auto">
          <Layers className="w-12 h-12 text-zinc-600 mx-auto" />
          <h2 className="text-lg font-bold text-white">No Indexed Repositories Found</h2>
          <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
            The Issue Workbench requires an indexed repository to generate line-level code citations and unified diff patches.
          </p>
          <div className="pt-2">
            <Link
              href="/workspace"
              className="glass-button-primary px-6 py-2.5 text-xs rounded-xl font-semibold inline-flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Connect & Index a Repository First</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Indexed Repositories Selector Bar */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center space-x-2">
                <FolderGit2 className="w-4 h-4 text-white" />
                <span>Select an Indexed Repository</span>
              </label>
              <span className="text-xs text-zinc-500 font-mono">
                {repos.length} Codebase{repos.length > 1 ? "s" : ""} Available
              </span>
            </div>

            {/* Horizontal Repo Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
              {repos.map((r) => {
                const isSelected = r.id === selectedRepoId;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRepoId(r.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2.5 shrink-0 transition ${
                      isSelected
                        ? "bg-white text-black shadow-lg"
                        : "bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10"
                    }`}
                  >
                    <FolderGit2 className={`w-3.5 h-3.5 ${isSelected ? "text-black" : "text-zinc-400"}`} />
                    <span>
                      {r.owner}/{r.repo}
                    </span>
                    {r.status === "ready" && (
                      <span className={`w-2 h-2 rounded-full ${isSelected ? "bg-emerald-600" : "bg-emerald-400"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Active Repository Details & Direct Intake */}
          {activeRepo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Active Repo Summary Card */}
              <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Github className="w-4 h-4 text-zinc-400" />
                    <h2 className="text-sm font-bold text-white truncate">
                      {activeRepo.owner} / {activeRepo.repo}
                    </h2>
                  </div>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    Status: <span className="text-emerald-400 font-semibold">{activeRepo.status.toUpperCase()}</span> ·
                    Indexed: {activeRepo.indexedAt ? new Date(activeRepo.indexedAt).toLocaleDateString() : "Pending"}
                  </p>
                </div>

                <a
                  href={`https://github.com/${activeRepo.owner}/${activeRepo.repo}/issues`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1.5 pt-2 border-t border-white/5 transition"
                >
                  <span>View on GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Direct Issue Number Intake for Active Repo */}
              <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                  <span>Inspect Issue # in this Codebase</span>
                </h3>
                <form onSubmit={handleManualIssueSubmit} className="flex gap-2">
                  <input
                    type="number"
                    placeholder="e.g. 1"
                    value={manualIssueNum}
                    onChange={(e) => setManualIssueNum(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!manualIssueNum}
                    className="glass-button-primary px-4 py-1.5 text-xs rounded-xl font-semibold flex items-center space-x-1 shrink-0 disabled:opacity-50"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </form>
              </div>

              {/* URL Intake */}
              <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center space-x-2">
                  <Search className="w-3.5 h-3.5 text-white" />
                  <span>Or Paste Full GitHub Issue URL</span>
                </h3>
                <form onSubmit={handleUrlSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="https://github.com/..."
                    value={issueUrl}
                    onChange={(e) => setIssueUrl(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!issueUrl}
                    className="glass-button-secondary px-4 py-1.5 text-xs rounded-xl font-semibold flex items-center space-x-1 shrink-0 disabled:opacity-50"
                  >
                    <span>Open</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* 3. Issues List for Active Indexed Codebase */}
          {activeRepo && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-white" />
                  <h3 className="text-base font-bold text-white">
                    Open Issues for {activeRepo.owner}/{activeRepo.repo}
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono bg-white/5 px-2 py-0.5 rounded border border-white/10">
                    {issues.length}
                  </span>
                </div>

                {/* Filter Search */}
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter issues or labels..."
                    value={issueSearch}
                    onChange={(e) => setIssueSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
                  />
                </div>
              </div>

              {loadingIssues ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="glass-card p-12 text-center rounded-2xl border border-white/10 space-y-2">
                  <AlertCircle className="w-8 h-8 text-zinc-600 mx-auto" />
                  <p className="text-sm font-semibold text-zinc-300">No open issues found</p>
                  <p className="text-xs text-zinc-500">
                    {issues.length === 0
                      ? "There are currently no open issues in this repository on GitHub. You can enter an issue number above to inspect past or closed issues."
                      : "No issues match your filter."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {filteredIssues.map((iss) => (
                    <Link
                      key={iss.number}
                      href={`/issues/${activeRepo.owner}/${activeRepo.repo}/${iss.number}`}
                      className="glass-card p-4 rounded-xl border border-white/10 hover:border-white/25 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition group"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-xs font-mono font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/10">
                            #{iss.number}
                          </span>
                          <h4 className="text-sm font-semibold text-white group-hover:text-zinc-200 truncate">
                            {iss.title}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                          <span className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>{iss.author}</span>
                          </span>

                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(iss.createdAt).toLocaleDateString()}</span>
                          </span>

                          {iss.labels.length > 0 && (
                            <div className="flex items-center gap-1.5">
                              <Tag className="w-3 h-3 text-zinc-500" />
                              {iss.labels.slice(0, 3).map((l, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-zinc-300 border border-white/5"
                                >
                                  {l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                        <span className="text-xs font-semibold text-white group-hover:underline flex items-center space-x-1">
                          <span>Launch RCA Workbench</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
