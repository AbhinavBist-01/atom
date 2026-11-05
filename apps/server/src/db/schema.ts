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
  userId: text("user_id"),
  userLogin: text("user_login"),
  owner: text("owner").notNull(),
  repo: text("repo").notNull(),
  installationId: text("installation_id"),
  defaultBranch: text("default_branch"),
  lastCommitSha: text("last_commit_sha"),
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
  contentHash: text("content_hash"),
  embedding: vector("embedding", { dimensions: 1536 }),
  pineconeVectorId: text("pinecone_vector_id"),
  gitBlameCommit: text("git_blame_commit"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const symbols = pgTable("symbols", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id").references(() => repositories.id, {
    onDelete: "cascade",
  }),
  filePath: text("file_path").notNull(),
  name: text("name").notNull(),
  kind: text("kind").notNull(), // function, class, interface, method, endpoint, model
  signature: text("signature"),
  startLine: integer("start_line").notNull(),
  endLine: integer("end_line").notNull(),
  docstring: text("docstring"),
  isExported: text("is_exported").default("false"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const dependencies = pgTable("dependencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  repoId: uuid("repo_id").references(() => repositories.id, {
    onDelete: "cascade",
  }),
  sourceFilePath: text("source_file_path").notNull(),
  targetFilePath: text("target_file_path").notNull(),
  specifier: text("specifier").notNull(),
  importedSymbols: text("imported_symbols"), // JSON stringified array of symbol names
  type: text("type").default("import"), // import | export | call
  createdAt: timestamp("created_at").defaultNow(),
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
  status: text("status").default("queued"), // queued | analyzing | investigating | planning | implementing | testing | awaiting_approval | pr_created | failed
  currentStep: text("current_step"),
  stepProgress: integer("step_progress").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMsg: text("error_msg"),
});

export const patchPlans = pgTable("patch_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "cascade" }),
  rootCause: text("root_cause").notNull(),
  filesToModify: text("files_to_modify").notNull(), // JSON stringified FileModificationPlan[]
  expectedBehavior: text("expected_behavior"),
  regressionRisks: text("regression_risks"),
  testStrategy: text("test_strategy"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const testExecutions = pgTable("test_executions", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => runs.id, { onDelete: "cascade" }),
  iteration: integer("iteration").default(1),
  command: text("command").notNull(),
  passed: text("passed").default("false"), // true | false
  exitCode: integer("exit_code").notNull(),
  stdout: text("stdout"),
  stderr: text("stderr"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow(),
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
