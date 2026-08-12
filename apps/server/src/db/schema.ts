import {
  pgTable,
  uuid,
  text,
  integer,
  doublePrecision,
  timestamp,
  vector,
} from "drizzle-orm/pg-core";

export const repositories = pgTable("repositories", {
  id: uuid("id").primaryKey().defaultRandom(),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  installationId: text("installation_id"),
  status: text("status").default("pending"),
  indexedAt: timestamp("indexed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chunks = pgTable("chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id").references(() => repositories.id, {
    onDelete: "cascade",
  }),
  filePath: text("file_path").notNull(),
  startLine: integer("start_line"),
  endLine: integer("end_line"),
  nodeType: text("node_type"),
  lang: text("lang"),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  gitBlameCommit: text("git_blame_commit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const issues = pgTable("issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id").references(() => repositories.id, {
    onDelete: "cascade",
  }),
  githubNumber: integer("github_number").notNull(),
  title: text("title"),
  body: text("body"),
  state: text("state"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const runs = pgTable("runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  issueId: uuid("issue_id").references(() => issues.id, {
    onDelete: "cascade",
  }),
  status: text("status").default("queued"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMsg: text("error_msg"),
});

export const rcaResults = pgTable("rca_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "cascade" }),
  rootCause: text("root_cause"),
  confidence: text("confidence"),
  patchDiff: text("patch_diff"),
  testPatch: text("test_patch"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const citations = pgTable("citations", {
  id: uuid("id").primaryKey().defaultRandom(),
  rcaId: uuid("rca_id").references(() => rcaResults.id, {
    onDelete: "cascade",
  }),
  chunkId: uuid("chunk_id").references(() => chunks.id),
  filePath: text("file_path"),
  startLine: integer("start_line"),
  endLine: integer("end_line"),
  commitHash: text("commit_hash"),
  relevanceScore: doublePrecision("relevance_score"),
});
