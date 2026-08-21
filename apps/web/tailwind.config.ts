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
          dark: "#0d1117",
          panel: "#161b22",
          border: "#30363d",
          hover: "#21262d",
          muted: "#8b949e",
          green: "#238636",
          greenHover: "#2ea043",
          greenText: "#3fb950",
          greenDark: "#0e2e1a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
