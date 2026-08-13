"use client";

import React, { useState, useEffect } from "react";
import { FolderGit2, Plus, RefreshCw, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

interface Repository {
  id: string;
  owner: string;
  repo: string;
  status: "pending" | "indexing" | "ready" | "error";
  indexedAt?: string;
  createdAt: string;
}

export default function ReposPage() {
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Ready
          </span>
        );
      case "indexing":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Repository Indexer</h1>
        <p className="text-sm text-gray-400 mt-1">
          Connect GitHub repositories to run AST chunking, git blame tagging, and vector embedding indexing.
        </p>
      </div>

      {/* Connect Form */}
      <div className="p-6 bg-gray-900/60 rounded-xl border border-gray-800 backdrop-blur-sm">
        <h2 className="text-base font-semibold text-gray-200 mb-4 flex items-center space-x-2">
          <Plus className="w-5 h-5 text-blue-400" />
          <span>Connect New Repository</span>
        </h2>

        <form onSubmit={handleConnectRepo} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Owner / Organization</label>
            <input
              type="text"
              placeholder="e.g. facebook"
              value={ownerInput}
              onChange={(e) => setOwnerInput(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Repository Name</label>
            <input
              type="text"
              placeholder="e.g. react"
              value={repoInput}
              onChange={(e) => setRepoInput(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !ownerInput || !repoInput}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderGit2 className="w-4 h-4" />}
              <span>Connect & Index</span>
            </button>
          </div>
        </form>

        {errorMsg && <p className="text-xs text-red-400 mt-3">{errorMsg}</p>}
      </div>

      {/* Repositories List */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-gray-200">Connected Repositories</h2>

        {repos.length === 0 ? (
          <div className="p-12 text-center bg-gray-900/30 rounded-xl border border-gray-800/80">
            <FolderGit2 className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-400">No repositories connected yet</p>
            <p className="text-xs text-gray-500 mt-1">Connect a repository above to start index processing.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {repos.map((repo) => (
              <div
                key={repo.id}
                className="p-5 bg-gray-900/40 rounded-xl border border-gray-800 flex items-center justify-between hover:border-gray-700 transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                    <FolderGit2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-white">
                      {repo.owner} / {repo.repo}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Indexed: {repo.indexedAt ? new Date(repo.indexedAt).toLocaleString() : "Not indexed yet"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  {renderStatusBadge(repo.status)}

                  <button
                    onClick={() => handleReindex(repo.id)}
                    title="Re-index codebase"
                    className="p-2 text-gray-400 hover:text-white bg-gray-800/50 hover:bg-gray-800 rounded-lg border border-gray-700/50 transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDelete(repo.id)}
                    title="Disconnect repository"
                    className="p-2 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
