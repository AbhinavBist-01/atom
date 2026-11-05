"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import HeroSection from "@/components/landing/HeroSection";
import InteractiveWorkbenchDemo from "@/components/landing/InteractiveWorkbenchDemo";
import CoreCapabilitiesGrid from "@/components/landing/CoreCapabilitiesGrid";
import UseCasesSection from "@/components/landing/UseCasesSection";
import CallToAction from "@/components/landing/CallToAction";

export default function LandingPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  // If already authenticated, redirect to workspace immediately
  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace("/workspace");
    }
  }, [session, isPending, router]);

  // Show subtle loading state while checking session
  if (isPending || session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="w-6 h-6 text-[#3fb950] animate-spin" />
          <span className="text-xs font-mono text-zinc-500">Checking GitHub Session…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 py-4">
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Interactive Issue Workbench Preview */}
      <InteractiveWorkbenchDemo />

      {/* 3. Core Capabilities & Architecture Grid */}
      <CoreCapabilitiesGrid />

      {/* 4. Real-world Engineering Use Cases */}
      <UseCasesSection />

      {/* 5. Bottom Call to Action */}
      <CallToAction />
    </div>
  );
}

