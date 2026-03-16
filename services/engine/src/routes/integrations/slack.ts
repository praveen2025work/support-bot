import { Router, Request, Response } from 'express';
import { logger } from '@/lib/logger';

const router = Router();

// Slack Events API - URL verification + message handling
router.post('/events', async (req: Request, res: Response) => {
  const body = req.body;

  // URL verification challenge
  if (body.type === 'url_verification') {
    res.json({ challenge: body.challenge });
    return;
  }

  // Event callback
  if (body.type === 'event_callback') {
    const event = body.event;

    // Only handle messages (not bot messages)
    if (event.type === 'message' && !event.bot_id && event.text) {
      logger.info({ channel: event.channel, user: event.user, text: event.text }, 'Slack message received');

      try {
        // Forward to chat engine
        const engineRes = await fetch(`http://localhost:${process.env.PORT || 4001}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: event.text,
            sessionId: `slack_${event.channel}_${event.user}`,
            platform: 'slack',
            groupId: 'default',
          }),
        });

        if (engineRes.ok) {
          const result = await engineRes.json();

          // Post reply back to Slack
          const slackToken = process.env.SLACK_BOT_TOKEN;
          if (slackToken) {
            await fetch('https://slack.com/api/chat.postMessage', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${slackToken}`,
              },
              body: JSON.stringify({
                channel: event.channel,
                text: result.text,
                thread_ts: event.thread_ts || event.ts,
              }),
            });
          }
        }
      } catch (error) {
        logger.error({ error }, 'Failed to process Slack message');
      }
    }
  }

  // Always respond 200 quickly to Slack
  res.status(200).send();
});

// Slack slash command handler
router.post('/command', async (req: Request, res: Response) => {
  const { text, user_id, channel_id, command } = req.body;
  logger.info({ command, text, user_id }, 'Slack slash command received');

  try {
    const engineRes = await fetch(`http://localhost:${process.env.PORT || 4001}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text || 'help',
        sessionId: `slack_${channel_id}_${user_id}`,
        platform: 'slack',
        groupId: 'default',
      }),
    });

    if (engineRes.ok) {
      const result = await engineRes.json();
      res.json({
        response_type: 'ephemeral',
        text: result.text,
      });
    } else {
      res.json({ response_type: 'ephemeral', text: 'Sorry, I encountered an error. Please try again.' });
    }
  } catch {
    res.json({ response_type: 'ephemeral', text: 'Bot engine is not available. Please try again later.' });
  }
});

export { router as slackRouter };
