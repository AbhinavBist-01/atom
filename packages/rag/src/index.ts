import OpenAI from "openai";

export interface SearchResult {
  chunkId: string;
  score: number;
  filePath: string;
  content: string;
}

/**
 * Generates vector embeddings for a list of text snippets using OpenAI text-embedding-3-small.
 * Processes inputs in batches to handle large repositories safely.
 */
export async function generateEmbeddings(
  texts: string[],
  apiKey?: string
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const openai = new OpenAI({
    apiKey: apiKey || process.env.OPENAI_API_KEY,
  });

  const BATCH_SIZE = 50;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    
    // Replace empty lines or pure whitespace to prevent OpenAI API errors
    const cleanedBatch = batch.map((t) => (t.trim().length > 0 ? t : "empty"));

    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: cleanedBatch,
    });

    for (const data of response.data) {
      allEmbeddings.push(data.embedding);
    }
  }

  return allEmbeddings;
}

/**
 * Merges dense vector search results and sparse (BM25) search results using Reciprocal Rank Fusion (RRF).
 */
export function reciprocalRankFusion(
  denseResults: SearchResult[],
  sparseResults: SearchResult[],
  k: number = 60
): SearchResult[] {
  const scoreMap = new Map<string, { score: number; item: SearchResult }>();

  denseResults.forEach((item, index) => {
    const rankScore = 1 / (k + (index + 1));
    scoreMap.set(item.chunkId, { score: rankScore, item });
  });

  sparseResults.forEach((item, index) => {
    const rankScore = 1 / (k + (index + 1));
    const existing = scoreMap.get(item.chunkId);
    if (existing) {
      existing.score += rankScore;
    } else {
      scoreMap.set(item.chunkId, { score: rankScore, item });
    }
  });

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry.item, score: entry.score }));
}
