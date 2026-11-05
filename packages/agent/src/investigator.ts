import OpenAI from "openai";
import {
  RcaResult,
  RcaResultSchema,
  Hypothesis,
  PatchPlan,
  Citation,
} from "@atom/core";
import { RepositoryTools, RepoContext, TOOL_DEFINITIONS } from "./tools.js";

export interface InvestigationInput {
  issueTitle: string;
  issueBody: string;
  repoContext: RepoContext;
  apiKey?: string;
  model?: string;
  maxToolIterations?: number;
  onProgress?: (step: string, message: string) => void;
}

export class InvestigationAgent {
  private openai: OpenAI;
  private model: string;
  private maxIterations: number;

  constructor(apiKey?: string, model: string = "gpt-4o", maxIterations: number = 8) {
    const key = apiKey || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error("OPENAI_API_KEY is required for InvestigationAgent.");
    }
    this.openai = new OpenAI({ apiKey: key });
    this.model = model;
    this.maxIterations = maxIterations;
  }

  /**
   * Runs the full autonomous investigation loop with tool calling, multi-hypothesis reasoning,
   * evidence ranking, and minimal patch planning.
   */
  public async investigate(input: InvestigationInput): Promise<RcaResult> {
    const { issueTitle, issueBody, repoContext, onProgress } = input;
    const tools = new RepositoryTools(repoContext);

    onProgress?.("analyzing", "Analyzing issue description and extracting key identifiers...");

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `You are ATOM 2.0, a Senior Autonomous Software Engineer and Investigator.
Your mission is to rigorously investigate a GitHub issue using repository tools before formulating any diagnosis.

INVESTIGATION PROTOCOL:
1. First, call 'searchCodebase' and 'findSymbol' to locate the relevant files and functions.
2. Call 'getFileContext' to inspect exact line ranges around suspected logic.
3. Call 'findDependencies' or 'findUsages' to trace callers, callees, and imports.
4. Inspect recent 'getGitHistory' if commit regression is suspected.
5. Formulate 2-3 candidate root cause hypotheses. Gather evidence for and against each hypothesis.
6. If evidence is insufficient to diagnose the bug with high confidence, state that clearly instead of guessing.
7. Only propose a patch when concrete code evidence has been verified.
Keep your tool queries focused and concise.`,
      },
      {
        role: "user",
        content: `Issue Title: ${issueTitle}\n\nIssue Description:\n${issueBody}\n\nPlease begin your investigation using the available tools.`,
      },
    ];

    // Iterative Tool-Calling Loop
    let iteration = 0;
    const toolCallLogs: string[] = [];

    while (iteration < this.maxIterations) {
      iteration++;
      onProgress?.(
        "investigating",
        `Investigation turn ${iteration}/${this.maxIterations}: reasoning and gathering code evidence...`
      );

      const response = await this.openai.chat.completions.create({
        model: this.model,
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: "auto",
        temperature: 0.1,
      });

      const message = response.choices[0]?.message;
      if (!message) break;

      messages.push(message);

      // If the model didn't call any tools, investigation phase is ready for synthesis
      if (!message.tool_calls || message.tool_calls.length === 0) {
        break;
      }

      // Execute each requested tool call
      for (const call of message.tool_calls) {
        if (call.type !== "function") continue;
        const name = call.function.name;
        let args: Record<string, any> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }

        onProgress?.("investigating", `Tool call: ${name}(${JSON.stringify(args).slice(0, 80)})...`);

        const toolRes = await tools.executeTool(name, args);
        toolCallLogs.push(`${name}: ${JSON.stringify(args)}`);

        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(toolRes.data ?? { error: toolRes.error }),
        });
      }
    }

    // Synthesis Phase: Generate Structured RCA & Patch Plan
    onProgress?.("planning", "Synthesizing root cause analysis, file evidence citations, and patch plan...");

    const synthesisPrompt: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "user",
      content: `Based on all the evidence gathered via repository tools during your investigation, output your final diagnosis as a valid JSON object matching this schema:

{
  "rootCause": "Clear explanation of the bug anchored to exact file and line evidence",
  "confidence": "high" | "medium" | "low",
  "isInconclusive": false,
  "hypotheses": [
    {
      "id": "hyp_1",
      "description": "Candidate explanation",
      "supportingEvidence": ["File A:10-20 shows unhandled null"],
      "counterEvidence": [],
      "likelihood": "high" | "medium" | "low",
      "status": "confirmed" | "rejected" | "investigating"
    }
  ],
  "citations": [
    {
      "filePath": "src/path/to/file.ts",
      "startLine": 42,
      "endLine": 81,
      "commitHash": "optional",
      "relevanceScore": 0.95
    }
  ],
  "patchPlan": {
    "rootCause": "Summary of cause",
    "filesToModify": [
      {
        "filePath": "src/path/to/file.ts",
        "reason": "Why this file is changed",
        "functionsToModify": ["functionName"],
        "expectedChange": "What logic is changed"
      }
    ],
    "expectedBehavior": "What should happen after the fix",
    "regressionRisks": "Potential edge cases or risks",
    "testStrategy": "Unit tests to cover the regression"
  },
  "patchDiff": "--- a/src/...\\n+++ b/src/...\\n@@ ... @@\\n minimal unified diff",
  "testPatch": "unit test code covering the bug"
}

CRITICAL RULES:
1. Every claim in rootCause must be backed by citations with verified file paths and line ranges.
2. If evidence is insufficient to diagnose the bug with reasonable certainty, set "isInconclusive": true and explain what is missing.
3. patchDiff must be a valid minimal unified diff (--- a/... +++ b/...). Never rewrite entire files.`,
    };

    messages.push(synthesisPrompt);

    const finalResponse = await this.openai.chat.completions.create({
      model: this.model,
      messages,
      response_format: { type: "json_object" },
      temperature: 0.1,
    });

    const rawJson = finalResponse.choices[0]?.message?.content || "{}";
    let parsed: any;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      parsed = {};
    }

    const validated = RcaResultSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }

    // Graceful fallback with sanitized defaults
    return {
      rootCause: parsed.rootCause || "Analysis completed based on gathered repository context.",
      confidence: (["low", "medium", "high"].includes(parsed.confidence) ? parsed.confidence : "medium") as any,
      citations: Array.isArray(parsed.citations) ? parsed.citations : [],
      patchDiff: parsed.patchDiff || "",
      testPatch: parsed.testPatch || "",
      hypotheses: Array.isArray(parsed.hypotheses) ? parsed.hypotheses : [],
      patchPlan: parsed.patchPlan || undefined,
      isInconclusive: Boolean(parsed.isInconclusive),
    };
  }
}
