<div align="center">

# ⚛️ ATOM
### **Autonomous GitHub Issue Resolution Agent**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Neon Postgres](https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![OpenAI GPT-4o](https://img.shields.io/badge/OpenAI-GPT--4o_&_Embeddings-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Redis & BullMQ](https://img.shields.io/badge/Redis_&_BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

<br/>

**Deterministic, Evidence-First Root Cause Analysis · Unified Diff Patches · Unit Test Synthesis · Sandboxed Verification · Automated GitHub PRs**

<br/>

<p align="center">
  <img src="https://skillicons.dev/icons?i=ts,nodejs,nextjs,react,tailwind,express,postgres,redis,docker,git,github,vitest" alt="Tech Stack Icons" />
</p>

</div>

---

## 🌟 Overview & Key Differentiators

ATOM is an autonomous AI agent designed for **evidence-grounded GitHub issue resolution**. Unlike generic coding assistants that guess where bugs originate, ATOM produces strict, line-anchored citations, valid unified diff patches, and regression unit tests verified in a sandbox before publishing to GitHub.

```
Root cause : race condition in token refresh lock
Evidence   : src/auth/refresh.ts:42-81
Introduced : commit 8f31a2c (PR #392)
Missing    : concurrent-refresh test case
Fix        : src/auth/refresh.ts — wrap refresh() with mutex lock
```

---

## 🛠️ Languages, Libraries & Tech Stack

### 🔹 Monorepo Workspace Structure

```
atom/
├── 📁 apps/
│   ├── 🌐 web/          # Next.js 16 (App Router), React 19, Tailwind CSS UI
│   └── ⚙️ server/       # Express.js REST API, Better Auth, BullMQ job runner
└── 📁 packages/
    ├── 📦 core/         # Shared Zod schemas (RCA, Citations, Runs) & domain types
    ├── 🐙 github/       # Octokit client, dynamic installation auth, Git cloner
    ├── 🌳 parser/       # Tree-sitter AST structural code chunker & markdown parser
    ├── 🔍 rag/          # HyDE, OpenAI text-embedding-3-small, BM25, RRF hybrid search
    └── 🤖 agent/        # LLM RCA engine (gpt-4o), patch generator & SandboxTestRunner
```

### 🔹 Categorized Tech Stack Matrix

| Category | Logo / Badge | Technology | Purpose & Details |
|:---|:---:|:---|:---|
| **Languages** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/typescript/typescript-original.svg" width="24" height="24" alt="TS"/> | **TypeScript 5.7+** | End-to-end type safety across apps and workspace packages. |
| **Runtime** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nodejs/nodejs-original.svg" width="24" height="24" alt="Node"/> | **Node.js 20+** | High-performance asynchronous backend runtime. |
| **Frontend Framework** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/nextjs/nextjs-original.svg" width="24" height="24" alt="Next"/> | **Next.js 16 (App Router)** | Obsidian glassmorphic UI (`#050507`), Server Actions, Edge Auth Middleware. |
| **UI & Styling** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/tailwindcss/tailwindcss-original.svg" width="24" height="24" alt="Tailwind"/> | **React 19 + Tailwind CSS** | Minimalist GitHub-dark design system, Lucide icons, live workbench streaming. |
| **Backend API** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/express/express-original.svg" width="24" height="24" alt="Express"/> | **Express.js** | REST API endpoints, CORS credential sessions, dynamic reverse proxies. |
| **Authentication** | <img src="https://avatars.githubusercontent.com/u/148011244?s=200&v=4" width="24" height="24" alt="Better Auth"/> | **Better Auth** | GitHub OAuth provider, scoped permissions (`repo`, `read:user`, `user:email`). |
| **Database & Vector** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/postgresql/postgresql-original.svg" width="24" height="24" alt="Postgres"/> | **Neon PostgreSQL + pgvector** | 1536-dim vector similarity search + 6 relational tables with Drizzle ORM. |
| **AI & Embeddings** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/openai/openai-original.svg" width="24" height="24" alt="OpenAI"/> | **OpenAI (`gpt-4o`, embeddings)** | Hypothetical Document Embeddings (HyDE), `text-embedding-3-small`, Zod JSON outputs. |
| **Code Parser** | <img src="https://tree-sitter.github.io/tree-sitter/assets/images/tree-sitter-small.png" width="24" height="24" alt="Tree-sitter"/> | **Tree-sitter AST Parser** | Semantic code chunking by function/class/method bounds + git blame tagging. |
| **GitHub Automation** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/github/github-original.svg" width="24" height="24" alt="GitHub"/> | **Octokit REST & App Auth** | Dynamic installation token management, shallow clones, bot PR & comment creation. |
| **Job Queue & Cache** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/redis/redis-original.svg" width="24" height="24" alt="Redis"/> | **BullMQ + Redis** | Background asynchronous repository indexing, embedding batcher, retry queues. |
| **Testing & Sandbox** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/vitest/vitest-original.svg" width="24" height="24" alt="Vitest"/> | **Vitest + Node Sandbox** | Isolated `git apply` patch verification & unit test execution before PR creation. |
| **Monorepo Tooling** | <img src="https://raw.githubusercontent.com/devicons/devicon/master/icons/pnpm/pnpm-original.svg" width="24" height="24" alt="pnpm"/> | **pnpm Workspaces + Docker** | Fast multi-package builds, strict ESM modularity, containerized local services. |

