import { NextRequest, NextResponse } from 'next/server';
import { processOnboarding } from '@/lib/onboard/onboard-service';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { groupId, name, description, sources, apiBaseUrl, greeting, helpText, queries, faq } = body;

    if (!groupId || !name) {
      return NextResponse.json(
        { error: 'groupId and name are required' },
        { status: 400 }
      );
    }

    // Validate groupId format
    if (!/^[a-z0-9_]+$/.test(groupId)) {
      return NextResponse.json(
        { error: 'groupId must be lowercase alphanumeric with underscores only' },
        { status: 400 }
      );
    }

    // Build OnboardPayload from manual form data
    const payload = {
      groupInfo: {
        group_id: groupId,
        name,
        description: description || '',
        sources: (sources || []).join(', '),
        greeting: greeting || '',
        help_text: helpText || '',
      },
      queries: (queries || []).map((q: {
        name: string;
        description: string;
        source: string;
        url: string;
        estimated_duration: number;
        filters: string;
      }) => ({
        name: q.name,
        description: q.description || '',
        source: q.source || '',
        url: q.url || '',
        estimated_duration: q.estimated_duration || 2000,
        filters: q.filters || '',
      })),
      synonyms: [],
      faq: (faq || []).map((f: { question: string; intent: string; answer: string }) => ({
        question: f.question,
        intent: f.intent || 'faq',
        answer: f.answer,
      })),
    };

    const result = await processOnboarding(payload);

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors?.[0] || 'Failed to create group', details: result.errors },
        { status: 400 }
      );
    }

    // If apiBaseUrl was provided, update groups.json to include it
    if (apiBaseUrl) {
      const { promises: fs } = await import('fs');
      const path = await import('path');
      const GROUPS_JSON_PATH = path.join(process.cwd(), 'src/config/groups.json');
      const groupsRaw = await fs.readFile(GROUPS_JSON_PATH, 'utf-8');
      const groupsData = JSON.parse(groupsRaw);
      if (groupsData.groups[groupId]) {
        groupsData.groups[groupId].apiBaseUrl = apiBaseUrl;
        await fs.writeFile(GROUPS_JSON_PATH, JSON.stringify(groupsData, null, 2), 'utf-8');
        const { reloadGroupConfig } = await import('@/config/group-config');
        reloadGroupConfig();
      }
    }

    return NextResponse.json({
      success: true,
      groupId: result.groupId,
      queriesAdded: result.queriesAdded,
    }, { status: 201 });
  } catch (error) {
    logger.error({ error }, 'Manual group creation error');
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}
