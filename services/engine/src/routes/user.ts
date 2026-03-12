import { Router, Request, Response } from 'express';
import { config } from '@/lib/config';
import { logger } from '@/lib/logger';

export const userRouter = Router();

// GET /api/userinfo — proxy to tenant API or return mock data
userRouter.get('/userinfo', async (req: Request, res: Response) => {
  const userInfoUrl = process.env.USER_INFO_URL;

  if (userInfoUrl) {
    // Production: proxy to real AD/Windows Auth endpoint
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      // Forward auth headers from the original request
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization;
      }
      if (req.headers.cookie) {
        headers['Cookie'] = req.headers.cookie;
      }

      const response = await fetch(userInfoUrl, {
        method: 'GET',
        headers,
        credentials: 'include' as RequestCredentials,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        logger.warn({ status: response.status }, 'User info endpoint returned error');
        return res.status(response.status).json({ error: 'Failed to fetch user info' });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error) {
      logger.error({ error }, 'Failed to fetch user info from upstream');
      return res.status(502).json({ error: 'User info service unavailable' });
    }
  }

  // Demo mode: proxy to mock API
  try {
    const mockUrl = `${config.apiBaseUrl.replace(/\/?$/, '/')}userinfo`;
    const response = await fetch(mockUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });

    if (!response.ok) {
      throw new Error(`Mock API returned ${response.status}`);
    }

    const data = await response.json();
    return res.json(data);
  } catch (error) {
    logger.warn({ error }, 'Mock userinfo unavailable, returning fallback');
    // Fallback mock data
    return res.json({
      samAccountName: 'demo_user',
      displayName: 'Demo User',
      emailAddress: 'demo@company.com',
      employeeId: 'DEMO001',
      givenName: 'Demo',
      surname: 'User',
      userName: 'LOCAL\\demo_user',
      department: 'Demo',
      location: 'Local',
      role: 'Developer',
    });
  }
});
