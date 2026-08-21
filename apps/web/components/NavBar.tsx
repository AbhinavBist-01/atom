"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
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
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <header className="border-b border-[#30363d]/80 bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/workspace" : "/"} className="flex items-center space-x-3.5 group">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-[#30363d] group-hover:border-[#3fb950]/60 transition-all duration-150 bg-[#161b22] flex items-center justify-center p-1 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="ATOM Logo"
              className="w-full h-full object-contain rounded-lg"
            />
          </div>
          <div className="flex items-center space-x-2.5">
            <span className="text-base font-bold tracking-tight text-white font-mono">ATOM</span>
            <span className="px-2 py-0.5 text-[10px] font-mono font-medium bg-[#0e2e1a] text-[#3fb950] rounded-md border border-[#238636]/40 shadow-sm flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse" />
              v0.1.0 · Online
            </span>
          </div>
        </Link>

        {/* Nav Links — only shown when authenticated */}
        {user && (
          <nav className="flex items-center space-x-1">
            <Link
              href="/"
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                pathname === "/"
                  ? "text-white bg-[#21262d] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Overview</span>
            </Link>
            <Link
              href="/workspace"
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                pathname === "/workspace"
                  ? "text-white bg-[#21262d] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22]"
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </Link>
            <Link
              href="/issues"
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                pathname.startsWith("/issues")
                  ? "text-white bg-[#21262d] border border-[#30363d]"
                  : "text-[#8b949e] hover:text-[#f0f6fc] hover:bg-[#161b22]"
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Issue Workbench</span>
            </Link>
          </nav>
        )}

        {/* Right side */}
        <div className="flex items-center space-x-3">
          {isPending ? (
            <Loader2 className="w-4 h-4 text-[#8b949e] animate-spin" />
          ) : user ? (
            <>
              {/* User Avatar + Name */}
              <div className="flex items-center space-x-2 px-3 py-1.5 bg-[#161b22] rounded-lg border border-[#30363d]">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image}
                    alt={user.name ?? "User"}
                    className="w-5 h-5 rounded-full border border-[#30363d]"
                  />
                ) : (
                  <Github className="w-4 h-4 text-[#8b949e]" />
                )}
                <span className="text-xs text-[#f0f6fc] font-medium max-w-[120px] truncate">
                  {user.name ?? user.email}
                </span>
              </div>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="glass-button-secondary px-3 py-1.5 text-xs rounded-lg flex items-center space-x-2 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5 text-[#8b949e]" />
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
              <Github className="w-3.5 h-3.5 text-[#8b949e]" />
              <span>GitHub App</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
