import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const TEMPLATES_PATH = join(process.cwd(), 'src/core/response/templates.ts');
const GROUPS_PATH = join(process.cwd(), 'src/config/groups.json');

function readGroups() {
  return JSON.parse(readFileSync(GROUPS_PATH, 'utf-8'));
}

function writeGroups(groups: unknown) {
  writeFileSync(GROUPS_PATH, JSON.stringify(groups, null, 2) + '\n', 'utf-8');
}

function parseTemplatesTs(): Record<string, string[]> {
  const content = readFileSync(TEMPLATES_PATH, 'utf-8');
  // Simple parser: extract the object from the TS file
  const match = content.match(/export const responseTemplates[^{]*(\{[\s\S]*\});?\s*$/);
  if (!match) return {};

  try {
    // Convert TS to valid JSON-ish: replace single quotes with double, handle template strings
    const obj = match[1];
    // Use eval-like approach via Function (safe since it's our own file)
    const result: Record<string, string[]> = {};
    const intentRegex = /(\w+)\s*:\s*\[([^\]]*)\]/g;
    let m;
    while ((m = intentRegex.exec(obj)) !== null) {
      const key = m[1];
      const values: string[] = [];
      const strRegex = /'([^']*(?:\\.[^']*)*)'/g;
      let sm;
      while ((sm = strRegex.exec(m[2])) !== null) {
        values.push(sm[1].replace(/\\n/g, '\n').replace(/\\'/g, "'"));
      }
      result[key] = values;
    }
    return result;
  } catch {
    return {};
  }
}

function writeTemplatesTs(templates: Record<string, string[]>) {
  const entries = Object.entries(templates)
    .map(([key, values]) => {
      const valuesStr = values
        .map((v) => `    '${v.replace(/'/g, "\\'").replace(/\n/g, '\\n')}',`)
        .join('\n');
      return `  ${key}: [\n${valuesStr}\n  ],`;
    })
    .join('\n');

  const content = `export const responseTemplates: Record<string, string[]> = {\n${entries}\n};\n`;
  writeFileSync(TEMPLATES_PATH, content, 'utf-8');
}

// GET — list base templates and per-group template overrides
export async function GET() {
  try {
    const baseTemplates = parseTemplatesTs();
    const groupsConfig = readGroups();

    const groupTemplates: Record<string, Record<string, string[]>> = {};
    for (const [gid, config] of Object.entries(groupsConfig.groups || {})) {
      const c = config as { templates?: Record<string, string[]> };
      if (c.templates) {
        groupTemplates[gid] = c.templates;
      }
    }

    return NextResponse.json({ baseTemplates, groupTemplates });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — update a template (base or group-specific)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scope, intent, responses } = body;

    if (!intent || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'intent and responses[] are required' }, { status: 400 });
    }

    if (scope === 'base' || !scope) {
      // Update base templates
      const templates = parseTemplatesTs();
      templates[intent] = responses;
      writeTemplatesTs(templates);
    } else {
      // Update group-specific template
      const groupsConfig = readGroups();
      if (!groupsConfig.groups[scope]) {
        return NextResponse.json({ error: `Group ${scope} not found` }, { status: 404 });
      }
      if (!groupsConfig.groups[scope].templates) {
        groupsConfig.groups[scope].templates = {};
      }
      groupsConfig.groups[scope].templates[intent] = responses;
      writeGroups(groupsConfig);
    }

    return NextResponse.json({ success: true, scope: scope || 'base', intent });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove a template entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'base';
    const intent = searchParams.get('intent');

    if (!intent) {
      return NextResponse.json({ error: 'intent query param is required' }, { status: 400 });
    }

    if (scope === 'base') {
      const templates = parseTemplatesTs();
      delete templates[intent];
      writeTemplatesTs(templates);
    } else {
      const groupsConfig = readGroups();
      if (groupsConfig.groups[scope]?.templates) {
        delete groupsConfig.groups[scope].templates[intent];
        writeGroups(groupsConfig);
      }
    }

    return NextResponse.json({ success: true, deleted: `${scope}:${intent}` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
