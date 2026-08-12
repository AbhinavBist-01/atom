# AGENTS.md — ATOM: Autonomous GitHub Issue Resolution Agent

> **Status**: Planning Phase · **Version**: 0.1.0 · **Last Updated**: 2026-08-12

---

## 1. Project Overview & Objective

**ATOM** is a fully autonomous AI agent that takes a GitHub issue as input and produces:

1. A **root cause analysis** with file + line-level evidence
2. A **unified diff patch** (the actual code fix)
3. **Automated unit tests** covering the regression
4. A **GitHub PR or comment** with all of the above attached

The key differentiator is **evidence-first reasoning** — every conclusion is anchored to specific files, line ranges, and commit hashes. Not:

> "I think the bug is in auth.ts."

But:

```
Root cause : race condition in token refresh lock
Evidence   : src/auth/refresh.ts:42-81
Introduced : commit 8f31a2c (PR #392)
Missing    : concurrent-refresh test case
Fix        : src/auth/refresh.ts — wrap refresh() with mutex lock
```

---

## 2. High-Level Data Flow

```
GitHub Issue / Webhook Event
          |
          v
  +-------------------+
  |   Issue Intake    |  <- Octokit REST / Webhook
  +--------+----------+
           |
           v
  +--------------------+
  |  Context Fetcher   |  <- Related PRs, Issues, Commit history
  +--------+-----------+
           |
           v
  +--------------------+
  |  HyDE Query Engine |  <- LLM generates hypothetical fix doc
  +--------+-----------+
           |
           v
  +--------------------------------------+
  |          Hybrid Retriever            |
  |  Dense  : pgvector / Pinecone        |
  |  Sparse : BM25 / Postgres FTS        |
  |  Fusion : Reciprocal Rank Fusion     |
  +----------------+---------------------+
                   |
                   v
  +--------------------------------------+
  |         Cohere Reranker              |  <- Top-K cross-encoder rerank
  +----------------+---------------------+
                   |
                   v
  +--------------------------------------+
  |          Context Builder             |
  |  Issue + Code Chunks + Git Log +     |
  |  Related Issues/PRs + Tests          |
  +----------------+---------------------+
                   |
                   v
  +--------------------------------------+
  |       LLM Reasoning Engine           |  <- gpt-4o / o3-mini (structured output)
  |  1. Root Cause Analysis (RCA)        |
  |  2. File:Line Evidence Citations     |
  |  3. Unified Diff Patch               |
  |  4. Test Case Generation             |
  +----------------+---------------------+
                   |
                   v
  +--------------------------------------+
  |      GitHub Action Publisher         |  <- PR creation / Issue comment
  +--------------------------------------+
```

---

## 3. Indexing Pipeline (Repo -> Vector Store)

When a repo is connected or a push event fires, the indexing pipeline runs as a BullMQ job:

```
Repo Clone (shallow via simple-git)
          |
          +-- Code files (.ts, .js, .py, .go, .java, .rs)
          |         |
          |         v
          |    Tree-sitter AST parse
          |         |
          |         v
          |    Chunk by: function -> class -> module
          |         + metadata: { filePath, startLine, endLine, nodeType, lang, exports, imports }
          |
          +-- Docs / Markdown (.md, .txt, config files)
                    |
                    v
               Paragraph chunking + metadata

Each Chunk -> { content, filePath, startLine, endLine, nodeType, lang, gitBlameCommit }
           -> text-embedding-3-small  ->  pgvector upsert + BM25 index update
```

---

## 4. Tech Stack

### Frontend — apps/web

| Concern      | Choice                            |
|---|---|
| Framework    | Next.js 14+ (App Router)          |
| Language     | TypeScript                        |
| Styling      | Tailwind CSS v3                   |
| Icons        | Lucide React                      |
| Code Viewer  | Monaco Editor                     |
| Diff Viewer  | react-diff-viewer-continued       |
| Real-time    | WebSocket / SSE client            |

### Backend — apps/server

| Concern      | Choice                            |
|---|---|
| Runtime      | Node.js 20+                       |
| Language     | TypeScript                        |
| Framework    | Express.js                        |
| Auth         | JWT + GitHub OAuth                |
| Validation   | Zod                               |
| Job Queue    | BullMQ + Redis                    |
| Real-time    | Socket.io / SSE                   |

### Data Layer

| Concern      | Choice                            |
|---|---|
| Relational   | Neon PostgreSQL (serverless)      |
| Vector Store | pgvector (primary) + Pinecone     |
| Sparse Search| Postgres FTS + wink-bm25          |
| Cache        | Redis                             |
| ORM          | Drizzle ORM                       |

### AI / LLM

