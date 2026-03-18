const jsonServer = require('json-server');
const server = jsonServer.create();
const path = require('path');
const router = jsonServer.router(path.join(__dirname, 'db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Request logging
server.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// === Dedicated endpoint demos ===

// Path variable demo: GET|POST /api/users/:userId/profile
function handleUserProfile(req, res) {
  const userId = req.params.userId;
  console.log(`[Path Variable] ${req.method} /api/users/${userId}/profile`);

  const profiles = {
    '101': { user_id: '101', name: 'Alice Johnson', email: 'alice@example.com', role: 'Engineering Manager', department: 'Engineering', location: 'San Francisco', joined: '2023-04-15' },
    '102': { user_id: '102', name: 'Bob Smith', email: 'bob@example.com', role: 'Senior Developer', department: 'Engineering', location: 'New York', joined: '2022-11-20' },
    '103': { user_id: '103', name: 'Carol Lee', email: 'carol@example.com', role: 'Product Manager', department: 'Product', location: 'Austin', joined: '2024-01-10' },
    '104': { user_id: '104', name: 'David Chen', email: 'david@example.com', role: 'DevOps Engineer', department: 'Infrastructure', location: 'Seattle', joined: '2023-08-05' },
  };

  const profile = profiles[userId];
  if (!profile) {
    return res.json({
      data: [{ user_id: userId, name: 'Unknown User', email: `user${userId}@example.com`, role: 'Member', department: 'General', location: 'Remote', joined: '2025-01-01' }],
      rowCount: 1,
      executionTime: Math.floor(Math.random() * 200),
    });
  }

  res.json({
    data: [profile],
    rowCount: 1,
    executionTime: Math.floor(Math.random() * 200),
  });
}
server.get('/api/users/:userId/profile', handleUserProfile);
server.post('/api/users/:userId/profile', handleUserProfile);

// Query param demo: GET|POST /api/logs
function handleLogs(req, res) {
  const { service, level, limit: maxResults } = req.query;
  console.log(`[Query Params] ${req.method} /api/logs?service=${service}&level=${level}&limit=${maxResults}`);

  const allLogs = [
    { timestamp: '2026-03-11T10:15:32Z', service: 'auth-service', level: 'error', message: 'Token validation failed for expired session', trace_id: 'abc-123' },
    { timestamp: '2026-03-11T10:14:21Z', service: 'auth-service', level: 'warn', message: 'Rate limit approaching for IP 192.168.1.50', trace_id: 'abc-124' },
    { timestamp: '2026-03-11T10:13:05Z', service: 'auth-service', level: 'info', message: 'User login successful: user_101', trace_id: 'abc-125' },
    { timestamp: '2026-03-11T10:12:44Z', service: 'payment-service', level: 'error', message: 'Payment gateway timeout after 30s', trace_id: 'def-201' },
    { timestamp: '2026-03-11T10:12:30Z', service: 'payment-service', level: 'info', message: 'Payment processed: $142.50 for order #8823', trace_id: 'def-202' },
    { timestamp: '2026-03-11T10:11:15Z', service: 'api-gateway', level: 'warn', message: 'High latency detected on /v2/users endpoint: 890ms', trace_id: 'ghi-301' },
    { timestamp: '2026-03-11T10:10:58Z', service: 'api-gateway', level: 'error', message: 'Circuit breaker tripped for search-service', trace_id: 'ghi-302' },
    { timestamp: '2026-03-11T10:10:01Z', service: 'api-gateway', level: 'info', message: 'Route refresh completed, 47 routes active', trace_id: 'ghi-303' },
    { timestamp: '2026-03-11T10:09:45Z', service: 'search-service', level: 'error', message: 'Elasticsearch cluster health yellow: 2 unassigned shards', trace_id: 'jkl-401' },
    { timestamp: '2026-03-11T10:09:12Z', service: 'search-service', level: 'info', message: 'Index rebuild completed in 12.4s', trace_id: 'jkl-402' },
  ];

  let filtered = allLogs;
  if (service) {
    filtered = filtered.filter((l) => l.service === service);
  }
  if (level) {
    filtered = filtered.filter((l) => l.level === level);
  }
  const cap = maxResults ? parseInt(maxResults, 10) : filtered.length;
  filtered = filtered.slice(0, cap);

  res.json({
    data: filtered,
    rowCount: filtered.length,
    executionTime: Math.floor(Math.random() * 500),
  });
}
server.get('/api/logs', handleLogs);
server.post('/api/logs', handleLogs);

// Request body demo: POST /api/reports/generate
server.post('/api/reports/generate', (req, res) => {
  const { filters } = req.body;
  const reportType = filters?.report_type || 'summary';
  const dateRange = filters?.date_range || 'this_month';
  const format = filters?.format || 'table';
  console.log(`[Request Body] POST /api/reports/generate body:`, JSON.stringify(filters));

  const reports = {
    summary: [
      { metric: 'Total Revenue', value: '$1,245,000', change: '+8.2%', period: dateRange },
      { metric: 'Active Users', value: '49,200', change: '+5.1%', period: dateRange },
      { metric: 'Error Rate', value: '0.12%', change: '-0.03%', period: dateRange },
      { metric: 'Avg Response Time', value: '145ms', change: '-12ms', period: dateRange },
      { metric: 'Customer Satisfaction', value: '4.6/5', change: '+0.2', period: dateRange },
    ],
    revenue: [
      { month: 'January', product: 'Platform', revenue: 325000, cost: 89000, profit: 236000 },
      { month: 'February', product: 'Platform', revenue: 358000, cost: 92000, profit: 266000 },
      { month: 'March', product: 'Platform', revenue: 412000, cost: 95000, profit: 317000 },
      { month: 'January', product: 'API', revenue: 67000, cost: 12000, profit: 55000 },
      { month: 'February', product: 'API', revenue: 72000, cost: 13000, profit: 59000 },
      { month: 'March', product: 'API', revenue: 81000, cost: 14000, profit: 67000 },
    ],
    incidents: [
      { date: '2026-03-01', severity: 'P1', service: 'payment-service', duration: '45m', resolved: true },
      { date: '2026-03-05', severity: 'P2', service: 'search-service', duration: '22m', resolved: true },
      { date: '2026-03-08', severity: 'P3', service: 'auth-service', duration: '15m', resolved: true },
      { date: '2026-03-10', severity: 'P2', service: 'api-gateway', duration: '38m', resolved: false },
    ],
  };

  const data = reports[reportType] || reports.summary;

  res.json({
    data,
    rowCount: data.length,
    executionTime: Math.floor(Math.random() * 2000),
    metadata: { reportType, dateRange, format },
  });
});

// === Finance endpoints ===

// Path variable: /finance/revenue/:region  (region as path var, date_range in body)
function handleFinanceRevenue(req, res) {
  const region = req.params.region;
  const filters = { ...(req.body.filters || {}), ...req.query };
  if (region && !region.startsWith('{')) filters.region = region;
  console.log(`[Finance] ${req.method} /api/finance/revenue/${region || 'all'} filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('monthly_revenue'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 3200) });
}
server.get('/api/finance/revenue/:region', handleFinanceRevenue);
server.post('/api/finance/revenue/:region', handleFinanceRevenue);
server.get('/api/finance/revenue', handleFinanceRevenue);
server.post('/api/finance/revenue', handleFinanceRevenue);

// Quarterly revenue
function handleQuarterlyRevenue(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Finance] ${req.method} /api/finance/quarterly-revenue filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('quarterly_revenue'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2000) });
}
server.get('/api/finance/quarterly-revenue', handleQuarterlyRevenue);
server.post('/api/finance/quarterly-revenue', handleQuarterlyRevenue);

// Revenue by segment
function handleRevenueBySegment(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Finance] ${req.method} /api/finance/revenue/segments filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('revenue_by_segment'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1800) });
}
server.get('/api/finance/revenue/segments', handleRevenueBySegment);
server.post('/api/finance/revenue/segments', handleRevenueBySegment);

// Gross margin
function handleGrossMargin(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Finance] ${req.method} /api/finance/gross-margin filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('gross_margin'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1500) });
}
server.get('/api/finance/gross-margin', handleGrossMargin);
server.post('/api/finance/gross-margin', handleGrossMargin);

// P&L Summary
function handlePnlSummary(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Finance] ${req.method} /api/finance/pnl filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('pnl_summary'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2500) });
}
server.get('/api/finance/pnl', handlePnlSummary);
server.post('/api/finance/pnl', handlePnlSummary);

// === Analytics endpoints ===

// Query param: /analytics/users/active  (date_range as query_param)
function handleActiveUsers(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Analytics] ${req.method} /api/analytics/users/active filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('active_users'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1500) });
}
server.get('/api/analytics/users/active', handleActiveUsers);
server.post('/api/analytics/users/active', handleActiveUsers);

// Body: /analytics/churn  (date_range in body)
function handleChurn(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Analytics] ${req.method} /api/analytics/churn filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('customer_churn'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 4500) });
}
server.get('/api/analytics/churn', handleChurn);
server.post('/api/analytics/churn', handleChurn);

// === Monitoring/Engineering endpoints ===

// Path variable: /monitoring/:environment/errors  (environment as path var)
function handleErrors(req, res) {
  const environment = req.params.environment;
  const filters = { ...(req.body.filters || {}), ...req.query };
  if (environment && !environment.startsWith('{')) filters.environment = environment;
  console.log(`[Monitoring] ${req.method} /api/monitoring/${environment || 'all'}/errors filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('error_rate'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 800) });
}
server.get('/api/monitoring/:environment/errors', handleErrors);
server.post('/api/monitoring/:environment/errors', handleErrors);
server.get('/api/monitoring/errors', handleErrors);
server.post('/api/monitoring/errors', handleErrors);

// Query param: /monitoring/performance  (environment as query_param)
function handlePerformance(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Monitoring] ${req.method} /api/monitoring/performance filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('performance'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2100) });
}
server.get('/api/monitoring/performance', handlePerformance);
server.post('/api/monitoring/performance', handlePerformance);

