import { RcaResult } from "@atom/core";

export function analyzeIssue(issueBody: string): Partial<RcaResult> {
  return {
    rootCause: `Analyzing issue: ${issueBody.substring(0, 50)}...`,
    confidence: "medium"
  };
}
