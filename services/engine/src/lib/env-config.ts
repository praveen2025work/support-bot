/**
 * Centralized environment configuration — externalizes ALL hardcoded paths.
 *
 * This module is the **single source of truth** for every file/directory path
 * the engine reads or writes.  When deploying multiple engine instances behind
 * a load balancer (e.g., two servers + NAS/NFS mount), set the environment
 * variables below so every instance points to the same shared storage.
 *
 * Local dev defaults:
 *   DATA_DIR   → <cwd>/data          (learning, audit, logs, indexes, …)
 *   CONFIG_DIR → <cwd>/src/config    (groups.json, settings.json, …)
 *   TRAINING_DIR → <cwd>/src/training (corpus.json, groups/corpus-*.json)
 *   KNOWLEDGE_DIR → <DATA_DIR>/knowledge
 *   DOCS_DIR   → <cwd>/docs
 *
 * Production / multi-instance:
 *   DATA_DIR=/mnt/nas/chatbot/data
 *   CONFIG_DIR=/mnt/nas/chatbot/config
 *   TRAINING_DIR=/mnt/nas/chatbot/training
 *   KNOWLEDGE_DIR=/mnt/nas/chatbot/knowledge   (optional, defaults to DATA_DIR/knowledge)
 *   DOCS_DIR=/mnt/nas/chatbot/docs              (optional)
 *
 * Additional env vars:
 *   INSTANCE_ID        — unique name per instance (for logging / tracing)
 *   DB_JSON_PATH       — mock-api db.json location (already supported)
 *   MOCK_API_DB_PATH   — alias for DB_JSON_PATH
 */

import { join } from 'path';

// ─── Base directories ────────────────────────────────────────────────────────

const CWD = process.cwd();

/** Shared mutable data (logs, learning, audit, indexes, preferences, knowledge) */
export const DATA_DIR = process.env.DATA_DIR || join(CWD, 'data');

/** Config files (groups.json, settings.json, users.json, filter-config.json) */
export const CONFIG_DIR = process.env.CONFIG_DIR || join(CWD, 'src/config');

/** NLP training data (corpus.json, groups/) */
export const TRAINING_DIR = process.env.TRAINING_DIR || join(CWD, 'src/training');

/** Uploaded documents */
export const KNOWLEDGE_DIR = process.env.KNOWLEDGE_DIR || join(DATA_DIR, 'knowledge');

/** OpenAPI / docs */
export const DOCS_DIR = process.env.DOCS_DIR || join(CWD, 'docs');

/** Response templates directory */
export const TEMPLATES_DIR = process.env.TEMPLATES_DIR || join(CWD, 'src/core/response');

/**
 * Base directory for CSV/XLSX/document file paths used by queries.
 * When set, query `filePath` values resolve against this directory instead of engine CWD.
 * Example: FILE_BASE_DIR=/mnt/shared/reports  →  filePath "q1.csv" resolves to /mnt/shared/reports/q1.csv
 * When empty (default), paths resolve relative to the engine directory (backward compatible).
 */
export const FILE_BASE_DIR = process.env.FILE_BASE_DIR || '';

/** Mock API db.json */
export const DB_JSON_PATH = process.env.DB_JSON_PATH || process.env.MOCK_API_DB_PATH || join(CWD, '..', 'mock-api', 'db.json');

// ─── Instance identity ──────────────────────────────────────────────────────

export const INSTANCE_ID = process.env.INSTANCE_ID || `engine-${process.pid}`;

// ─── Derived paths — data ────────────────────────────────────────────────────

