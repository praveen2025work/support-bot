import { NextRequest, NextResponse } from 'next/server';
import { parseOnboardingExcel } from '@/lib/onboard/excel-parser';
import { processOnboarding } from '@/lib/onboard/onboard-service';
import { getAllGroupIds } from '@/config/group-config';

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

    // Check for duplicate group ID
    const existingGroups = getAllGroupIds();
    if (existingGroups.includes(parseResult.data.groupInfo.group_id)) {
      return NextResponse.json(
        {
          error: `Group ID "${parseResult.data.groupInfo.group_id}" already exists`,
        },
        { status: 409 }
      );
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

    // Submit mode: write all files
    const result = await processOnboarding(parseResult.data);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Onboarding failed', details: result.errors },
        { status: 500 }
      );
    }

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
