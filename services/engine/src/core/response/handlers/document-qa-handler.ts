import { logger } from '@/lib/logger';
import { DocumentManager } from '../../document-index/document-manager';
import { extractAnswer } from '../../document-index/extractive-qa';
import type { ClassificationResult, BotResponse, ConversationContext } from '../../types';
import { getLastUserText } from './query-handler';

const ANSWER_CONFIDENCE_THRESHOLD = 0.3;

/**
 * Handle document.ask intent — search indexed documents and extract answer sentences.
 */
export async function handleDocumentAsk(
  classification: ClassificationResult,
  context: ConversationContext,
  groupId: string = 'default'
): Promise<BotResponse> {
  const userText = getLastUserText(context);
  const docManager = DocumentManager.getInstance(groupId);

  try {
    await docManager.ensureLoaded();
    const status = await docManager.getIndexStatus();

    if (status.documentCount === 0) {
      return {
        text: 'No documents have been uploaded yet. Ask an admin to upload PDF, DOCX, or text files so I can search them for answers.',
        suggestions: ['list queries', 'help'],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    // BM25 search for top chunks
    const candidates = docManager.search(userText, 8);

    if (candidates.length === 0) {
      return {
        text: `I couldn't find relevant content for "${userText}" in the uploaded documents. Try rephrasing your question.`,
        suggestions: ['list documents', 'list queries', 'help'],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    // Extract best answer sentences
    const answers = extractAnswer(userText, candidates, 3);

    if (answers.length === 0 || answers[0].confidence < ANSWER_CONFIDENCE_THRESHOLD) {
      // Low confidence — return chunk-level results instead
      const sections = candidates.slice(0, 3).map((c) => ({
        heading: c.chunk.heading,
        content: c.chunk.text.substring(0, 300) + (c.chunk.text.length > 300 ? '...' : ''),
        score: c.score,
        documentId: c.chunk.documentId,
      }));

      return {
        text: `I found some possibly relevant sections, but I'm not confident about a specific answer for "${userText}":`,
        richContent: {
          type: 'document_answer',
          data: {
            mode: 'sections',
            question: userText,
            sections,
            documentCount: status.documentCount,
          },
        },
        suggestions: ['list documents', 'list queries'],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    logger.info(
      {
        question: userText,
        answerCount: answers.length,
        topConfidence: answers[0].confidence,
        topSource: answers[0].sourceDocument,
      },
      'Document Q&A answer extracted'
    );

    return {
      text: answers.length === 1
        ? 'Here\'s what I found in the documents:'
        : `Found ${answers.length} relevant answers from the documents:`,
      richContent: {
        type: 'document_answer',
        data: {
          mode: 'answer',
          question: userText,
          answers: answers.map((a) => ({
            answer: a.answer,
            confidence: Math.round(a.confidence * 100),
            sourceDocument: a.sourceDocument,
            sourceHeading: a.sourceHeading,
            context: a.context,
          })),
          documentCount: status.documentCount,
        },
      },
      suggestions: ['list documents', 'ask another question'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  } catch (error) {
    logger.error({ error, question: userText }, 'Document Q&A failed');
    return {
      text: 'Sorry, I had trouble searching the documents. Please try again.',
      suggestions: ['list queries', 'help'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
}

/**
 * Handle document.list intent — show all indexed documents.
 */
export async function handleDocumentList(
  classification: ClassificationResult,
  context: ConversationContext,
  groupId: string = 'default'
): Promise<BotResponse> {
  const docManager = DocumentManager.getInstance(groupId);

  try {
    const status = await docManager.getIndexStatus();

    if (status.documentCount === 0) {
      return {
        text: 'No documents have been uploaded yet. Ask an admin to upload PDF, DOCX, or text files to the knowledge base.',
        suggestions: ['list queries', 'help'],
        sessionId: context.sessionId,
        intent: classification.intent,
        confidence: classification.confidence,
      };
    }

    return {
      text: `${status.documentCount} document${status.documentCount !== 1 ? 's' : ''} indexed (${status.chunkCount} searchable chunks):`,
      richContent: {
        type: 'document_upload_result',
        data: {
          mode: 'list',
          documents: status.documents.map((d) => ({
            id: d.id,
            filename: d.filename,
            format: d.format,
            wordCount: d.wordCount,
            chunkCount: d.chunkCount,
            pageCount: d.pageCount,
            uploadedAt: d.uploadedAt,
          })),
          totalChunks: status.chunkCount,
        },
      },
      suggestions: ['ask a question about documents', 'list queries'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  } catch (error) {
    logger.error({ error }, 'Document list failed');
    return {
      text: 'Sorry, I had trouble retrieving the document list. Please try again.',
      suggestions: ['help'],
      sessionId: context.sessionId,
      intent: classification.intent,
      confidence: classification.confidence,
    };
  }
}
