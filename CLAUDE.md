# CLAUDE.md — ATOM Project Summary & Phase 1 Infrastructure

## 1. Executive Summary & Status
- **Status**: Phase 1 Complete (Monorepo Scaffolding & Infrastructure)
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
│   └── server/                # Express.js API, Better Auth, BullMQ job handlers, Drizzle ORM
│
└── packages/
    ├── core/                  # Shared Zod schemas (Citations, RCA, Runs) & domain types
    ├── github/                # Octokit client wrapper, Webhook listeners & Git cloner
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

## 5. Phase 1 Accomplishments

1. **Monorepo Setup**: Configured `pnpm-workspace.yaml`, root `package.json`, and `tsconfig.base.json`.
2. **Package Scaffolding**:
   - `@atom/core`: Domain models & Zod schemas (`CitationSchema`, `RcaResultSchema`).
   - `@atom/github`: Octokit REST API wrapper & Git integration stub.
   - `@atom/parser`: Tree-sitter AST code parsing & metadata chunking structure.
   - `@atom/rag`: RAG helper utilities including Reciprocal Rank Fusion (`reciprocalRankFusion`).
   - `@atom/agent`: Issue analysis & root cause analysis engine baseline.
3. **Application Baseline**:
   - `apps/server`: Express application bootstrap with Drizzle ORM PostgreSQL schema (`repositories`, `chunks`, `issues`, `runs`, `rca_results`, `citations`) and `drizzle.config.ts`.
   - `apps/web`: Next.js 16 App Router application with Tailwind CSS dark-mode dashboard UI.
4. **Environment & Local Services**:
   - Configured `docker-compose.yml` for PostgreSQL 16 (with `pgvector`) and Redis 7.
   - Created `.env.example` with documented environment variable requirements.

---

## 6. Next Steps (Phase 2 & Beyond)

1. **Phase 2 — GitHub Integration**: Set up GitHub OAuth with Better Auth, Octokit REST client, webhook handlers (`issues.*`, `push`, `pull_request.*`), and `simple-git` cloning module.
2. **Phase 3 — Parsing & Indexing**: Integrate Tree-sitter parsers, extract functions/classes AST nodes, tag git blame commit hashes, generate embeddings, and populate pgvector + BM25 search indices.
