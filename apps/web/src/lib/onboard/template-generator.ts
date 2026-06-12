// XLSX is lazy-loaded (~700KB) — only needed when generating an onboarding template
export async function generateTemplate() {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  // Sheet 1: Group Info (single row expected)
  const groupInfoData = [
    ['group_id', 'name', 'description', 'sources', 'greeting', 'help_text'],
    [
      'my_team',
      'My Team Bot',
      'Handles my team queries',
      'my_source',
      'Hello! I am the My Team Bot. How can I help?',
      'I can help with:\n- Query A reports\n- Query B analytics',
    ],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(groupInfoData);
  ws1['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 35 },
    { wch: 20 },
    { wch: 45 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, 'Group Info');

  // Sheet 2: Queries
  const queriesData = [
    ['name', 'description', 'source', 'estimated_duration', 'url', 'filters'],
    [
      'sales_report',
      'Weekly sales breakdown by region',
      'my_source',
      2500,
      'https://dashboard.example.com/sales',
      'date_range,region',
    ],
    [
      'team_metrics',
      'Team performance metrics and KPIs',
      'my_source',
      1800,
      'https://dashboard.example.com/team',
      'date_range,team',
    ],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(queriesData);
  ws2['!cols'] = [
    { wch: 20 },
    { wch: 40 },
    { wch: 15 },
    { wch: 20 },
    { wch: 45 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, 'Queries');

  // Sheet 3: Synonyms
  const synonymsData = [
    ['query_name', 'synonyms'],
    ['sales_report', 'sales data, weekly sales, sales numbers, revenue report'],
    ['team_metrics', 'team performance, team KPIs, how is the team doing'],
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(synonymsData);
  ws3['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws3, 'Synonyms');

  // Sheet 4: FAQ
  const faqData = [
    ['question', 'intent', 'answer'],
    [
      'How do I see sales data?',
      'query.execute',
      'Just type "run sales report" and I will fetch it for you.',
    ],
    [
      'What reports are available?',
      'query.list',
      'Type "list queries" to see all available reports.',
    ],
  ];
  const ws4 = XLSX.utils.aoa_to_sheet(faqData);
  ws4['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'FAQ');

  // Sheet 5: Instructions
  const instructionsData = [
    ['Sheet', 'Field', 'Description', 'Required', 'Format'],
    ['Group Info', 'group_id', 'Unique identifier for your group', 'Yes', 'snake_case (e.g. my_team)'],
    ['Group Info', 'name', 'Display name for the bot', 'Yes', 'Free text'],
    ['Group Info', 'description', 'Short description shown in UI', 'Yes', 'Free text'],
    ['Group Info', 'sources', 'Data source tags for query filtering', 'Yes', 'Comma-separated'],
    ['Group Info', 'greeting', 'Custom bot greeting message', 'No', 'Free text'],
    ['Group Info', 'help_text', 'Custom help message content', 'No', 'Free text (use \\n for newlines)'],
    ['Queries', 'name', 'Query identifier', 'Yes', 'snake_case'],
    ['Queries', 'description', 'What the query does', 'Yes', 'Free text'],
    ['Queries', 'source', 'Source tag (must match Group Info sources)', 'Yes', 'Single value'],
    ['Queries', 'estimated_duration', 'Expected run time in milliseconds', 'Yes', 'Number (e.g. 2500)'],
    ['Queries', 'url', 'Dashboard URL for this query', 'Yes', 'Valid URL'],
    ['Queries', 'filters', 'Supported filter parameters', 'No', 'Comma-separated (date_range,region,team,environment)'],
    ['Synonyms', 'query_name', 'Must match a name from Queries sheet', 'Yes', 'snake_case'],
    ['Synonyms', 'synonyms', 'Alternative names users might say', 'Yes', 'Comma-separated'],
    ['FAQ', 'question', 'Example user question', 'Yes', 'Free text'],
    ['FAQ', 'intent', 'Intent to map to', 'Yes', 'e.g. query.execute, query.list, help'],
    ['FAQ', 'answer', 'Bot response for fuzzy match', 'Yes', 'Free text'],
  ];
  const ws5 = XLSX.utils.aoa_to_sheet(instructionsData);
  ws5['!cols'] = [
    { wch: 15 },
    { wch: 20 },
    { wch: 45 },
    { wch: 10 },
    { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, ws5, 'Instructions');

  return wb;
}