---

## 📐 High-Level Design & System Diagrams

### 1. End-to-End System Architecture

```
                                GitHub Ecosystem
                 (Webhooks / Issues / Repositories / Pull Requests)
                                       │
                                       ▼
                     ┌───────────────────────────────────┐
                     │   Better Auth Social Gate (OAuth) │
                     └─────────────────┬─────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
        ┌───────────────────────┐             ┌───────────────────────┐
        │ apps/web (Next.js 16) │             │  apps/server (Express)│
        │ • Obsidian Dashboard  │◄──Proxy/───►│ • REST API Endpoints  │
        │ • Synced Repositories │   Rewrites  │ • Webhook Receiver    │
        │ • Issue RCA Workbench │             │ • BullMQ Worker Queue │
        └───────────────────────┘             └───────────┬───────────┘
                                                          │
          ┌───────────────────────────────────────────────┴──────────────────────────────┐
          │                                                                              │
          ▼                                                                              ▼
┌───────────────────┐                                                          ┌───────────────────┐
│ Codebase Indexing │                                                          │ Hybrid RAG & RCA  │
│ • shallow git clone│                                                         │ • HyDE Query Gen  │
│ • Tree-sitter AST │                                                          │ • pgvector Dense  │
│ • Line & Blame Map│                                                          │ • BM25 Sparse     │
│ • pgvector Upsert │                                                          │ • RRF Fusion      │
└─────────┬─────────┘                                                          └─────────┬─────────┘
          │                                                                              │
          ▼                                                                              ▼
┌───────────────────┐                                                          ┌───────────────────┐
│ Database (Neon DB)│                                                          │ Sandboxed Runner  │
│ • repositories    │◄─────────────────────────────────────────────────────────┤ • git apply patch │
│ • chunks + vector │                                                          │ • vitest / jest   │
│ • issues & runs   │                                                          │ • Bot PR / Comment│
└───────────────────┘                                                          └───────────────────┘
```

---

### 2. Codebase Indexing Pipeline (Repo ➔ Vector Store)

```mermaid
flowchart TD
    A[Connect Repo / Push Webhook] --> B[BullMQ: indexRepo Job]
    B --> C[Shallow Git Clone via simple-git]
    C --> D{File Extension Classifier}
    
    D -->|Code .ts, .js, .py, .go, .java, .rs| E[Tree-sitter AST Parser]
    D -->|Docs .md, .txt| F[Section & Paragraph Parser]
    
    E --> G[Extract Functions, Classes, Methods]
    F --> G
    
    G --> H[Tag Metadata: filePath, startLine, endLine, gitBlameCommit]
    H --> I[OpenAI text-embedding-3-small]
    I --> J[Neon pgvector Upsert]
    H --> K[BM25 Index Store]
```

---

### 3. Evidence-First Hybrid RAG & RCA Resolution Pipeline

```mermaid
flowchart TD
    A[GitHub Issue Intake] --> B[HyDE Query Generator: LLM crafts hypothetical fix]
    B --> C[OpenAI Embeddings: text-embedding-3-small]
    
    C --> D[Dense Vector Search: pgvector Cosine Top-50]
    A --> E[Sparse Keyword Search: BM25 / FTS Top-50]
    
    D --> F[Reciprocal Rank Fusion - RRF]
    E --> F
    
    F --> G[Context Builder: Issue + Code Chunks + Git Blame + Related PRs]
    G --> H[LLM Reasoning Engine: gpt-4o / o3-mini]
    
    H --> I[Structured RCA Output]
    I --> J[File:Line Citations e.g. auth.ts:42-81]
    I --> K[Unified Diff Patch --- a/... +++ b/...]
    I --> L[Synthesized Unit Tests]
    
    K --> M[Sandbox Verification: git apply + test run]
    L --> M
    M -->|Passed| N[Publish atom-agent bot PR / Issue Comment]
```

---

## 🔍 Architecture: How Things Work

### 1. Better Auth & GitHub Social Gate
- Unauthenticated users are gated at the root `/` with a 1-click GitHub OAuth CTA.
- Edge middleware protects `/workspace` and `/issues`.
- Session tokens use standard HTTP cookies with CORS `credentials: true` and Next.js transparent API rewrites (`/api/*` ➔ Express port 4000).

### 2. Automatic User Handle & Multi-Installation Discovery
- Resolves GitHub handles dynamically from avatar IDs (`/user/:id`), eliminating user-display-name mismatches.
- Discovers user repositories and organization repositories where the ATOM GitHub App is installed via `@octokit/auth-app`.

### 3. Tree-sitter AST Code Parsing
- Instead of naive character chunking, ATOM parses code into semantic AST blocks (functions, classes, modules).
- Each chunk preserves `filePath`, `startLine`, `endLine`, `nodeType`, `lang`, and the last-modifying `gitBlameCommit`.

