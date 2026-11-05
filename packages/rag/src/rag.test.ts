import { describe, it, expect } from "vitest";
import {
  BM25Engine,
  cosineSimilarity,
  multiWayRrf,
  SearchResult,
} from "./index.js";

describe("ATOM 2.0 RAG & Retrieval Engine", () => {
  it("computes cosine similarity accurately", () => {
    const v1 = [1, 0, 0];
    const v2 = [1, 0, 0];
    const v3 = [0, 1, 0];

    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1.0);
    expect(cosineSimilarity(v1, v3)).toBeCloseTo(0.0);
  });

  it("indexes and ranks documents using BM25", () => {
    const engine = new BM25Engine();
    engine.index([
      { id: "doc1", text: "token refresh race condition mutex deadlock" },
      { id: "doc2", text: "unrelated user profile visual styling" },
      { id: "doc3", text: "token exchange and authentication provider" },
    ]);

    const results = engine.search("token refresh mutex");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("doc1");
  });

  it("fuses multiple ranked result lists using Reciprocal Rank Fusion", () => {
    const listA: SearchResult[] = [
      { chunkId: "c1", score: 0.9, filePath: "src/auth.ts", content: "code" },
      { chunkId: "c2", score: 0.8, filePath: "src/db.ts", content: "code" },
    ];

    const listB: SearchResult[] = [
      { chunkId: "c2", score: 10, filePath: "src/db.ts", content: "code" },
      { chunkId: "c3", score: 5, filePath: "src/net.ts", content: "code" },
    ];

    const fused = multiWayRrf([listA, listB], 60);
    expect(fused.length).toBe(3);
    // c2 appeared high in both lists, so its fused RRF score should be highest
    expect(fused[0].chunkId).toBe("c2");
  });
});
