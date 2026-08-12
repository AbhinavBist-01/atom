export interface SearchResult {
  chunkId: string;
  score: number;
  filePath: string;
  content: string;
}

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
