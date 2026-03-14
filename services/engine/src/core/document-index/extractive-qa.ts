import type { ScoredChunk } from './tfidf-index';

export interface ExtractedAnswer {
  answer: string;
  confidence: number;
  sourceDocument: string;
  sourceHeading: string | null;
  context: string;
  /** The full chunk text containing the answer */
  chunkText: string;
}

/**
 * Extractive Q&A engine — finds the best answer sentences from candidate chunks
 * WITHOUT any LLM. Uses TF-IDF overlap, pattern matching, and positional heuristics.
 */
export function extractAnswer(
  question: string,
  candidates: ScoredChunk[],
  maxAnswers: number = 3
): ExtractedAnswer[] {
  if (candidates.length === 0) return [];

  const questionTerms = tokenize(question);
  const questionLower = question.toLowerCase();
  const isDefinitionQ = /^\s*(what\s+is|what\s+are|define|explain)\b/i.test(question);
  const isHowQ = /^\s*(how\s+do|how\s+does|how\s+to|how\s+is)\b/i.test(question);
  const isWhyQ = /^\s*(why\s+do|why\s+does|why\s+is)\b/i.test(question);

  const allScoredSentences: Array<{
    sentence: string;
    score: number;
    chunk: ScoredChunk;
    sentenceIndex: number;
  }> = [];

  for (const candidate of candidates) {
    const { chunk, score: chunkScore } = candidate;
    const headingTerms = chunk.heading ? tokenize(chunk.heading) : [];
    const headingOverlap = computeOverlap(questionTerms, headingTerms);

    for (let si = 0; si < chunk.sentences.length; si++) {
      const sentence = chunk.sentences[si].trim();
      if (sentence.length < 10) continue; // skip trivially short

      const sentenceTerms = tokenize(sentence);
      let score = 0;

      // 1. TF-IDF-like term overlap (primary signal)
      const overlap = computeOverlap(questionTerms, sentenceTerms);
      score += overlap * 2.0;

      // 2. Chunk-level BM25 score as a baseline boost
      score += Math.min(chunkScore * 0.3, 1.0);

      // 3. Definition pattern bonus
      if (isDefinitionQ && /\b(is|are|refers?\s+to|means?|defined?\s+as)\b/i.test(sentence)) {
        score += 0.3;
      }

      // 4. How-to pattern bonus
      if (isHowQ && /\b(steps?|process|procedure|first|then|next|follow)\b/i.test(sentence)) {
        score += 0.2;
      }

      // 5. Why/because pattern bonus
      if (isWhyQ && /\b(because|reason|due\s+to|caused?\s+by|result\s+of)\b/i.test(sentence)) {
        score += 0.2;
      }

      // 6. Position bonus — first sentence often summarizes
      if (si === 0) score += 0.1;

      // 7. Heading relevance bonus
      if (headingOverlap > 0.3) score += 0.2;

      // 8. Length penalty — too short or too long sentences are less useful
      const wordCount = sentenceTerms.length;
      if (wordCount < 4) score *= 0.5;
      if (wordCount > 50) score *= 0.8;

      // 9. Exact substring match bonus
      for (const qt of questionTerms) {
        if (qt.length >= 4 && sentence.toLowerCase().includes(qt)) {
          score += 0.1;
        }
      }

      allScoredSentences.push({
        sentence,
        score,
        chunk: candidate,
        sentenceIndex: si,
      });
    }
  }

  // Sort by score descending
  allScoredSentences.sort((a, b) => b.score - a.score);

  // Deduplicate — don't return near-identical sentences
  const results: ExtractedAnswer[] = [];
  const usedSentences = new Set<string>();

  for (const item of allScoredSentences) {
    if (results.length >= maxAnswers) break;

    const normalized = item.sentence.toLowerCase().trim();
    if (usedSentences.has(normalized)) continue;

    // Check for near-duplicates (>80% overlap)
    let isDuplicate = false;
    for (const used of usedSentences) {
      if (stringSimilarity(normalized, used) > 0.8) {
        isDuplicate = true;
        break;
      }
    }
    if (isDuplicate) continue;

    usedSentences.add(normalized);

    // Build surrounding context (sentence before + after)
    const chunk = item.chunk.chunk;
    const contextSentences: string[] = [];
    if (item.sentenceIndex > 0) {
      contextSentences.push(chunk.sentences[item.sentenceIndex - 1]);
    }
    contextSentences.push(item.sentence);
    if (item.sentenceIndex < chunk.sentences.length - 1) {
      contextSentences.push(chunk.sentences[item.sentenceIndex + 1]);
    }

    results.push({
      answer: item.sentence,
      confidence: Math.min(item.score, 1.0), // cap at 1.0
      sourceDocument: chunk.documentId,
      sourceHeading: chunk.heading,
      context: contextSentences.join(' '),
      chunkText: chunk.text,
    });
  }

  return results;
}

// ── Helper functions ──────────────────────────────────────────────

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP.has(w));
}

/** Compute Jaccard-like overlap between two term sets */
function computeOverlap(termsA: string[], termsB: string[]): number {
  if (termsA.length === 0 || termsB.length === 0) return 0;
  const setB = new Set(termsB);
  let matches = 0;
  for (const t of termsA) {
    if (setB.has(t)) matches++;
  }
  return matches / termsA.length; // proportion of query terms found
}

/** Simple string similarity (character-level Jaccard) */
function stringSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  let intersection = 0;
  for (const w of setA) {
    if (setB.has(w)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

const STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those', 'not', 'no', 'so',
  'what', 'which', 'who', 'how', 'when', 'where', 'why',
  'me', 'my', 'we', 'our', 'you', 'your', 'he', 'she', 'they', 'their',
  'its', 'us', 'him', 'them',
]);
