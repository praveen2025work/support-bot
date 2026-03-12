import type { OnboardPayload } from './schemas';

interface CorpusFile {
  name: string;
  locale: string;
  entities: Record<string, { options: Record<string, string[]> }>;
  data: Array<{
    intent: string;
    utterances: string[];
    answers: string[];
  }>;
}

interface FaqEntry {
  question: string;
  intent: string;
  answer: string;
}

export function generateCorpus(payload: OnboardPayload): CorpusFile {
  const { groupInfo, queries, synonyms } = payload;

  // Build query_name entity options from synonyms
  const queryNameOptions: Record<string, string[]> = {};
  for (const query of queries) {
    const matchingSynonym = synonyms.find((s) => s.query_name === query.name);
    const humanName = query.name.replace(/_/g, ' ');
    const synList = matchingSynonym
      ? matchingSynonym.synonyms
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];
    queryNameOptions[query.name] = [humanName, ...synList];
  }

  // Standard time_period entity
  const timePeriodOptions: Record<string, string[]> = {
    today: ['today', 'current day'],
    this_week: ['this week', 'current week', 'weekly'],
    this_month: ['this month', 'current month', 'monthly'],
    this_quarter: ['this quarter', 'current quarter', 'quarterly'],
    last_week: ['last week', 'previous week'],
    last_month: ['last month', 'previous month'],
    last_quarter: ['last quarter', 'previous quarter'],
  };

  const entities: CorpusFile['entities'] = {
    query_name: { options: queryNameOptions },
    time_period: { options: timePeriodOptions },
  };

  // Detect filter types across all queries
  const allFilters = new Set(
    queries.flatMap((q) =>
      q.filters ? q.filters.split(',').map((f) => f.trim()) : []
    )
  );

  if (allFilters.has('region')) {
    entities['region'] = {
      options: {
        US: ['US', 'United States', 'America', 'USA'],
        EU: ['EU', 'Europe', 'European'],
        APAC: ['APAC', 'Asia Pacific', 'Asia'],
      },
    };
  }
  if (allFilters.has('environment')) {
    entities['environment'] = {
      options: {
        production: ['production', 'prod', 'live'],
        staging: ['staging', 'stage', 'pre-prod'],
        dev: ['dev', 'development', 'local'],
      },
    };
  }
  if (allFilters.has('team')) {
    entities['team'] = {
      options: {
        engineering: ['engineering', 'eng', 'developers'],
        sales: ['sales', 'sales team'],
        marketing: ['marketing', 'mktg'],
        support: ['support', 'customer support'],
      },
    };
  }

  // Build utterances for query.execute
  const executeUtterances = [
    'run the @query_name query',
    'execute @query_name',
    'show me @query_name',
    'get me @query_name results',
    'pull up @query_name',
    'run @query_name for @time_period',
    'show me @query_name for @time_period',
    'run query',
    'execute a query',
  ];
  if (allFilters.has('region')) {
    executeUtterances.push(
      'get @query_name filtered by @region',
      'run @query_name in @region',
      'run @query_name for @time_period in @region'
    );
  }
  if (allFilters.has('environment')) {
    executeUtterances.push(
      'show me @query_name in @environment',
      'get @query_name in @environment',
      'run @query_name for @time_period in @environment'
    );
  }
  if (allFilters.has('team')) {
    executeUtterances.push(
      'run @query_name for @team team',
      'get @query_name for @team'
    );
  }

  const data: CorpusFile['data'] = [
    {
      intent: 'greeting',
      utterances: ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'hi there'],
      answers: [],
    },
    {
      intent: 'query.execute',
      utterances: executeUtterances,
      answers: [],
    },
    {
      intent: 'query.multi',
      utterances: [
        'show me @query_name and @query_name',
        'run @query_name and @query_name together',
        'compare @query_name and @query_name',
        'get @query_name and @query_name data',
        'run multiple queries',
      ],
      answers: [],
    },
    {
      intent: 'query.estimate',
      utterances: [
        'how long will @query_name take',
        'estimate for @query_name',
        'time estimate for @query_name',
        'estimation',
        'how long will this take',
      ],
      answers: [],
    },
    {
      intent: 'query.list',
      utterances: [
        'what queries are available',
        'list all queries',
        'show me available queries',
        'what reports do you have',
        'what data can I access',
        'available queries',
      ],
      answers: [],
    },
    {
      intent: 'url.find',
      utterances: [
        'link for @query_name',
        'URL for @query_name',
        'where is the @query_name page',
        'find me a URL for @query_name',
        'give me the link',
        'show me the URL',
      ],
      answers: [],
    },
    {
      intent: 'help',
      utterances: ['help', 'what can you do', 'how does this work', 'instructions'],
      answers: [],
    },
    {
      intent: 'farewell',
      utterances: ['bye', 'goodbye', 'see you', 'thanks bye', 'that is all', 'I am done'],
      answers: [],
    },
  ];

  return {
    name: `${groupInfo.name} Corpus`,
    locale: 'en-US',
    entities,
    data,
  };
}

export function generateFaq(payload: OnboardPayload): FaqEntry[] {
  return payload.faq.map((row) => ({
    question: row.question,
    intent: row.intent,
    answer: row.answer,
  }));
}
