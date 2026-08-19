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
  ExternalLink,
  ArrowRight,
  Shield,
  ChevronDown,
  Search,
  Lock,
  Globe,
  Check,
  Sparkles,
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

interface GitHubRepoItem {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description?: string | null;
  language?: string | null;
}

export default function WorkspacePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [repos, setRepos] = useState<Repository[]>([]);
  
  // Intake mode: 'dropdown' or 'manual'
  const [inputMode, setInputMode] = useState<"dropdown" | "manual">("dropdown");
  
  // GitHub Repos from dropdown / synced account
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [isAppConnected, setIsAppConnected] = useState(false);
  const [loadingGithubRepos, setLoadingGithubRepos] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGithubRepo, setSelectedGithubRepo] = useState<GitHubRepoItem | null>(null);

  // Manual inputs
  const [ownerInput, setOwnerInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [connectingRepoId, setConnectingRepoId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Client-side auth guard (middleware is the primary gate)
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/");
    }
  }, [session, isPending, router]);

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  const fetchRepos = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/repos`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error("Failed to fetch connected repos:", err);
    }
  };

  const fetchGithubRepos = async (customUser?: string) => {
    const targetUser = customUser !== undefined ? customUser.trim() : usernameInput.trim();
    const userImage = session?.user?.image || "";
    const userEmail = session?.user?.email || "";

    setLoadingGithubRepos(true);
    try {
      const params = new URLSearchParams();
      if (targetUser) params.set("username", targetUser);
      if (userImage) params.set("image", userImage);
      if (userEmail) params.set("email", userEmail);

      const res = await fetch(`${SERVER_URL}/api/repos/github-repos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setGithubRepos(data.githubRepos || []);
        if (typeof data.isAppConnected === "boolean") {
          setIsAppConnected(data.isAppConnected);
        }
        if (data.resolvedLogin) {
          setUsernameInput(data.resolvedLogin);
        }
      }
    } catch (err) {
      console.error("Failed to fetch user GitHub repos:", err);
    } finally {
      setLoadingGithubRepos(false);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  useEffect(() => {
    if (session?.user) {
      const initialHandle = (session.user.name || session.user.email?.split("@")[0] || "").trim();
      setUsernameInput(initialHandle);
      fetchGithubRepos(initialHandle);
    }
  }, [session]);

  const filteredGithubRepos = useMemo(() => {
    if (!searchTerm) return githubRepos;
    const term = searchTerm.toLowerCase();
    return githubRepos.filter(
      (r) =>
        r.name.toLowerCase().includes(term) ||
        r.fullName.toLowerCase().includes(term) ||
        (r.language && r.language.toLowerCase().includes(term))
    );
  }, [githubRepos, searchTerm]);

  // Set of connected repo full names for quick lookup
  const connectedSet = useMemo(() => {
    const set = new Set<string>();
    for (const r of repos) {
      set.add(`${r.owner}/${r.repo}`.toLowerCase());
    }
    return set;
  }, [repos]);

  const handleSelectDropdownRepo = (repo: GitHubRepoItem) => {
    setSelectedGithubRepo(repo);
    setOwnerInput(repo.owner);
    setRepoInput(repo.name);
    setDropdownOpen(false);
  };

  const handleConnectRepoDirect = async (owner: string, repo: string, repoIdNumeric?: number) => {
    const finalOwner = owner.trim();
    const finalRepo = repo.trim();
    if (!finalOwner || !finalRepo) return;

    if (repoIdNumeric !== undefined) {
      setConnectingRepoId(repoIdNumeric);
    } else {
      setLoading(true);
    }
    setErrorMsg("");

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

      setOwnerInput("");
      setRepoInput("");
      setSelectedGithubRepo(null);
      await fetchRepos();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect repository");
    } finally {
      setLoading(false);
      setConnectingRepoId(null);
    }
  };

  const handleConnectRepo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    handleConnectRepoDirect(ownerInput, repoInput);
  };

  const handleReindex = async (id: string) => {
    try {
      await fetch(`${SERVER_URL}/api/repos/${id}/index`, { method: "POST" });
      await fetchRepos();
    } catch (err) {
      console.error("Re-index failed:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${SERVER_URL}/api/repos/${id}`, { method: "DELETE" });
      await fetchRepos();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-white/10 text-white border border-white/20">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" /> Ready
          </span>
        );
      case "indexing":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Indexing
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            Pending
          </span>
        );
    }
  };

  // Show spinner while checking session or while redirecting
  if (isPending || !session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-10 py-2">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
            <FolderGit2 className="w-7 h-7 text-white" />
            <span>ATOM Main Workspace</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Synced repositories from your GitHub account. Select and index any repository to start autonomous issue resolution.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {isAppConnected ? (
            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>GitHub App Connected</span>
            </div>
          ) : (
            <a
              href="https://github.com/settings/apps"
              target="_blank"
              rel="noreferrer"
              className="glass-button-secondary px-4 py-2 text-xs rounded-xl font-semibold flex items-center space-x-2 shrink-0 justify-center"
            >
              <Github className="w-4 h-4" />
              <span>Install GitHub App</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. SYNCED GITHUB REPOSITORIES (TOP COMPONENT)                              */}
      {/* ========================================================================= */}
      <section className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-white flex items-center space-x-2">
              <Github className="w-5 h-5 text-white" />
              <span>Synced GitHub Repositories</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Repositories automatically fetched from your GitHub account (@{usernameInput || session.user.name || "user"}).
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center space-x-1 bg-white/5 p-1 rounded-xl border border-white/10 text-xs shrink-0">
            <button
              onClick={() => setInputMode("dropdown")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                inputMode === "dropdown"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Dropdown Selector
            </button>
            <button
              onClick={() => setInputMode("manual")}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                inputMode === "manual"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Custom / Public Repo
            </button>
          </div>
        </div>

        {/* DROPDOWN SELECTOR MODE */}
        {inputMode === "dropdown" && (
          <div className="space-y-4">
            {/* Account / Org handle bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-black/40 rounded-xl border border-white/10">
              <div className="flex items-center space-x-2.5 flex-1">
                <Github className="w-4 h-4 text-zinc-400 shrink-0" />
                <span className="text-xs text-zinc-300 font-medium shrink-0">GitHub Handle / Org:</span>
                <input
                  type="text"
                  placeholder="e.g. AbhinavBist-01"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      fetchGithubRepos();
                    }
                  }}
                  className="bg-black/60 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 flex-1 max-w-xs font-mono"
                />
              </div>
              <button
                type="button"
                onClick={() => fetchGithubRepos()}
                disabled={loadingGithubRepos}
                className="glass-button-secondary px-3.5 py-1.5 text-xs rounded-lg flex items-center space-x-1.5 shrink-0 self-end sm:self-auto font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingGithubRepos ? "animate-spin" : ""}`} />
                <span>{loadingGithubRepos ? "Syncing..." : "Sync Repos"}</span>
              </button>
            </div>

            {/* Repos count / helper note */}
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>
                {loadingGithubRepos
                  ? "Fetching repositories from GitHub..."
                  : `Found ${githubRepos.length} repositories for @${usernameInput || "user"}`}
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                Click below to select & index
              </span>
            </div>

            {/* Custom Styled Combobox / Dropdown */}
            <div className="relative">
              <div
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full px-4 py-3 bg-black/60 border border-white/10 hover:border-white/20 rounded-xl cursor-pointer flex items-center justify-between text-sm text-white transition"
              >
                <div className="flex items-center space-x-3 truncate">
                  <FolderGit2 className="w-4 h-4 text-zinc-400 shrink-0" />
                  {selectedGithubRepo ? (
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-semibold text-white">{selectedGithubRepo.fullName}</span>
                      {selectedGithubRepo.language && (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                          {selectedGithubRepo.language}
                        </span>
                      )}
                      {connectedSet.has(selectedGithubRepo.fullName.toLowerCase()) && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Already Connected
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-zinc-500">
                      {loadingGithubRepos
                        ? "Syncing repositories from GitHub..."
                        : githubRepos.length === 0
                        ? "No repositories found (click Sync Repos or use Custom Repo)"
                        : "Click to select a repository from dropdown..."}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 text-zinc-400 shrink-0">
                  {loadingGithubRepos && <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />}
                  <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Dropdown Menu List */}
              {dropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0c0c10] border border-white/15 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl max-h-80 flex flex-col">
                  {/* Search Bar inside dropdown */}
                  <div className="p-3 border-b border-white/10 flex items-center space-x-2 bg-white/[0.02]">
                    <Search className="w-4 h-4 text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Search repositories or language..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {/* List of Repos */}
                  <div className="overflow-y-auto flex-1 divide-y divide-white/5">
                    {filteredGithubRepos.length === 0 ? (
                      <div className="p-6 text-center text-xs text-zinc-500 space-y-1">
                        <p>No matching repositories found.</p>
                        <p className="text-[11px] text-zinc-600">
                          Type a search query or switch to "Custom / Public Repo".
                        </p>
                      </div>
                    ) : (
                      filteredGithubRepos.map((repo) => {
                        const isSelected = selectedGithubRepo?.id === repo.id;
                        const isAlreadyConnected = connectedSet.has(repo.fullName.toLowerCase());
                        return (
                          <div
                            key={repo.id}
                            onClick={() => handleSelectDropdownRepo(repo)}
                            className={`p-3.5 hover:bg-white/10 cursor-pointer flex items-center justify-between transition ${
                              isSelected ? "bg-white/10" : ""
                            }`}
                          >
                            <div className="space-y-1 truncate pr-4">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-semibold text-white">{repo.fullName}</span>
                                {repo.private ? (
                                  <span className="flex items-center space-x-1 text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Private</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center space-x-1 text-[10px] text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                    <Globe className="w-2.5 h-2.5" />
                                    <span>Public</span>
                                  </span>
                                )}
                                {repo.language && (
                                  <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                    {repo.language}
                                  </span>
                                )}
                                {isAlreadyConnected && (
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    Connected
                                  </span>
                                )}
                              </div>
                              {repo.description && (
                                <p className="text-[11px] text-zinc-400 truncate">{repo.description}</p>
                              )}
                            </div>
                            {isSelected && <Check className="w-4 h-4 text-white shrink-0" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Selected Dropdown Repo Action Card */}
            {selectedGithubRepo && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-xs text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Selected: <strong className="text-white">{selectedGithubRepo.fullName}</strong></span>
                  </div>
                  {selectedGithubRepo.description && (
                    <p className="text-[11px] text-zinc-400">{selectedGithubRepo.description}</p>
                  )}
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {connectedSet.has(selectedGithubRepo.fullName.toLowerCase()) ? (
                    <Link
                      href={`/issues?owner=${selectedGithubRepo.owner}&repo=${selectedGithubRepo.name}`}
                      className="glass-button-primary px-5 py-2 text-xs rounded-xl font-semibold flex items-center space-x-1.5"
                    >
                      <span>Open Workbench Issues</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleConnectRepoDirect(selectedGithubRepo.owner, selectedGithubRepo.name)}
                      disabled={loading}
                      className="glass-button-primary px-5 py-2 text-xs rounded-xl font-semibold flex items-center space-x-2 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      <span>Connect & Index Repository</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* MANUAL INPUT MODE */}
        {inputMode === "manual" && (
          <form onSubmit={handleConnectRepo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Owner / Organization</label>
              <input
                type="text"
                placeholder="facebook or your-org"
                value={ownerInput}
                onChange={(e) => setOwnerInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Repository Name</label>
              <input
                type="text"
                placeholder="react or my-project"
                value={repoInput}
                onChange={(e) => setRepoInput(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading || !ownerInput || !repoInput}
                className="w-full glass-button-primary py-2 text-xs rounded-xl font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderGit2 className="w-4 h-4" />}
                <span>Add & Index Repository</span>
              </button>
            </div>
          </form>
        )}

        {errorMsg && <p className="text-xs text-red-400 mt-2">{errorMsg}</p>}
      </section>

      {/* ========================================================================= */}
      {/* 2. CONNECTED & INDEXED REPOSITORIES (BOTTOM COMPONENT)                     */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 bg-white/5 rounded-lg border border-white/10">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Connected & Active Repositories
              </h2>
              <p className="text-xs text-zinc-400">
                Codebases indexed in pgvector and ready for autonomous issue resolution.
              </p>
            </div>
          </div>
          <span className="text-xs text-zinc-400 font-mono bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
            {repos.length} Connected
          </span>
        </div>

        {repos.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-white/10 space-y-3">
            <Layers className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No active repositories connected yet</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Select any repository from the Synced Repositories section above to index its AST chunks and start autonomous bug resolution.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-white/5 rounded-xl border border-white/10">
                      <FolderGit2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        {repo.owner} / {repo.repo}
                      </h3>
                      <p className="text-[11px] font-mono text-zinc-500 mt-0.5">
                        Indexed: {repo.indexedAt ? new Date(repo.indexedAt).toLocaleDateString() : "Pending"}
                      </p>
                    </div>
                  </div>
                  {renderStatusBadge(repo.status)}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <Link
                    href={`/issues?owner=${repo.owner}&repo=${repo.repo}`}
                    className="text-xs font-semibold text-white hover:underline flex items-center space-x-1"
                  >
                    <span>Open Workbench Issues</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleReindex(repo.id)}
                      title="Re-index Codebase"
                      className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDelete(repo.id)}
                      title="Disconnect Repo"
                      className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
