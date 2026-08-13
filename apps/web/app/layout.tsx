import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, FolderGit2, AlertCircle, LayoutDashboard } from "lucide-react";
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
      <body className="antialiased min-h-screen bg-[#090d16] text-gray-100 flex flex-col font-sans">
        {/* Top Navbar */}
        <header className="border-b border-gray-800 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-3 group">
              <div className="p-2 bg-blue-600/20 text-blue-400 rounded-lg border border-blue-500/30 group-hover:border-blue-400 transition">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-bold tracking-wide text-white">ATOM</span>
                <span className="ml-2 text-xs text-blue-400 font-mono">v0.1.0</span>
              </div>
            </Link>

            <nav className="flex items-center space-x-1">
              <Link
                href="/"
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-md transition"
              >
                <LayoutDashboard className="w-4 h-4 text-gray-400" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/repos"
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-md transition"
              >
                <FolderGit2 className="w-4 h-4 text-gray-400" />
                <span>Repositories</span>
              </Link>
              <Link
                href="/issues"
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800/60 rounded-md transition"
              >
                <AlertCircle className="w-4 h-4 text-gray-400" />
                <span>Issue Workbench</span>
              </Link>
            </nav>

            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
                Server Online
              </span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-gray-800/80 bg-[#070a12] py-6 text-center text-xs text-gray-500">
          <p>ATOM Agentic System — Evidence-first autonomous GitHub issue resolution</p>
        </footer>
      </body>
    </html>
  );
}