// === Commerce endpoints ===

// Path variable: /commerce/orders/:region  (region as path var, date_range in body)
function handleOrders(req, res) {
  const region = req.params.region;
  const filters = { ...(req.body.filters || {}), ...req.query };
  if (region && !region.startsWith('{')) filters.region = region;
  console.log(`[Commerce] ${req.method} /api/commerce/orders/${region || 'all'} filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('daily_orders'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1200) });
}
server.get('/api/commerce/orders/:region', handleOrders);
server.post('/api/commerce/orders/:region', handleOrders);
server.get('/api/commerce/orders', handleOrders);
server.post('/api/commerce/orders', handleOrders);

// === Infrastructure endpoints ===

// Path variable: /infra/costs/:environment  (environment as path var)
function handleInfraCosts(req, res) {
  const environment = req.params.environment;
  const filters = { ...(req.body.filters || {}), ...req.query };
  if (environment && !environment.startsWith('{')) filters.environment = environment;
  console.log(`[Infra] ${req.method} /api/infra/costs/${environment || 'all'} filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('infrastructure_costs'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2800) });
}
server.get('/api/infra/costs/:environment', handleInfraCosts);
server.post('/api/infra/costs/:environment', handleInfraCosts);
server.get('/api/infra/costs', handleInfraCosts);
server.post('/api/infra/costs', handleInfraCosts);

