import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '@/lib/logger';
import { DocumentManager } from '../document-index/document-manager';
import { paths } from '@/lib/env-config';
import type { Chunk } from '../document-index/chunker';

interface AutoFaqEntry {
  question: string;
  intent: string;
  answer: string;
  source: 'heading_question' | 'definition' | 'qa_pattern';
  generatedAt: string;
}

// Patterns for detecting FAQ-like content
const QA_PATTERN = /^(?:Q:|Question:|\?)\s*(.+)/i;
const ANSWER_PATTERN = /^(?:A:|Answer:)\s*(.+)/i;
const DEFINITION_PATTERN = /^(.{5,50})\s+(?:is|are|refers?\s+to|means?|can\s+be\s+defined\s+as)\s+(.{20,})/i;
const HEADING_QUESTION_PATTERN = /^(?:what|how|why|when|where|who|which|can|does|is|are)\s/i;

/**
 * Auto-FAQ Generator — scans indexed documents for FAQ-like patterns
 * and generates FAQ entries that can be loaded into the FuzzyMatcher.
 */
export class AutoFaqGenerator {
  private groupId: string;
  private outputPath: string;

  constructor(groupId: string = 'default') {
    this.groupId = groupId;
    this.outputPath = paths.data.autoFaqs(groupId);
  }

  /**
   * Scan all indexed documents and generate FAQ entries.
   */
  async generate(): Promise<AutoFaqEntry[]> {
    const docManager = DocumentManager.getInstance(this.groupId);
    await docManager.ensureLoaded();

    const index = docManager.getIndex();
    const chunks = index.getChunks();

    if (chunks.length === 0) {
      logger.info({ groupId: this.groupId }, 'No chunks to scan for auto-FAQ');
      return [];
    }

    const entries: AutoFaqEntry[] = [];
    const seen = new Set<string>(); // deduplicate by normalized question

    for (const chunk of chunks) {
      // 1. Check heading-as-question
      if (chunk.heading && HEADING_QUESTION_PATTERN.test(chunk.heading)) {
        const question = chunk.heading.replace(/\?$/, '').trim();
        const answer = this.extractFirstSentence(chunk.text);
        if (answer && !seen.has(question.toLowerCase())) {
          seen.add(question.toLowerCase());
          entries.push({
            question: question + '?',
            intent: 'knowledge.search',
            answer,
            source: 'heading_question',
            generatedAt: new Date().toISOString(),
          });
        }
      }

      // 2. Check for Q&A patterns in text
      const qaEntries = this.extractQAPairs(chunk);
      for (const qa of qaEntries) {
        if (!seen.has(qa.question.toLowerCase())) {
          seen.add(qa.question.toLowerCase());
          entries.push(qa);
        }
      }

      // 3. Check for definition sentences
      const defEntries = this.extractDefinitions(chunk);
      for (const def of defEntries) {
        if (!seen.has(def.question.toLowerCase())) {
          seen.add(def.question.toLowerCase());
          entries.push(def);
        }
      }
    }

    // Save generated FAQ
    if (entries.length > 0) {
      await this.save(entries);
      logger.info(
        { groupId: this.groupId, count: entries.length },
        'Auto-FAQ entries generated'
      );
    }

    return entries;
  }

  /**
   * Load previously generated FAQs from disk.
   */
  async load(): Promise<AutoFaqEntry[]> {
    try {
      const raw = await fs.readFile(this.outputPath, 'utf-8');
      return JSON.parse(raw) as AutoFaqEntry[];
    } catch {
      return [];
    }
  }

  private extractQAPairs(chunk: Chunk): AutoFaqEntry[] {
    const results: AutoFaqEntry[] = [];
    const lines = chunk.text.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const qMatch = QA_PATTERN.exec(line);
      if (qMatch) {
        const question = qMatch[1].replace(/\?$/, '').trim();
        // Look for answer on next line(s)
        let answer = '';
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const nextLine = lines[j].trim();
          const aMatch = ANSWER_PATTERN.exec(nextLine);
          if (aMatch) {
            answer = aMatch[1].trim();
            break;
          } else if (nextLine.length > 20 && !QA_PATTERN.test(nextLine)) {
            answer = nextLine;
            break;
          }
        }

        if (question.length >= 10 && answer.length >= 10) {
          results.push({
            question: question + '?',
            intent: 'knowledge.search',
            answer: answer.length > 200 ? answer.substring(0, 200) + '...' : answer,
            source: 'qa_pattern',
            generatedAt: new Date().toISOString(),
          });
        }
      }
    }

    return results;
  }

  private extractDefinitions(chunk: Chunk): AutoFaqEntry[] {
    const results: AutoFaqEntry[] = [];

    for (const sentence of chunk.sentences) {
      const match = DEFINITION_PATTERN.exec(sentence.trim());
      if (match) {
        const term = match[1].trim();
        const definition = match[2].trim();

        // Skip if term is too generic or too long
        if (term.split(/\s+/).length > 6 || term.length < 3) continue;

        results.push({
          question: `What is ${term}?`,
          intent: 'knowledge.search',
          answer: sentence.trim().length > 200
            ? sentence.trim().substring(0, 200) + '...'
            : sentence.trim(),
          source: 'definition',
          generatedAt: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  private extractFirstSentence(text: string): string | null {
    const sentences = text.split(/(?<=[.!?])\s+/);
    const first = sentences[0]?.trim();
    if (first && first.length >= 15) {
      return first.length > 200 ? first.substring(0, 200) + '...' : first;
    }
    return null;
  }

  private async save(entries: AutoFaqEntry[]): Promise<void> {
    await fs.mkdir(dirname(this.outputPath), { recursive: true });
    await fs.writeFile(this.outputPath, JSON.stringify(entries, null, 2), 'utf-8');
  }
}
