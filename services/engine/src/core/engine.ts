import { NlpService } from "./nlp/nlp-service";
import { ResponseGenerator } from "./response/response-generator";
import { SessionManager } from "./session/session-manager";
import { RecommendationEngine } from "./recommendations/recommendation-engine";
import { QueryRewriter } from "./nlp/query-rewriter";
import { buildDisambiguationPayload } from "./response/smart-suggestions";
import type { LearningService } from "./learning/learning-service";
import { logger } from "@/lib/logger";
import { NLP_DISAMBIG_FLOOR } from "./constants";
import type { Query } from "./api-connector/types";
import type {
  BotResponse,
  ChatMessage,
  ClassificationResult,
  IntentOverlap,
} from "./types";

/**
 * Locked microcopy for the below-floor "I don't understand" path.
 * Used when the NLP top score is < NLP_DISAMBIG_FLOOR (no candidates worth surfacing).
 */
const BELOW_FLOOR_TEXT =
  "I don't understand that one — try rephrasing or browse the query catalog.";

/** Minimal high-confidence value used when synthesizing a forced-intent classification. */
const FORCE_INTENT_CONFIDENCE = 1.0;

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
    forceIntent?: string,
  ): Promise<BotResponse> {
    await this.initialize();

    const context = await this.sessionManager.getContext(
      message.sessionId,
      message.userId,
    );

    logger.debug(
      {
        sessionId: message.sessionId,
        hasLastApiResult: !!context.lastApiResult,
        lastQueryName: context.lastQueryName,
        text: message.text,
        forceIntent,
      },
      "processMessage context state",
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

    // forceIntent: chip-click came from a "Did you mean?" disambiguation.
    // Skip NLP and synthesize a high-confidence ClassificationResult that
    // points the response generator at the chosen query. The chat route
    // is responsible for validating the intent is permitted for the user's
    // group before this method is invoked.
    let classification: ClassificationResult;
    let processedText: string;
    if (forceIntent) {
      processedText = message.text;
      classification = this.synthesizeForcedClassification(forceIntent);
      logger.info(
        { forceIntent, sessionId: message.sessionId },
        "Bypassing NLP — forceIntent path",
      );
    } else {
      // Context-aware query rewriting (pronoun resolution, abbreviation expansion, etc.)
      const rewriteResult = this.queryRewriter.rewrite(message.text, context);
      processedText = rewriteResult.rewritten;
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

      const hasQueryContext = !!(
        context.lastQueryName && context.lastApiResult
      );
      classification = await this.nlpService.classify(
        processedText,
        hasQueryContext,
      );

      // Disambiguation band: NLP top score landed in [NLP_DISAMBIG_FLOOR,
      // NLP_CONFIDENCE_THRESHOLD). Short-circuit before the response generator
      // and return chips instead of guessing the wrong query.
      if (classification.disambiguationCandidates?.length) {
        const disambigResponse = await this.buildDisambiguationResponse(
          message,
          classification,
        );
        if (disambigResponse) {
          context.history.push({
            role: "bot",
            text: disambigResponse.text,
            timestamp: new Date(),
          });
          await this.sessionManager.saveContext(context, message.userId);
          return disambigResponse;
        }
      }

      // Below-floor: top score < NLP_DISAMBIG_FLOOR — no candidates worth
      // surfacing. Render the locked "I don't understand" microcopy.
      if (
        classification.intent !== "None" &&
        classification.confidence < NLP_DISAMBIG_FLOOR
      ) {
        const belowFloor = this.buildBelowFloorResponse(
          message,
          classification,
        );
        context.history.push({
          role: "bot",
          text: belowFloor.text,
          timestamp: new Date(),
        });
        await this.sessionManager.saveContext(context, message.userId);
        return belowFloor;
      }
    }

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

    // Fetch recommendations before generating response so they can influence suggestions
    let recommendations: Awaited<
      ReturnType<RecommendationEngine["getRecommendations"]>
    > = [];
    try {
      if (!(context.lastApiResult === undefined && !context.lastQueryName)) {
        recommendations = await this.recommendationEngine.getRecommendations(
          context,
          classification,
          3,
          message.userId,
        );
      }
    } catch (error) {
      logger.debug(
        { error },
        "Recommendation engine failed — continuing without",
      );
    }

    const response = await this.responseGenerator.generate(
      classification,
      context,
      explicitFilters,
      incomingHeaders,
      followUpMode,
      recommendations,
    );

    // Attach recommendations metadata to the response
    if (recommendations.length > 0) {
      response.recommendations = recommendations.map((r) => ({
        type: r.type,
        name: r.name,
        reason: r.reason,
      }));
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

  /** Get the conversation context for a session (used by chat route for card-level overrides). */
  async getContext(sessionId: string, userId?: string) {
    return this.sessionManager.getContext(sessionId, userId);
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

  /**
   * Look up a query by exact name (case-insensitive) within the engine's
   * group. Used by the chat route to validate `forceIntent` before bypassing
   * NLP — if the query isn't in the user's group, the route returns 400.
   *
   * Returns the canonical Query record (with full definition) when found,
   * or null when not. Throws only on infrastructure failure (DB unreachable),
   * never on "not found" — those are normal outcomes the caller handles.
   */
  async findQueryByName(name: string): Promise<{ name: string } | null> {
    const queryService = this.responseGenerator.getQueryService();
    const all = await queryService.getQueries();
    const match = all.find((q) => q.name.toLowerCase() === name.toLowerCase());
    return match ? { name: match.name } : null;
  }

  /**
   * Synthesize a confident ClassificationResult that points the response
   * generator at a forced query. Used when `forceIntent` is supplied (chip
   * click). The chat route guarantees the queryName has already been
   * validated against the user's group, so the response generator can
   * trust the entity.
   */
  private synthesizeForcedClassification(
    queryName: string,
  ): ClassificationResult {
    return {
      intent: "query.execute",
      confidence: FORCE_INTENT_CONFIDENCE,
      entities: [
        {
          entity: "query_name",
          value: queryName,
          start: 0,
          end: queryName.length,
        },
      ],
      source: "ensemble",
    };
  }

  /**
   * Build a BotResponse for the disambiguation-band path. Enriches the
   * classification's `disambiguationCandidates` with the user's group
   * query catalog (filters out queries the user can't run, attaches
   * descriptions for chip secondary text), and returns a response with
   * a `disambiguation` payload the UI renders as chips.
   *
   * Returns `null` when no candidates survive group filtering — caller
   * should fall through to the below-floor microcopy.
   */
  private async buildDisambiguationResponse(
    message: ChatMessage,
    classification: ClassificationResult,
  ): Promise<BotResponse | null> {
    let availableQueries: Query[] = [];
    try {
      availableQueries = await this.responseGenerator
        .getQueryService()
        .getQueries();
    } catch (err) {
      logger.warn(
        { err, sessionId: message.sessionId },
        "Failed to fetch group queries for disambiguation enrichment — continuing with raw candidates",
      );
    }

    const payload = buildDisambiguationPayload({
      candidates: classification.disambiguationCandidates ?? [],
      availableQueries,
    });

    if (!payload) return null;

    return {
      text: payload.headline,
      sessionId: message.sessionId,
      intent: "disambiguation",
      confidence: classification.confidence,
      disambiguation: payload,
    };
  }

  /**
   * Build the locked "I don't understand" response for the below-floor
   * path (top score < NLP_DISAMBIG_FLOOR). Microcopy is fixed by the
   * design doc; the UI may render a "browse queries" CTA alongside.
   */
  private buildBelowFloorResponse(
    message: ChatMessage,
    classification: ClassificationResult,
  ): BotResponse {
    return {
      text: BELOW_FLOOR_TEXT,
      sessionId: message.sessionId,
      intent: "disambiguation.no_match",
      confidence: classification.confidence,
    };
  }
}
