import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "monospace"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        gh: {
          canvas: "#050507",
          dark: "#0d1117",
          panel: "#161b22",
          hover: "#21262d",
          border: "#30363d",
          muted: "#8b949e",
          text: "#f0f6fc",
          heading: "#ffffff",
          green: "#238636",
          greenHover: "#2ea043",
          greenText: "#3fb950",
          greenDark: "#0e2e1a",
          red: "#f85149",
          redDark: "#3c1e1e",
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "0.8" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.2s ease-out forwards",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
