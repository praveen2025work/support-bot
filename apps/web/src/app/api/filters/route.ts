import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const FILTER_CONFIG_PATH = path.join(process.cwd(), 'src/config/filter-config.json');

// Public endpoint: returns filter configs for the chat UI
export async function GET() {
  try {
    const raw = await fs.readFile(FILTER_CONFIG_PATH, 'utf-8');
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ filters: {} });
  }
}
