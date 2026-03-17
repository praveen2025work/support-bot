import { NextRequest, NextResponse } from 'next/server';
import { proxyToEngine } from '@/lib/engine-proxy';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/queries/columns
 * Executes a query via the engine chat endpoint and returns discovered column names.
 * Body: { queryName: string, groupId?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { queryName, groupId } = await request.json();
    if (!queryName) {
      return NextResponse.json({ error: 'queryName is required' }, { status: 400 });
    }

    const engineRes = await proxyToEngine('/api/chat', {
      method: 'POST',
      body: {
        text: `run ${queryName}`,
        sessionId: `admin-column-discovery-${Date.now()}`,
        ...(groupId && { groupId }),
      },
    });

    if (!engineRes.ok) {
      return NextResponse.json({ error: 'Engine query execution failed' }, { status: 502 });
    }

    const data = await engineRes.json();
    const richContent = data.richContent;
    let columns: string[] = [];

    if (richContent?.type === 'query_result' && richContent.data?.data?.length > 0) {
      columns = Object.keys(richContent.data.data[0]);
    } else if (richContent?.type === 'csv_table' && richContent.data?.headers?.length > 0) {
      columns = richContent.data.headers;
    } else if (richContent?.type === 'csv_group_by' && richContent.data?.groups?.length > 0) {
      const group = richContent.data.groups[0];
      columns = [richContent.data.groupColumn, ...Object.keys(group.aggregations || {})];
    } else if (richContent?.data?.data?.length > 0) {
      columns = Object.keys(richContent.data.data[0]);
    }

    return NextResponse.json({ columns });
  } catch (error) {
    logger.error({ error }, 'Column discovery failed');
    return NextResponse.json({ error: 'Column discovery failed' }, { status: 500 });
  }
}