// === HR endpoints ===

// Query param: /hr/headcount  (team as query_param, date_range in body)
function handleHeadcount(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[HR] ${req.method} /api/hr/headcount filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('headcount'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2000) });
}
server.get('/api/hr/headcount', handleHeadcount);
server.post('/api/hr/headcount', handleHeadcount);

// Body: /hr/hiring/pipeline  (date_range in body)
function handleHiring(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[HR] ${req.method} /api/hr/hiring/pipeline filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('hiring_pipeline'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1500) });
}
server.get('/api/hr/hiring/pipeline', handleHiring);
server.post('/api/hr/hiring/pipeline', handleHiring);

// Mock query execution endpoint: POST /api/queries/:id/execute
server.post('/api/queries/:id/execute', (req, res) => {
  const db = router.db;
  const query = db.get('queries').find({ id: req.params.id }).value();

  if (!query) {
    return res.status(404).json({ error: 'Query not found' });
  }

  // Merge filters from body and query params (supports both binding types)
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`Executing query: ${query.name}, filters:`, JSON.stringify(filters));

  const data = applyFilters(getRawData(query.name), filters);

  res.json({
    data,
    rowCount: data.length,
    executionTime: Math.floor(Math.random() * query.estimatedDuration),
  });
});

// Batch execution endpoint: POST /api/queries/batch
server.post('/api/queries/batch', (req, res) => {
  const db = router.db;
  const { queries: queryIds, filters } = req.body;

  if (!queryIds || !Array.isArray(queryIds)) {
    return res.status(400).json({ error: 'queries array is required' });
  }

  const startTime = Date.now();
  const results = [];

  for (const qId of queryIds) {
    const query = db.get('queries').find({ id: qId }).value();
    if (query) {
      const data = applyFilters(getRawData(query.name), filters || {});
      results.push({
        queryId: query.id,
        queryName: query.name,
        data,
        rowCount: data.length,
        executionTime: Math.floor(Math.random() * query.estimatedDuration),
      });
    }
  }

  res.json({
    results,
    totalExecutionTime: Date.now() - startTime,
  });
});

