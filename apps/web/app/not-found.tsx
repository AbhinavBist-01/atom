import Link from "next/link";
import { ArrowLeft, Cpu } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
      <div className="w-16 h-16 bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden p-1 shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ATOM Logo" className="w-full h-full object-cover rounded-xl" />
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-white font-mono">404</h1>
        <h2 className="text-base font-semibold text-zinc-300">Page Not Found</h2>
        <p className="text-xs text-[#8b949e]">
          The requested route does not exist or has been relocated.
        </p>
      </div>

      <Link
        href="/"
        className="gh-btn-green px-5 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to ATOM</span>
      </Link>
    </div>
  );
}
