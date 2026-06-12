import { Router, type Request, type Response } from 'express';
import { getLearningService } from '@/core/learning/learning-service';
import { logger } from '@/lib/logger';

export const feedbackRouter = Router();

feedbackRouter.post('/', async (req: Request, res: Response) => {
  try {
    const { sessionId, messageId, feedbackType, correctionText, groupId, intent, confidence } = req.body;

    if (!sessionId || !feedbackType) {
      return res.status(400).json({ error: 'sessionId and feedbackType are required' });
    }

    const gid = groupId || 'default';
    const learningService = getLearningService(gid);

    // Log as a feedback interaction
    await learningService.logInteraction(
      {
        intent: intent || 'unknown',
        confidence: confidence ?? 0,
        entities: [],
        source: 'nlp' as const,
      },
      {
        text: correctionText || `[feedback:${feedbackType}]`,
        sessionId,
        feedbackType: feedbackType === 'positive' ? 'suggestion_click' : 'rephrase',
        previousMessageText: correctionText,
      }
    );

    logger.info({ sessionId, messageId, feedbackType, groupId: gid }, 'Feedback recorded');

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Failed to record feedback');
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});