// Stats endpoints
server.post('/api/stats', (req, res) => {
  const db = router.db;
  const stat = {
    id: `stat_${Date.now()}`,
    ...req.body,
    recordedAt: new Date().toISOString(),
  };
  db.get('queryStats').push(stat).write();
  res.status(201).json(stat);
});

server.get('/api/stats', (req, res) => {
  const db = router.db;
  let stats = db.get('queryStats').value() || [];

  const { queryName, since } = req.query;
  if (queryName) {
    stats = stats.filter((s) => s.queryName === queryName);
  }
  if (since) {
    stats = stats.filter((s) => s.timestamp >= since);
  }

  // Compute aggregated metrics per query
  const byQuery = {};
  for (const s of stats) {
    if (!byQuery[s.queryName]) {
      byQuery[s.queryName] = { durations: [], successes: 0, failures: 0 };
    }
    const bucket = byQuery[s.queryName];
    if (s.durationMs != null) bucket.durations.push(s.durationMs);
    if (s.success) bucket.successes++;
    else bucket.failures++;
  }

  const aggregated = Object.entries(byQuery).map(([name, b]) => {
    const sorted = [...b.durations].sort((a, c) => a - c);
    const len = sorted.length;
    return {
      queryName: name,
      totalExecutions: b.successes + b.failures,
      successCount: b.successes,
      failureCount: b.failures,
      failureRate: len > 0 ? ((b.failures / (b.successes + b.failures)) * 100).toFixed(1) + '%' : '0%',
      avgDurationMs: len > 0 ? Math.round(sorted.reduce((a, c) => a + c, 0) / len) : 0,
      p50Ms: len > 0 ? sorted[Math.floor(len * 0.5)] : 0,
      p95Ms: len > 0 ? sorted[Math.floor(len * 0.95)] : 0,
    };
  });

  res.json({ stats, aggregated, totalRecords: stats.length });
});

// === User Info endpoint (mock Active Directory data) ===
server.get('/api/userinfo', (req, res) => {
  console.log(`[UserInfo] GET /api/userinfo`);
  res.json({
    samAccountName: 'jdoe',
    displayName: 'John Doe',
    emailAddress: 'john.doe@company.com',
    employeeId: 'EMP001',
    givenName: 'John',
    surname: 'Doe',
    userName: 'DOMAIN\\jdoe',
    department: 'Engineering',
    location: 'San Francisco',
    role: 'Senior Engineer',
  });
});

