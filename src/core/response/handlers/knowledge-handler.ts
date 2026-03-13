import { logger } from '@/lib/logger';
import type { QueryService } from '../../api-connector/query-service';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import { STOP_WORDS } from '../constants';
import { getLastUserText } from './query-handler';

/**
 * Handle knowledge.search intent — search across all documents for an answer.
 */
export async function handleKnowledgeSearch(
  classification: ClassificationResult,
  context: ConversationContext,
  queryService: QueryService
): Promise<BotResponse> {
  const userText = getLastUserText(context);

  // Extract keywords from user text
  const words = userText
    .toLowerCase()
    .replace(/[?!.,;:'"()[\]{}]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w));

  if (words.length === 0) {
    return {
      text: 'Could you be more specific? Try asking a question like "what is the auth flow?" or "how do I deploy?"',
      suggestions: ['list queries', 'help'],
      sessionId: context.sessionId,
      intent: 'knowledge.search',
      confidence: classification.confidence,
    };
  }

  try {
    const results = await queryService.searchAllDocuments(words);

    if (results.length === 0) {
      return {
        text: `I couldn't find relevant information for "${userText}" in the knowledge base. Try rephrasing your question or type \`list queries\` to see available documents.`,
        suggestions: ['list queries', 'help'],
        sessionId: context.sessionId,
        intent: 'knowledge.search',
        confidence: classification.confidence,
      };
    }

    const totalSections = results.reduce((sum, r) => sum + r.sections.length, 0);
    logger.info(
      { keywords: words, docs: results.length, sections: totalSections },
      'Knowledge search results'
    );

    const suggestions = results
      .slice(0, 3)
      .map((r) => `search ${r.queryName} for more details`);
    if (suggestions.length < 4) suggestions.push('list queries');

    return {
      text: `Found ${totalSections} matching section${totalSections !== 1 ? 's' : ''} across ${results.length} document${results.length !== 1 ? 's' : ''}:`,
      richContent: {
        type: 'knowledge_search',
        data: { results, keywords: words },
      },
      suggestions,
      sessionId: context.sessionId,
      intent: 'knowledge.search',
      confidence: classification.confidence,
    };
  } catch (error) {
    logger.error({ error }, 'Knowledge search failed');
    return {
      text: 'Sorry, I had trouble searching the knowledge base. Please try again.',
      suggestions: ['list queries', 'help'],
      sessionId: context.sessionId,
      intent: 'knowledge.search',
      confidence: classification.confidence,
    };
  }
}

/**
 * Generate a structured summary of document content.
 * Extracts headings, key stats (tables, endpoints, etc.), and keywords.
 */
export function summarizeDocument(content: string): {
  text: string;
  title: string;
  sections: { heading: string; preview: string }[];
  stats: { label: string; value: string }[];
  keywords: string[];
} {
  const lines = content.split('\n');

  // Extract title (first heading)
  const titleLine = lines.find((l) => /^#+\s+/.test(l.trim()));
  const title = titleLine ? titleLine.replace(/^#+\s+/, '').trim() : 'Document';

  // Extract section headings with previews
  const sections: { heading: string; preview: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^#{2,3}\s+/.test(line)) {
      const heading = line.replace(/^#+\s+/, '').trim();
      let preview = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const next = lines[j].trim();
        if (next && !next.startsWith('#') && !next.startsWith('|') && !next.startsWith('-')) {
          preview = next.length > 120 ? next.substring(0, 120) + '...' : next;
          break;
        }
      }
      sections.push({ heading, preview });
    }
  }

  // Extract stats: tables, lists, code blocks, etc.
  const stats: { label: string; value: string }[] = [];
  const tableRows = lines.filter((l) => l.trim().startsWith('|') && !l.trim().startsWith('|--')).length;
  if (tableRows > 0) stats.push({ label: 'Table rows', value: String(tableRows) });

  const bulletPoints = lines.filter((l) => /^\s*[-*]\s/.test(l)).length;
  if (bulletPoints > 0) stats.push({ label: 'Bullet points', value: String(bulletPoints) });

  const codeBlocks = (content.match(/```/g) || []).length / 2;
  if (codeBlocks > 0) stats.push({ label: 'Code blocks', value: String(Math.floor(codeBlocks)) });

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  stats.push({ label: 'Word count', value: wordCount.toLocaleString() });
  stats.push({ label: 'Sections', value: String(sections.length) });

  // Extract keywords from headings
  const keywords = sections
    .map((s) => s.heading)
    .flatMap((h) => h.split(/\s+/))
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w.toLowerCase()))
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  const uniqueKeywords = Array.from(new Set(keywords.map((k) => k.toLowerCase())));

  return {
    text: `Summary of "${title}" — ${sections.length} sections, ${wordCount.toLocaleString()} words:`,
    title,
    sections,
    stats,
    keywords: uniqueKeywords,
  };
}
