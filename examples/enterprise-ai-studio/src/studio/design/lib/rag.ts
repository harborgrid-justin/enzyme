/**
 * Knowledge retrieval (feature #21).
 *
 * A transparent TF-IDF-ish retriever over the workspace knowledge base. No
 * embeddings server required — it scores docs by query-term overlap weighted
 * by inverse document frequency, then returns the best-matching snippet from
 * each doc so generations can be grounded in org context.
 */
import type { KnowledgeDoc, RetrievedChunk } from '../types';

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Rank docs against a query and return the top-`k` grounding chunks. */
export function retrieve(query: string, docs: KnowledgeDoc[], k = 3): RetrievedChunk[] {
  const queryTerms = new Set(tokenize(query));
  if (queryTerms.size === 0 || docs.length === 0) return [];

  // Document frequency per term.
  const df = new Map<string, number>();
  const docTerms = docs.map((doc) => {
    const terms = new Set(tokenize(`${doc.title} ${doc.content}`));
    for (const term of terms) df.set(term, (df.get(term) ?? 0) + 1);
    return terms;
  });

  const scored = docs.map((doc, i) => {
    let score = 0;
    for (const term of queryTerms) {
      if (docTerms[i]!.has(term)) {
        const idf = Math.log(1 + docs.length / (df.get(term) ?? 1));
        score += idf;
      }
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ doc, score }) => ({
      docId: doc.id,
      docTitle: doc.title,
      snippet: bestSnippet(doc.content, queryTerms),
      score: Number(score.toFixed(3)),
    }));
}

/** Pick the sentence with the most query-term hits. */
function bestSnippet(content: string, queryTerms: Set<string>): string {
  const sentences = content.split(/(?<=[.!?])\s+/);
  let best = sentences[0] ?? content;
  let bestHits = -1;
  for (const sentence of sentences) {
    const hits = tokenize(sentence).filter((t) => queryTerms.has(t)).length;
    if (hits > bestHits) {
      bestHits = hits;
      best = sentence;
    }
  }
  return best.trim().slice(0, 220);
}

/** Compose a grounded system-prompt preamble from retrieved chunks. */
export function groundingPreamble(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';
  const refs = chunks.map((c, i) => `[${i + 1}] ${c.docTitle}: ${c.snippet}`).join('\n');
  return `Use the following sources to ground your answer:\n${refs}`;
}
