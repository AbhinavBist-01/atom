import { z } from "zod";

export const RunStatusEnum = z.enum([
  "queued",
  "analyzing",
  "investigating",
  "planning",
  "implementing",
  "testing",
  "awaiting_approval",
  "pr_created",
  "failed",
]);
export type RunStatus = z.infer<typeof RunStatusEnum>;

export const CitationSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  commitHash: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional(),
});

export const SymbolKindEnum = z.enum([
  "function",
  "class",
  "interface",
  "method",
  "variable",
  "type",
  "endpoint",
  "model",
]);
export type SymbolKind = z.infer<typeof SymbolKindEnum>;

export const SymbolDefinitionSchema = z.object({
  name: z.string(),
  kind: SymbolKindEnum,
  signature: z.string().optional(),
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  docstring: z.string().optional(),
  isExported: z.boolean().default(false),
});
export type SymbolDefinition = z.infer<typeof SymbolDefinitionSchema>;

export const DependencyRelationSchema = z.object({
  sourceFilePath: z.string(),
  targetFilePath: z.string(),
  specifier: z.string(),
  importedSymbols: z.array(z.string()).default([]),
  type: z.enum(["import", "export", "call"]).default("import"),
});
export type DependencyRelation = z.infer<typeof DependencyRelationSchema>;

export const HypothesisSchema = z.object({
  id: z.string(),
  description: z.string(),
  supportingEvidence: z.array(z.string()).default([]),
  counterEvidence: z.array(z.string()).default([]),
  likelihood: z.enum(["low", "medium", "high"]),
  status: z.enum(["investigating", "confirmed", "rejected"]),
});
export type Hypothesis = z.infer<typeof HypothesisSchema>;

export const FileModificationPlanSchema = z.object({
  filePath: z.string(),
  reason: z.string(),
  functionsToModify: z.array(z.string()).default([]),
  expectedChange: z.string().optional(),
});
export type FileModificationPlan = z.infer<typeof FileModificationPlanSchema>;

export const PatchPlanSchema = z.object({
  rootCause: z.string(),
  filesToModify: z.array(FileModificationPlanSchema),
  expectedBehavior: z.string(),
  regressionRisks: z.string(),
  testStrategy: z.string(),
});
export type PatchPlan = z.infer<typeof PatchPlanSchema>;

export const TestExecutionResultSchema = z.object({
  command: z.string(),
  passed: z.boolean(),
  exitCode: z.number().int(),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number(),
  testCount: z.number().optional(),
  passedCount: z.number().optional(),
  failedCount: z.number().optional(),
});
export type TestExecutionResult = z.infer<typeof TestExecutionResultSchema>;

export const VerificationStatusEnum = z.enum([
  "passed",
  "failed",
  "inconclusive",
  "skipped",
  "not_configured",
]);
export type VerificationStatus = z.infer<typeof VerificationStatusEnum>;

export const VerificationStageNameEnum = z.enum([
  "patch_apply",
  "build",
  "lint",
  "typecheck",
  "unit_tests",
  "integration_tests",
  "regression_tests",
  "security_checks",
]);
export type VerificationStageName = z.infer<typeof VerificationStageNameEnum>;

export const VerificationStageSchema = z.object({
  name: VerificationStageNameEnum,
  status: VerificationStatusEnum,
  command: z.string().optional(),
  durationMs: z.number().default(0),
  stdout: z.string().default(""),
  stderr: z.string().default(""),
  exitCode: z.number().int().default(0),
  failureReason: z.string().optional(),
  details: z.record(z.any()).optional(),
});
export type VerificationStage = z.infer<typeof VerificationStageSchema>;

export const SecurityCheckResultSchema = z.object({
  passed: z.boolean(),
  secretsFound: z.array(z.string()).default([]),
  dangerousPatterns: z.array(z.string()).default([]),
  blockedFiles: z.array(z.string()).default([]),
  summary: z.string(),
});
export type SecurityCheckResult = z.infer<typeof SecurityCheckResultSchema>;

export const RepoToolchainSchema = z.object({
  language: z.enum([
    "typescript",
    "javascript",
    "python",
    "java",
    "cpp",
    "unknown",
  ]),
  packageManager: z.enum([
    "npm",
    "pnpm",
    "yarn",
    "pip",
    "poetry",
    "maven",
    "gradle",
    "cmake",
    "make",
    "none",
  ]),
  buildCommand: z.string().optional(),
  testCommand: z.string().optional(),
  lintCommand: z.string().optional(),
  typecheckCommand: z.string().optional(),
  detectedFiles: z.array(z.string()).default([]),
});
export type RepoToolchain = z.infer<typeof RepoToolchainSchema>;

export const VerificationReportSchema = z.object({
  taskId: z.string(),
  runId: z.string(),
  repoRef: z.string(),
  prEligible: z.boolean(),
  humanApprovalRequired: z.boolean().default(true),
  repairAttempts: z.number().int().default(0),
  stages: z.array(VerificationStageSchema),
  toolchain: RepoToolchainSchema.optional(),
  security: SecurityCheckResultSchema.optional(),
  regressionTest: z
    .object({
      testFile: z.string(),
      baselineFailedAsExpected: z.boolean(),
      postPatchPassed: z.boolean(),
      code: z.string(),
    })
    .optional(),
  summary: z.string(),
  createdAt: z.string(),
});
export type VerificationReport = z.infer<typeof VerificationReportSchema>;

export const RcaResultSchema = z.object({
  rootCause: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  citations: z.array(CitationSchema),
  patchDiff: z.string(),
  testPatch: z.string(),
  hypotheses: z.array(HypothesisSchema).optional(),
  patchPlan: PatchPlanSchema.optional(),
  testExecution: TestExecutionResultSchema.optional(),
  verificationReport: VerificationReportSchema.optional(),
  isInconclusive: z.boolean().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;
export type RcaResult = z.infer<typeof RcaResultSchema>;
