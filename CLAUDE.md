# CLAUDE.md — ATOM Project Summary & Status

## 1. Executive Summary & Status
- **Status**: Phase 2 Complete (GitHub App Integration & Webhook Listener)
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
│   └── server/                # Express.js API, Better Auth, Webhook listener, Repos & Issues REST routes
│
└── packages/
    ├── core/                  # Shared Zod schemas (Citations, RCA, Runs) & domain types
    ├── github/                # Octokit REST client, App authentication, Webhook signature verifier & GitCloner
    ├── parser/                # Tree-sitter AST parser & multi-language chunker
    ├── rag/                   # HyDE, OpenAI Embeddings, Pinecone/BM25 & Reciprocal Rank Fusion (RRF)
    └── agent/                 # LLM Root Cause Analysis, Patch & Test generation engine
```

---

## 3. Tech Stack Quick Reference

| Layer | Choice | Notes |
|---|---|---|
| **Frontend** | Next.js 16+ (App Router), React 19, Tailwind CSS | Dashboard, Issue Workbench, Diff & Evidence viewer |
| **Backend** | Express.js, Node.js, Better Auth | REST APIs, GitHub Webhook listener, Better Auth (GitHub OAuth) |
| **Database & ORM** | Neon PostgreSQL (`pg`), Drizzle ORM | Relational metadata (users, repos, issues, runs, citations) |
| **Vector Database** | Pinecone Vector DB (`@pinecone-database/pinecone`) | 1536-dim embeddings index (`atom-code-chunks`, cosine metric) |
| **Queue & Cache** | Redis 7 + BullMQ | Async job queues (`indexRepo`, `processIssue`, `embedChunks`) |
| **GitHub Integration** | Octokit REST, `@octokit/auth-app`, `simple-git` | GitHub App auth, bot PRs/comments (`atom-agent[bot]`), git blame |
| **RAG & Reranking** | OpenAI `text-embedding-3-small`, BM25, RRF | Reciprocal Rank Fusion (100% free $0 API cost reranking) |
| **Code Parsing** | Tree-sitter AST parser (`web-tree-sitter`) | Multi-language AST semantic chunking |

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
pnpm db:migrate      # Apply migrations to PostgreSQL
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
   - `@atom/parser`: Tree-sitter code parsing and `CodeChunk` type definitions.
   - `@atom/rag`: Reciprocal Rank Fusion (`reciprocalRankFusion`) utility for hybrid search merging.
   - `@atom/agent`: Issue analysis engine baseline with `analyzeIssue()` stub.
3. **Application Baseline** (2 apps):
   - `apps/server`: Express.js entry point with health check, Drizzle ORM schema defining 6 tables (`repositories`, `chunks`, `issues`, `runs`, `rca_results`, `citations`), and `drizzle.config.ts`.
   - `apps/web`: Next.js App Router with Tailwind CSS dark-mode dashboard, `layout.tsx`, and `page.tsx` home view.
4. **Infrastructure & Environment**:
   - `docker-compose.yml`: PostgreSQL 16 + Redis 7 Alpine containers.
   - `.env.example`: Documented template for GitHub App, Better Auth, OpenAI, Postgres, Pinecone, and Redis keys.
   - `.gitignore`: Configured to exclude `**/dist/`, `*.tsbuildinfo`, `node_modules/`, `.next/`, and `.env` files.

### Phase 2 — GitHub API Integration & Webhook Listener
1. **GitHub Package (`@atom/github`)**:
   - `AtomGitHubClient`: Octokit REST API wrapper supporting GitHub App authentication (`@octokit/auth-app`), issue fetching, PR creation (`createPullRequest`), issue comment publishing (`createIssueComment`), commit logs, and file tree inspection.
   - `GitCloner`: Shallow repo cloning module with `simple-git` and git blame line inspection.
   - `GitHubWebhookHandler`: Webhook signature verification (`x-hub-signature-256`) and issue/installation payload parser.
2. **Server Services (`apps/server`)**:
   - `Better Auth` setup with GitHub OAuth social provider integration (`src/auth.ts`).
   - Webhook Endpoint (`POST /webhooks/github`): Verified event receiver for issue lifecycle & app installation events.
   - Repos API Router (`GET /api/repos`, `POST /api/repos`): Repository connection and management.
   - Issues API Router (`GET /api/issues/:owner/:repo/:number`, `POST /api/issues/:owner/:repo/:number/run`): Issue details retrieval & agent analysis run trigger.

---

## 6. Background Job Queue Architecture (Redis + BullMQ)

| Queue Name | Purpose & Workflow |
|---|---|
| **`indexRepo`** | Asynchronously clones repository via `simple-git`, runs Tree-sitter AST parsing, extracts function/class chunks, generates OpenAI embeddings, and populates Pinecone + Neon Postgres without HTTP request timeouts. |
| **`processIssue`** | Executes RAG pipeline (HyDE query expansion $\rightarrow$ Pinecone vector search + BM25 keyword search $\rightarrow$ Reciprocal Rank Fusion $\rightarrow$ LLM RCA reasoning $\rightarrow$ diff patch generation $\rightarrow$ automated test generation). |
| **`embedChunks`** | Batch processes OpenAI embedding API calls with rate-limit throttling and exponential backoff retry. |

**Real-Time SSE Broadcasting**: Workers publish execution progress to Redis Pub/Sub, which streams live step-by-step progress (`cloning` $\rightarrow$ `parsing` $\rightarrow$ `embedding` $\rightarrow$ `retrieving` $\rightarrow$ `patching`) to the Next.js frontend via Server-Sent Events (SSE).

---

## 7. Setup & Execution Checklist

1. **Copy `.env`**: `Copy-Item .env.example .env`
2. **Create Pinecone Index**:
   - Index Name: `atom-code-chunks`
   - Dimensions: `1536`
   - Metric: `cosine`
3. **Register GitHub App** (GitHub Settings $\rightarrow$ Developer Settings $\rightarrow$ GitHub Apps):
   - Callback URL: `http://localhost:4000/api/auth/callback/github`
   - Webhook URL: `https://<your-domain-or-ngrok>/webhooks/github`
   - Permissions: Issues (`Read & Write`), Pull Requests (`Read & Write`), Contents (`Read-only`)
   - Webhook Subscriptions: `Issues`, `Pull Request`, `Push`
4. **Fill Credentials in `.env`**: `OPENAI_API_KEY`, `PINECONE_API_KEY`, `DATABASE_URL`, `REDIS_URL`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_WEBHOOK_SECRET`.
5. **Start & Run**:
   - `pnpm docker:up`
   - `pnpm db:push`
   - `pnpm dev`

---

## 8. Next Steps (Phase 3 & Beyond)

1. **Phase 3 — Code Parsing & Hybrid Indexing Pipeline**:
   - Multi-language AST parsing using Tree-sitter (TS, JS, Python, Go, Rust, Java).
   - Smart semantic chunker (function/class level node extraction).
   - Git blame commit hash tagging per chunk.
   - Batch OpenAI embeddings generation + Pinecone upsert & BM25 sparse index update via BullMQ `indexRepo` job queue.
