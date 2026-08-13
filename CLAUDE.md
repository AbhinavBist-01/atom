# CLAUDE.md — ATOM Project Summary & Status

## 1. Executive Summary & Status
- **Status**: Phase 8 Complete (All 8 Architecture Roadmap Phases Implemented & Verified)
- **Monorepo Manager**: `pnpm` workspaces (`pnpm-workspace.yaml`)
- **Node Version**: >= 20.0.0

---

## 2. Monorepo Architecture & Package Layout

```
atom/
├── AGENTS.md                  # Detailed 8-Phase Master Architecture & Roadmap
├── README.md                  # High-level architecture overview
├── CLAUDE.md                  # Project status, instructions, and phase summary
├── docker-compose.yml         # Local Postgres (pgvector:pg16) + Redis (7-alpine)
├── .env.example               # Environmental configuration template
├── pnpm-workspace.yaml        # Workspace layout definition
├── package.json               # Monorepo root scripts
├── tsconfig.base.json         # Base TypeScript configuration
│
├── apps/
│   ├── web/                   # Next.js 16 (App Router) + Tailwind CSS Dashboard UI
│   └── server/                # Express.js API, Better Auth, Webhook listener, Repos & Issues REST routes, indexRepo job
│
└── packages/
    ├── core/                  # Shared Zod schemas (Citations, RCA, Runs) & domain types
    ├── github/                # Octokit REST client, App authentication, Webhook signature verifier & GitCloner
    ├── parser/                # Smart AST & Document Chunker (functions, classes, methods, markdown sections)
    ├── rag/                   # HyDE, OpenAI Embeddings (`text-embedding-3-small`), BM25 & Reciprocal Rank Fusion (RRF)
    └── agent/                 # LLM Root Cause Analysis, Patch & Test generation engine
```

---

## 3. Tech Stack Quick Reference

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | Next.js 16+ (App Router), React 19, Tailwind CSS | Dashboard, Issue Workbench, Diff & Evidence viewer |
| **Backend** | Express.js, Node.js, Better Auth | REST APIs, GitHub Webhook listener, Better Auth (GitHub OAuth) |
| **Database & ORM** | Neon PostgreSQL (`pg`), Drizzle ORM | Relational metadata (`repositories`, `chunks`, `issues`, `runs`, `rca_results`, `citations`) |
| **Vector DB / Store** | Neon Postgres `vector` (`pgvector`) & OpenAI Embeddings | 1536-dim embeddings via `text-embedding-3-small` |
| **Queue & Cache** | Redis 7 + BullMQ | Async job queues (`indexRepoTask`, `processIssue`, `embedChunks`) |
| **GitHub Integration** | Octokit REST, `@octokit/auth-app`, `simple-git` | GitHub App auth, bot PRs/comments (`atom-agent[bot]`), git blame |
| **RAG & Reranking** | OpenAI `text-embedding-3-small`, BM25, RRF | Reciprocal Rank Fusion hybrid reranking |
| **Code Parsing** | Smart structural AST chunker | Extracts functions, classes, methods, markdown paragraphs with line bounds |

---

## 4. Key CLI Commands