export const paths = {
  // ── Data (mutable, shared across instances via NAS) ──────────────────────
  data: {
    root: DATA_DIR,

    /** Per-group learning data: interactions, review queue, auto-learned, signals */
    learningDir: (groupId: string) => join(DATA_DIR, 'learning', groupId),
    interactions: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'interactions.jsonl'),
    reviewQueue: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'review-queue.jsonl'),
    autoLearned: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'auto-learned.jsonl'),
    signalAggregates: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'signal-aggregates.json'),
    coOccurrence: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'co-occurrence.json'),
    autoFaqs: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'auto-faqs.json'),

    /** Audit trail */
    auditDir: join(DATA_DIR, 'audit'),
    auditFile: join(DATA_DIR, 'audit', 'audit.jsonl'),

    /** Conversation logs */
    logsDir: join(DATA_DIR, 'logs'),
    conversationsLog: join(DATA_DIR, 'logs', 'conversations.jsonl'),

    /** User preferences */
    preferencesDir: join(DATA_DIR, 'preferences'),
    userPrefs: (userId: string) => {
      const safe = userId.replace(/[^a-zA-Z0-9_\-]/g, '_');
      return join(DATA_DIR, 'preferences', `${safe}.json`);
    },

    /** Document knowledge base (uploaded files) */
    knowledgeDir: KNOWLEDGE_DIR,
    knowledgeGroupDir: (groupId: string) => join(KNOWLEDGE_DIR, groupId),

    /** TF-IDF / BM25 indexes */
    indexesDir: join(DATA_DIR, 'indexes'),
    groupIndexDir: (groupId: string) => join(DATA_DIR, 'indexes', groupId),
    documentsRegistry: (groupId: string) => join(DATA_DIR, 'indexes', groupId, 'documents.json'),
    tfidfIndex: (groupId: string) => join(DATA_DIR, 'indexes', groupId, 'tfidf-index.json'),
    semanticIndex: (groupId: string) => join(DATA_DIR, 'indexes', groupId, 'semantic-index.json'),

    /** ML recommendation data */
    userInteractions: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'user-interactions.jsonl'),
    collaborativeMatrix: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'collaborative-matrix.json'),
    timePatterns: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'time-patterns.json'),
    userClusters: (groupId: string) => join(DATA_DIR, 'learning', groupId, 'user-clusters.json'),

    /** Anomaly detection */
    anomalyDir: (groupId: string) => join(DATA_DIR, 'anomaly', groupId),
    anomalySnapshots: (groupId: string) => join(DATA_DIR, 'anomaly', groupId, 'snapshots.jsonl'),
    anomalyBaselines: (groupId: string) => join(DATA_DIR, 'anomaly', groupId, 'baselines.json'),
    anomalyConfig: (groupId: string) => join(DATA_DIR, 'anomaly', groupId, 'config.json'),
  },

  // ── Config (can be shared on NAS or kept per-instance for read-only) ─────
  config: {
    root: CONFIG_DIR,
    groups: join(CONFIG_DIR, 'groups.json'),
    settings: join(CONFIG_DIR, 'settings.json'),
    users: join(CONFIG_DIR, 'users.json'),
    filterConfig: join(CONFIG_DIR, 'filter-config.json'),
  },

  // ── Training (NLP corpus files — shared on NAS for multi-instance) ───────
  training: {
    root: TRAINING_DIR,
    corpus: join(TRAINING_DIR, 'corpus.json'),
    groupsDir: join(TRAINING_DIR, 'groups'),
    groupCorpus: (groupId: string) => join(TRAINING_DIR, 'groups', `corpus-${groupId}.json`),
    groupFaq: (groupId: string, faqFile: string) => join(TRAINING_DIR, 'groups', faqFile),
  },

  // ── Templates ─────────────────────────────────────────────────────────────
  templates: {
    file: join(TEMPLATES_DIR, 'templates.ts'),
  },

  // ── Docs ──────────────────────────────────────────────────────────────────
  docs: {
    openapi: join(DOCS_DIR, 'openapi.yaml'),
  },

  // ── Mock API ──────────────────────────────────────────────────────────────
  mockApi: {
    dbJson: DB_JSON_PATH,
  },
} as const;
