import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CORPUS_PATH = join(process.cwd(), 'src/training/corpus.json');

function readCorpus() {
  const raw = readFileSync(CORPUS_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeCorpus(corpus: unknown) {
  writeFileSync(CORPUS_PATH, JSON.stringify(corpus, null, 2) + '\n', 'utf-8');
}

// GET — list all entities
export async function GET() {
  try {
    const corpus = readCorpus();
    return NextResponse.json({ entities: corpus.entities || {} });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — add/update an entity option (e.g., add synonyms for a query_name)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, optionKey, synonyms } = body;

    if (!entityType || !optionKey || !Array.isArray(synonyms)) {
      return NextResponse.json({ error: 'entityType, optionKey, and synonyms[] are required' }, { status: 400 });
    }

    const corpus = readCorpus();
    if (!corpus.entities) corpus.entities = {};
    if (!corpus.entities[entityType]) corpus.entities[entityType] = { options: {} };

    corpus.entities[entityType].options[optionKey] = synonyms;
    writeCorpus(corpus);

    return NextResponse.json({ success: true, entityType, optionKey });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove an entity option
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const optionKey = searchParams.get('optionKey');

    if (!entityType || !optionKey) {
      return NextResponse.json({ error: 'entityType and optionKey query params are required' }, { status: 400 });
    }

    const corpus = readCorpus();
    if (corpus.entities?.[entityType]?.options) {
      delete corpus.entities[entityType].options[optionKey];
    }
    writeCorpus(corpus);

    return NextResponse.json({ success: true, deleted: `${entityType}.${optionKey}` });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
