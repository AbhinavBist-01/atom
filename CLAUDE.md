# CLAUDE.md — ATOM Project Summary & Status

## 1. Executive Summary & Status
- **Status**: Phase 2 Complete (GitHub Integration & Webhook Listener)
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
    ├── github/                # Octokit REST client, Webhook signature verifier & GitCloner
    ├── parser/                # Tree-sitter AST parser & multi-language chunker
    ├── rag/                   # HyDE, OpenAI Embeddings, pgvector/BM25 & Cohere Reranker
    └── agent/                 # LLM Root Cause Analysis, Patch & Test generation engine
```

---

## 3. Tech Stack Quick Reference

| Layer | Choice |
|---|---|
| **Frontend** | Next.js 16+ (App Router), React 19, Tailwind CSS, Lucide Icons |
| **Backend** | Express.js, Node.js, Better Auth (GitHub OAuth), Zod |
| **Database & ORM** | Neon PostgreSQL / pgvector, Drizzle ORM |
| **Queue & Cache** | Redis 7 + BullMQ |
| **GitHub Integration** | Octokit REST, `@octokit/webhooks`, `simple-git` |
| **RAG & Search** | OpenAI `text-embedding-3-small`, BM25, Cohere Rerank v3 |
| **Code Parsing** | Tree-sitter AST parser (`web-tree-sitter`) |

---

## 4. Key CLI Commands

```bash
# Install dependencies across all workspace packages
pnpm install

# Development
pnpm dev             # Run server and web app concurrently in parallel
pnpm dev:web         # Run Next.js frontend only
pnpm dev:server      # Run Express backend only

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
pnpm docker:up       # Launch Postgres (pgvector) + Redis containers
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
   - `docker-compose.yml`: PostgreSQL 16 (`pgvector/pgvector:pg16`) + Redis 7 Alpine containers.
   - `.env.example`: Documented template for GitHub, Better Auth, OpenAI, Cohere, Postgres, and Redis keys.
   - `.gitignore`: Configured to exclude `**/dist/`, `*.tsbuildinfo`, `node_modules/`, `.next/`, and `.env` files.

### Phase 2 — GitHub API Integration & Webhook Listener
1. **GitHub Package (`@atom/github`)**:
   - `AtomGitHubClient`: Octokit REST API wrapper to fetch issue details, commit history, and directory file trees.
   - `GitCloner`: Shallow repo cloning module with `simple-git` and git blame line inspection.
   - `GitHubWebhookHandler`: Webhook signature verification (`x-hub-signature-256`) and issue event parser.
2. **Server Services (`apps/server`)**:
   - `Better Auth` setup with GitHub OAuth social provider integration (`src/auth.ts`).
   - Webhook Endpoint (`POST /webhooks/github`): Verified event receiver for issue lifecycle events.
   - Repos API Router (`GET /api/repos`, `POST /api/repos`): Repository management and connection.
   - Issues API Router (`GET /api/issues/:owner/:repo/:number`, `POST /api/issues/:owner/:repo/:number/run`): Issue retrieval & agent run trigger.

---

## 6. Next Steps (Phase 3 & Beyond)

1. **Phase 3 — Code Parsing & Hybrid Indexing Pipeline**:
   - Multi-language AST parsing using Tree-sitter (TS, JS, Python, Go, Rust, Java).
   - Smart semantic chunker (function/class level node extraction).
   - Git blame commit hash tagging per chunk.
   - Batch OpenAI embeddings generation + pgvector upsert & BM25 sparse index update via BullMQ `indexRepo` job queue.

