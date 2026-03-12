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

// GET — list all intents with their training phrases and entity info
export async function GET() {
  try {
    const corpus = readCorpus();
    const intents = (corpus.data || []).map((item: { intent: string; utterances: string[]; answers?: string[] }) => ({
      intent: item.intent,
      utterances: item.utterances,
      answers: item.answers || [],
      utteranceCount: item.utterances.length,
    }));

    const entities = corpus.entities || {};

    return NextResponse.json({ intents, entities });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST — add a new intent or update an existing one
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { intent, utterances, answers } = body;

    if (!intent || !utterances || !Array.isArray(utterances)) {
      return NextResponse.json({ error: 'intent and utterances[] are required' }, { status: 400 });
    }

    const corpus = readCorpus();
    const existing = corpus.data.findIndex((item: { intent: string }) => item.intent === intent);

    if (existing >= 0) {
      // Update existing
      corpus.data[existing].utterances = utterances;
      if (answers) corpus.data[existing].answers = answers;
    } else {
      // Add new
      corpus.data.push({
        intent,
        utterances,
        answers: answers || [],
      });
    }

    writeCorpus(corpus);
    return NextResponse.json({ success: true, intent });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE — remove an intent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const intent = searchParams.get('intent');

    if (!intent) {
      return NextResponse.json({ error: 'intent query param is required' }, { status: 400 });
    }

    const corpus = readCorpus();
    corpus.data = corpus.data.filter((item: { intent: string }) => item.intent !== intent);
    writeCorpus(corpus);

    return NextResponse.json({ success: true, deleted: intent });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
