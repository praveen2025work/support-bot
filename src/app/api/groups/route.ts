import { NextResponse } from 'next/server';
import { getGroupConfigs } from '@/config/group-config';

export async function GET() {
  const configs = getGroupConfigs();
  const groups = Object.entries(configs).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
  }));
  return NextResponse.json({ groups });
}
