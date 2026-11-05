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

export const RcaResultSchema = z.object({
  rootCause: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  citations: z.array(CitationSchema),
  patchDiff: z.string(),
  testPatch: z.string(),
  hypotheses: z.array(HypothesisSchema).optional(),
  patchPlan: PatchPlanSchema.optional(),
  testExecution: TestExecutionResultSchema.optional(),
  isInconclusive: z.boolean().optional(),
});

export type Citation = z.infer<typeof CitationSchema>;
export type RcaResult = z.infer<typeof RcaResultSchema>;