// === BAM Token Mock Endpoint ===
server.post('/api/bam/token', (req, res) => {
  console.log('[BAM Auth] Token request received');
  res.json({
    code: 'success',
    message: 'success',
    bamToken: 'mock-bam-token-' + Date.now(),
    redirectURL: 'http://localhost:8080/api',
  });
});

// Reload db.json into json-server's in-memory database.
// Called by the Engine/UI after admin creates/updates/deletes queries.
server.post('/api/reload', (req, res) => {
  try {
    const fs = require('fs');
    const dbPath = path.join(__dirname, 'db.json');
    const freshData = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    // Replace json-server's in-memory db with fresh disk data
    router.db.setState(freshData);
    console.log(`[${new Date().toISOString()}] db.json reloaded — ${(freshData.queries || []).length} queries`);
    res.json({ success: true, queries: (freshData.queries || []).length });
  } catch (err) {
    console.error('Failed to reload db.json:', err.message);
    res.status(500).json({ error: 'Failed to reload db.json' });
  }
});

// Serve queries under /api/queries
server.use('/api', router);

function applyFilters(data, filters) {
  let result = data;

  if (filters.region) {
    result = result.filter(
      (row) => !row.region || row.region.toLowerCase() === filters.region.toLowerCase()
    );
  }
  if (filters.team) {
    result = result.filter(
      (row) => !row.team || row.team.toLowerCase() === filters.team.toLowerCase()
    );
  }
  if (filters.environment) {
    result = result.filter(
      (row) => !row.environment || row.environment.toLowerCase() === filters.environment.toLowerCase()
    );
  }
  // Handle resolved date ranges (time_period_start/end or date_range_start/end)
  const startDate = filters.time_period_start || filters.date_range_start;
  const endDate = filters.time_period_end || filters.date_range_end;
  if (startDate && endDate) {
    console.log(`  resolved date range: ${startDate} to ${endDate}`);
    result = result.filter((row) => {
      // Standard date field comparison
      if (row.date) return row.date >= startDate && row.date <= endDate;
      // Cohort field (e.g., "Jan 2026") — convert to month range and compare
      if (row.cohort) {
        const cohortDate = new Date(row.cohort + ' 1');
        if (!isNaN(cohortDate.getTime())) {
          const cohortMonth = cohortDate.toISOString().slice(0, 7); // "YYYY-MM"
          const startMonth = startDate.slice(0, 7);
          const endMonth = endDate.slice(0, 7);
          return cohortMonth >= startMonth && cohortMonth <= endMonth;
        }
      }
      // Month field (e.g., "January") — compare by month name
      if (row.month) {
        const monthNames = ['january','february','march','april','may','june','july','august','september','october','november','december'];
        const rowMonthIdx = monthNames.indexOf(row.month.toLowerCase());
        const startMonthIdx = parseInt(startDate.slice(5, 7), 10) - 1;
        const endMonthIdx = parseInt(endDate.slice(5, 7), 10) - 1;
        if (rowMonthIdx >= 0) return rowMonthIdx >= startMonthIdx && rowMonthIdx <= endMonthIdx;
      }
      return true;
    });
  } else if (filters.time_period || filters.date_range) {
    const period = filters.time_period || filters.date_range;
    console.log(`  unresolved date preset: ${period}`);
    // Try direct cohort/month matching for unresolved presets (e.g., "jan_2026")
    const monthMatch = period.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[_\s]?(\d{4})$/i);
    if (monthMatch) {
      const shortMonth = monthMatch[1].toLowerCase();
      const year = monthMatch[2];
      const monthMap = { jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec' };
      const monthFullMap = { jan: 'January', feb: 'February', mar: 'March', apr: 'April', may: 'May', jun: 'June', jul: 'July', aug: 'August', sep: 'September', oct: 'October', nov: 'November', dec: 'December' };
      const cohortPrefix = `${monthMap[shortMonth]} ${year}`;
      const fullMonth = monthFullMap[shortMonth];
      console.log(`  matching cohort/month: ${cohortPrefix} / ${fullMonth}`);
      result = result.filter((row) => {
        if (row.cohort) return row.cohort === cohortPrefix;
        if (row.month) return row.month.toLowerCase() === fullMonth.toLowerCase();
        return true;
      });
    }
  }
  if (filters.severity) {
    result = result.filter(
      (row) => !row.severity || row.severity.toLowerCase() === filters.severity.toLowerCase()
    );
  }

  return result;
}

