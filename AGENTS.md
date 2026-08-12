# AGENTS.md — Implementation Plan for ATOM (GitHub Issue Resolution Agent)

## 1. Project Overview & Objective

**ATOM** is an autonomous AI agent system designed to resolve GitHub issues automatically by combining code analysis, historical git metadata, hybrid retrieval (RAG), root cause analysis, evidence-based citations, and patch/test generation.

---

## 2. Core Architecture & Workflow

```
                        GitHub Repository / Webhooks
                                     │
                    ┌────────────────┼────────────────┐
                    ↓                ↓                ↓
                 Issues             PRs            Commits
                    │                │                │
                    └────────────────┼────────────────┘
                                     ↓
                          Repository Indexer
                                     │
                    ┌────────────────┴────────────────┐
                    ↓                                 ↓
               Code Parser                       Document Parser
               (Tree-sitter)                    (Markdown/Docs)
                    │                                 │
                    └────────────────┬────────────────┘
                                     ↓
                            Chunk + Metadata
                                     ↓
                    ┌─────────────────────────────────┐
                    │  Vector DB (Pinecone/Neon) +    │
                    │  BM25 Hybrid Retrieval          │
                    └────────────────┬────────────────┘
                                     ↓
                           Issue Query Rewriting
                           (HyDE - Hypothetical Doc)
                                     ↓
                              Hybrid Retrieval
                                     ↓
                                 Reranking
                                     ↓
                              Context Builder
                                     ↓
                            LLM Reasoning Engine
                                     ↓
                    ┌─────────────────────────────────┐
                    │ 1. Root Cause Analysis (RCA)    │
                    │ 2. Evidence Citations (Files)   │
                    │ 3. Proposed Fix / Code Patch     │
                    │ 4. Automated Tests & Validation │
                    └─────────────────────────────────┘
```

---

## 3. Tech Stack Specification

- **Frontend**: Next.js 16+ (App Router), TypeScript, Tailwind CSS, Lucide Icons
- **Backend Service**: Node.js, TypeScript, Express.js
- **Background Jobs & Queue**: Redis + BullMQ (Async repository indexing, issue processing, RAG tasks)
- **Code Parsing & AST**: Tree-sitter (`web-tree-sitter` / `tree-sitter`)
- **Database & Storage**:
  - **Vector Storage**: Pinecone + Postgres (Neon )
  - **Relational DB**: Neon PostgreSQL (Users, Repos, Issues, Execution Runs, Citations)
  - **Search**: BM25 (e.g., `flexsearch` or `wink-bm25` / Postgres Full-Text Search)
- **AI / LLM Integration**: OpenAI API (`gpt-4o` / `o3-mini`) , Cohere Rerank API
- **GitHub Integration**: `@octokit/rest`, `@octokit/webhooks`

---

## 4. Implementation Phased Roadmap

### Phase 1: Repository Setup & Core Infrastructure

- [ ] Initialize Node.js + TypeScript workspace structure for Backend & Express server.
- [ ] Initialize Next.js project with Tailwind CSS for Frontend Dashboard.
- [ ] Configure environment variables, ESLint, Prettier, and build scripts.
- [ ] Set up PostgreSQL (Neon) schema for Repositories, Issues, Runs, and Chunks.

### Phase 2: GitHub API Integration & Webhook Listener

- [ ] Implement GitHub OAuth & Octokit integration for fetching repo contents, issues, PRs, and commit logs.
- [ ] Set up Express webhook endpoints to listen for issue events (`issues.opened`, `issues.edited`, `issue_comment.created`).
- [ ] Implement local git cloner/syncer module for deep code inspection.

### Phase 3: Code Parsing & Hybrid Indexing Pipeline

- [ ] Integrate Tree-sitter for multi-language code AST parsing (TypeScript, JavaScript, Python, Go, Rust, Java).
- [ ] Implement smart semantic chunking (function-level, class-level, module-level with context wrappers).
- [ ] Construct metadata extraction pipeline (file path, line range, AST node type, imports/exports, git history tags).
- [ ] Implement dual indexing:
  - Vector embeddings generation & upsert to Pinecone.
  - BM25 sparse keyword indexing for exact symbol/variable matching.

### Phase 4: Advanced RAG & Retrieval Engine

- [ ] Implement HyDE (Hypothetical Document Embeddings) module to generate synthetic bug fixes from issue descriptions for enhanced embedding retrieval.
- [ ] Build Hybrid Search retriever combining dense vector search and BM25 sparse search with Reciprocal Rank Fusion (RRF).
- [ ] Integrate Cohere Reranker to filter top-$K$ most relevant code snippets.
- [ ] Construct Context Builder to assemble full context: Current Issue + Code Chunks + Git History + Related PRs/Issues + Existing Tests.

### Phase 5: Agentic Reasoning & Root Cause Analysis (RCA)

- [ ] Design structured output prompt schemas for LLM reasoning.
- [ ] Implement Evidence & Citation extractor mapping root causes directly to `filename:startLine-endLine` and commit hashes.
- [ ] Implement Fix Generator producing unified diff patches (`git diff` style).
- [ ] Build Automated Test Generator to synthesize unit tests covering edge cases.

### Phase 6: Asynchronous Job Processing & Pipeline Orchestration

- [ ] Setup Redis & BullMQ queues for handling long-running indexing and issue processing jobs.
- [ ] Add real-time event publishing via WebSockets / Server-Sent Events (SSE) to broadcast agent reasoning progress to the frontend UI.

### Phase 7: Frontend Dashboard & Interactive UI

- [ ] Build Repository Management & Indexing Status view.
- [ ] Develop Issue Resolver Workbench view:
  - Issue Details & GitHub metadata display.
  - Interactive Agent Progress / RAG trace timeline.
  - Code Evidence viewer with syntax highlighting and line citations.
  - Side-by-side Git Diff viewer for proposed fixes.
  - Test Patch inspection & One-click "Create PR" / "Comment on Issue" action button.

### Phase 8: Benchmarking & Testing Framework

- [ ] Integrate execution sandbox / test runner to validate generated code patches against test suites.
- [ ] Evaluate performance against SWE-bench / repo-level benchmark samples.

---

## 5. Directory Structure Plan

```
atom/
├── AGENTS.md                 # Project design, roadmap, and agent execution plan
├── README.md                 # System overview and architecture
├── apps/
│   ├── web/                  # Next.js Frontend Dashboard
│   └── server/               # Express Backend API & Webhook Handler
├── packages/
│   ├── core/                 # Core domain types & utilities
│   ├── github/               # GitHub API client & webhook listeners
│   ├── parser/               # Tree-sitter code parser & chunker
│   ├── rag/                  # Hybrid retrieval, HyDE, BM25, Vector DB & Reranker
│   └── agent/                # LLM Root Cause Analysis & Patch Generator
└── docker-compose.yml        # Redis & local services setup
```

---

## 6. Next Immediate Action Items

1. Confirm directory structure (monorepo structure vs single-package structure).
2. Begin Phase 1: Initialize server and web application packages.
3. Configure environment templates (`.env.example`).
