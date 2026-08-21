# CLAUDE.md — ATOM Project Architecture, Status & Knowledge Base

> **Project**: ATOM (Autonomous GitHub Issue Resolution Agent)  
> **Status**: Production Ready · Phase 8 Verified & Enhanced  
> **Monorepo Manager**: `pnpm` workspaces (`pnpm-workspace.yaml`)  
> **Node Version**: >= 20.0.0

---

## 1. Executive Summary & Architecture Overview

**ATOM** is an autonomous AI coding agent designed for evidence-first GitHub issue resolution. When given a GitHub issue, ATOM:
1. **Performs Root Cause Analysis (RCA)** anchored to file- and line-level evidence (`auth.ts:42-81`) and commit blame logs.
2. **Generates Unified Diff Patches** (`--- a/... +++ b/...`) to fix the underlying regression.
3. **Synthesizes Automated Unit Test Suites** to prevent regression.
4. **Verifies in a Sandboxed Runner** before publishing.
5. **Publishes Bot Pull Requests or Comments** on GitHub as `atom-agent[bot]`.

```
GitHub OAuth / Webhook / UI Intake
                │
                ▼
      Better Auth Social Gate (GitHub OAuth)
                │
                ▼
   ┌────────────────────────────────────────┐
   │         Main Workspace Engine          │
   │  • Auto-resolves user GitHub handle    │
   │  • Synced Repositories Dropdown/Combobox│
   │  • 1-Click Codebase Indexer (AST+pgvec)│
   │  • Connected & Active Repos Component  │
   └───────────────────┬────────────────────┘
                       │
                       ▼
   ┌────────────────────────────────────────┐
   │        Issue Workbench Explorer        │
   │  • Connected directly to Indexed Repos │
   │  • Live GitHub Issue Browser           │
   │  • HyDE + BM25 + Reciprocal Rank Fusion│
   │  • LLM RCA Reasoning & Unified Patch   │
   │  • Sandboxed Patch Runner & Verifier   │
   │  • Octokit Bot Comment / PR Publisher  │
   └────────────────────────────────────────┘
```

---

## 2. Monorepo Structure & Package Responsibilities

```
atom/
├── AGENTS.md                  # Master 8-Phase Architecture Spec
├── README.md                  # High-level overview
├── CLAUDE.md                  # System architecture, knowledge base & logs
├── docker-compose.yml         # Local Postgres (pgvector:pg16) + Redis (7-alpine)
├── .env.example               # Environment variables template
├── pnpm-workspace.yaml        # pnpm workspace definition
├── package.json               # Monorepo root build & dev scripts
├── tsconfig.base.json         # Base TypeScript shared configuration
│
├── apps/
│   ├── web/                   # Next.js 16 (App Router) + Tailwind CSS Glassmorphic UI
│   │   ├── app/
│   │   │   ├── page.tsx       # Auth-Gated Landing Page (GitHub OAuth CTA only)
│   │   │   ├── layout.tsx     # Root layout with Glassmorphic ambient glow
│   │   │   ├── workspace/     # Synced Repos (Top) & Connected Repos (Bottom)
│   │   │   └── issues/        # Issue Explorer & Live RCA Workbench
│   │   ├── components/
│   │   │   └── NavBar.tsx     # Session-aware navigation & user avatar
│   │   ├── lib/
│   │   │   └── auth-client.ts # Better Auth React Client (useSession, signIn, signOut)
│   │   └── middleware.ts      # Edge middleware protecting /workspace and /issues
│   │
│   └── server/                # Express.js REST API, Better Auth & BullMQ Jobs
│       ├── src/
│       │   ├── auth.ts        # Better Auth config (GitHub OAuth + trustedOrigins)
│       │   ├── index.ts       # Express entry, CORS with credentials, API routes
│       │   ├── db/            # Drizzle ORM schema (6 tables) & Neon connection
│       │   ├── jobs/          # indexRepoTask AST chunker & OpenAI embedder
│       │   ├── routes/        # repos.ts, issues.ts, runs.ts
│       │   └── webhooks/      # GitHub webhook listener & signature verifier
│
└── packages/
    ├── core/                  # Shared Zod schemas (Citations, RCA, Runs) & domain types
    ├── github/                # Octokit client, dynamic installation auth, GitCloner
    ├── parser/                # Smart AST code chunker (Tree-sitter) & markdown parser
    ├── rag/                   # HyDE, OpenAI text-embedding-3-small, BM25, RRF hybrid search
    └── agent/                 # LLM RCA engine (gpt-4o) & SandboxTestRunner
```

