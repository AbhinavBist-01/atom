import OpenAI from "openai";
import { RcaResult, RcaResultSchema } from "@atom/core";

export interface CodeContextChunk {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  lang?: string;
  commitHash?: string;
  relevanceScore?: number;
}

export interface AnalyzeIssueInput {
  issueTitle: string;
  issueBody: string;
  codeChunks: CodeContextChunk[];
  apiKey?: string;
  model?: string;
}

/**
 * Executes ATOM Agentic Reasoning Engine to generate evidence-first RCA,
 * line-level citations, unified diff patch, and regression test cases.
 */
export async function runRcaEngine(input: AnalyzeIssueInput): Promise<RcaResult> {
  const apiKey = input.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required to run the ATOM RCA Engine.");
  }

  const openai = new OpenAI({ apiKey });

  const contextFormatted = input.codeChunks
    .map(
      (c, idx) =>
        `--- Chunk #${idx + 1} ---\nFile: ${c.filePath} (Lines ${c.startLine}-${c.endLine})\nLanguage: ${c.lang || "unknown"}\n${c.commitHash ? `Commit: ${c.commitHash}\n` : ""}\nCode:\n${c.content}`
    )
    .join("\n\n");

  const systemPrompt = `You are ATOM, an Autonomous GitHub Issue Resolution Agent.
Your job is to produce evidence-first root cause analysis (RCA) and resolution patches for software issues.

CRITICAL INSTRUCTIONS:
1. Every root cause claim MUST be anchored to specific files and line ranges from the provided code context.
2. Output a valid JSON object strictly adhering to the schema below.
3. The patchDiff field MUST be a valid unified diff (--- a/file +++ b/file).
4. The testPatch field MUST contain automated unit test(s) covering the regression.
5. List file:line citations backing your RCA under 'citations'.
6. Evaluate your confidence as 'low', 'medium', or 'high'.

JSON Output Schema:
{
  "rootCause": "Detailed RCA anchored to file:line evidence",
  "confidence": "high" | "medium" | "low",
  "citations": [
    {
      "filePath": "src/auth.ts",
      "startLine": 42,
      "endLine": 81,
      "commitHash": "abc1234",
      "relevanceScore": 0.95
    }
  ],
  "patchDiff": "--- a/src/auth.ts\\n+++ b/src/auth.ts\\n@@ -42,5 +42,5 @@...",
  "testPatch": "describe('auth fix', () => { it('should handle concurrent refresh', () => { ... }) })"
}`;

  const userPrompt = `Issue Title: ${input.issueTitle}

Issue Description:
${input.issueBody}

Codebase Context Chunks:
${contextFormatted || "No code chunks retrieved."}`;

  const response = await openai.chat.completions.create({
    model: input.model || "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.1
  });

  const rawJson = response.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawJson);

  const validated = RcaResultSchema.safeParse(parsed);
  if (validated.success) {
    return validated.data;
  }

  return {
    rootCause: parsed.rootCause || "Root cause analysis completed.",
    confidence: (["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium") as "low" | "medium" | "high",
    citations: Array.isArray(parsed.citations) ? parsed.citations : [],
    patchDiff: parsed.patchDiff || "",
    testPatch: parsed.testPatch || ""
  };
}

export function analyzeIssue(issueBody: string): Partial<RcaResult> {
  return {
    rootCause: `Analyzing issue: ${issueBody.substring(0, 50)}...`,
    confidence: "medium"
  };
}
