import { z } from "zod";

export const CitationSchema = z.object({
  filePath: z.string(),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  commitHash: z.string().optional(),
  relevanceScore: z.number().min(0).max(1).optional()
});

export const RcaResultSchema = z.object({
  rootCause: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  citations: z.array(CitationSchema),
  patchDiff: z.string(),
  testPatch: z.string()
});

export type Citation = z.infer<typeof CitationSchema>;
export type RcaResult = z.infer<typeof RcaResultSchema>;
