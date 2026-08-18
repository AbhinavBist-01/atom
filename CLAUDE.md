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
- **RSA Private Key Unescaping**: Automatically unescapes literal `\n` characters in `GITHUB_APP_PRIVATE_KEY` strings loaded from `.env` files.

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
