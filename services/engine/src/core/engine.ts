import { NlpService } from "./nlp/nlp-service";
import { ResponseGenerator } from "./response/response-generator";
import { SessionManager } from "./session/session-manager";
import { RecommendationEngine } from "./recommendations/recommendation-engine";
import { QueryRewriter } from "./nlp/query-rewriter";
import type { LearningService } from "./learning/learning-service";
import { logger } from "@/lib/logger";
import type { ChatMessage, BotResponse, IntentOverlap } from "./types";

export class ChatbotEngine {
  private initialized = false;
  private recommendationEngine: RecommendationEngine;
  private queryRewriter: QueryRewriter;

  constructor(
    private nlpService: NlpService,
    private responseGenerator: ResponseGenerator,
    private sessionManager: SessionManager,
    private learningService?: LearningService,
    groupId?: string,
  ) {
    this.recommendationEngine = new RecommendationEngine(groupId || "default");
    this.queryRewriter = new QueryRewriter();
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.nlpService.initialize();
    this.initialized = true;
    logger.info("ChatbotEngine initialized");
  }

  /** Returns true if the engine (and its NLP model) has been initialized. */
  isInitialized(): boolean {
    return this.initialized;
  }

  async processMessage(
    message: ChatMessage,
    explicitFilters?: Record<string, string>,
    incomingHeaders?: Record<string, string>,
    followUpMode?: "local" | "requery",
  ): Promise<BotResponse> {
    await this.initialize();

    const context = await this.sessionManager.getContext(
      message.sessionId,
      message.userId,
    );

    context.history.push({
      role: "user",
      text: message.text,
      timestamp: message.timestamp,
    });

    // Trim conversation history to prevent unbounded memory growth per session
    const MAX_HISTORY = 40;
    if (context.history.length > MAX_HISTORY) {
      context.history = context.history.slice(-MAX_HISTORY);
    }

    // Context-aware query rewriting (pronoun resolution, abbreviation expansion, etc.)
    const rewriteResult = this.queryRewriter.rewrite(message.text, context);
    const processedText = rewriteResult.rewritten;
    if (rewriteResult.rewrites.length > 0) {
      logger.info(
        {
          original: message.text,
          rewritten: processedText,
          rewrites: rewriteResult.rewrites.length,
        },
        "Query rewritten",
      );
    }

    const hasQueryContext = !!(context.lastQueryName && context.lastApiResult);
    const classification = await this.nlpService.classify(
      processedText,
      hasQueryContext,
    );

    // Store entities in context for future pronoun resolution
    if (classification.entities.length > 0) {
      context.lastEntities = classification.entities;
    }

    logger.info(
      {
        intent: classification.intent,
        confidence: classification.confidence,
        entities: classification.entities.map((e) => e.entity),
        source: classification.source,
      },
      "Message classified",
    );

    const response = await this.responseGenerator.generate(
      classification,
      context,
      explicitFilters,
      incomingHeaders,
      followUpMode,
    );

    // Attach recommendations (fire-and-forget, non-blocking)
    try {
      if (!response.richContent || response.richContent.type !== "error") {
        const recs = await this.recommendationEngine.getRecommendations(
          context,
          classification,
          3,
          message.userId,
        );
        if (recs.length > 0) {
          response.recommendations = recs.map((r) => ({
            type: r.type,
            name: r.name,
            reason: r.reason,
          }));
        }
      }
    } catch (error) {
      logger.debug(
        { error },
        "Recommendation engine failed — continuing without",
      );
    }

    context.history.push({
      role: "bot",
      text: response.text,
      timestamp: new Date(),
    });

    await this.sessionManager.saveContext(context, message.userId);

    // Log interaction for learning (fire-and-forget)
    if (this.learningService) {
      try {
        await this.learningService.logInteraction(classification, {
          text: message.text,
          sessionId: message.sessionId,
          feedbackType: message.feedbackType,
          previousMessageText: message.previousMessageText,
        });
      } catch (error) {
        logger.error({ error }, "Learning service logging failed");
      }
    }

    return response;
  }

  /** Returns intent overlap warnings detected during NLP training. */
  async getIntentOverlaps(): Promise<IntentOverlap[]> {
    await this.initialize();
    return this.nlpService.getOverlaps();
  }

  /** Remove a session from the store (called on browser close). */
  async closeSession(sessionId: string, userId?: string): Promise<void> {
    await this.sessionManager.closeSession(sessionId, userId);
  }

  /** Clear the API client's query cache so the next request fetches fresh data. */
  clearQueryCache(): void {
    this.responseGenerator.clearQueryCache();
  }
}
