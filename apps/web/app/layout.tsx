import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, FolderGit2, AlertCircle, Sparkles, Github } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATOM — Autonomous GitHub Issue Resolution Agent",
  description: "Evidence-first autonomous bug fixing agent with RCA, line-level citations, and patch generation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#050507] text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
        {/* Ambient Top Glow */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 radial-spotlight pointer-events-none z-0" />

        {/* Glassmorphic Navbar */}
        <header className="border-b border-white/[0.08] bg-[#09090c]/70 backdrop-blur-xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-white/5 text-white rounded-lg border border-white/10 group-hover:border-white/30 transition">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-base font-bold tracking-tight text-white">ATOM</span>
                <span className="px-2 py-0.5 text-[10px] font-mono uppercase font-semibold bg-white/10 text-zinc-300 rounded border border-white/10">
                  v0.1.0
                </span>
              </div>
            </Link>

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

            <div className="flex items-center space-x-3">
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="glass-button-secondary px-3.5 py-1.5 text-xs rounded-lg flex items-center space-x-2"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub App</span>
              </a>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 relative z-10">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-[#050507] py-6 text-center text-xs text-zinc-600">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-mono text-[11px]">ATOM Autonomous GitHub Resolution Engine · Monochrome Glass Edition</p>
            <div className="flex items-center space-x-4 text-zinc-500">
              <span>Next.js 16</span>
              <span>•</span>
              <span>Better Auth</span>
              <span>•</span>
              <span>OpenAI gpt-4o</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
