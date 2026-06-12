import { NlpService } from "./nlp/nlp-service";
import { ResponseGenerator } from "./response/response-generator";
import { SessionManager } from "./session/session-manager";
import { RecommendationEngine } from "./recommendations/recommendation-engine";
import { QueryRewriter } from "./nlp/query-rewriter";
import { buildDisambiguationPayload } from "./response/smart-suggestions";
import type { LearningService } from "./learning/learning-service";
import { logger } from "@/lib/logger";
import { NLP_DISAMBIG_FLOOR } from "./constants";
import {
  GROUP_BY_PATTERN,
  SORT_PATTERN,
  AGGREGATION_PATTERN,
  TOP_BOTTOM_PATTERN,
  SUMMARY_PATTERN,
  VALUE_COMPARE_PATTERN,
  ANALYSIS_PATTERN,
  COMPUTED_COLUMN_PATTERN,
  PERIOD_OVER_PERIOD_PATTERN,
  AGG_COMPUTED_PATTERN,
  FILTER_FOLLOWUP_PATTERN,
  EXPORT_PATTERN,
  UNDO_PATTERN,
  DRILL_DOWN_PATTERN,
} from "./response/constants";
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

const KEYBOARD_ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function isLikelyKeyboardNoise(text: string): boolean {
  const tokens = text.toLowerCase().match(/[a-z]{4,}/g);
  if (!tokens?.length) return false;

  const noisyTokens = tokens.filter((token) =>
    KEYBOARD_ROWS.some(
      (row) =>
        row.includes(token) || row.split("").reverse().join("").includes(token),
    ),
  );

  return noisyTokens.length / tokens.length >= 0.6;
}

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
      message.groupId,
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

      // A "looks like follow-up" message is one that structurally matches
      // a known data-operation regex (group_by, sort, summary, top_n,
      // filter, analysis, etc.) AND the session has a live query result
      // to operate on. When both are true we ALWAYS prefer follow-up
      // routing over either the disambig short-circuit or the below-floor
      // bail-out, because the regex parser is strict — if it can't pin a
      // column / value, we fall through naturally.
      //
      // Without this, drift in NLP confidence from the learning loop can
      // push a perfectly clear follow-up like "for each feedname" into
      // the [0.4, 0.5) disambig band and surface chips for unrelated
      // queries (e.g. "query.execute:0.46"). That's worse UX than just
      // running the follow-up.
      // Follow-up routing only applies to row-shaped results (CSV /
      // API). When the active context is a document (markdown / PDF
      // body), aggregation and group-by patterns aren't meaningful
      // — those questions get routed to the active-document QA path
      // instead, which actually has the content to answer them.
      const activeContextIsDocument =
        hasQueryContext &&
        typeof (context.lastApiResult as { content?: unknown } | undefined)
          ?.content === "string";

      const looksLikeFollowUp =
        hasQueryContext &&
        !activeContextIsDocument &&
        (GROUP_BY_PATTERN.test(processedText) ||
          SORT_PATTERN.test(processedText) ||
          AGGREGATION_PATTERN.test(processedText) ||
          TOP_BOTTOM_PATTERN.test(processedText) ||
          SUMMARY_PATTERN.test(processedText) ||
          VALUE_COMPARE_PATTERN.test(processedText) ||
          ANALYSIS_PATTERN.test(processedText) ||
          COMPUTED_COLUMN_PATTERN.test(processedText) ||
          PERIOD_OVER_PERIOD_PATTERN.test(processedText) ||
          AGG_COMPUTED_PATTERN.test(processedText) ||
          FILTER_FOLLOWUP_PATTERN.test(processedText) ||
          EXPORT_PATTERN.test(processedText) ||
          UNDO_PATTERN.test(processedText) ||
          DRILL_DOWN_PATTERN.test(processedText));

      // "Ask the active document" bypass — when the user has just loaded
      // a document (e.g. `run incident_report`) and types a free-text
      // question, route through the normal handler so the active-document
      // QA path can score the question against the loaded content. Without
      // this, the below-floor short-circuit eats every such question with
      // "I don't understand" — even though the loaded document has the
      // answer.
      const looksLikeDocQuestion =
        hasQueryContext &&
        typeof (context.lastApiResult as { content?: unknown } | undefined)
          ?.content === "string" &&
        /^\s*(how\s+(many|much|do|does|did|long|often)|what|why|when|where|who|which|count\b|list\b|tell\s+me)\b|\?\s*$/i.test(
          processedText,
        );
      const looksLikeKeyboardNoise = isLikelyKeyboardNoise(processedText);

      // Disambiguation band: NLP top score landed in [NLP_DISAMBIG_FLOOR,
      // NLP_CONFIDENCE_THRESHOLD). Short-circuit before the response generator
      // and return chips instead of guessing the wrong query.
      // Exception: when the message looks like a follow-up on a live
      // result, prefer follow-up routing — the chips would be for unrelated
      // top-level queries (e.g. "query.execute:0.46") that the user
      // definitely doesn't want.
      if (
        classification.disambiguationCandidates?.length &&
        !looksLikeFollowUp &&
        !looksLikeDocQuestion &&
        !looksLikeKeyboardNoise
      ) {
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
          await this.sessionManager.saveContext(
            context,
            message.userId,
            message.groupId,
          );
          return disambigResponse;
        }
      }

      // Below-floor: top score < NLP_DISAMBIG_FLOOR — no candidates worth
      // surfacing. Render the locked "I don't understand" microcopy.
      // Same exception as the disambig path above.
      if (
        classification.intent !== "None" &&
        (classification.confidence < NLP_DISAMBIG_FLOOR ||
          looksLikeKeyboardNoise) &&
        !looksLikeFollowUp &&
        !looksLikeDocQuestion
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
        await this.sessionManager.saveContext(
          context,
          message.userId,
          message.groupId,
        );
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

    await this.sessionManager.saveContext(
      context,
      message.userId,
      message.groupId,
    );

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
  async getContext(sessionId: string, userId?: string, groupId?: string) {
    return this.sessionManager.getContext(sessionId, userId, groupId);
  }

  /** Returns intent overlap warnings detected during NLP training. */
  async getIntentOverlaps(): Promise<IntentOverlap[]> {
    await this.initialize();
    return this.nlpService.getOverlaps();
  }

  /** Remove a session from the store (called on browser close). */
  async closeSession(
    sessionId: string,
    userId?: string,
    groupId?: string,
  ): Promise<void> {
    await this.sessionManager.closeSession(sessionId, userId, groupId);
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
