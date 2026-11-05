import "dotenv/config";
import OpenAI from "openai";

export interface SearchResult {
  chunkId: string;
  score: number;
  filePath: string;
  content: string;
  startLine?: number;
  endLine?: number;
  symbolName?: string;
  nodeType?: string;
  relationships?: string[];
}

export interface HybridSearchInput {
  query: string;
  chunks: Array<{
    id: string;
    filePath: string;
    content: string;
    startLine?: number | null;
    endLine?: number | null;
    nodeType?: string | null;
    embedding?: number[] | null;
    symbolName?: string | null;
  }>;
  symbols?: Array<{
    name: string;
    filePath: string;
    kind: string;
    startLine: number;
    endLine: number;
  }>;
  dependencies?: Array<{
    sourceFilePath: string;
    targetFilePath: string;
    importedSymbols?: string[];
  }>;
  topK?: number;
  apiKey?: string;
}

/**
 * Computes cosine similarity between two numeric vectors.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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
 * HyDE (Hypothetical Document Embeddings):
 * Uses an LLM to generate a hypothetical code diff and explanation from the issue description.
 * Embedding the hypothetical doc bridges the vocabulary gap between issue reports and code.
 */
export async function generateHydeDocument(
  issueTitle: string,
  issueBody: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey || process.env.OPENAI_API_KEY;
  if (!key) {
    return `${issueTitle}\n${issueBody}`;
  }

  try {
    const openai = new OpenAI({ apiKey: key });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a principal software engineer. Given a GitHub issue description, generate a concise hypothetical technical diagnosis, mentioning likely affected files, function names, error causes, and code changes that would resolve this bug.",
        },
        {
          role: "user",
          content: `Issue: ${issueTitle}\n\nDescription:\n${issueBody}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 350,
    });

    const doc = response.choices[0]?.message?.content;
    return doc ? `${issueTitle}\n${doc}` : `${issueTitle}\n${issueBody}`;
  } catch (error) {
    console.warn("[HyDE] Warning generating hypothetical document:", error);
    return `${issueTitle}\n${issueBody}`;
  }
}

/**
 * High-performance BM25 Keyword Search Engine
 */
export class BM25Engine {
  private docs: Array<{ id: string; tokens: string[]; length: number }>;
  private docFreqs: Map<string, number> = new Map();
  private avgDocLength: number = 0;
  private k1: number;
  private b: number;

  constructor(k1: number = 1.5, b: number = 0.75) {
    this.docs = [];
    this.k1 = k1;
    this.b = b;
  }

  public index(documents: Array<{ id: string; text: string }>): void {
    this.docs = [];
    this.docFreqs.clear();
    let totalLength = 0;

    for (const doc of documents) {
      const tokens = this.tokenize(doc.text);
      this.docs.push({ id: doc.id, tokens, length: tokens.length });
      totalLength += tokens.length;

      const seen = new Set(tokens);
      for (const token of seen) {
        this.docFreqs.set(token, (this.docFreqs.get(token) || 0) + 1);
      }
    }

    this.avgDocLength = this.docs.length > 0 ? totalLength / this.docs.length : 0;
  }

  public search(query: string, topK: number = 30): Array<{ id: string; score: number }> {
    const queryTokens = this.tokenize(query);
    const scores = new Map<string, number>();
    const N = this.docs.length;

    if (N === 0 || queryTokens.length === 0) return [];

    for (const token of queryTokens) {
      const df = this.docFreqs.get(token) || 0;
      if (df === 0) continue;

      // Robertson-Spärck Jones IDF
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);

      for (const doc of this.docs) {
        const tf = doc.tokens.filter((t) => t === token).length;
        if (tf === 0) continue;

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (doc.length / (this.avgDocLength || 1)));
        const termScore = idf * (numerator / denominator);

        scores.set(doc.id, (scores.get(doc.id) || 0) + termScore);
      }
    }

    return Array.from(scores.entries())
      .map(([id, score]) => ({ id, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_$/.-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1);
  }
}

/**
 * Multi-way Reciprocal Rank Fusion (RRF)
 * Merges dense vector, sparse BM25, symbol search, and dependency-aware search rankings.
 */
export function reciprocalRankFusion(
  denseResults: SearchResult[],
  sparseResults: SearchResult[],
  k: number = 60
): SearchResult[] {
  return multiWayRrf([denseResults, sparseResults], k);
}

/**
 * Multi-list Reciprocal Rank Fusion
 */
export function multiWayRrf(resultLists: SearchResult[][], k: number = 60): SearchResult[] {
  const scoreMap = new Map<string, { score: number; item: SearchResult }>();

  for (const list of resultLists) {
    list.forEach((item, index) => {
      const rankScore = 1 / (k + (index + 1));
      const existing = scoreMap.get(item.chunkId);
      if (existing) {
        existing.score += rankScore;
        // Merge metadata if available
        if (!existing.item.symbolName && item.symbolName) {
          existing.item.symbolName = item.symbolName;
        }
        if (!existing.item.relationships && item.relationships) {
          existing.item.relationships = item.relationships;
        }
      } else {
        scoreMap.set(item.chunkId, { score: rankScore, item: { ...item } });
      }
    });
  }

  return Array.from(scoreMap.values())
    .sort((a, b) => b.score - a.score)
    .map((entry) => ({ ...entry.item, score: entry.score }));
}

/**
 * Executes unified hybrid retrieval combining:
 * 1. HyDE + Dense Vector Cosine Similarity
 * 2. BM25 Keyword Search
 * 3. Exact Symbol Search
 * 4. Dependency-aware relationship expansion
 */
export async function executeHybridSearch(input: HybridSearchInput): Promise<SearchResult[]> {
  const { query, chunks, symbols = [], dependencies = [], topK = 15, apiKey } = input;
  if (chunks.length === 0) return [];

  // 1. BM25 Search
  const bm25 = new BM25Engine();
  bm25.index(chunks.map((c) => ({ id: c.id, text: `${c.filePath}\n${c.symbolName || ""}\n${c.content}` })));
  const bm25Matches = bm25.search(query, 50);

  const chunkMap = new Map(chunks.map((c) => [c.id, c]));
  const sparseResults: SearchResult[] = bm25Matches
    .map((m) => {
      const c = chunkMap.get(m.id);
      if (!c) return null;
      return {
        chunkId: c.id,
        score: m.score,
        filePath: c.filePath,
        content: c.content,
        startLine: c.startLine || 1,
        endLine: c.endLine || 1,
        symbolName: c.symbolName || undefined,
        nodeType: c.nodeType || undefined,
      };
    })
    .filter(Boolean) as SearchResult[];

  // 2. Dense Vector Search (if query embedding available or generated)
  let denseResults: SearchResult[] = [];
  const chunksWithVectors = chunks.filter((c) => c.embedding && c.embedding.length > 0);

  if (chunksWithVectors.length > 0) {
    try {
      const queryEmbeddings = await generateEmbeddings([query], apiKey);
      if (queryEmbeddings.length > 0) {
        const queryVec = queryEmbeddings[0];
        const scored = chunksWithVectors.map((c) => ({
          chunkId: c.id,
          score: cosineSimilarity(queryVec, c.embedding!),
          filePath: c.filePath,
          content: c.content,
          startLine: c.startLine || 1,
          endLine: c.endLine || 1,
          symbolName: c.symbolName || undefined,
          nodeType: c.nodeType || undefined,
        }));
        denseResults = scored.sort((a, b) => b.score - a.score).slice(0, 50);
      }
    } catch (err) {
      console.warn("[Hybrid Search] Dense search skipped:", err);
    }
  }

  // 3. Exact Symbol Search
  const symbolResults: SearchResult[] = [];
  const queryTerms = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);

  for (const s of symbols) {
    const sNameLower = s.name.toLowerCase();
    const isMatched = queryTerms.some((term) => sNameLower.includes(term) || term.includes(sNameLower));
    if (isMatched) {
      const matchingChunk = chunks.find(
        (c) => c.filePath === s.filePath && (c.startLine || 1) <= s.startLine && (c.endLine || 1) >= s.endLine
      );
      if (matchingChunk) {
        symbolResults.push({
          chunkId: matchingChunk.id,
          score: 1.0,
          filePath: matchingChunk.filePath,
          content: matchingChunk.content,
          startLine: matchingChunk.startLine || 1,
          endLine: matchingChunk.endLine || 1,
          symbolName: s.name,
          nodeType: s.kind,
        });
      }
    }
  }

  // 4. Combine via Multi-Way RRF
  const fused = multiWayRrf([denseResults, sparseResults, symbolResults], 60);

  // 5. Expand dependencies (find callers, imports)
  const targetFiles = new Set(fused.slice(0, 5).map((r) => r.filePath));
  for (const item of fused) {
    const relatedDeps = dependencies.filter(
      (d) => d.sourceFilePath === item.filePath || d.targetFilePath === item.filePath
    );
    if (relatedDeps.length > 0) {
      item.relationships = Array.from(
        new Set(
          relatedDeps.map((d) =>
            d.sourceFilePath === item.filePath
              ? `imports ${d.targetFilePath} (${(d.importedSymbols || []).join(", ")})`
              : `imported by ${d.sourceFilePath}`
          )
        )
      );
      // Give a subtle relevance boost to chunks with direct dependency links to top candidates
      const hasLinkToTop = relatedDeps.some(
        (d) => targetFiles.has(d.sourceFilePath) || targetFiles.has(d.targetFilePath)
      );
      if (hasLinkToTop) {
        item.score *= 1.15;
      }
    }
  }

  return fused.sort((a, b) => b.score - a.score).slice(0, topK);
}
