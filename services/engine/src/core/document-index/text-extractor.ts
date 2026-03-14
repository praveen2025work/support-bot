import { logger } from '@/lib/logger';

export interface ExtractionResult {
  rawText: string;
  format: string;
  pageCount?: number;
  wordCount: number;
}

/**
 * Extract text content from a file buffer based on its extension.
 * Supports: .pdf, .docx, .md, .txt
 */
export async function extractText(
  buffer: Buffer,
  extension: string
): Promise<ExtractionResult> {
  const ext = extension.toLowerCase().replace(/^\./, '');

  switch (ext) {
    case 'pdf':
      return extractPdf(buffer);
    case 'docx':
      return extractDocx(buffer);
    case 'md':
    case 'txt':
    case 'markdown':
      return extractPlainText(buffer, ext);
    default:
      throw new Error(`Unsupported file type: .${ext}. Supported: pdf, docx, md, txt`);
  }
}

async function extractPdf(buffer: Buffer): Promise<ExtractionResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse');
  const data = await pdfParse(buffer);
  const rawText: string = data.text || '';
  const pageCount: number = data.numpages || 1;
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  // Warn if very low text-to-page ratio (likely scanned/image PDF)
  const wordsPerPage = wordCount / pageCount;
  if (wordsPerPage < 20 && pageCount > 0) {
    logger.warn(
      { wordsPerPage, pageCount },
      'PDF appears to be image-based — text extraction may be incomplete'
    );
  }

  return { rawText, format: 'pdf', pageCount, wordCount };
}

async function extractDocx(buffer: Buffer): Promise<ExtractionResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mammoth = require('mammoth');
  const result = await mammoth.convertToMarkdown({ buffer });
  const rawText: string = result.value || '';
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;

  if (result.messages && result.messages.length > 0) {
    logger.debug({ messages: result.messages.length }, 'DOCX conversion warnings');
  }

  return { rawText, format: 'docx', wordCount };
}

function extractPlainText(buffer: Buffer, ext: string): ExtractionResult {
  const rawText = buffer.toString('utf-8');
  const wordCount = rawText.split(/\s+/).filter(Boolean).length;
  return { rawText, format: ext, wordCount };
}
