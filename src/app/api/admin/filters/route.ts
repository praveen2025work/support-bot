import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

const FILTER_CONFIG_PATH = path.join(process.cwd(), 'src/config/filter-config.json');

interface FilterOption {
  value: string;
  label: string;
}

interface FilterConfig {
  label: string;
  type: 'select' | 'text' | 'boolean';
  options: FilterOption[];
  placeholder: string | null;
  dateFormat?: string;
}

interface FilterConfigFile {
  filters: Record<string, FilterConfig>;
}

async function readFilterConfig(): Promise<FilterConfigFile> {
  const raw = await fs.readFile(FILTER_CONFIG_PATH, 'utf-8');
  return JSON.parse(raw);
}

async function writeFilterConfig(data: FilterConfigFile): Promise<void> {
  await fs.writeFile(FILTER_CONFIG_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// GET: Return all filter configs
export async function GET() {
  try {
    const data = await readFilterConfig();
    return NextResponse.json(data);
  } catch (error) {
    logger.error({ error }, 'Failed to read filter config');
    return NextResponse.json({ filters: {} }, { status: 500 });
  }
}

// POST: Add or update a filter config
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, label, type, options, placeholder, dateFormat } = body;

    if (!key || !label || !type) {
      return NextResponse.json(
        { error: 'key, label, and type are required' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(key)) {
      return NextResponse.json(
        { error: 'key must be lowercase alphanumeric with underscores only' },
        { status: 400 }
      );
    }

    if (type !== 'select' && type !== 'text' && type !== 'boolean') {
      return NextResponse.json(
        { error: 'type must be "select", "text", or "boolean"' },
        { status: 400 }
      );
    }

    const data = await readFilterConfig();

    const filterEntry: FilterConfig = {
      label,
      type,
      options: type === 'select' ? (options || []) : [],
      placeholder: type === 'text' ? (placeholder || `Enter ${key}...`) : null,
    };
    if (dateFormat) {
      filterEntry.dateFormat = dateFormat;
    }
    data.filters[key] = filterEntry;

    await writeFilterConfig(data);

    return NextResponse.json({ key, ...data.filters[key] });
  } catch (error) {
    logger.error({ error }, 'Failed to save filter config');
    return NextResponse.json({ error: 'Failed to save filter config' }, { status: 500 });
  }
}

// DELETE: Remove a filter config
export async function DELETE(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get('key');
    if (!key) {
      return NextResponse.json({ error: 'key query param is required' }, { status: 400 });
    }

    const data = await readFilterConfig();

    if (!data.filters[key]) {
      return NextResponse.json({ error: 'Filter not found' }, { status: 404 });
    }

    delete data.filters[key];
    await writeFilterConfig(data);

    return NextResponse.json({ success: true, deletedKey: key });
  } catch (error) {
    logger.error({ error }, 'Failed to delete filter config');
    return NextResponse.json({ error: 'Failed to delete filter config' }, { status: 500 });
  }
}
