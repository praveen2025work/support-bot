export interface DocumentSection {
  heading: string | null;
  content: string;
  lineStart: number;
  lineEnd: number;
  score: number;
}

const HEADING_REGEX = /^#{1,6}\s+.+$/;

/**
 * Split markdown content into sections by headings.
 * Falls back to paragraph splitting if no headings found.
 */
function splitIntoSections(content: string): Omit<DocumentSection, 'score'>[] {
  const lines = content.split('\n');
  const sections: Omit<DocumentSection, 'score'>[] = [];

  // Find heading line indices
  const headingIndices: number[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (HEADING_REGEX.test(lines[i].trim())) {
      headingIndices.push(i);
    }
  }

  if (headingIndices.length === 0) {
    // No headings — split by double newlines (paragraphs)
    const paraStart = 0;
    const text = content.trim();
    const paragraphs = text.split(/\n\s*\n/);
    let lineOffset = 0;
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 0) {
        const paraLines = trimmed.split('\n').length;
        sections.push({
          heading: null,
          content: trimmed,
          lineStart: lineOffset + 1,
          lineEnd: lineOffset + paraLines,
        });
        lineOffset += paraLines + 1; // +1 for blank line
      } else {
        lineOffset += 1;
      }
    }
    return sections;
  }

  // Content before first heading
  if (headingIndices[0] > 0) {
    const preContent = lines.slice(0, headingIndices[0]).join('\n').trim();
    if (preContent.length > 0) {
      sections.push({
        heading: null,
        content: preContent,
        lineStart: 1,
        lineEnd: headingIndices[0],
      });
    }
  }

  // Each heading to next heading (or end)
  for (let i = 0; i < headingIndices.length; i++) {
    const start = headingIndices[i];
    const end = i + 1 < headingIndices.length ? headingIndices[i + 1] : lines.length;
    const heading = lines[start].trim();
    const body = lines.slice(start + 1, end).join('\n').trim();
    sections.push({
      heading,
      content: body,
      lineStart: start + 1,
      lineEnd: end,
    });
  }

  return sections;
}

/**
 * Search document content by keywords. Returns top matching sections.
 * (Legacy keyword-counting method — kept for backward compatibility)
 */
export function searchDocument(
  content: string,
  keywords: string[],
  maxResults: number = 5
): DocumentSection[] {
  if (!content || keywords.length === 0) return [];

  const sections = splitIntoSections(content);
  const lowerKeywords = keywords.map((k) => k.toLowerCase());

  const scored: DocumentSection[] = sections.map((section) => {
    const searchText = `${section.heading ?? ''} ${section.content}`.toLowerCase();
    let score = 0;
    for (const kw of lowerKeywords) {
      if (kw.length < 2) continue;
      // Count occurrences
      let idx = 0;
      while ((idx = searchText.indexOf(kw, idx)) !== -1) {
        score++;
        idx += kw.length;
      }
    }
    return { ...section, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

// ── BM25 stop words ────────────────────────────────────────────────

const BM25_STOP = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'it', 'as', 'be', 'was', 'are',
  'were', 'been', 'have', 'has', 'had', 'do', 'does', 'did',
  'will', 'would', 'could', 'should', 'may', 'might', 'can',
  'this', 'that', 'these', 'those', 'not', 'no', 'so',
  'what', 'which', 'who', 'how', 'when', 'where', 'why',
]);

function tokenizeBM25(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !BM25_STOP.has(w));
}

/**
 * Search document content using BM25 scoring — better relevance ranking
 * than simple keyword counting. Considers term frequency, inverse document
 * frequency, and document length normalization.
 */
export function searchDocumentBM25(
  content: string,
  query: string,
  maxResults: number = 5
): DocumentSection[] {
  if (!content || !query.trim()) return [];

  const sections = splitIntoSections(content);
  if (sections.length === 0) return [];

  const queryTerms = tokenizeBM25(query);
  if (queryTerms.length === 0) return [];

  const k1 = 1.2;
  const b = 0.75;

  // Tokenize all sections
  const sectionTokens = sections.map((s) =>
    tokenizeBM25(`${s.heading ?? ''} ${s.content}`)
  );

  // Average document length
  const avgDl = sectionTokens.reduce((sum, t) => sum + t.length, 0) / sections.length;

  // Document frequency per term
  const df = new Map<string, number>();
  for (const tokens of sectionTokens) {
    const unique = new Set(tokens);
    for (const term of unique) {
      df.set(term, (df.get(term) || 0) + 1);
    }
  }

  const N = sections.length;

  const scored: DocumentSection[] = sections.map((section, i) => {
    const tokens = sectionTokens[i];
    const dl = tokens.length;

    // Term frequency map for this section
    const tf = new Map<string, number>();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) || 0) + 1);
    }

    let score = 0;
    for (const term of queryTerms) {
      const termDf = df.get(term) || 0;
      if (termDf === 0) continue;

      const idf = Math.log((N - termDf + 0.5) / (termDf + 0.5) + 1);
      const termTf = tf.get(term) || 0;
      const tfNorm = (termTf * (k1 + 1)) / (termTf + k1 * (1 - b + b * (dl / avgDl)));

      score += idf * tfNorm;
    }

    return { ...section, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}
