/**
 * URL content parser.
 * Fetches a URL and extracts clean text content by stripping HTML tags.
 * Uses built-in fetch — no external HTML parser dependency needed.
 */

import { logger } from '@/lib/logger';

interface ParsedUrl {
  url: string;
  title: string;
  rawText: string;
  wordCount: number;
  fetchedAt: string;
}

/**
 * Strip HTML tags and extract clean text content.
 * Removes script, style, nav, footer, and header elements first.
 */
function htmlToText(html: string): { title: string; text: string } {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';

  // Remove unwanted blocks
  let cleaned = html;
  const removePatterns = [
    /<script[\s\S]*?<\/script>/gi,
    /<style[\s\S]*?<\/style>/gi,
    /<nav[\s\S]*?<\/nav>/gi,
    /<footer[\s\S]*?<\/footer>/gi,
    /<header[\s\S]*?<\/header>/gi,
    /<iframe[\s\S]*?<\/iframe>/gi,
    /<noscript[\s\S]*?<\/noscript>/gi,
    /<!--[\s\S]*?-->/g,
  ];

  for (const pattern of removePatterns) {
    cleaned = cleaned.replace(pattern, ' ');
  }

  // Replace block-level tags with newlines for paragraph detection
  cleaned = cleaned
    .replace(/<\/(div|p|h[1-6]|li|tr|br|hr)[^>]*>/gi, '\n')
    .replace(/<(br|hr)\s*\/?>/gi, '\n');

  // Strip all remaining HTML tags
  cleaned = cleaned.replace(/<[^>]+>/g, ' ');

  // Decode common HTML entities
  cleaned = cleaned
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ')
    .replace(/&\w+;/g, ' ');

  // Collapse whitespace
  const text = cleaned
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');

  return { title, text };
}

/**
 * Fetch and parse a URL into clean text content.
 */
export async function parseUrl(url: string): Promise<ParsedUrl> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ChatBot-URLParser/1.0',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const { title, text } = htmlToText(html);
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    logger.info({ url, title, wordCount }, 'URL parsed successfully');

    return {
      url,
      title: title || url,
      rawText: text,
      wordCount,
      fetchedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}
