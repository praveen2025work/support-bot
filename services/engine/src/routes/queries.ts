import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { getGroupConfig, getGroupConfigs } from '@/config/group-config';
import { ApiClient } from '@/core/api-connector/api-client';
import { paths } from '@/lib/env-config';
import { QueryService } from '@/core/api-connector/query-service';
import { logger } from '@/lib/logger';

export const queriesRouter = Router();

// GET /api/queries — list queries for a group
queriesRouter.get('/queries', async (req: Request, res: Response) => {
  try {
    const groupId = (req.query.groupId as string) || 'default';
    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(apiClient, groupConfig.sources);
    const queries = await queryService.getQueries();

    return res.json({
      queries: queries.map((q) => ({
        name: q.name,
        description: q.description,
        filters: q.filters || [],
        type: q.type ?? 'api',
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Queries API error');
    return res.status(500).json({ queries: [] });
  }
});

// GET /api/filters — return filter config for chat UI
queriesRouter.get('/filters', async (_req: Request, res: Response) => {
  try {
    const configPath = paths.config.filterConfig;
    const raw = await fs.readFile(configPath, 'utf-8');
    const data = JSON.parse(raw);
    return res.json(data);
  } catch {
    return res.json({ filters: {} });
  }
});

// GET /api/groups — list all groups
queriesRouter.get('/groups', (_req: Request, res: Response) => {
  const configs = getGroupConfigs();
  const groups = Object.entries(configs).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
  }));
  return res.json({ groups });
});
