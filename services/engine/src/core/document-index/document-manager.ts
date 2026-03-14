import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { logger } from '@/lib/logger';
import { extractText, type ExtractionResult } from './text-extractor';
import { chunkDocument, type Chunk } from './chunker';
import { TfIdfIndex } from './tfidf-index';
import { paths, KNOWLEDGE_DIR } from '@/lib/env-config';

export interface DocumentMeta {
  id: string;
  filename: string;
  format: string;
  uploadedAt: string;
  chunkCount: number;
  wordCount: number;
  pageCount?: number;
}

interface DocumentRegistry {
  documents: DocumentMeta[];
  updatedAt: string;
}

// Singleton instances per group
const instances = new Map<string, DocumentManager>();

/**
 * DocumentManager orchestrates the full document ingestion pipeline:
 * extract text → chunk → index → persist
 */
export class DocumentManager {
  private registry: DocumentMeta[] = [];
  private index: TfIdfIndex;
  private groupId: string;
  private registryPath: string;
  private loaded = false;

  private constructor(groupId: string) {
    this.groupId = groupId;
    this.registryPath = paths.data.documentsRegistry(groupId);
    this.index = new TfIdfIndex(groupId);
  }

  /** Get or create a singleton instance for a group */
  static getInstance(groupId: string = 'default'): DocumentManager {
    if (!instances.has(groupId)) {
      instances.set(groupId, new DocumentManager(groupId));
    }
    return instances.get(groupId)!;
  }

  /** Ensure registry and index are loaded from disk */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    await this.loadRegistry();
    await this.index.load();
    this.loaded = true;
  }

  /**
   * Ingest a new document: extract text, chunk, index, and persist.
   */
  async addDocument(
    buffer: Buffer,
    filename: string
  ): Promise<{ meta: DocumentMeta; extraction: ExtractionResult }> {
    await this.ensureLoaded();

    const ext = extname(filename);
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const documentId = `doc_${Date.now()}_${safeName.replace(/\.[^.]+$/, '')}`;

    logger.info({ filename: safeName, documentId }, 'Starting document ingestion');

    // 1. Extract text
    const extraction = await extractText(buffer, ext);
    logger.info(
      { documentId, words: extraction.wordCount, format: extraction.format },
      'Text extracted'
    );

    // 2. Save extracted text to knowledge directory
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    const textFilename = safeName.replace(/\.[^.]+$/, '.md');
    await fs.writeFile(join(KNOWLEDGE_DIR, textFilename), extraction.rawText, 'utf-8');

    // 3. Chunk the document
    const chunks = chunkDocument(documentId, extraction.rawText);
    logger.info({ documentId, chunks: chunks.length }, 'Document chunked');

    // 4. Add to TF-IDF index
    this.index.addChunks(chunks);

    // 5. Create metadata entry
    const meta: DocumentMeta = {
      id: documentId,
      filename: safeName,
      format: extraction.format,
      uploadedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      wordCount: extraction.wordCount,
      pageCount: extraction.pageCount,
    };

    // Remove existing entry for same filename (re-upload)
    this.registry = this.registry.filter((d) => d.filename !== safeName);
    this.registry.push(meta);

    // 6. Persist
    await Promise.all([this.saveRegistry(), this.index.save()]);

    logger.info({ documentId, filename: safeName }, 'Document ingestion complete');
    return { meta, extraction };
  }

  /** Remove a document from index and registry */
  async removeDocument(documentId: string): Promise<boolean> {
    await this.ensureLoaded();

    const idx = this.registry.findIndex((d) => d.id === documentId);
    if (idx === -1) return false;

    const doc = this.registry[idx];
    this.registry.splice(idx, 1);
    this.index.removeDocument(documentId);

    await Promise.all([this.saveRegistry(), this.index.save()]);
    logger.info({ documentId, filename: doc.filename }, 'Document removed from index');
    return true;
  }

  /** List all indexed documents */
  async listDocuments(): Promise<DocumentMeta[]> {
    await this.ensureLoaded();
    return [...this.registry];
  }

  /** Search across all indexed documents using BM25 */
  search(query: string, topK: number = 5) {
    return this.index.search(query, topK);
  }

  /** Get the raw TF-IDF index for advanced operations */
  getIndex(): TfIdfIndex {
    return this.index;
  }

  /** Get index stats */
  async getIndexStatus(): Promise<{
    groupId: string;
    documentCount: number;
    chunkCount: number;
    documents: DocumentMeta[];
  }> {
    await this.ensureLoaded();
    return {
      groupId: this.groupId,
      documentCount: this.registry.length,
      chunkCount: this.index.size,
      documents: [...this.registry],
    };
  }

  // ── Persistence helpers ──────────────────────────────────────────

  private async loadRegistry(): Promise<void> {
    try {
      const raw = await fs.readFile(this.registryPath, 'utf-8');
      const data: DocumentRegistry = JSON.parse(raw);
      this.registry = data.documents;
      logger.info(
        { groupId: this.groupId, docs: this.registry.length },
        'Document registry loaded'
      );
    } catch {
      // No registry yet — that's fine
      this.registry = [];
    }
  }

  private async saveRegistry(): Promise<void> {
    const dir = paths.data.groupIndexDir(this.groupId);
    await fs.mkdir(dir, { recursive: true });
    const data: DocumentRegistry = {
      documents: this.registry,
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(this.registryPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}
