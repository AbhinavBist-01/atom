"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Cpu,
  FolderGit2,
  AlertCircle,
  Sparkles,
  Github,
  LogOut,
  Loader2,
} from "lucide-react";
import { useSession, signOut } from "@/lib/auth-client";

export default function NavBar() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="border-b border-gh-border/70 bg-[#0d1117]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/workspace" : "/"} className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded-lg overflow-hidden border border-gh-border group-hover:border-gh-greenText/50 transition bg-gh-panel flex items-center justify-center p-0.5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="ATOM Logo"
              className="w-full h-full object-cover rounded-md"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-semibold tracking-tight text-white font-mono">ATOM</span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-gh-greenDark/60 text-gh-greenText rounded border border-gh-green/30">
              v0.1.0 · Online
            </span>
          </div>
        </Link>

        {/* Nav Links — only shown when authenticated */}
        {user && (
          <nav className="flex items-center space-x-1">
            <Link
              href="/"
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
              <span>Overview</span>
            </Link>
            <Link
              href="/workspace"
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-zinc-400" />
              <span>Workspace</span>
            </Link>
            <Link
              href="/issues"
              className="flex items-center space-x-2 px-3.5 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition"
            >
              <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />
              <span>Issue Workbench</span>
            </Link>
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {isPending ? (
            <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
          ) : user ? (
            <>
              {/* User Avatar + Name */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-white/5 rounded-lg border border-white/10">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="w-5 h-5 rounded-full border border-white/20"
                  />
                ) : (
                  <Github className="w-4 h-4 text-zinc-400" />
                )}
                <span className="text-xs text-zinc-300 font-medium max-w-[120px] truncate">
                  {user.name ?? user.email}
                </span>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="glass-button-secondary px-3 py-1.5 text-xs rounded-lg flex items-center space-x-2"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out</span>
              </button>
            </>
          ) : (
            /* Not signed in — show GitHub App link */
            <a
              href="https://github.com/apps"
              target="_blank"
              rel="noreferrer"
              className="glass-button-secondary px-3.5 py-1.5 text-xs rounded-lg flex items-center space-x-2"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub App</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
