import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync, mkdirSync } from 'fs';
import { join, extname } from 'path';
import { logAudit } from '@/lib/audit-logger';
import { requirePermission } from '@/middleware/rbac';

const router = Router();

const PROJECT_ROOT = process.cwd();
const KNOWLEDGE_DIR = join(PROJECT_ROOT, 'data/knowledge');

router.get('/', requirePermission('files.manage'), (_req: Request, res: Response) => {
  try {
    if (!existsSync(KNOWLEDGE_DIR)) mkdirSync(KNOWLEDGE_DIR, { recursive: true });
    const files = readdirSync(KNOWLEDGE_DIR).filter((f) => !f.startsWith('.')).map((name) => {
      const filePath = join(KNOWLEDGE_DIR, name);
      const stat = statSync(filePath);
      const content = readFileSync(filePath, 'utf-8');
      return { name, path: `data/knowledge/${name}`, size: stat.size, extension: extname(name).slice(1), modifiedAt: stat.mtime.toISOString(), preview: content.substring(0, 200) + (content.length > 200 ? '...' : '') };
    }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return res.json({ files, totalFiles: files.length });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

router.post('/', requirePermission('files.manage'), (req: Request, res: Response) => {
  try {
    const { name, content } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'name and content are required' });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    writeFileSync(join(KNOWLEDGE_DIR, safeName), content, 'utf-8');
    logAudit({ action: 'create', resource: 'file', resourceId: safeName, details: { size: content.length }, ip: req.ip });
    return res.json({ success: true, name: safeName });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

router.delete('/', requirePermission('files.manage'), (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'name query param is required' });
    unlinkSync(join(KNOWLEDGE_DIR, name.replace(/[^a-zA-Z0-9._-]/g, '-')));
    logAudit({ action: 'delete', resource: 'file', resourceId: name, ip: req.ip });
    return res.json({ success: true, deleted: name });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

router.get('/read', requirePermission('files.manage'), (req: Request, res: Response) => {
  try {
    const name = req.query.name as string;
    if (!name) return res.status(400).json({ error: 'name query param is required' });
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const content = readFileSync(join(KNOWLEDGE_DIR, safeName), 'utf-8');
    return res.json({ name: safeName, content });
  } catch (err) { return res.status(500).json({ error: String(err) }); }
});

export default router;
