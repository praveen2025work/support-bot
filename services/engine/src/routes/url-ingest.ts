import { Router, type Request, type Response } from 'express';
import { parseUrl } from '@/core/document-index/url-parser';
import { logger } from '@/lib/logger';

export const urlIngestRouter = Router();

urlIngestRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { url, groupId } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    // Basic URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    const gid = groupId || 'default';
    const parsed = await parseUrl(url);

    logger.info({ url, groupId: gid, wordCount: parsed.wordCount }, 'URL ingested');

    res.json({
      success: true,
      url: parsed.url,
      title: parsed.title,
      wordCount: parsed.wordCount,
      fetchedAt: parsed.fetchedAt,
      textPreview: parsed.rawText.substring(0, 500),
    });
  } catch (err) {
    logger.error({ err, url: req.body?.url }, 'URL ingestion failed');
    res.status(500).json({ error: 'Failed to fetch and parse URL' });
  }
});
