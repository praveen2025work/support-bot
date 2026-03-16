import { Router, Request, Response } from 'express';
import { logger } from '@/lib/logger';

const router = Router();

// Teams Bot Framework webhook
router.post('/messages', async (req: Request, res: Response) => {
  const activity = req.body;

  // Only handle message activities
  if (activity.type !== 'message' || !activity.text) {
    res.status(200).json({ type: 'message', text: '' });
    return;
  }

  logger.info({
    from: activity.from?.name,
    text: activity.text,
    conversationId: activity.conversation?.id,
  }, 'Teams message received');

  try {
    // Strip bot mention from text
    const cleanText = activity.text.replace(/<at>.*?<\/at>/g, '').trim();

    const engineRes = await fetch(`http://localhost:${process.env.PORT || 4001}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: cleanText || 'help',
        sessionId: `teams_${activity.conversation?.id}_${activity.from?.id}`,
        platform: 'teams',
        groupId: 'default',
        userName: activity.from?.name,
      }),
    });

    if (engineRes.ok) {
      const result = await engineRes.json();

      // Reply via Bot Framework
      const serviceUrl = activity.serviceUrl;
      const conversationId = activity.conversation?.id;

      if (serviceUrl && conversationId && process.env.TEAMS_APP_PASSWORD) {
        try {
          // Get access token
          const tokenRes = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'client_credentials',
              client_id: process.env.TEAMS_APP_ID || '',
              client_secret: process.env.TEAMS_APP_PASSWORD || '',
              scope: 'https://api.botframework.com/.default',
            }),
          });

          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            await fetch(`${serviceUrl}v3/conversations/${conversationId}/activities`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenData.access_token}`,
              },
              body: JSON.stringify({
                type: 'message',
                text: result.text,
                replyToId: activity.id,
              }),
            });
          }
        } catch (replyError) {
          logger.error({ error: replyError }, 'Failed to reply via Teams Bot Framework');
        }
      }

      res.status(200).json({ type: 'message', text: result.text });
    } else {
      res.status(200).json({ type: 'message', text: 'I encountered an error processing your request.' });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to process Teams message');
    res.status(200).json({ type: 'message', text: 'Bot engine is temporarily unavailable.' });
  }
});

export { router as teamsRouter };
