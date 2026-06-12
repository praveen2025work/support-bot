import { Router, Request, Response } from 'express';
import { logger } from '@/lib/logger';

const router = Router();

// Connected SSE clients
const clients = new Set<Response>();

// Broadcast an event to all connected clients
export function broadcastEvent(event: string, data: unknown): void {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    try {
      client.write(message);
    } catch {
      clients.delete(client);
    }
  }
}

// SSE endpoint
router.get('/', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  // Send initial keepalive
  res.write('event: connected\ndata: {"status":"ok"}\n\n');

  clients.add(res);
  logger.debug({ clientCount: clients.size }, 'SSE client connected');

  // Keepalive every 30s
  const keepalive = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch {
      clearInterval(keepalive);
      clients.delete(res);
    }
  }, 30000);

  req.on('close', () => {
    clearInterval(keepalive);
    clients.delete(res);
    logger.debug({ clientCount: clients.size }, 'SSE client disconnected');
  });
});

export { router as eventsRouter };
