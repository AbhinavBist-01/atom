import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "ATOM — Autonomous GitHub Issue Resolution Agent",
  description:
    "Evidence-first autonomous bug fixing agent with RCA, line-level citations, and patch generation",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen bg-[#050507] text-zinc-100 flex flex-col font-sans selection:bg-[#238636] selection:text-white">
        {/* Ambient Top Glow with subtle GitHub green tint */}
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 radial-spotlight pointer-events-none z-0" />

        <NavBar />

        {/* Main Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 relative z-10">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] bg-[#050507] py-6 text-center text-xs text-zinc-600">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-mono text-[11px]">
              ATOM Autonomous GitHub Resolution Engine · Monochrome Glass Edition
            </p>
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
