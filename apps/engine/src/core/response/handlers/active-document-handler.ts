/**
 * "Ask the active document" handler.
 *
 * When the user has just loaded a document via a catalog query
 * (e.g., `run incident_report`) and then asks a follow-up question
 * like `how many incidents` or `what was the root cause`, we want to
 * answer FROM THAT DOCUMENT — not bottom out with "I don't understand".
 *
 * Approach: chunk the document text the same way DocumentManager
 * indexes uploaded files, compute per-chunk term overlap with the
 * question, and run the existing extractive-QA over the top chunks.
 * No external index, no LLM — just in-memory text scoring.
 *
 * Intentionally narrow: returns null when the active context isn't a
 * document, or when the input doesn't look like a question. The
 * response generator falls back to its normal flow in that case.
 */

import { chunkDocument, type Chunk } from "../../document-index/chunker";
import { extractAnswer } from "../../document-index/extractive-qa";
import type { ScoredChunk } from "../../document-index/tfidf-index";
import type {
  BotResponse,
  ClassificationResult,
  ConversationContext,
} from "../../types";

const QUESTION_PREFIX =
  /^\s*(how\s+(many|much|do|does|did|long|often)|what|why|when|where|who|which|count\b|list\b|show\b|find\b|tell\s+me)/i;

const STOP_WORDS = new Set([
  "the",
  "and",
  "or",
  "of",
  "to",
  "a",
  "in",
  "is",
  "are",
  "was",
  "were",
  "for",
  "on",
  "at",
  "by",
  "an",
  "be",
  "this",
  "that",
  "it",
  "as",
  "with",
  "from",
  "how",
  "what",
  "why",
  "when",
  "where",
  "who",
  "which",
  "many",
  "much",
  "do",
  "does",
  "did",
  "tell",
  "me",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function looksLikeQuestion(text: string): boolean {
  if (!text || text.length < 3) return false;
  if (text.trim().endsWith("?")) return true;
  return QUESTION_PREFIX.test(text);
}

/**
 * Score chunks by term-overlap with the question. Cheap enough to run
 * fresh on every question — the active document is at most ~10k words.
 */
function scoreChunks(chunks: Chunk[], question: string): ScoredChunk[] {
  const qTerms = tokenize(question);
  if (qTerms.length === 0) {
    // No content terms left after stop-word strip — return all chunks
    // with uniform score so positional bias in extractAnswer takes over.
    return chunks.map((c) => ({ chunk: c, score: 0.1 }));
  }
  const scored: ScoredChunk[] = [];
  for (const chunk of chunks) {
    const cTerms = tokenize(chunk.text);
    if (cTerms.length === 0) continue;
    const cSet = new Set(cTerms);
    let overlap = 0;
    for (const t of qTerms) if (cSet.has(t)) overlap += 1;
    if (overlap === 0) continue;
    // Normalize by question length so a 3-word question and a 6-word
    // question are comparable.
    scored.push({ chunk, score: overlap / qTerms.length });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 5);
}

/**
 * Try to answer the user's question using the currently loaded
 * document. Returns null when:
 *   - no active document is loaded
 *   - the input doesn't look like a question (don't intercept
 *     follow-ups like "group by region" — those go elsewhere)
 *   - no chunks scored above zero overlap
 */
export function handleActiveDocumentQuestion(
  classification: ClassificationResult,
  context: ConversationContext,
  userText: string,
): BotResponse | null {
  if (!looksLikeQuestion(userText)) return null;

  const last = context.lastApiResult as
    | { content?: string; filePath?: string }
    | undefined;
  const content = last?.content;
  if (!content || typeof content !== "string" || content.length < 50) {
    return null;
  }

  const documentId =
    last?.filePath || context.lastQueryName || "active-document";
  const chunks = chunkDocument(documentId, content);
  if (chunks.length === 0) return null;

  const candidates = scoreChunks(chunks, userText);
  if (candidates.length === 0) {
    return {
      text: `I couldn't find anything matching "${userText}" in the active document. Try different keywords or load another query.`,
      suggestions: ["List queries", "Help"],
      sessionId: context.sessionId,
      intent: "document.ask",
      confidence: classification.confidence,
    };
  }

  const answers = extractAnswer(userText, candidates, 3);
  if (answers.length === 0) {
    // Fall back to top chunk preview when extractive QA can't pull a
    // sentence with high enough confidence.
    const top = candidates[0].chunk;
    return {
      text: `From the active document — closest section to "${userText}":`,
      richContent: {
        type: "document_answer",
        data: {
          mode: "sections",
          question: userText,
          sections: [
            {
              heading: top.heading,
              content: top.text.slice(0, 400),
              score: candidates[0].score,
              documentId,
            },
          ],
          documentCount: 1,
        },
      },
      suggestions: ["List queries", "Help"],
      sessionId: context.sessionId,
      intent: "document.ask",
      confidence: Math.max(classification.confidence, 0.55),
    };
  }

  return {
    text: `From the active document:\n\n${answers[0].answer}`,
    richContent: {
      type: "document_answer",
      data: {
        mode: "answer",
        question: userText,
        answer: answers[0].answer,
        confidence: answers[0].confidence,
        context: answers[0].context,
        heading: answers[0].sourceHeading,
        documentId,
        alternates: answers.slice(1).map((a) => ({
          answer: a.answer,
          confidence: a.confidence,
          heading: a.sourceHeading,
        })),
      },
    },
    suggestions: ["List queries", "Help"],
    sessionId: context.sessionId,
    intent: "document.ask",
    confidence: Math.max(classification.confidence, answers[0].confidence),
  };
}