---

## 3. Tech Stack Reference

| Layer | Technology | Key Details |
|---|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, Tailwind CSS | Obsidian glassmorphism (`#050507`), Lucide icons, Edge middleware |
| **Backend** | Node.js 20+, Express.js | CORS with `credentials: true`, dynamic route fallback, Better Auth |
| **Auth** | Better Auth (`better-auth`) | GitHub Social Provider, OAuth scopes `["repo", "read:user", "user:email"]` |
| **Database & ORM** | Neon PostgreSQL (`pg`), Drizzle ORM | 6 relational tables: `repositories`, `chunks`, `issues`, `runs`, `rca_results`, `citations` |
| **Vector DB** | Neon `pgvector` & OpenAI Embeddings | 1536-dim embeddings via `text-embedding-3-small` |
| **Code Parser** | Tree-sitter & AST structural parser | Extracts function/class/method bounds + markdown sections |
| **GitHub Integration** | Octokit REST, `@octokit/auth-app`, `simple-git` | Dynamic repository installation token resolution, shallow cloning |
| **RAG & Search** | Dense Vector + BM25 + RRF | Reciprocal Rank Fusion combining keyword + semantic embeddings |
| **Agent Reasoning** | OpenAI `gpt-4o` / `o3-mini` | Zod structured outputs: RCA, file citations, unified diff, unit tests |
| **Sandboxed Runner** | Node `child_process` + `git apply` | Isolated patch application and test suite execution |

---

## 4. Key CLI Commands

```bash
# Install dependencies across all packages
pnpm install

# Development
pnpm dev             # Run server (port 4000) and web app (port 3000) concurrently
pnpm dev:web         # Run Next.js frontend only (http://localhost:3000)
pnpm dev:server      # Run Express backend only (http://localhost:4000)

# Build & Type Check
pnpm build           # Build all packages first, then apps
pnpm build:packages  # Build core, github, parser, rag, and agent packages
pnpm build:server    # Build Express backend
pnpm build:web       # Build Next.js frontend

# Database Operations (Drizzle ORM)
pnpm db:generate     # Generate SQL migration files
pnpm db:migrate      # Apply migrations to PostgreSQL (Neon DB)
pnpm db:push         # Push schema directly to database
pnpm db:studio       # Launch Drizzle Studio database UI

# Local Services (Docker Compose)
pnpm docker:up       # Launch Postgres + Redis containers
pnpm docker:down     # Stop local Docker containers
```

---

## 5. Critical Knowledge & Architectural Insights

### A. Better Auth & GitHub OAuth Integration
- **Strict Auth Gate**: Unauthenticated users visiting `/` only see "Sign in with GitHub". Authenticated users are automatically redirected to `/workspace`.
- **Edge Middleware (`middleware.ts`)**: Fast session cookie gate on Next.js edge preventing unauthenticated navigation to `/workspace` and `/issues`.
- **Absolute Callback URLs**: `signIn.social` passes an absolute callback URL (`http://localhost:3000/workspace`) to prevent Better Auth from redirecting to the backend API port (4000).
- **CORS Credentials Mode**: Express CORS is configured with `credentials: true` and explicit origin (`http://localhost:3000`), avoiding wildcard origin rejections on session requests.

### B. Automatic GitHub Handle & Repo Resolution
- **User Display Name vs Handle**: Better Auth returns display names (e.g. `"Abhinav Bist"`), which fail GitHub user APIs requiring exact handles (`AbhinavBist-01`).
- **Avatar ID Resolution (`resolveUserLogin`)**: Extracts numeric user ID from avatar URL (`/u/178583190`) and fetches `/user/178583190` to resolve the exact login handle with 100% precision without manual input.
- **Synced vs Connected Repositories**:
  - **Synced (Top)**: Real-time list of all user repositories from GitHub with search, language tags, and 1-click "Connect & Index" action.
  - **Connected (Bottom)**: Active codebases indexed into ATOM's database with status badges and "Open Workbench Issues" triggers.

### C. Issue Workbench & Indexed Codebases Connection
- **Tight Coupling**: `/issues` is directly connected to indexed repositories in the database.
- **Live Issue Explorer**: Selecting an indexed codebase fetches live open GitHub issues (`GET /api/issues/:owner/:repo`).
- **1-Click Workbench Launch**: Clicking any issue opens `/issues/[owner]/[repo]/[number]` to run RCA.

