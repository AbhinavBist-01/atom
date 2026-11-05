"use client";

import React, { useState } from "react";
import { Github, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { signIn } from "@/lib/auth-client";

export default function CallToAction() {
  const [authenticating, setAuthenticating] = useState(false);

  const handleGitHubSignIn = async () => {
    try {
      setAuthenticating(true);
      const callbackURL =
        typeof window !== "undefined"
          ? `${window.location.origin}/workspace`
          : "http://localhost:3000/workspace";

      await signIn.social({
        provider: "github",
        callbackURL,
      });
    } catch (error) {
      console.error("Sign in failed:", error);
      setAuthenticating(false);
    }
  };

  return (
    <section className="max-w-5xl mx-auto pt-4 pb-8">
      <div className="p-6 sm:p-8 rounded-2xl bg-[#0d1117] border border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-bold text-white">
            Connect your repositories
          </h3>
          <p className="text-xs sm:text-sm text-[#8b949e]">
            1-click OAuth to start resolving GitHub issues with deterministic line citations.
          </p>
        </div>

        <button
          onClick={handleGitHubSignIn}
          disabled={authenticating}
          className="gh-btn-green px-6 py-3 text-xs sm:text-sm rounded-xl font-semibold flex items-center justify-center space-x-2 w-full sm:w-auto shrink-0 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
        >
          {authenticating ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Github className="w-4 h-4 text-white" />
          )}
          <span>{authenticating ? "Redirecting…" : "Sign in with GitHub"}</span>
          {!authenticating && (
            <ArrowRight className="w-3.5 h-3.5 text-white/80 group-hover:translate-x-0.5 transition-transform" />
          )}
        </button>
      </div>
    </section>
  );
}