function getRawData(queryName) {
  switch (queryName) {
    case 'monthly_revenue':
      return [
        { month: 'January', product: 'Platform', region: 'US', revenue: 125000 },
        { month: 'January', product: 'Platform', region: 'EU', revenue: 89000 },
        { month: 'February', product: 'Platform', region: 'US', revenue: 132000 },
        { month: 'February', product: 'Platform', region: 'EU', revenue: 94000 },
        { month: 'March', product: 'Platform', region: 'US', revenue: 141000 },
        { month: 'March', product: 'API', region: 'US', revenue: 67000 },
      ];
    case 'active_users':
      return [
        { date: '2026-02-24', daily_active: 14200, monthly_active: 46800, retention: '70%' },
        { date: '2026-02-25', daily_active: 14580, monthly_active: 46900, retention: '70%' },
        { date: '2026-02-26', daily_active: 14900, monthly_active: 47100, retention: '71%' },
        { date: '2026-02-27', daily_active: 15100, monthly_active: 47300, retention: '71%' },
        { date: '2026-02-28', daily_active: 14700, monthly_active: 47500, retention: '71%' },
        { date: '2026-03-01', daily_active: 15420, monthly_active: 48300, retention: '72%' },
        { date: '2026-03-02', daily_active: 14890, monthly_active: 48150, retention: '71%' },
        { date: '2026-03-03', daily_active: 16100, monthly_active: 48500, retention: '73%' },
        { date: '2026-03-04', daily_active: 15750, monthly_active: 48400, retention: '72%' },
        { date: '2026-03-05', daily_active: 13200, monthly_active: 48100, retention: '70%' },
        { date: '2026-03-06', daily_active: 15800, monthly_active: 48600, retention: '72%' },
        { date: '2026-03-07', daily_active: 16200, monthly_active: 48800, retention: '73%' },
        { date: '2026-03-08', daily_active: 14100, monthly_active: 48500, retention: '71%' },
        { date: '2026-03-09', daily_active: 13800, monthly_active: 48200, retention: '70%' },
        { date: '2026-03-10', daily_active: 16500, monthly_active: 49000, retention: '73%' },
        { date: '2026-03-11', daily_active: 16800, monthly_active: 49200, retention: '74%' },
      ];
    case 'error_rate':
      return [
        { service: 'auth-service', endpoint: '/login', errors: 23, total: 15000, rate: '0.15%' },
        { service: 'payment-service', endpoint: '/charge', errors: 8, total: 5200, rate: '0.15%' },
        { service: 'api-gateway', endpoint: '/v2/users', errors: 45, total: 82000, rate: '0.05%' },
        { service: 'search-service', endpoint: '/search', errors: 12, total: 34000, rate: '0.04%' },
      ];
    case 'performance':
      return [
        { service: 'api-gateway', p50: '45ms', p95: '120ms', p99: '340ms', throughput: '2.3k rps' },
        { service: 'auth-service', p50: '32ms', p95: '85ms', p99: '210ms', throughput: '800 rps' },
        { service: 'search-service', p50: '78ms', p95: '250ms', p99: '890ms', throughput: '1.1k rps' },
      ];
    case 'daily_orders':
      return [
        { date: '2026-02-24', orders: 1050, avg_value: '$81.20', region: 'US', fulfilled: 1040, pending: 10 },
        { date: '2026-02-25', orders: 1120, avg_value: '$83.40', region: 'US', fulfilled: 1120, pending: 0 },
        { date: '2026-02-26', orders: 1080, avg_value: '$82.10', region: 'EU', fulfilled: 1070, pending: 10 },
        { date: '2026-02-27', orders: 1150, avg_value: '$85.60', region: 'EU', fulfilled: 1150, pending: 0 },
        { date: '2026-02-28', orders: 1200, avg_value: '$86.30', region: 'APAC', fulfilled: 1190, pending: 10 },
        { date: '2026-03-01', orders: 1180, avg_value: '$84.50', region: 'US', fulfilled: 1170, pending: 10 },
        { date: '2026-03-02', orders: 1090, avg_value: '$82.80', region: 'US', fulfilled: 1090, pending: 0 },
        { date: '2026-03-03', orders: 1260, avg_value: '$88.20', region: 'EU', fulfilled: 1250, pending: 10 },
        { date: '2026-03-04', orders: 1310, avg_value: '$90.10', region: 'EU', fulfilled: 1300, pending: 10 },
        { date: '2026-03-05', orders: 1050, avg_value: '$80.50', region: 'APAC', fulfilled: 1050, pending: 0 },
        { date: '2026-03-06', orders: 1280, avg_value: '$89.30', region: 'US', fulfilled: 1265, pending: 15 },
        { date: '2026-03-07', orders: 1340, avg_value: '$91.50', region: 'US', fulfilled: 1330, pending: 10 },
        { date: '2026-03-08', orders: 998, avg_value: '$79.90', region: 'EU', fulfilled: 998, pending: 0 },
        { date: '2026-03-09', orders: 1189, avg_value: '$84.10', region: 'APAC', fulfilled: 1189, pending: 0 },
        { date: '2026-03-10', orders: 1312, avg_value: '$92.30', region: 'US', fulfilled: 1300, pending: 12 },
        { date: '2026-03-11', orders: 1245, avg_value: '$87.50', region: 'US', fulfilled: 1180, pending: 65 },
      ];
    case 'customer_churn':
      return [
        { cohort: 'Jan 2026', total: 5200, churned: 312, rate: '6.0%' },
        { cohort: 'Feb 2026', total: 5800, churned: 290, rate: '5.0%' },
        { cohort: 'Mar 2026', total: 6100, churned: 244, rate: '4.0%' },
      ];
    case 'infrastructure_costs':
      return [
        { service: 'EC2', environment: 'production', monthly_cost: '$12,450' },
        { service: 'RDS', environment: 'production', monthly_cost: '$4,200' },
        { service: 'S3', environment: 'production', monthly_cost: '$1,800' },
        { service: 'Lambda', environment: 'production', monthly_cost: '$950' },
        { service: 'EC2', environment: 'staging', monthly_cost: '$3,100' },
      ];
    case 'headcount':
      return [
        { department: 'Engineering', location: 'US', team: 'engineering', count: 45 },
        { department: 'Engineering', location: 'EU', team: 'engineering', count: 22 },
        { department: 'Sales', location: 'US', team: 'sales', count: 30 },
        { department: 'Marketing', location: 'US', team: 'marketing', count: 15 },
        { department: 'Support', location: 'EU', team: 'support', count: 18 },
      ];
    case 'hiring_pipeline':
      return [
        { role: 'Senior Engineer', applicants: 120, screened: 45, interviewed: 12, offers: 3 },
        { role: 'Product Manager', applicants: 85, screened: 30, interviewed: 8, offers: 2 },
        { role: 'Designer', applicants: 60, screened: 20, interviewed: 6, offers: 1 },
      ];
    case 'quarterly_revenue':
      return [
        { quarter: 'Q1 2025', region: 'US', revenue: 3250000, growth: '8.2%' },
        { quarter: 'Q1 2025', region: 'EU', revenue: 1850000, growth: '6.5%' },
        { quarter: 'Q1 2025', region: 'APAC', revenue: 920000, growth: '12.1%' },
        { quarter: 'Q2 2025', region: 'US', revenue: 3480000, growth: '7.1%' },
        { quarter: 'Q2 2025', region: 'EU', revenue: 1920000, growth: '3.8%' },
        { quarter: 'Q2 2025', region: 'APAC', revenue: 1050000, growth: '14.1%' },
        { quarter: 'Q3 2025', region: 'US', revenue: 3710000, growth: '6.6%' },
        { quarter: 'Q3 2025', region: 'EU', revenue: 2010000, growth: '4.7%' },
        { quarter: 'Q3 2025', region: 'APAC', revenue: 1180000, growth: '12.4%' },
        { quarter: 'Q4 2025', region: 'US', revenue: 4120000, growth: '11.0%' },
        { quarter: 'Q4 2025', region: 'EU', revenue: 2250000, growth: '11.9%' },
        { quarter: 'Q4 2025', region: 'APAC', revenue: 1340000, growth: '13.6%' },
      ];
    case 'revenue_by_segment':
      return [
        { segment: 'Platform', region: 'US', revenue: 5200000, pct_total: '38%' },
        { segment: 'Platform', region: 'EU', revenue: 3100000, pct_total: '23%' },
        { segment: 'API Services', region: 'US', revenue: 2100000, pct_total: '15%' },
        { segment: 'API Services', region: 'EU', revenue: 1200000, pct_total: '9%' },
        { segment: 'Consulting', region: 'US', revenue: 1050000, pct_total: '8%' },
        { segment: 'Consulting', region: 'APAC', revenue: 950000, pct_total: '7%' },
      ];
    case 'gross_margin':
      return [
        { quarter: 'Q1 2025', region: 'US', revenue: 3250000, cogs: 1140000, margin: '64.9%' },
        { quarter: 'Q1 2025', region: 'EU', revenue: 1850000, cogs: 720000, margin: '61.1%' },
        { quarter: 'Q2 2025', region: 'US', revenue: 3480000, cogs: 1180000, margin: '66.1%' },
        { quarter: 'Q2 2025', region: 'EU', revenue: 1920000, cogs: 730000, margin: '62.0%' },
        { quarter: 'Q3 2025', region: 'US', revenue: 3710000, cogs: 1220000, margin: '67.1%' },
        { quarter: 'Q3 2025', region: 'EU', revenue: 2010000, cogs: 740000, margin: '63.2%' },
      ];
    case 'pnl_summary':
      return [
        { line_item: 'Revenue', region: 'US', q1: 3250000, q2: 3480000, q3: 3710000, q4: 4120000 },
        { line_item: 'Revenue', region: 'EU', q1: 1850000, q2: 1920000, q3: 2010000, q4: 2250000 },
        { line_item: 'COGS', region: 'US', q1: -1140000, q2: -1180000, q3: -1220000, q4: -1300000 },
        { line_item: 'COGS', region: 'EU', q1: -720000, q2: -730000, q3: -740000, q4: -780000 },
        { line_item: 'Gross Profit', region: 'US', q1: 2110000, q2: 2300000, q3: 2490000, q4: 2820000 },
        { line_item: 'Gross Profit', region: 'EU', q1: 1130000, q2: 1190000, q3: 1270000, q4: 1470000 },
        { line_item: 'OpEx', region: 'US', q1: -1200000, q2: -1250000, q3: -1300000, q4: -1350000 },
        { line_item: 'Net Income', region: 'US', q1: 910000, q2: 1050000, q3: 1190000, q4: 1470000 },
      ];
    default:
      return [{ message: 'No data available for this query' }];
  }
}

const PORT = parseInt(process.env.MOCK_API_PORT || '8080', 10);
const httpServer = server.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
  console.log(`Queries endpoint: http://localhost:${PORT}/api/queries`);
});

// Graceful shutdown (works on Linux SIGTERM + Windows SIGINT/SIGHUP via NSSM)
function shutdownMockApi(signal) {
  console.log(`[mock-api] ${signal} received, shutting down...`);
  httpServer.close(() => {
    console.log('[mock-api] Server closed');
    process.exit(0);
  });
  setTimeout(() => { process.exit(1); }, 5000).unref();
}
process.on('SIGTERM', () => shutdownMockApi('SIGTERM'));
process.on('SIGINT', () => shutdownMockApi('SIGINT'));
process.on('SIGHUP', () => shutdownMockApi('SIGHUP'));