### D. Sandboxed Test Runner & Bot Comment Publishing
- **Dynamic Installation Auth (`getInstallationOctokit`)**: Resolves the repository installation ID on the fly via `octokit.apps.getRepoInstallation({ owner, repo })`, allowing bot PRs and issue comments without manual installation IDs.
- **Auto-Cloning in Sandbox**: If `scratch/repos/${owner}_${repo}` is missing during sandbox test verification, it automatically triggers a shallow clone before applying diff patches.
- **Multi-Stage RSA Key Sanitization**: Handles base64 encoded private keys, wrapped quotation marks (`"..."` / `'...'`), and unescapes literal `\n` characters from `.env` files with graceful fallback.

### E. GitHub App Multi-Installation & Repository Aggregation
- **Cross-Installation Discovery (`listAllAppRepos`)**: Discovers repositories across all installations where the ATOM GitHub App is configured by iterating through `apps.listInstallations()` and `apps.listReposAccessibleToInstallation()`.
- **Connection Health & Metadata**: `/api/repos/github-repos` returns `isAppConnected` and `appReposCount` flags to render visual connection badges in the Workspace UI.

### F. Next.js Architecture, API Rewrites & ESM Interop
- **Transparent API Rewrites (`next.config.mjs`)**: Next.js proxies `/api/auth/:path*` and `/api/:path*` directly to `NEXT_PUBLIC_SERVER_URL` (port 4000), eliminating cross-origin mismatches and cookie dropping.
- **Pure ESM Monorepo Standardization**: All `@atom/*` packages define `"type": "module"` with explicit `.js` import extensions for modern Node.js and Next.js 16 bundler compliance.
- **Client Suspense Boundaries**: Pages consuming `useSearchParams` (e.g. `/issues`) are wrapped in React `<Suspense>` boundaries to satisfy Next.js static generation constraints.

---

## 6. Implementation Log & Bug Fixes

| Problem / Symptom | Root Cause | Solution Applied |
|---|---|---|
| **CORS Wildcard Rejection** | Better Auth `/api/auth/get-session` sent credentials while Express used `cors()` wildcard `*`. | Configured `cors({ origin: 'http://localhost:3000', credentials: true })` and `trustedOrigins` in `betterAuth`. |
| **CSP Violation on Port 4000** | OAuth `callbackURL` was relative (`/workspace`), causing Better Auth to redirect to backend port 4000. | Passed absolute frontend URL (`${window.location.origin}/workspace`) and added safety redirect on port 4000. |
| **Repos Listing 404** | GitHub user repo API queried display name `"Abhinav Bist"` instead of handle `"AbhinavBist-01"`. | Implemented `resolveUserLogin` extracting numeric user ID from avatar URL with search fallback. |
| **App Auth RSA Crash** | `createAppAuth` threw on literal `\n` in `.env` private key string. | Unescaped `\\n` to real newlines, stripped quotes, and added try/catch fallback. |
| **Disconnected Issue Workbench** | `/issues` only had manual inputs without showing indexed repositories. | Rewrote `/issues` to load DB repositories, browse live GitHub issues, and support `?owner=&repo=`. |
| **Verify 400 / Missing Directory** | `/api/runs/:id/verify` failed if `scratch/repos` was not on disk. | Added auto-clone fallback with `GitCloner` and automatic relation lookup from DB. |
| **Publish Comment 401 / 500** | `AtomGitHubClient` had unauthenticated Octokit instance for comment creation. | Added dynamic repository installation token resolution (`getInstallationOctokit`). |
| **Org / App Repos Missing** | User repo listing only fetched personal repos, missing repos where GitHub App was installed. | Implemented `listAllAppRepos()` and `listInstallationRepos()` in `AtomGitHubClient` and merged with user repos. |
| **Next.js Port / CORS Friction** | Direct client requests to port 4000 required complex CORS headers on edge routes. | Added Next.js `rewrites()` in `next.config.mjs` to proxy `/api/*` and `/api/auth/*` to the server. |
| **ESM Module Resolution Failure** | Monorepo internal packages lacked `"type": "module"`, breaking ESM imports. | Added `"type": "module"` to `package.json` files across `@atom/core`, `@atom/github`, `@atom/parser`, `@atom/rag`, `@atom/agent`. |
| **Next.js 16 CSR Bailing Warning** | `useSearchParams()` in `/issues` caused static generation de-optimization warnings. | Wrapped `IssuesWorkbenchDirectoryPage` inside `<Suspense>` with loading fallback. |
| **Base64 / Quoted Key Failure** | `GITHUB_APP_PRIVATE_KEY` stored with quotes or base64 failed PEM header check. | Added base64 detection & decode, quote trimming, and CRLF normalization. |
| **EINVAL Readlink on Windows/OneDrive** | Next.js stale cache in `.next/server/app/page.js` caused `readlink` syscall error on NTFS/OneDrive. | Cleared `.next` cache directory (`Remove-Item -Recurse -Force apps/web/.next`) and rebuilt cleanly. |

