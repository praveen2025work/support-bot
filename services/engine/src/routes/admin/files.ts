import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import multer from 'multer';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';
import { DocumentManager } from '@/core/document-index/document-manager';
import { KNOWLEDGE_DIR } from '@/lib/env-config';

const router = Router();

// Multer config for file uploads (10MB max)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.pdf', '.docx', '.md', '.txt', '.markdown'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}. Allowed: ${allowed.join(', ')}`));
    }
  },
});

// ── List files ──────────────────────────────────────────────────────

router.get('/', requirePermission('files.manage'), async (_req: Request, res: Response) => {
  try {
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    const entries = await fs.readdir(KNOWLEDGE_DIR);
    const files = await Promise.all(
      entries.filter((f) => !f.startsWith('.')).map(async (name) => {
        const filePath = join(KNOWLEDGE_DIR, name);
        const stat = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        return {
          name,
          path: `data/knowledge/${name}`,
          size: stat.size,
          extension: extname(name).slice(1),
          modifiedAt: stat.mtime.toISOString(),
          preview: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
        };
      })
    );
    files.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return res.json({ files, totalFiles: files.length });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Create/update file (JSON body — text content) ───────────────────

router.post('/', requirePermission('files.manage'), async (req: Request, res: Response) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name and content are required' });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
    await fs.writeFile(join(KNOWLEDGE_DIR, safeName), content, 'utf-8');
    logAudit({ action: 'create', resource: 'file', resourceId: safeName, details: { size: content.length }, ip: req.ip });
    return res.json({ success: true, name: safeName });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Upload file (multipart — PDF/DOCX/MD/TXT) with document indexing ─

router.post(
  '/upload',
  requirePermission('files.manage'),
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided. Use field name "file".' });
      }

      const groupId = (req.query.groupId as string) || 'default';
      const docManager = DocumentManager.getInstance(groupId);
      const { meta, extraction } = await docManager.addDocument(
        req.file.buffer,
        req.file.originalname
      );

      logAudit({
        action: 'upload',
        resource: 'file',
        resourceId: meta.filename,
        details: {
          format: meta.format,
          wordCount: meta.wordCount,
          chunkCount: meta.chunkCount,
          pageCount: meta.pageCount,
          groupId,
        },
        ip: req.ip,
      });

      return res.json({
        success: true,
        document: {
          id: meta.id,
          filename: meta.filename,
          format: meta.format,
          wordCount: meta.wordCount,
          chunkCount: meta.chunkCount,
          pageCount: meta.pageCount,
          uploadedAt: meta.uploadedAt,
        },
        message: `Document "${meta.filename}" processed: ${meta.wordCount} words, ${meta.chunkCount} searchable chunks.`,
      });
    } catch (err) {
      return res.status(500).json({ error: String(err) });
    }
  }
);

// ── Index status ────────────────────────────────────────────────────

router.get('/index-status', requirePermission('files.manage'), async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const docManager = DocumentManager.getInstance(groupId);
    const status = await docManager.getIndexStatus();
    return res.json(status);
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Delete file ─────────────────────────────────────────────────────

router.delete('/', requirePermission('files.manage'), async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'name query param is required' });
    await fs.unlink(join(KNOWLEDGE_DIR, name.replace(/[^a-zA-Z0-9._-]/g, '-')));
    logAudit({ action: 'delete', resource: 'file', resourceId: name, ip: req.ip });
    return res.json({ success: true, deleted: name });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

// ── Read file contents ──────────────────────────────────────────────

router.get('/read', requirePermission('files.manage'), async (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'name query param is required' });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const content = await fs.readFile(join(KNOWLEDGE_DIR, safeName), 'utf-8');
    return res.json({ name: safeName, content });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
