import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const SETTINGS_PATH = join(process.cwd(), 'src/config/settings.json');

const DEFAULT_SETTINGS = {
  nlpConfidenceThreshold: 0.65,
  fuzzyConfidenceThreshold: 0.5,
  sessionTtlMinutes: 30,
  apiCacheTtlMinutes: 5,
  apiBaseUrl: '',
  mockApiUrl: 'http://localhost:8080',
  enabledPlatforms: ['web', 'widget'],
};

function readSettings() {
  if (!existsSync(SETTINGS_PATH)) {
    return DEFAULT_SETTINGS;
  }
  try {
    return JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8'));
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings: unknown) {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}

export async function GET() {
  return NextResponse.json({ config: readSettings() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const settings = { ...readSettings(), ...body };
    writeSettings(settings);
    return NextResponse.json({ success: true, config: settings });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
