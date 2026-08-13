"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { FolderGit2, Plus, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Loader2, Github, ExternalLink, ArrowRight, Sparkles, Shield } from "lucide-react";

interface Repository {
  id: string;
  owner: string;
  repo: string;
  status: "pending" | "indexing" | "ready" | "error";
  indexedAt?: string;
  createdAt: string;
}

export default function WorkspacePage() {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [ownerInput, setOwnerInput] = useState("");
  const [repoInput, setRepoInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";

  const fetchRepos = async () => {
    try {
      const res = await fetch(`${SERVER_URL}/api/repos`);
      if (res.ok) {
        const data = await res.json();
        setRepos(data.repos || []);
      }
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    }
  };

  useEffect(() => {
    fetchRepos();
  }, []);

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerInput || !repoInput) return;

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch(`${SERVER_URL}/api/repos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner: ownerInput.trim(), repo: repoInput.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to connect repository");
      }

      setOwnerInput("");
      setRepoInput("");
      await fetchRepos();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to connect repository");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="space-y-8 py-2">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
            <FolderGit2 className="w-7 h-7 text-white" />
            <span>ATOM Main Workspace</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Manage GitHub App access, index repositories, and launch autonomous issue resolution.
          </p>
        </div>

        <a
          href="https://github.com/apps/atom-ai-agent/installations/new"
          target="_blank"
          rel="noreferrer"
          className="glass-button-primary px-5 py-2.5 text-xs rounded-xl font-semibold flex items-center space-x-2 shrink-0 justify-center"
        >
          <Github className="w-4 h-4" />
          <span>Connect / Install GitHub App</span>
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>

      {/* Connect Form */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Plus className="w-4 h-4 text-white" />
          <span>Add Repository Access</span>
        </h2>

        <form onSubmit={handleConnectRepo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Owner / Organization</label>
            <input
              type="text"
              placeholder="facebook"
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Repository Name</label>
            <input
              type="text"
              placeholder="react"
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

        {errorMsg && <p className="text-xs text-red-400 mt-2">{errorMsg}</p>}
      </div>

      {/* Repositories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <Shield className="w-4 h-4 text-white" />
            <span>Connected GitHub Repositories</span>
          </h2>
          <span className="text-xs text-zinc-500 font-mono">{repos.length} Repositories Active</span>
        </div>

        {repos.length === 0 ? (
          <div className="glass-card p-12 text-center rounded-2xl border border-white/10 space-y-3">
            <FolderGit2 className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No repositories connected yet</p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Add a repository above or click "Connect / Install GitHub App" to grant ATOM access to your repositories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {repos.map((repo) => (
              <div key={repo.id} className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between space-y-4">
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

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
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
      </div>
    </div>
  );
}
