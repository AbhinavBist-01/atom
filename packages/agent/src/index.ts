import "dotenv/config";
import OpenAI from "openai";
import { RcaResult, RcaResultSchema } from "@atom/core";

export * from "./tools.js";
export * from "./sandbox.js";
export * from "./investigator.js";
export * from "./patchValidator.js";
export * from "./workspace.js";
export * from "./toolchain.js";
export * from "./verificationEngine.js";
export * from "./regressionGenerator.js";
export * from "./repairOrchestrator.js";

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
      (c) =>
        `File: ${c.filePath} (Lines ${c.startLine}-${c.endLine})\n\`\`\`${c.lang || ""}\n${c.content}\n\`\`\``
    )
    .join("\n\n");

  const systemPrompt = `You are ATOM, an autonomous software engineering agent specialized in resolving GitHub issues with evidence-first precision.
Analyze the provided GitHub issue and code context to:
1. Identify the root cause with specific file + line evidence.
2. Formulate multiple hypotheses and verify them against context.
3. Formulate a structured patch plan (files to modify, expected behavior, regression risks).
4. Provide a valid unified diff patch (using --- a/ and +++ b/ headers) resolving the issue.
5. Provide a test case or patch to reproduce and prevent regression.

Default model: process.env.OPENAI_MODEL or gpt-6-luna.
Always return JSON adhering strictly to the requested schema.`;

  const userPrompt = `Issue Title: ${input.issueTitle}

Issue Description:
${input.issueBody}

Code Context:
${contextFormatted || "No indexed chunks available. Formulate analysis based on issue description."}`;

  const completion = await openai.chat.completions.create({
    model: input.model || process.env.OPENAI_MODEL || "gpt-6-luna",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.1
  });

  const rawJson = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(rawJson);

  return RcaResultSchema.parse({
    rootCause: parsed.rootCause || "Root cause analysis inconclusive.",
    confidence: parsed.confidence || "medium",
    citations: parsed.citations || [],
    patchDiff: parsed.patchDiff || "",
    testPatch: parsed.testPatch || "",
    hypotheses: parsed.hypotheses || [],
    patchPlan: parsed.patchPlan,
    isInconclusive: parsed.isInconclusive || false
  });
}
