<div align="center">

# ⚛️ ATOM
### **Autonomous Software Engineering & GitHub Issue Resolution Engine**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js 16](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![Neon Postgres](https://img.shields.io/badge/Neon_Postgres-00E599?style=for-the-badge&logo=postgresql&logoColor=black)](https://neon.tech/)
[![OpenAI GPT-6 Luna](https://img.shields.io/badge/OpenAI-GPT--6_Luna_&_Embeddings-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)
[![Redis & BullMQ](https://img.shields.io/badge/Redis_&_BullMQ-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://bullmq.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

<br/>

**Evidence-First Root Cause Analysis · AST Repository Intelligence · Git Worktree Isolation · 8-Stage Verification Engine · Dual Regression Testing · Self-Correction Loop · Automated GitHub Draft PRs**

<br/>

<p align="center">
  <img src="https://skillicons.dev/icons?i=ts,nodejs,nextjs,react,tailwind,express,postgres,redis,docker,git,github,vitest" alt="Tech Stack Icons" />
</p>

</div>

---

## 🌟 Core Principle

> **ATOM must never confuse generated code with verified code.**  
> A patch is eligible for a draft PR **only** when its verification evidence supports that decision.

---

## 🚀 What Makes ATOM Different

Unlike generic coding assistants that guess where bugs originate and output untested code, ATOM is a **full-lifecycle autonomous software engineering agent**:

1. **Evidence-Anchored Root Cause Analysis**: Identifies exact files, line numbers, and commit blame.
2. **Isolated Git Worktrees**: Every verification task runs in an isolated worktree branch with credentials stripped from the child process environment.
3. **Repository-Aware Toolchain Discovery**: Automatically detects programming languages, frameworks, package managers, and test commands (Node/TS, Python, Java, C++).
4. **8-Stage Autonomous Verification Engine**: Deterministically validates patches against Security, Apply, Build, Lint, Typecheck, Unit Tests, Integration Tests, and Regression Tests.
5. **Dual-Phase Regression Reproduction**: Synthesizes a test that **fails on baseline unpatched code** (reproducing the bug) and **passes post-patch** (proving the fix).
6. **Self-Correction Repair Loop**: If verification fails, a Failure Analysis Agent diagnoses stdout/stderr logs and generates revised patches across up to 3 automated repair iterations.
7. **Deterministic Verification Gate**: Blocks PR creation if build, security, or tests fail, with human approval gates.

```
Root cause : race condition in token refresh lock
Evidence   : src/auth/refresh.ts:42-81
Introduced : commit 8f31a2c (PR #392)
Repro Test : tests/atom_regression.test.ts (Failed baseline -> Passed post-patch)
Gate Check : 8/8 Stages PASSED (Build, Lint, Typecheck, Unit, Security)
Draft PR   : Closes #392 with full verification scorecard attached
```

---

## 📐 High-Level Architecture & Pipeline Flow

```mermaid
flowchart TD
    Issue["GitHub Issue Intake"] --> Intake["Context Fetcher & AST Graph"]
    Intake --> HyDE["HyDE Engine + Hybrid RAG (pgvector + BM25)"]
    HyDE --> Agent["Investigation Agent (Multi-Tool Loop)"]
    
    Agent --> Plan["Patch Planning & Unified Diff Generation"]
    Plan --> PVal["Patch Validator (Syntax & Security Scanner)"]
    
    PVal -->|Valid| WT["Isolated Workspace (Git Worktree)"]
    PVal -->|Invalid| Repair["Failure Analysis & Repair Loop"]
    
    WT --> RegTest["Dual Regression Test Generator"]
    RegTest --> Baseline["Baseline Check: Must FAIL on unpatched code"]
    
    Baseline --> Apply["Apply Patch in Worktree"]
    Apply --> Discovery["Repository Toolchain Detector"]
    
    Discovery --> VEngine["8-Stage Autonomous Verification Engine"]
    
    subgraph VEngine["8-Stage Verification Matrix"]
        S1["1. Patch Apply Check"]
        S2["2. Build Verification"]
        S3["3. Lint Verification"]
        S4["4. Static Type Checking"]
        S5["5. Unit Test Suite"]
        S6["6. Integration Tests"]
        S7["7. Regression Test (Pass)"]
        S8["8. Security & Secret Checks"]
    end
    
    VEngine --> VGate{"Deterministic Verification Gate"}
    
    VGate -->|Any Stage Fails| Repair
    Repair -->|Attempt < 3| Agent
    Repair -->|Attempt >= 3| HumanFail["Halt & Request Human Review"]
    
    VGate -->|All Stages Passed| VReport["Verification Report (Persisted to DB)"]
    VReport --> UI["Interactive Next.js Verification Dashboard"]
    VReport --> DraftPR["GitHub Draft PR (Evidence Scorecard Attached)"]
```

---

## 🛠️ Monorepo Structure

```
atom/
├── 📁 apps/
│   ├── 🌐 web/          # Next.js 16 (App Router), React 19, Tailwind CSS UI Dashboard
│   └── ⚙️ server/       # Express.js REST API, Better Auth, Drizzle ORM, BullMQ Worker
└── 📁 packages/
    ├── 📦 core/         # Shared Zod schemas (RCA, VerificationReport, PatchPlan, Toolchain)
    ├── 🐙 github/       # Octokit client, installation tokens, Git worktree cloner
    ├── 🌳 parser/       # Tree-sitter AST structural code parser & symbol extractor
    ├── 🔍 rag/          # HyDE, OpenAI text-embedding-3-small, BM25, RRF hybrid retriever
    └── 🤖 agent/        # Investigation agent, WorkspaceManager, PatchValidator, VerificationEngine
```

---

## 🧩 Categorized Tech Stack

| Category | Technology | Purpose & Details |
|:---|:---|:---|
| **Language** | **TypeScript 5.7+** | Strict end-to-end type safety across the monorepo. |
| **Frontend** | **Next.js 16 (App Router) + React 19** | Obsidian glassmorphic UI (`#050507`), Server Components, Live SSE Streaming. |
| **Backend API** | **Express.js** | REST endpoints, webhook processor, SSE event broadcasting. |
| **Authentication** | **Better Auth** | GitHub OAuth provider with dynamic handle resolution and user scoping. |
| **Database** | **Neon PostgreSQL + pgvector** | Serverless relational store, vector similarity, and migration system. |
| **AI / LLM** | **OpenAI (`gpt-6-luna`)** | Multi-tool investigation, failure analysis, regression synthesis, JSON mode. |
| **Code Parser** | **Tree-sitter AST** | Structural chunking by function, class, and interface line bounds. |
| **Sandboxing** | **Git Worktrees** | Isolated checkout environments preventing contamination of host branches. |
| **Verification** | **ATOM Verification Engine** | 8-stage deterministic verification pipeline with self-correction. |
| **Test Runner** | **Vitest** | Automated unit tests covering core agent tools, parser, RAG, and verification. |

---

## 🛡️ The 8-Stage Autonomous Verification Engine

| Stage | Name | Verification Action | Blocking Condition |
|:---:|:---|:---|:---|
| **1** | `patch_apply` | Validates unified diff headers and runs `git apply --check` in the worktree. | Rejects malformed patches or conflicts. |
| **2** | `build` | Runs repository build command (`npm run build`, `mvn compile`, `cmake`, etc.). | Fails on compilation errors. |
| **3** | `lint` | Executes repository linter (`eslint`, `ruff`, `flake8`, `checkstyle`). | Flags lint violations. |
| **4** | `typecheck` | Executes static type checker (`tsc --noEmit`, `mypy`). | Fails on type inconsistencies. |
| **5** | `unit_tests` | Executes existing repository unit test suite. | Prevents regressions in existing features. |
| **6** | `integration_tests` | Runs integration tests if configured for the repository. | Skipped if unconfigured. |
| **7** | `regression_tests` | Runs newly synthesized regression test against patched code. | Fails if the original bug is not resolved. |
| **8** | `security_checks` | Scans diff for secrets, private keys, hazardous commands (`curl \| sh`, `rm -rf /`). | Blocks sensitive file tampering. |

---

## ⚡ Getting Started Locally

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **pnpm**: `>= 9.0.0` (`npm install -g pnpm`)
- **Neon PostgreSQL** or local Postgres with `pgvector`
- **Redis** (optional for local BullMQ job queue)

---

### Step 1: Clone & Install

```bash
git clone https://github.com/AbhinavBist-01/atom.git
cd atom

# Install monorepo dependencies
pnpm install
```

---

### Step 2: Environment Configuration

Create a `.env` file in the project root:

```env
# GitHub App Configuration
GITHUB_APP_ID=your_github_app_id
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GITHUB_CLIENT_ID=your_github_oauth_client_id
GITHUB_CLIENT_SECRET=your_github_oauth_client_secret

# Optional fallback token for private cloning
GITHUB_TOKEN=ghp_...

# Better Auth
BETTER_AUTH_SECRET=your_random_32_char_secret
BETTER_AUTH_URL=http://localhost:4000

# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-6-luna

# Database (Neon PostgreSQL with pgvector)
DATABASE_URL=postgresql://user:password@ep-...neon.tech/atom?sslmode=require

# Redis
REDIS_URL=redis://localhost:6379

# Server & Client Ports
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
PORT=4000
```

---

### Step 3: Database Migrations

Apply database schema migrations to Neon PostgreSQL:

```bash
pnpm --filter @atom/server exec tsx src/db/apply-migrations.ts
```

---

### Step 4: Run Tests

Execute the Vitest test suite across all packages:

```bash
pnpm test
```

---

### Step 5: Start Development Server

```bash
# Starts both Express backend (:4000) and Next.js frontend (:3000)
pnpm dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 📋 Monorepo CLI Reference

| Command | Description |
|---|---|
| `pnpm dev` | Starts backend and frontend development servers concurrently |
| `pnpm build` | Compiles all 5 workspace packages and Next.js web application |
| `pnpm test` | Runs 20 unit tests across parser, RAG, agent tools, and verification |
| `pnpm build:packages` | Compiles TypeScript for internal `@atom/*` packages |
| `pnpm dev:server` | Starts Express backend server only on `http://localhost:4000` |
| `pnpm dev:web` | Starts Next.js frontend only on `http://localhost:3000` |
| `pnpm docker:up` | Starts local PostgreSQL (`pgvector`) and Redis containers |

---

## 📄 License

MIT © [Abhinav Bist](https://github.com/AbhinavBist-01)
