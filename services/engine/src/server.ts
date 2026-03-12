import 'module-alias/register';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { chatRouter } from './routes/chat';
import { adminRouter } from './routes/admin';
import { queriesRouter } from './routes/queries';
import { statsRouter } from './routes/stats';
import { healthRouter } from './routes/health';
import { userRouter } from './routes/user';
import { logger } from './lib/logger';

const app = express();
const PORT = parseInt(process.env.ENGINE_PORT || '4000', 10);

// Middleware
app.use(cors({
  origin: process.env.UI_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many admin requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request logging
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Request');
  next();
});

// Routes
app.use('/api/chat', chatLimiter, chatRouter);
app.use('/api/admin', adminLimiter, adminRouter);
app.use('/api', queriesRouter);
app.use('/api/stats', statsRouter);
app.use('/api', healthRouter);
app.use('/api', userRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Engine server running at http://localhost:${PORT}`);
  console.log(`Engine server running at http://localhost:${PORT}`);
});

export default app;
