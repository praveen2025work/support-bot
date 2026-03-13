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
