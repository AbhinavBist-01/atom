this is github issue resolution agent

Architecture:

                    GitHub Repository
                          │
             ┌────────────┼────────────┐
             ↓            ↓            ↓
          Issues        PRs        Commits
             │            │            │
             └────────────┼────────────┘
                          ↓
                   Repository Indexer
                          │
             ┌────────────┴────────────┐
             ↓                         ↓
        Code Parser              Document Parser
             │                         │
             └────────────┬────────────┘
                          ↓
                  Chunk + Metadata
                          ↓
              ┌──────────────────────┐
              │ Vector DB + BM25     │
              │ Hybrid Retrieval     │
              └──────────┬───────────┘
                         ↓
                  Query Rewriting
                         ↓
                   Retrieval
                         ↓
                    Reranking
                         ↓
                 Context Builder
                         ↓
                      LLM
                         ↓
              ┌──────────────────────┐
              │ Root Cause Analysis  │
              │ Proposed Fix         │
              │ Tests                │
              │ Citations            │
              └──────────────────────┘

what happens when you give the issue :

1.  fetches the issue from github - the github api provides the issue , title , description
2.  retreive the relevant code from the codebase and store you the metadata
3.  retreive the git history , so that the agent can actually see what was changed recently
4.  retreive related issue and PR's so that the context becomes :
    Current Issue +
    Relevant Code +
    Git History +
    Related Issues +
    Previous PRs +
    Tests

5.  root cause analysis
6.  give the propsed fix
7.  the agent produces the tests , it can generate the actual test patch.

The pipeline will be :

              User Issue
    │
    ▼

Query
│
▼
HyDE
│
│ LLM generates a hypothetical
│ relevant answer/document
▼
Hypothetical Document
│
▼
Embedding
│
▼
Vector Search
│
├──────────────► BM25 Search
│ │
└──────────┬──────────┘

▼
Hybrid Retrieval
│
▼
Reranker
│
▼
Top K Chunks
│
▼
Context Builder
│
▼
LLM
│
▼
Root Cause + Evidence

Example :
I'd make citations + evidence a first-class part of the system.

Not:

"I think the bug is in auth.ts."

But:

Root cause: race condition in token refresh
Evidence: refresh.ts:42-81
Introduced by: commit 8f31a2
Related: PR #392
Test coverage: missing concurrent-refresh case

#Tech stack I'd use

For your stack,

Frontend

Next.js
Tailwind

Backend

Node.js
TypeScript
Express

GitHub

GitHub REST API
Webhooks

RAG

Pinecone + postgres(neon)
embeddings
BM25
reranker

LLM

OpenAI API

Code parsing

Tree-sitter

Jobs

Redis + BullMQ

Git

GitHub API initially
o
