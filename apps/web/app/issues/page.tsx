"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Search, ArrowRight, Sparkles } from "lucide-react";

export default function IssuesDirectoryPage() {
  const router = useRouter();
  const [issueUrl, setIssueUrl] = useState("");
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [issueNum, setIssueNum] = useState("");

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueUrl) return;

    // Parse URL format: https://github.com/owner/repo/issues/123
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
          <AlertCircle className="w-7 h-7 text-blue-400" />
          <span>Issue Workbench Intake</span>
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Provide a GitHub issue to trigger ATOM's autonomous Root Cause Analysis (RCA), code citations, and patch generation.
        </p>
      </div>

      {/* URL Intake Card */}
      <div className="p-6 bg-gray-900/60 rounded-xl border border-gray-800 backdrop-blur-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-200 flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Intake via GitHub Issue URL</span>
        </h2>

        <form onSubmit={handleUrlSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="https://github.com/facebook/react/issues/28000"
              value={issueUrl}
              onChange={(e) => setIssueUrl(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
          <button
            type="submit"
            disabled={!issueUrl}
            className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg transition disabled:opacity-50 flex items-center space-x-2"
          >
            <span>Open Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Manual Entry Card */}
      <div className="p-6 bg-gray-900/40 rounded-xl border border-gray-800 space-y-4">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Or Enter Details Manually</h2>

        <form onSubmit={handleManualSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Owner</label>
            <input
              type="text"
              placeholder="facebook"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Repo</label>
            <input
              type="text"
              placeholder="react"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Issue #</label>
            <input
              type="number"
              placeholder="28000"
              value={issueNum}
              onChange={(e) => setIssueNum(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-950 border border-gray-800 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={!owner || !repo || !issueNum}
              className="w-full px-4 py-2 text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
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
