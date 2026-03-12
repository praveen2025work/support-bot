import { NlpService } from './nlp/nlp-service';
import { ResponseGenerator } from './response/response-generator';
import { SessionManager } from './session/session-manager';
import type { LearningService } from './learning/learning-service';
import { logger } from '@/lib/logger';
import type { ChatMessage, BotResponse } from './types';

export class ChatbotEngine {
  private initialized = false;

  constructor(
    private nlpService: NlpService,
    private responseGenerator: ResponseGenerator,
    private sessionManager: SessionManager,
    private learningService?: LearningService
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.nlpService.initialize();
    this.initialized = true;
    logger.info('ChatbotEngine initialized');
  }

  async processMessage(message: ChatMessage, explicitFilters?: Record<string, string>): Promise<BotResponse> {
    await this.initialize();

    const context = await this.sessionManager.getContext(message.sessionId);

    context.history.push({
      role: 'user',
      text: message.text,
      timestamp: message.timestamp,
    });

    const classification = await this.nlpService.classify(message.text);
    logger.info(
      {
        intent: classification.intent,
        confidence: classification.confidence,
        entities: classification.entities.map((e) => e.entity),
        source: classification.source,
      },
      'Message classified'
    );

    const response = await this.responseGenerator.generate(
      classification,
      context,
      explicitFilters
    );

    context.history.push({
      role: 'bot',
      text: response.text,
      timestamp: new Date(),
    });

    await this.sessionManager.saveContext(context);

    // Log interaction for learning (fire-and-forget)
    if (this.learningService) {
      try {
        this.learningService.logInteraction(classification, {
          text: message.text,
          sessionId: message.sessionId,
          feedbackType: message.feedbackType,
          previousMessageText: message.previousMessageText,
        });
      } catch (error) {
        logger.error({ error }, 'Learning service logging failed');
      }
    }

    return response;
  }
}