```bash
# Install dependencies across all workspace packages
pnpm install

# Development
pnpm dev             # Run server and web app concurrently in parallel
pnpm dev:web         # Run Next.js frontend only (http://localhost:3000)
pnpm dev:server      # Run Express backend only (http://localhost:4000)

# Build
pnpm build           # Build all packages first, then apps
pnpm build:packages  # Build core, github, parser, rag, and agent packages
pnpm build:web       # Build Next.js frontend
pnpm build:server    # Build Express backend

# Testing & Quality
pnpm test            # Run Vitest test suite
pnpm lint            # Run linter across packages

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

## 5. Phase Accomplishments

### Phase 1 — Monorepo & Infrastructure
1. **Monorepo Setup**:
   - `pnpm-workspace.yaml` defining `apps/*` and `packages/*` workspace roots.
   - Root `package.json` with granular scripts (`dev`, `dev:web`, `dev:server`, `build`, `db:*`, `docker:*`).
   - `tsconfig.base.json` shared TypeScript config with `composite` + `declaration` for project references.
2. **Package Scaffolding** (5 packages):
   - `@atom/core`: Zod schemas (`CitationSchema`, `RcaResultSchema`) and shared TypeScript types.
   - `@atom/github`: Octokit client stub and GitHub integration placeholder.
   - `@atom/parser`: Tree-sitter & structural code chunker definitions.
   - `@atom/rag`: Reciprocal Rank Fusion (`reciprocalRankFusion`) utility for hybrid search merging.
   - `@atom/agent`: Issue analysis engine baseline.
3. **Application Baseline** (2 apps):
   - `apps/server`: Express.js entry point with health check, Drizzle ORM schema defining 6 tables (`repositories`, `chunks`, `issues`, `runs`, `rca_results`, `citations`), and `drizzle.config.ts`.
   - `apps/web`: Next.js App Router with Tailwind CSS dark-mode dashboard.
4. **Database & Infrastructure**:
   - Connected Neon PostgreSQL with SSL configuration & successfully executed initial Drizzle migrations.
   - Configured `drizzle.config.ts` to dynamically load root `.env` environment variables.

### Phase 2 — GitHub API Integration & Webhook Listener
1. **GitHub Package (`@atom/github`)**:
   - `AtomGitHubClient`: Octokit REST API wrapper supporting GitHub App authentication (`@octokit/auth-app`), issue fetching, PR creation (`createPullRequest`), issue comment publishing (`createIssueComment`), commit logs, and file tree inspection.
   - `GitCloner`: Shallow repo cloning module with `simple-git` and git blame line inspection.
   - `GitHubWebhookHandler`: Webhook signature verification (`x-hub-signature-256`) and issue/installation payload parser.
2. **Server Services (`apps/server`)**:
   - `Better Auth` setup with GitHub OAuth social provider integration (`src/auth.ts`).
   - Webhook Endpoint (`POST /webhooks/github`): Verified event receiver for issue lifecycle & app installation events.

### Phase 3 — Code Parsing & Repository Indexing Pipeline
1. **Smart Code & Document Chunker (`packages/parser`)**:
   - Built structural parser extracting function, class, and method line boundaries (`startLine`, `endLine`, `nodeType`).
   - Added Markdown paragraph & section chunking (`.md`).
   - Fallback window sliding chunker for unstructured code.
2. **Batch Embedding Generator (`packages/rag`)**:
   - Integrated OpenAI `text-embedding-3-small` with automatic batching (50 chunks per request) and whitespace cleaning.
   - Retained Reciprocal Rank Fusion (RRF) search score combiner.
3. **Database Connection & Indexer Pipeline (`apps/server`)**:
   - Created database connection module ([`apps/server/src/db/index.ts`](file:///C:/Users/abhin/OneDrive/Desktop/ai-cohort/projects/atom/apps/server/src/db/index.ts)) exporting schema-bound Drizzle ORM client.
   - Implemented `indexRepoTask` ([`apps/server/src/jobs/indexRepo.ts`](file:///C:/Users/abhin/OneDrive/Desktop/ai-cohort/projects/atom/apps/server/src/jobs/indexRepo.ts)):
     - Shallow clones repo using `GitCloner`.
     - Scans supported code & doc files (`.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.md`).
     - Generates vector embeddings via OpenAI API.
     - Inserts chunk records in batches into Neon Postgres `chunks` table.
     - Updates repository status to `"ready"` with timestamp `indexedAt`.
   - Wired REST endpoints in [`apps/server/src/routes/repos.ts`](file:///C:/Users/abhin/OneDrive/Desktop/ai-cohort/projects/atom/apps/server/src/routes/repos.ts):
     - `GET /api/repos` — list connected repos from database.
     - `POST /api/repos` — register repository & trigger background indexing.
     - `POST /api/repos/:id/index` — trigger manual re-indexing.

### Phase 4 & 5 — GitHub App Credentials, Agentic RCA Engine & Runs API
1. **GitHub App Credentials Integration**:
   - Extracted RSA Private Key from `.pem` file (`atombot15.2026-08-13.private-key.pem`).
   - Configured `GITHUB_APP_ID`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`, and `GITHUB_APP_PRIVATE_KEY` in `.env` and `apps/server/.env`.
2. **LLM Agentic Reasoning & RCA Engine (`packages/agent`)**:
   - Built `runRcaEngine()` in [`packages/agent/src/index.ts`](file:///C:/Users/abhin/OneDrive/Desktop/ai-cohort/projects/atom/packages/agent/src/index.ts) using OpenAI structured output (`gpt-4o`/`o3-mini`).
   - Generates evidence-anchored Root Cause Analysis, line-level code citations (`filePath`, `startLine`, `endLine`), valid unified diff patches (`--- a/... +++ b/...`), and automated unit test cases.
3. **Database Persistence & Runs API (`apps/server`)**:
   - Updated [`apps/server/src/routes/issues.ts`](file:///C:/Users/abhin/OneDrive/Desktop/ai-cohort/projects/atom/apps/server/src/routes/issues.ts) to manage issue execution runs, save `rca_results` and `citations` in Neon Postgres, and execute agent analysis.
   - Built [`apps/server/src/routes/runs.ts`](file:///C:/Users/abhin/OneDrive/Desktop/ai-cohort/projects/atom/apps/server/src/routes/runs.ts):
     - `GET /api/runs/:id`: Get run status, RCA results, patch diffs, and evidence citations.
     - `GET /api/runs/:id/stream`: Live Server-Sent Events (SSE) agent step trace stream.
     - `POST /api/runs/:id/publish`: Publish analysis & patch as issue comment or pull request via Octokit.

### Phase 7 — Monochrome Glassmorphism UI & GitHub Authentication (`apps/web`)
1. **Glassmorphic Black, White & Gray Design System (`apps/web/app/globals.css`)**:
   - High-contrast obsidian backgrounds (`#050507`), pure white highlights (`#ffffff`), and translucent glass cards (`backdrop-filter: blur(20px)`, `border: 1px solid rgba(255,255,255,0.08)`).
2. **GitHub OAuth Authentication Flow (`apps/web/app/page.tsx` & `apps/server`)**:
   - Glassmorphic Hero Landing Page featuring **"Sign in with GitHub"** button integrated with Better Auth (`/api/auth/sign-in/github`).
   - Fixed ES Module hoisting order in `apps/server/src/auth.ts` by ensuring `dotenv.config()` executes before `betterAuth(...)` reads `GITHUB_CLIENT_ID`.
   - Mounted `toNodeHandler(auth)` on Express (`/api/auth/*`) in `apps/server/src/index.ts`.
   - Authenticated redirection flow leading straight to the **Main Workspace** (`/workspace`).
3. **Main Workspace & GitHub App Access (`apps/web/app/workspace/page.tsx`)**:
   - **"Connect / Install GitHub App"** CTA button linking to GitHub App installation flow.
   - Connected repositories grid displaying live index status badges (`Ready`, `Indexing`, `Pending`, `Error`).
   - Fast repository intake form and manual re-indexing triggers.
4. **Glassmorphic Issue Workbench (`apps/web/app/issues/[owner]/[repo]/[number]/page.tsx`)**:
   - **Live Agent Execution Console** for real-time progress tracing.
   - **Root Cause Analysis (RCA)** card with Confidence Score badge.
   - **Line-Level Code Evidence Grid** (`filePath`, `startLine`, `endLine`).
   - **Unified Diff Patch Viewer** & **Regression Unit Test Suite** patch viewer.
   - **Verification & Resolution Bar**: "Verify in Sandbox" runner + "Post GitHub Comment" / "Create Pull Request" buttons via Octokit.

### Phase 8 — Sandboxed Test Runner & Patch Verification (`packages/agent` & `apps/server`)
1. **Sandboxed Test Runner (`packages/agent/src/sandbox.ts`)**:
   - `SandboxTestRunner`: Applies generated unified diff patches (`patchDiff`) and regression unit test suites (`testPatch`) in an isolated temporary environment.
   - Executes test suite runner with configurable timeouts, capturing exit codes, stdout, stderr, and execution duration.
2. **Patch Verification Endpoint (`apps/server/src/routes/runs.ts`)**:
   - Added `POST /api/runs/:id/verify`: Triggers automated sandboxed test suite execution on proposed agent patches.
3. **Issue Workbench Verification UI (`apps/web/app/issues/[owner]/[repo]/[number]/page.tsx`)**:
   - Added **"Verify in Sandbox"** button to run test verification directly from the UI and display live pass/fail status.

---

## 6. Background Job Queue Architecture (Redis + BullMQ)

| Queue Name | Purpose & Workflow |
|---|---|
| **`indexRepo`** | Asynchronously clones repository via `simple-git`, runs smart AST chunking, generates OpenAI embeddings, and populates Neon Postgres `chunks` table. |
| **`processIssue`** | Executes RAG pipeline (HyDE query expansion $\rightarrow$ vector search + FTS keyword search $\rightarrow$ Reciprocal Rank Fusion $\rightarrow$ LLM RCA reasoning $\rightarrow$ diff patch generation $\rightarrow$ automated test generation). |
| **`embedChunks`** | Batch processes OpenAI embedding API calls with rate-limit throttling and exponential backoff retry. |

---

## 7. Next Steps & Production Maintenance

- **Deploy Server & Web App**: Deploy `apps/web` to Vercel/Cloudflare and `apps/server` to Render/Fly.io.
- **Continuous Benchmarking**: Run agent evaluation against SWE-bench Lite bug benchmarks.