### 4. Hybrid RAG (HyDE + pgvector + BM25 + RRF)
- **HyDE (Hypothetical Document Embeddings)**: Generates a hypothetical code fix document from the issue description before embedding to bridge the semantic gap between issue text and source code.
- **Dense Vector Search**: Queries Neon `pgvector` for semantic cosine similarity.
- **Sparse BM25 Search**: Matches exact symbols, function names, and error messages.
- **Reciprocal Rank Fusion (RRF)**: Merges dense and sparse rankings using the standard formula:
  $$RRF(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

### 5. Evidence-First RCA & Structured Output
- Rather than vague suggestions, ATOM produces structured Zod outputs:
  - **Root Cause**: Pinpoints exact logic errors, race conditions, or regressions.
  - **Citations**: Direct references to `filePath:startLine-endLine` backed by commit blame.
  - **Unified Diff**: Syntactically valid git patch format.
  - **Test Suite**: Dedicated unit test covering the regression.

### 6. Sandboxed Patch Verification & Bot Publishing
- Applies the generated diff in an isolated shallow clone directory using `git apply`.
- Executes unit test suites in a child process sandbox.
- Dynamically resolves installation tokens to post comments or open Pull Requests on GitHub under `atom-agent[bot]`.

---

## 🚀 How to Run Locally

### Prerequisites
- **Node.js**: >= 20.0.0
- **pnpm**: >= 9.0.0 (`npm install -g pnpm`)
- **Docker & Docker Compose** (for local Redis/Postgres) *OR* a **Neon DB URL**

---

### Step 1: Clone & Install Dependencies

```bash
git clone https://github.com/AbhinavBist-01/atom.git
cd atom

# Install monorepo dependencies across all packages and apps
pnpm install
```

---

### Step 2: Configure Environment Variables

Copy the `.env.example` template to `.env` in the root directory:

```bash
cp .env.example .env
```

Fill in the required keys:

```env
# GitHub App Configuration
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Better Auth
BETTER_AUTH_SECRET=your_random_32_char_secret
BETTER_AUTH_URL=http://localhost:4000

# OpenAI API Key
OPENAI_API_KEY=sk-proj-...

# Database (Neon Postgres with pgvector or Local Postgres)
DATABASE_URL=postgresql://user:password@localhost:5432/atom_db

# Redis (BullMQ queue)
REDIS_URL=redis://localhost:6379

# Ports & URLs
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
PORT=4000
```

---

### Step 3: Start Local Infrastructure (Docker)

If you are using local Docker services for Postgres and Redis:

```bash
# Start Postgres (pgvector) and Redis containers
pnpm docker:up
```

---

### Step 4: Setup Database Schema & Migrations

Push the Drizzle ORM schema directly to your database:

```bash
# Push schema to database
pnpm db:push

# Optional: Open Drizzle Studio UI to inspect tables
pnpm db:studio
```

---

### Step 5: Build Packages & Start Development Server

```bash
# Build internal packages (@atom/core, @atom/github, @atom/parser, @atom/rag, @atom/agent)
pnpm build:packages

# Run Next.js frontend (port 3000) and Express server (port 4000) concurrently
pnpm dev
```

You can also run individual services separately:

```bash
# Terminal 1: Backend Server (port 4000)
pnpm dev:server

# Terminal 2: Frontend Web App (port 3000)
pnpm dev:web
```

---

### Step 6: Using the Application

1. Open **`http://localhost:3000`** in your browser.
2. Click **"Sign in with GitHub"** to authenticate via Better Auth.
3. In **`/workspace`**:
   - Browse your **Synced Repositories**.
   - Click **"Connect & Index"** on any repository to run the Tree-sitter AST chunker and pgvector indexing.
4. In **`/issues`**:
   - Select an indexed repository to view open GitHub issues.
   - Click an issue to launch the **Issue Workbench**.
   - Review the **Root Cause Analysis**, inspect **File:Line Citations**, preview the **Unified Diff Patch**, run **Sandboxed Test Verification**, and click **"Create PR"** or **"Post Comment"** to publish the fix to GitHub.

---

## 📋 Monorepo CLI Command Reference

| Command | Description |
|---|---|
| `pnpm dev` | Starts server and web frontend concurrently |
| `pnpm dev:web` | Starts Next.js frontend only on `http://localhost:3000` |
| `pnpm dev:server` | Builds packages and starts Express API on `http://localhost:4000` |
| `pnpm build` | Builds all packages (`packages/*`) and applications (`apps/*`) |
| `pnpm build:packages` | Compiles TypeScript for all 5 internal packages |
| `pnpm build:server` | Compiles Express backend |
| `pnpm build:web` | Creates optimized Next.js 16 production build |
| `pnpm db:push` | Pushes Drizzle schema definitions to PostgreSQL |
| `pnpm db:studio` | Launches Drizzle Studio GUI for database inspection |
| `pnpm docker:up` | Starts local PostgreSQL (`pgvector`) and Redis containers |
| `pnpm docker:down` | Stops local Docker containers |
| `pnpm test` | Runs Vitest unit test suite across the monorepo |

---

## 📄 License

MIT © [Abhinav Bist](https://github.com/AbhinavBist-01)