| Concern      | Choice                             |
|---|---|
| Completion   | OpenAI gpt-4o / o3-mini            |
| Embeddings   | OpenAI text-embedding-3-small      |
| Reranker     | Cohere rerank-english-v3.0         |
| Output Shape | OpenAI JSON mode + Zod schema      |

### Infra & Tooling

| Concern      | Choice                             |
|---|---|
| Monorepo     | pnpm workspaces                    |
| Code Parser  | Tree-sitter (Node bindings)        |
| GitHub       | @octokit/rest + @octokit/webhooks  |
| Local Dev    | Docker Compose (Redis, Postgres)   |
| Linting      | ESLint + Prettier                  |
| Testing      | Vitest                             |

---

## 5. Database Schema (Core Tables)

```sql
-- Registered repositories
CREATE TABLE repositories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner           TEXT NOT NULL,
  repo            TEXT NOT NULL,
  installation_id TEXT,
  status          TEXT DEFAULT 'pending',  -- pending | indexing | ready | error
  indexed_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Indexed code/doc chunks
CREATE TABLE chunks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         UUID REFERENCES repositories(id) ON DELETE CASCADE,
  file_path       TEXT NOT NULL,
  start_line      INT,
  end_line        INT,
  node_type       TEXT,       -- function | class | module | paragraph
  lang            TEXT,
  content         TEXT NOT NULL,
  embedding       vector(1536),
  git_blame_commit TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- GitHub issues being processed
CREATE TABLE issues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repo_id         UUID REFERENCES repositories(id) ON DELETE CASCADE,
  github_number   INT NOT NULL,
  title           TEXT,
  body            TEXT,
  state           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Agent execution runs per issue
CREATE TABLE runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id        UUID REFERENCES issues(id) ON DELETE CASCADE,
  status          TEXT DEFAULT 'queued',  -- queued | running | done | failed
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  error_msg       TEXT
);

-- RCA + patch output per run
CREATE TABLE rca_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID REFERENCES runs(id) ON DELETE CASCADE,
  root_cause      TEXT,
  confidence      TEXT,  -- low | medium | high
  patch_diff      TEXT,
  test_patch      TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- File:line citations backing each RCA
CREATE TABLE citations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rca_id          UUID REFERENCES rca_results(id) ON DELETE CASCADE,
  chunk_id        UUID REFERENCES chunks(id),
  file_path       TEXT,
  start_line      INT,
  end_line        INT,
  commit_hash     TEXT,
  relevance_score FLOAT
);
```

---

## 6. Phased Implementation Roadmap

