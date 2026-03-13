import { NextRequest, NextResponse } from 'next/server';
import { parseOnboardingExcel } from '@/lib/onboard/excel-parser';
import { proxyToEngine } from '@/lib/engine-proxy';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const action = formData.get('action') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!file.name.endsWith('.xlsx')) {
      return NextResponse.json(
        { error: 'File must be .xlsx format' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const parseResult = parseOnboardingExcel(buffer);

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: 'Validation failed', details: parseResult.errors },
        { status: 422 }
      );
    }

    // Check for duplicate group ID by querying the engine
    const groupsRes = await proxyToEngine('/api/groups');
    if (groupsRes.ok) {
      const groupsData = await groupsRes.json();
      const existingIds = (groupsData.groups || []).map((g: { id: string }) => g.id);
      if (existingIds.includes(parseResult.data.groupInfo.group_id)) {
        return NextResponse.json(
          {
            error: `Group ID "${parseResult.data.groupInfo.group_id}" already exists`,
          },
          { status: 409 }
        );
      }
    }

    // Preview mode: return parsed data without writing
    if (action === 'preview') {
      return NextResponse.json({
        valid: true,
        data: {
          groupInfo: parseResult.data.groupInfo,
          queries: parseResult.data.queries,
          synonyms: parseResult.data.synonyms,
          faq: parseResult.data.faq,
        },
      });
    }

    // Submit mode: proxy to engine's group create endpoint
    const engineRes = await proxyToEngine('/api/admin/groups/create', {
      method: 'POST',
      body: {
        groupId: parseResult.data.groupInfo.group_id,
        name: parseResult.data.groupInfo.name,
        description: parseResult.data.groupInfo.description || '',
        sources: parseResult.data.groupInfo.sources
          ? parseResult.data.groupInfo.sources.split(',').map((s: string) => s.trim())
          : [],
        queries: parseResult.data.queries,
        faq: parseResult.data.faq,
      },
    });

    if (!engineRes.ok) {
      const errorData = await engineRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error || 'Onboarding failed', details: errorData.details },
        { status: engineRes.status }
      );
    }

    const result = await engineRes.json();
    return NextResponse.json({
      success: true,
      groupId: result.groupId,
      queriesAdded: result.queriesAdded,
      message: `Group "${result.groupId}" onboarded successfully with ${result.queriesAdded} queries.`,
    });
  } catch (error) {
    console.error('Onboard API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
