import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getGroupConfig, getAllGroupIds, reloadGroupConfig } from '@/config/group-config';
import { invalidateEngine } from '@/lib/singleton';
import { logger } from '@/lib/logger';

const PROJECT_ROOT = process.cwd();
const GROUPS_JSON_PATH = path.join(PROJECT_ROOT, 'src/config/groups.json');
const TRAINING_GROUPS_DIR = path.join(PROJECT_ROOT, 'src/training/groups');

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const allIds = getAllGroupIds();
  if (!allIds.includes(id)) {
    return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  }

  const config = getGroupConfig(id);
  return NextResponse.json({ id, ...config });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await request.json();
    const groupsRaw = await fs.readFile(GROUPS_JSON_PATH, 'utf-8');
    const groupsData = JSON.parse(groupsRaw);

    if (!groupsData.groups[id]) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = groupsData.groups[id];

    // Update allowed fields
    if (body.name !== undefined) group.name = body.name;
    if (body.description !== undefined) group.description = body.description;
    if (body.sources !== undefined) group.sources = body.sources;
    if (body.apiBaseUrl !== undefined) group.apiBaseUrl = body.apiBaseUrl || null;
    if (body.templates !== undefined) {
      group.templates = body.templates && Object.keys(body.templates).length > 0
        ? body.templates
        : null;
    }

    groupsData.groups[id] = group;
    await fs.writeFile(GROUPS_JSON_PATH, JSON.stringify(groupsData, null, 2), 'utf-8');

    reloadGroupConfig();
    invalidateEngine(id);

    return NextResponse.json({ id, ...group });
  } catch (error) {
    logger.error({ error }, 'Admin PATCH group error');
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (id === 'default') {
    return NextResponse.json({ error: 'Cannot delete the default group' }, { status: 400 });
  }

  try {
    const groupsRaw = await fs.readFile(GROUPS_JSON_PATH, 'utf-8');
    const groupsData = JSON.parse(groupsRaw);

    if (!groupsData.groups[id]) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const group = groupsData.groups[id];

    // Remove group from config
    delete groupsData.groups[id];
    await fs.writeFile(GROUPS_JSON_PATH, JSON.stringify(groupsData, null, 2), 'utf-8');

    // Delete corpus file if exists
    if (group.corpus) {
      const corpusPath = path.join(TRAINING_GROUPS_DIR, group.corpus);
      await fs.unlink(corpusPath).catch(() => {});
    }

    // Delete faq file if exists
    if (group.faq) {
      const faqPath = path.join(TRAINING_GROUPS_DIR, group.faq);
      await fs.unlink(faqPath).catch(() => {});
    }

    invalidateEngine(id);
    reloadGroupConfig();

    return NextResponse.json({ success: true, deletedGroupId: id });
  } catch (error) {
    logger.error({ error }, 'Admin DELETE group error');
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
