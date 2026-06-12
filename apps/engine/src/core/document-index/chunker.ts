const HEADING_REGEX = /^#{1,6}\s+.+$/;

export interface Chunk {
  id: string;
  documentId: string;
  heading: string | null;
  text: string;
  sentences: string[];
  wordCount: number;
  position: number; // 0-based chunk index within the document
}

// Simple sentence splitter — splits on period/exclamation/question followed by space+uppercase or end
const SENTENCE_SPLIT = /(?<=[.!?])\s+(?=[A-Z])|(?<=[.!?])$/g;

function splitSentences(text: string): string[] {
  const raw = text.split(SENTENCE_SPLIT).filter((s) => s.trim().length > 0);
  // Fallback: if regex didn't split, try newline-based splitting
  if (raw.length <= 1 && text.length > 200) {
    return text
      .split(/\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return raw;
}

/**
 * Chunk a document into searchable sections.
 * Strategy:
 * 1. Split by markdown headings (reuses existing logic from document-search.ts)
 * 2. If a section exceeds maxWordsPerChunk, sub-split into overlapping chunks
 */
export function chunkDocument(
  documentId: string,
  text: string,
  maxWordsPerChunk: number = 300,
  overlapWords: number = 50
): Chunk[] {
  const lines = text.split('\n');
  const rawSections = splitByHeadings(lines);
  const chunks: Chunk[] = [];
  let position = 0;

  for (const section of rawSections) {
    const words = section.content.split(/\s+/).filter(Boolean);

    if (words.length <= maxWordsPerChunk) {
      // Section fits in one chunk
      const sentences = splitSentences(section.content);
      chunks.push({
        id: `${documentId}_chunk_${position}`,
        documentId,
        heading: section.heading,
        text: section.content,
        sentences,
        wordCount: words.length,
        position,
      });
      position++;
    } else {
      // Sub-split into overlapping chunks
      let start = 0;
      while (start < words.length) {
        const end = Math.min(start + maxWordsPerChunk, words.length);
        const chunkText = words.slice(start, end).join(' ');
        const sentences = splitSentences(chunkText);
        chunks.push({
          id: `${documentId}_chunk_${position}`,
          documentId,
          heading: section.heading,
          text: chunkText,
          sentences,
          wordCount: end - start,
          position,
        });
        position++;
        start = end - overlapWords;
        if (start >= words.length - overlapWords) break;
      }
    }
  }

  return chunks;
}

interface RawSection {
  heading: string | null;
  content: string;
}

function splitByHeadings(lines: string[]): RawSection[] {
  const sections: RawSection[] = [];
  const headingIndices: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (HEADING_REGEX.test(lines[i].trim())) {
      headingIndices.push(i);
    }
  }

  if (headingIndices.length === 0) {
    // No headings — split by double newlines (paragraphs)
    const paragraphs = lines.join('\n').split(/\n\s*\n/);
    for (const para of paragraphs) {
      const trimmed = para.trim();
      if (trimmed.length > 0) {
        sections.push({ heading: null, content: trimmed });
      }
    }
    return sections;
  }

  // Content before first heading
  if (headingIndices[0] > 0) {
    const preContent = lines.slice(0, headingIndices[0]).join('\n').trim();
    if (preContent.length > 0) {
      sections.push({ heading: null, content: preContent });
    }
  }

  // Each heading to next heading (or end)
  for (let i = 0; i < headingIndices.length; i++) {
    const start = headingIndices[i];
    const end = i + 1 < headingIndices.length ? headingIndices[i + 1] : lines.length;
    const heading = lines[start].trim().replace(/^#+\s+/, '');
    const body = lines.slice(start + 1, end).join('\n').trim();
    if (body.length > 0) {
      sections.push({ heading, content: body });
    }
  }

  return sections;
}
