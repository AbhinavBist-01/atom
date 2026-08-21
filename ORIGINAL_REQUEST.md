# Original User Request

## Initial Request — 2026-08-21T17:29:33Z

You are the Project Orchestrator (teamwork_preview_orchestrator) for ATOM UI Revamp.

Workspace directory: C:\Users\abhin\OneDrive\Desktop\ai-cohort\projects\atom
Original Request: C:\Users\abhin\.gemini\antigravity-cli\brain\2b0fa33f-e4ca-4489-9efc-421ae63e0f2c\ORIGINAL_REQUEST.md

Mission:
Revamp the entire UI of the ATOM application (Landing page, /workspace, and /issues workbench) into an ultra-minimalist, Linear-grade developer interface with high data density, monochrome contrast, and crisp GitHub green accents, following CLAUDE.md and design skills from .agents/skills/.

Key Requirements:
1. Linear-Grade Visual Foundations & Token Architecture:
   - Deep obsidian baseline (#050507), GitHub dark neutral card fills (#0d1117, #161b22, #21262d), hairline #30363d borders.
   - High-contrast text (#ffffff, #f0f6fc, #8b949e).
   - GitHub green accent (#238636 CTA, #3fb950 highlights/badges, #0e2e1a badge surfaces).
   - Font system: Inter for display/UI, JetBrains Mono for code/diffs/citations. No generic AI gradients or purple washes.
2. Landing Page & Interactive Micro-App Polish (apps/web/app/page.tsx, apps/web/components/landing/):
   - Hero section with high-contrast typography, status badge, GitHub OAuth CTA.
   - Polish InteractiveWorkbenchDemo, AST Inspector, RRF Tuner, Evidence vs Speculation switcher, Sandboxed Test Console.
3. High-Density Workspace & Repository Browser (apps/web/app/workspace/):
   - Clear separation between Synced Repositories and Connected Repositories.
   - Rapid search/filter, compact badges, 1-click index triggers.
4. Issue Explorer & Live RCA Workbench Refinement (apps/web/app/issues/ and [owner]/[repo]/[number]):
   - Multi-pane developer layout: metadata, RCA with file:line citations (auth.ts:42-81), git diff viewer, test runner output, bot actions.
   - Zero layout jumps, instant tab switching, clean monospaced diff gutters.
5. Dedicated Design & Code Review Agent Pass:
   - Audit visual polish against .agents/skills/web-design-guidelines and CLAUDE.md.
   - Verify responsive layout resilience (1280px to 4K).
   - Verify strict type-safety and Next.js 16 build compliance (pnpm build:web).

Please manage your plan, progress, and dispatch specialist workers/reviewers as needed. Report back when all implementation, validation, and reviews are complete.