### Phase 1 — Monorepo Scaffold & Infrastructure
- [ ] Init pnpm workspace with apps/web, apps/server, packages/*
- [ ] TypeScript configs (base tsconfig + per-package extends)
- [ ] ESLint + Prettier + Vitest setup
- [ ] docker-compose.yml (Redis + Postgres)
- [ ] .env.example with all required keys documented
- [ ] Drizzle ORM schema + initial migration

### Phase 2 — GitHub Integration
- [ ] GitHub App / OAuth flow (installation-based or PAT)
- [ ] Octokit client wrapper: issues, PRs, commits, file trees, blame
- [ ] Express webhook handler for issues.*, push, pull_request.* events
- [ ] Webhook signature verification via @octokit/webhooks
- [ ] Shallow git clone module using simple-git

### Phase 3 — Code Parsing & Indexing Pipeline
- [ ] Tree-sitter integration: TypeScript, JavaScript, Python, Go, Java, Rust
- [ ] Smart chunker: extract functions/classes/modules with line ranges
- [ ] Git blame tagging per chunk (last-modifying commit)
- [ ] Embedding generation with batching + retry + rate limiting
- [ ] pgvector upsert + BM25 index update per chunk
- [ ] BullMQ job: indexRepo — triggered on repo connect or push

### Phase 4 — Hybrid RAG Retrieval Engine
- [ ] HyDE: LLM generates hypothetical fix document from issue text, then embed it
- [ ] Dense retriever: pgvector cosine similarity search
- [ ] Sparse retriever: BM25 / Postgres FTS keyword search
- [ ] Hybrid fusion: Reciprocal Rank Fusion (RRF) merging dense + sparse
- [ ] Cohere reranker: cross-encoder on top-50 -> return top-10
- [ ] Context Builder: assemble final prompt context window with token budgeting

### Phase 5 — Agentic Reasoning & RCA
- [ ] Zod output schema: { rootCause, confidence, evidence[], patchDiff, testPatch }
- [ ] Multi-step LLM chain: RCA -> Citations -> Patch -> Tests
- [ ] Citation extractor: map each claim to filePath:startLine-endLine + commitHash
- [ ] Patch generator: valid unified diff (--- a/ ... +++ b/ ... format)
- [ ] Test generator: edge-case unit tests in the repo's existing test framework
- [ ] Confidence scorer: low / medium / high based on retrieval quality + LLM self-eval

### Phase 6 — Async Job Queue & Real-time Streaming
- [ ] BullMQ queues: indexRepo, processIssue, embedChunks
- [ ] SSE / Socket.io: broadcast live agent step progress to frontend
- [ ] Dead-letter queue + exponential backoff retry
- [ ] Run status persisted to runs table in real time

### Phase 7 — Frontend Dashboard
- [ ] Layout: Sidebar nav (repos, issues, runs) + main content area
- [ ] Repositories page: connect repo, indexing status, manual re-index trigger
- [ ] Issues page: list + filter by status, repo, severity
- [ ] Issue Workbench (core view):
  - Issue metadata (title, labels, author, linked PRs)
  - Live agent progress trace via SSE
  - Code Evidence panel: syntax-highlighted chunks, file:line citations
  - Side-by-side diff viewer for proposed patch
  - Test patch viewer
  - Action buttons: Create PR / Post Comment on GitHub
- [ ] Monaco Editor for code, dark mode default

### Phase 8 — Validation & Benchmarking
- [ ] Sandboxed test runner: apply patch -> run test suite -> report pass/fail
- [ ] Evaluate subset of SWE-bench Lite (300 real bugs)
- [ ] Track: patch acceptance rate, test pass rate, RCA citation accuracy

---

## 7. Directory Structure

```
atom/
|-- AGENTS.md                      <- you are here
|-- README.md
|-- docker-compose.yml             <- Redis + Postgres for local dev
|-- .env.example
|-- pnpm-workspace.yaml
|-- package.json                   <- root scripts (build, lint, test)
|
|-- apps/
|   |-- web/                       <- Next.js 14 Frontend
|   |   |-- app/
|   |   |   |-- layout.tsx
|   |   |   |-- page.tsx           <- Dashboard home
|   |   |   |-- repos/             <- Repository management
|   |   |   `-- issues/[id]/       <- Issue Workbench
|   |   |-- components/
|   |   `-- tailwind.config.ts
|   |
|   `-- server/                    <- Express.js Backend
|       |-- src/
|       |   |-- index.ts           <- Entry point
|       |   |-- routes/            <- REST API routes
|       |   |-- webhooks/          <- GitHub webhook handlers
|       |   |-- jobs/              <- BullMQ job definitions
|       |   |-- db/                <- Drizzle schema + migrations
|       |   `-- middleware/        <- Auth, error handling, rate limit
|       `-- tsconfig.json
|
`-- packages/
    |-- core/                      <- Shared types, constants, Zod schemas
    |-- github/                    <- Octokit client, webhook utils, git cloner
    |-- parser/                    <- Tree-sitter chunker + metadata extractor
    |-- rag/                       <- HyDE, embeddings, hybrid retriever, reranker
    `-- agent/                     <- LLM prompts, RCA engine, patch/test generator
```

---

## 8. Key Environment Variables

```env
# GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# OpenAI
OPENAI_API_KEY=

# Cohere
COHERE_API_KEY=

# Neon Postgres
DATABASE_URL=

# Pinecone (optional scale-out)
PINECONE_API_KEY=
PINECONE_INDEX=

# Redis
REDIS_URL=redis://localhost:6379

# App
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
PORT=4000
```

---

## 9. API Surface (Backend Routes)

```
POST   /api/repos                  -> Connect a GitHub repository
GET    /api/repos                  -> List connected repos + index status
DELETE /api/repos/:id              -> Disconnect a repo
POST   /api/repos/:id/index        -> Trigger manual re-index

GET    /api/issues                 -> List tracked issues (filter: repo, status)
POST   /api/issues/:id/run         -> Trigger agent run on issue
GET    /api/issues/:id             -> Get issue details + linked runs

GET    /api/runs/:id               -> Get run result (RCA, patch, tests, citations)
GET    /api/runs/:id/stream        -> SSE stream of live agent step progress
POST   /api/runs/:id/publish       -> Create PR or comment on GitHub issue

POST   /webhooks/github            -> GitHub webhook receiver
```

---

## 10. Immediate Next Steps

| Priority | Task                                          |
|---|---|
| P0       | Scaffold monorepo with pnpm workspaces        |
| P0       | Setup Drizzle + Neon Postgres + migrations    |
| P0       | GitHub OAuth + Octokit wrapper                |
| P1       | Tree-sitter parser + smart chunker            |
| P1       | Embedding pipeline + pgvector upsert          |
| P1       | BullMQ indexRepo job                          |
| P2       | HyDE + Hybrid retriever + Cohere reranker     |
| P2       | LLM RCA chain + Zod structured output         |
| P2       | Next.js frontend skeleton + Issue Workbench   |