---

## 7. Frontend Design System & Landing Page Specifications

### A. Core Design Philosophy
- **Minimalist & Professional**: Zero AI-slop (no gratuitous purple/magenta gradients, no generic floating blobs). Pure focus on high-signal developer information.
- **Color Palette (Monochrome + GitHub Green Accent Only)**:
  - `Background`: `#050507` (Deep obsidian black)
  - `Panels & Cards`: `#0d1117`, `#161b22`, `#21262d` (GitHub dark mode neutrals)
  - `Borders`: `#30363d` (Precise, hairline structural borders)
  - `Text`: `#ffffff` (Primary heading), `#f0f6fc` (Secondary), `#8b949e` (Muted labels & captions)
  - `GitHub Green Accent`:
    - CTA Background: `#238636` (`gh-btn-green` class)
    - CTA Hover: `#2ea043`
    - Badges & Text: `#3fb950` (`text-[#3fb950]`)
    - Dark Badge Fill: `#0e2e1a` (`bg-[#0e2e1a]`)
    - Diff Additions: `rgba(46, 160, 67, 0.15)` with `#3fb950` border
    - Ambient Glow: `radial-gradient` spotlight with 8% `#2ea043` alpha

### B. Typography Hierarchy
- **Body & Display**: **Inter** (`next/font/google`, `var(--font-inter)`), font-weight scale `400 / 500 / 600 / 800`.
- **Code & Metadata**: **JetBrains Mono** (`var(--font-mono)`), used for file citations (`auth.ts:42-81`), commit hashes (`8f31a2c`), and diff views.

### C. Landing Page Modular Component Architecture (`apps/web/components/landing/`)
1. **`HeroSection.tsx`**:
   - Live heartbeat status badge (`● ATOM v0.1.0 · Autonomous GitHub Issue Resolution Engine`).
   - High-contrast editorial headline with subtle white-to-green gradient terminal word.
   - 1-click **GitHub Green OAuth CTA** (`gh-btn-green`) with instantaneous loading state.
   - Architecture trust indicators: *Zero-Code Leaks (Scoped OAuth)*, *Automated Unit Tests*, *AST Chunking + RAG*.

2. **`InteractiveWorkbenchDemo.tsx`**:
   - Live interactive simulation of the ATOM Issue Workbench.
   - Interactive scenario switcher for real-world bugs (e.g. Issue `#402` token refresh race condition, Issue `#188` WebSocket memory leak).
   - 4-stage interactive tab inspector:
     - **1. Root Cause Analysis**: Exact file:line citation (`src/auth/refresh.ts:42-81`), commit blame trace (`PR #392`), and confidence score (`99.4%`).
     - **2. Unified Diff Patch**: Git-compliant patch preview with red deletion and green addition highlights.
     - **3. Synthesized Unit Tests**: Generated regression test suite (Vitest/Jest).
     - **4. Sandbox & Bot PR**: Sandbox verification report (100% passed in `1.42s`) and `atom-agent[bot]` PR simulation.

3. **`CoreCapabilitiesGrid.tsx`**:
   - 4 technical pillars:
     - *AST Structural Indexer* (Tree-sitter multi-language chunking + pgvector).
     - *Reciprocal Rank Fusion* (Dense embeddings + BM25 keyword search + HyDE).
     - *Evidence-First RCA* (Deterministic file:line citations over hallucinations).
     - *Sandboxed Verification & Bot Publisher* (`git apply` isolation + GitHub App bot auth).

4. **`UseCasesSection.tsx`**:
   - 3 focused developer workflows:
     - *Autonomous GitHub Issue Triage* (Webhooks -> clone -> RCA -> PR).
     - *Interactive Issue Workbench* (In-depth developer inspection and approval).
     - *Automated Regression Test Synthesis* (Guaranteed reproduction tests for CI).

5. **`CallToAction.tsx`**:
   - Minimalist bottom card with subtle GitHub Green ambient radial spotlight and 1-click OAuth button.

