import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ATOM — Autonomous GitHub Issue Resolution Agent",
  description: "Evidence-first autonomous bug fixing agent with RCA and patch generation"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#090d16] text-gray-100">
        {children}
      </body>
    </html>
  );
}
