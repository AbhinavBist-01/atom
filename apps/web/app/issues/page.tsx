"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Search, ArrowRight, Sparkles, FolderGit2 } from "lucide-react";

export default function IssuesDirectoryPage() {
  const router = useRouter();
  const [issueUrl, setIssueUrl] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [issueNum, setIssueNum] = useState("");

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

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (owner && repo && issueNum) {
      router.push(`/issues/${owner.trim()}/${repo.trim()}/${issueNum.trim()}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-3">
          <AlertCircle className="w-7 h-7 text-white" />
          <span>Issue Workbench Intake</span>
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Intake a GitHub issue to trigger ATOM's autonomous Root Cause Analysis (RCA), code citations, and patch generation.
        </p>
      </div>

      {/* URL Intake Card */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-white" />
          <span>Intake via GitHub Issue URL</span>
        </h2>

        <form onSubmit={handleUrlSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="https://github.com/facebook/react/issues/28000"
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!issueUrl}
            className="glass-button-primary px-6 py-2.5 text-xs rounded-xl font-semibold flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
          >
            <span>Open Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Manual Entry Card */}
      <div className="glass-card p-6 rounded-2xl border border-white/10 space-y-4">
        <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center space-x-2">
          <FolderGit2 className="w-4 h-4 text-zinc-400" />
          <span>Or Enter Repository Details Manually</span>
        </h2>

        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Owner</label>
            <input
              type="text"
              placeholder="facebook"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Repo</label>
            <input
              type="text"
              placeholder="react"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Issue #</label>
            <input
              type="number"
              placeholder="28000"
              value={issueNum}
              onChange={(e) => setIssueNum(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-black/60 border border-white/10 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-white/30 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!owner || !repo || !issueNum}
              className="w-full glass-button-secondary py-2 text-xs rounded-xl font-semibold flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>Inspect Issue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
