import { NextRequest, NextResponse } from 'next/server';
import { getGroupConfig } from '@/config/group-config';
import { ApiClient } from '@/core/api-connector/api-client';
import { QueryService } from '@/core/api-connector/query-service';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const groupId = request.nextUrl.searchParams.get('groupId') || 'default';
    const groupConfig = getGroupConfig(groupId);
    const apiClient = new ApiClient(groupConfig.apiBaseUrl ?? undefined);
    const queryService = new QueryService(apiClient, groupConfig.sources);
    const queries = await queryService.getQueries();

    return NextResponse.json({
      queries: queries.map((q) => ({
        name: q.name,
        description: q.description,
        filters: q.filters || [],
        type: q.type ?? 'api',
      })),
    });
  } catch (error) {
    logger.error({ error }, 'Queries API error');
    return NextResponse.json({ queries: [] }, { status: 500 });
  }
}
