"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Layers,
  ChevronDown,
  Edit2,
  ExternalLink,
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
  description?: string | null;
}

export default function WorkspacePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // Connected Repositories from Database
  const [repos, setRepos] = useState<Repository[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(true);

  // GitHub Repositories from API
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [resolvedUsername, setResolvedUsername] = useState("");
  const [customHandle, setCustomHandle] = useState("");
  const [isEditingHandle, setIsEditingHandle] = useState(false);

  // Combobox & Dropdown State
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  // Auth guard
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/");
    }
  }, [session, isPending, router]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const fetchUserGithubRepos = async (overrideUser?: string) => {
    if (!session?.user && !overrideUser) return;
    setLoadingGithubRepos(true);
    setErrorMsg("");

    try {
      const handle = (overrideUser || customHandle || session?.user?.name || session?.user?.email?.split("@")[0] || "").trim();
      const params = new URLSearchParams();
      if (handle) params.set("username", handle);
      if (session?.user?.image) params.set("image", session.user.image);
      if (session?.user?.email) params.set("email", session.user.email);

      const res = await fetch(`${SERVER_URL}/api/repos/github-repos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.githubRepos || []);
        if (data.resolvedLogin) {
          setResolvedUsername(data.resolvedLogin);
          if (!customHandle) setCustomHandle(data.resolvedLogin);
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

  // Polling loop for active indexing jobs
  useEffect(() => {
    const isAnyIndexing = repos.some((r) => r.status === "indexing" || r.status === "pending");
    if (!isAnyIndexing) return;

    const interval = setInterval(() => {
      fetchConnectedRepos();
    }, 2500);

    return () => clearInterval(interval);
  }, [repos]);

  // Fast lookup of already connected full names
  const connectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of repos) {
      set.add(`${r.owner}/${r.repo}`.toLowerCase());
    }
    return set;
  }, [repos]);

  // Filtered dropdown list (shows all matches, scrollable)
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return githubRepos;
    const q = searchQuery.toLowerCase().trim();
    return githubRepos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.name.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
    );
  }, [githubRepos, searchQuery]);

  const handleConnectRepo = async (owner: string, repo: string) => {
    const finalOwner = owner.trim();
    const finalRepo = repo.trim();
    if (!finalOwner || !finalRepo) return;

    const slug = `${finalOwner}/${finalRepo}`;
    setConnectingSlug(slug);
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
      setConnectingSlug(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchQuery.includes("/")) {
      const [owner, repo] = searchQuery.split("/");
      handleConnectRepo(owner, repo);
    } else if (resolvedUsername || session?.user?.name) {
      const defaultOwner = resolvedUsername || customHandle || session?.user?.name || "user";
      handleConnectRepo(defaultOwner, searchQuery);
    } else {
      setErrorMsg("Please enter in format: owner/repo (e.g. facebook/react)");
    }
  };

  const handleReindex = async (id: string) => {
    setReindexingId(id);
    try {
      await fetch(`${SERVER_URL}/api/repos/${id}/index`, { method: "POST" });
      await fetchConnectedRepos();
    } catch (err) {
      console.error("Re-index failed:", err);
    } finally {
      setReindexingId(null);
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

  const handleHandleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customHandle.trim()) {
      setIsEditingHandle(false);
      fetchUserGithubRepos(customHandle.trim());
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
      {/* Header */}
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
            Indexed codebases available for autonomous issue analysis, test synthesis, and PR generation.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
          <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-zinc-300">
            @{resolvedUsername || customHandle || session.user.name || "user"}
          </span>
          <span className="px-2.5 py-1 rounded-md bg-[#161b22] border border-[#30363d] text-[#3fb950] font-semibold">
            {repos.length} Indexed
          </span>
        </div>
      </div>

      {/* Sleek Combobox Dropdown Picker */}
      <div className="space-y-2 relative" ref={dropdownRef}>
        <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search your GitHub repositories or type 'owner/repo'..."
              value={searchQuery}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
                setErrorMsg("");
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-[#0d1117] border border-[#30363d] focus:border-[#3fb950] rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition shadow-sm"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1.5">
              {loadingGithubRepos ? (
                <Loader2 className="w-3.5 h-3.5 text-zinc-500 animate-spin" />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="text-zinc-500 hover:text-zinc-300 p-0.5"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!searchQuery.trim() || !!connectingSlug}
            className="gh-btn-green px-5 py-2.5 text-xs font-semibold rounded-xl flex items-center space-x-1.5 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {connectingSlug ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Plus className="w-3.5 h-3.5 text-white" />
            )}
            <span>{connectingSlug ? "Indexing…" : "Index Repo"}</span>
          </button>
        </form>

        {/* Floating Obsidian Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#0d1117] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden divide-y divide-[#30363d]/50 animate-fadeIn">
            {/* Dropdown Header / Target Handle Switcher */}
            <div className="p-2.5 bg-[#161b22] flex items-center justify-between text-xs text-zinc-400">
              <div className="flex items-center space-x-2">
                <Github className="w-3.5 h-3.5 text-[#3fb950]" />
                {isEditingHandle ? (
                  <form onSubmit={handleHandleSubmit} className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={customHandle}
                      onChange={(e) => setCustomHandle(e.target.value)}
                      placeholder="GitHub username"
                      className="px-2 py-0.5 text-xs bg-[#0d1117] border border-[#3fb950] rounded text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="px-1.5 py-0.5 text-[10px] bg-[#238636] text-white rounded font-mono"
                    >
                      Fetch
                    </button>
                  </form>
                ) : (
                  <span className="font-mono text-zinc-300">
                    Target Account: <strong className="text-white">@{resolvedUsername || customHandle || session.user.name || "user"}</strong>
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {!isEditingHandle && (
                  <button
                    onClick={() => setIsEditingHandle(true)}
                    className="text-[11px] text-zinc-400 hover:text-[#3fb950] flex items-center space-x-1"
                    title="Change target GitHub account"
                  >
                    <Edit2 className="w-2.5 h-2.5" />
                    <span>Change</span>
                  </button>
                )}
                <button
                  onClick={() => fetchUserGithubRepos()}
                  disabled={loadingGithubRepos}
                  className="text-[11px] text-zinc-400 hover:text-white flex items-center space-x-1"
                  title="Refresh Repositories"
                >
                  <RefreshCw className={`w-2.5 h-2.5 ${loadingGithubRepos ? "animate-spin text-[#3fb950]" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Direct Custom Input Option */}
            {searchQuery.trim() && (
              <div
                onClick={handleManualSubmit}
                className="p-3 bg-[#161b22]/70 hover:bg-[#21262d] flex items-center justify-between cursor-pointer transition text-xs"
              >
                <div className="flex items-center space-x-2 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#3fb950] shrink-0" />
                  <span className="text-white font-medium truncate">
                    Index custom repository: <code className="text-[#3fb950] font-mono bg-[#0d1117] px-1.5 py-0.5 rounded border border-[#30363d]">{searchQuery}</code>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#3fb950] bg-[#0e2e1a] px-2 py-0.5 rounded border border-[#238636]/40 shrink-0">
                  Press Enter ↵
                </span>
              </div>
            )}

            {/* Repositories Scrollable List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-[#30363d]/30">
              {loadingGithubRepos ? (
                <div className="p-6 text-center text-zinc-500 font-mono text-xs flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#3fb950]" />
                  <span>Fetching repositories from GitHub API...</span>
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="p-6 text-center text-zinc-400 space-y-1">
                  <p className="text-xs">No repositories found.</p>
                  <p className="text-[11px] text-zinc-500">
                    Type an exact repository like <code>owner/repo</code> or click <strong>Change</strong> above to fetch a specific username.
                  </p>
                </div>
              ) : (
                filteredRepos.map((repo) => {
                  const slug = repo.fullName.toLowerCase();
                  const isConnected = connectedSet.has(slug);
                  const isConnecting = connectingSlug === slug;

                  return (
                    <div
                      key={repo.id}
                      onClick={() => {
                        if (!isConnected && !isConnecting) {
                          handleConnectRepo(repo.owner, repo.name);
                        }
                      }}
                      className={`p-3 flex items-center justify-between transition cursor-pointer ${
                        isConnected
                          ? "bg-[#161b22]/30 opacity-70 cursor-default"
                          : "hover:bg-[#161b22]"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 truncate mr-3">
                        <FolderGit2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <div className="truncate space-y-0.5">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-white truncate">
                              {repo.fullName}
                            </span>
                            {repo.private ? (
                              <span className="text-[9px] text-zinc-400 bg-[#161b22] px-1.5 py-0.2 rounded border border-[#30363d] flex items-center space-x-0.5">
                                <Lock className="w-2.5 h-2.5" />
                                <span>Private</span>
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-400 bg-[#161b22] px-1.5 py-0.2 rounded border border-[#30363d] flex items-center space-x-0.5">
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
                          {repo.description && (
                            <p className="text-[11px] text-[#8b949e] truncate max-w-md">
                              {repo.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {isConnected ? (
                        <span className="text-[10px] font-mono text-[#3fb950] px-2 py-0.5 rounded bg-[#0e2e1a] border border-[#238636]/40 shrink-0 flex items-center space-x-1">
                          <Check className="w-2.5 h-2.5" />
                          <span>Connected</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={isConnecting}
                          className="gh-btn-green text-[11px] font-semibold px-2.5 py-1 rounded-md transition shrink-0 flex items-center space-x-1"
                        >
                          {isConnecting ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white" />
                          ) : (
                            <Plus className="w-3 h-3 text-white" />
                          )}
                          <span>{isConnecting ? "Indexing..." : "+ Connect"}</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Dropdown Footer */}
            <div className="p-2 bg-[#050507] text-[10px] font-mono text-zinc-500 text-center">
              Showing {filteredRepos.length} repositories · Select a repo or type custom owner/repo to index
            </div>
          </div>
        )}

        {errorMsg && (
          <p className="text-xs text-red-400 flex items-center space-x-1 font-mono">
            <span>✕ {errorMsg}</span>
          </p>
        )}
      </div>

      {/* Connected Repositories Grid */}
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
                    <div className="p-2 rounded-lg bg-[#161b22] border border-[#30363d] text-[#3fb950]">
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
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#0e2e1a] text-[#3fb950] border border-[#238636]/40 flex items-center space-x-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950]" />
                      <span>Ready</span>
                    </span>
                  ) : repo.status === "indexing" ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center space-x-1 shrink-0">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Indexing</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-[#3c1e1e] text-[#f85149] border border-[#f85149]/40 flex items-center space-x-1 shrink-0">
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
                    <span>Issue Workbench</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleReindex(repo.id)}
                      disabled={reindexingId === repo.id || repo.status === "indexing"}
                      title="Re-index Codebase"
                      className="p-1.5 text-zinc-400 hover:text-white bg-[#161b22] hover:bg-[#21262d] rounded-lg border border-[#30363d] transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${reindexingId === repo.id ? "animate-spin text-[#3fb950]" : ""}`} />
                    </button>

                    <button
                      onClick={() => handleDelete(repo.id)}
                      title="Disconnect Repo"
                      className="p-1.5 text-zinc-500 hover:text-[#f85149] bg-[#161b22] hover:bg-[#3c1e1e] rounded-lg border border-[#30363d] hover:border-[#f85149]/40 transition active:scale-95 cursor-pointer"
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
