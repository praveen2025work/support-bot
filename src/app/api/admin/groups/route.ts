import { NextResponse } from 'next/server';
import { getGroupConfigs } from '@/config/group-config';

export async function GET() {
  try {
    const configs = getGroupConfigs();
    const groups = Object.entries(configs).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      sources: config.sources,
      apiBaseUrl: config.apiBaseUrl,
      hasCorpus: !!config.corpus,
      hasFaq: !!config.faq,
      hasTemplates: !!config.templates,
    }));

    return NextResponse.json({ groups });
  } catch {
    return NextResponse.json({ groups: [] }, { status: 500 });
  }
}
