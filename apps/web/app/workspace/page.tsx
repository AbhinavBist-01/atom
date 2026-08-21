"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FolderGit2,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Github,
  ArrowRight,
  Search,
  Check,
  Globe,
  Lock,
  Sparkles,
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

interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  language?: string | null;
}

export default function WorkspacePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Connected Repos from DB
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  // GitHub Repos from API
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [resolvedUsername, setResolvedUsername] = useState("");

  // Search & Combobox State
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  // Auth guard
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/");
    }
  }, [session, isPending, router]);

  const fetchConnectedRepos = async () => {
    try {
      setLoadingRepos(true);
      const res = await fetch(`${SERVER_URL}/api/repos`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error("Failed to fetch connected repos:", err);
    } finally {
      setLoadingRepos(false);
    }
  };

  const fetchUserGithubRepos = async () => {
    if (!session?.user) return;
    setLoadingGithubRepos(true);
    try {
      const initialHandle = (session.user.name || session.user.email?.split("@")[0] || "").trim();
      const params = new URLSearchParams();
      if (initialHandle) params.set("username", initialHandle);
      if (session.user.image) params.set("image", session.user.image);
      if (session.user.email) params.set("email", session.user.email);

      const res = await fetch(`${SERVER_URL}/api/repos/github-repos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.githubRepos || []);
        if (data.resolvedLogin) {
          setResolvedUsername(data.resolvedLogin);
        }
      }
    } catch (err) {
      console.error("Failed to fetch GitHub repos:", err);
    } finally {
      setLoadingGithubRepos(false);
    }
  };

  useEffect(() => {
    fetchConnectedRepos();
  }, []);

  useEffect(() => {
    if (session?.user) {
      fetchUserGithubRepos();
    }
  }, [session]);

  // Fast lookup of already connected full names
  const connectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of repos) {
      set.add(`${r.owner}/${r.repo}`.toLowerCase());
    }
    return set;
  }, [repos]);

  // Filtered dropdown list
  const filteredRepos = useMemo(() => {
    if (!searchQuery) return githubRepos.slice(0, 15);
    const q = searchQuery.toLowerCase().trim();
    return githubRepos
      .filter(
        (r) =>
          r.fullName.toLowerCase().includes(q) ||
          r.name.toLowerCase().includes(q) ||
          (r.language && r.language.toLowerCase().includes(q))
      )
      .slice(0, 20);
  }, [githubRepos, searchQuery]);

  const handleConnectRepo = async (owner: string, repo: string) => {
    const finalOwner = owner.trim();
    const finalRepo = repo.trim();
    if (!finalOwner || !finalRepo) return;

    setConnecting(true);
    setErrorMsg("");
    setIsDropdownOpen(false);

    try {
      const res = await fetch(`${SERVER_URL}/api/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: finalOwner, repo: finalRepo }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to connect repository");
      }

      setSearchQuery("");
      await fetchConnectedRepos();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect repository");
    } finally {
      setConnecting(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.includes("/")) {
      setErrorMsg("Please enter in format: owner/repository (e.g. facebook/react)");
      return;
    }
    const [owner, repo] = searchQuery.split("/");
    handleConnectRepo(owner, repo);
  };

  const handleReindex = async (id: string) => {
    try {
      await fetch(`${SERVER_URL}/api/repos/${id}/index`, { method: "POST" });
      await fetchConnectedRepos();
    } catch (err) {
      console.error("Re-index failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${SERVER_URL}/api/repos/${id}`, { method: "DELETE" });
      await fetchConnectedRepos();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  if (isPending || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-5 h-5 text-[#3fb950] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-4">
      {/* Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30363d] pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-xs font-mono text-[#3fb950]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>ATOM REPOSITORY WORKSPACE</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Connected Repositories
          </h1>
          <p className="text-xs text-[#8b949e]">
            Indexed codebases available for autonomous issue analysis and PR generation.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-zinc-300">
            @{resolvedUsername || session.user.name || "user"}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-[#3fb950] font-semibold">
            {repos.length} Indexed
          </span>
        </div>
      </div>

      {/* 1-Line Clean Repo Search / Connect Combobox */}
      <div className="space-y-2">
        <div className="relative">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search your GitHub repos or type 'owner/repo' to index..."
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  setErrorMsg("");
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-[#3fb950]/60 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-sm"
              />
              {loadingGithubRepos && (
                <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            <button
              type="submit"
              disabled={connecting || !searchQuery}
              className="gh-btn-green px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center space-x-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {connecting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-white" />
              )}
              <span>{connecting ? "Indexing…" : "Index Repo"}</span>
            </button>
          </form>

          {/* Quick Dropdown Picker */}
          {isDropdownOpen && filteredRepos.length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsDropdownOpen(false)}
              />
              <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden max-h-72 overflow-y-auto divide-y divide-[#30363d]/40">
                {filteredRepos.map((repo) => {
                  const isConnected = connectedSet.has(repo.fullName.toLowerCase());
                  return (
                    <div
                      key={repo.id}
                      onClick={() => {
                        if (!isConnected) {
                          handleConnectRepo(repo.owner, repo.name);
                        }
                      }}
                      className={`p-3 flex items-center justify-between transition cursor-pointer ${
                        isConnected
                          ? "bg-[#161b22]/40 opacity-70 cursor-default"
                          : "hover:bg-[#161b22]"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <FolderGit2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-semibold text-white truncate">
                          {repo.fullName}
                        </span>
                        {repo.private ? (
                          <span className="text-[10px] text-zinc-400 bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] flex items-center space-x-1">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-zinc-400 bg-[#161b22] px-1.5 py-0.5 rounded border border-[#30363d] flex items-center space-x-1">
                            <Globe className="w-2.5 h-2.5" />
                            <span>Public</span>
                          </span>
                        )}
                        {repo.language && (
                          <span className="text-[10px] font-mono text-zinc-400">
                            {repo.language}
                          </span>
                        )}
                      </div>

                      {isConnected ? (
                        <span className="text-[10px] font-mono text-[#3fb950] px-2 py-0.5 rounded bg-[#238636]/20 border border-[#238636]/40">
                          Connected
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="text-[11px] font-mono text-white bg-[#238636] hover:bg-[#2ea043] px-2.5 py-1 rounded-md transition"
                        >
                          + Connect
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 flex items-center space-x-1 font-mono">
            <span>✕ {errorMsg}</span>
          </p>
        )}
      </div>

      {/* Connected Repositories Grid / List */}
      <div className="space-y-3">
        {loadingRepos ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs flex flex-col items-center space-y-2">
            <Loader2 className="w-5 h-5 animate-spin text-[#3fb950]" />
            <span>Loading connected codebases…</span>
          </div>
        ) : repos.length === 0 ? (
          <div className="p-10 rounded-2xl bg-[#0d1117] border border-[#30363d] text-center space-y-3">
            <div className="p-2.5 w-fit mx-auto rounded-xl bg-[#161b22] border border-[#30363d] text-zinc-400">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">No repositories indexed yet</h3>
              <p className="text-xs text-[#8b949e] max-w-sm mx-auto">
                Search your GitHub repositories above to parse their AST chunks and start autonomous issue resolution.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="p-4 rounded-xl bg-[#0d1117] border border-[#30363d] hover:border-[#3fb950]/40 transition space-y-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2.5 truncate">
                    <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-white">
                      <FolderGit2 className="w-4 h-4" />
                    </div>
                    <div className="truncate">
                      <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                        {repo.owner} / {repo.repo}
                      </h3>
                      <p className="text-[10px] font-mono text-zinc-500">
                        Indexed: {repo.indexedAt ? new Date(repo.indexedAt).toLocaleDateString() : "Active"}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {repo.status === "ready" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40 flex items-center space-x-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                      <span>Ready</span>
                    </span>
                  ) : repo.status === "indexing" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center space-x-1 shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Indexing</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center space-x-1 shrink-0">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Error</span>
                    </span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-[#30363d]/50">
                  <Link
                    href={`/issues?owner=${repo.owner}&repo=${repo.repo}`}
                    className="text-xs font-semibold text-[#3fb950] hover:text-[#2ea043] flex items-center space-x-1 transition"
                  >
                    <span>Open Issues</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleReindex(repo.id)}
                      title="Re-index Codebase"
                      className="p-1.5 text-zinc-400 hover:text-white bg-[#161b22] hover:bg-[#21262d] rounded-lg border border-[#30363d] transition active:scale-95 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(repo.id)}
                      title="Disconnect Repo"
                      className="p-1.5 text-zinc-500 hover:text-red-400 bg-[#161b22] hover:bg-red-950/30 rounded-lg border border-[#30363d] hover:border-red-900/40 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
