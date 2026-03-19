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

// P&L Summary (legacy)
function handlePnlSummaryLegacy(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Finance] ${req.method} /api/finance/pnl filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('pnl_summary'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2500) });
}
server.get('/api/finance/pnl', handlePnlSummaryLegacy);
server.post('/api/finance/pnl', handlePnlSummaryLegacy);

// === P&L Demo Endpoints ===

// P&L Summary (new demo version)
function handlePnlSummaryDemo(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[P&L Demo] ${req.method} /api/finance/pnl/summary filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('pnl_summary_demo'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2500) });
}
server.get('/api/finance/pnl/summary', handlePnlSummaryDemo);
server.post('/api/finance/pnl/summary', handlePnlSummaryDemo);

// P&L Detail
function handlePnlDetail(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[P&L Demo] ${req.method} /api/finance/pnl/detail filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('pnl_detail'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2000) });
}
server.get('/api/finance/pnl/detail', handlePnlDetail);
server.post('/api/finance/pnl/detail', handlePnlDetail);

// Revenue by Region
function handleRevenueByRegion(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[P&L Demo] ${req.method} /api/finance/pnl/revenue-by-region filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('revenue_by_region'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1800) });
}
server.get('/api/finance/pnl/revenue-by-region', handleRevenueByRegion);
server.post('/api/finance/pnl/revenue-by-region', handleRevenueByRegion);

// Budget vs Actual
function handleBudgetVsActual(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[P&L Demo] ${req.method} /api/finance/pnl/budget-vs-actual filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('budget_vs_actual'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2200) });
}
server.get('/api/finance/pnl/budget-vs-actual', handleBudgetVsActual);
server.post('/api/finance/pnl/budget-vs-actual', handleBudgetVsActual);

// GL Transactions
function handleGlTransactions(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[P&L Demo] ${req.method} /api/finance/pnl/gl-transactions filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('gl_transactions'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1500) });
}
server.get('/api/finance/pnl/gl-transactions', handleGlTransactions);
server.post('/api/finance/pnl/gl-transactions', handleGlTransactions);

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

// === Cross-source join data endpoints ===

// Headcount by cost center (for budget vs headcount combined query)
function handleHeadcountByCostCenter(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[HR] ${req.method} /api/hr/headcount-by-cost-center filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('headcount_by_cost_center'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1200) });
}
server.get('/api/hr/headcount-by-cost-center', handleHeadcountByCostCenter);
server.post('/api/hr/headcount-by-cost-center', handleHeadcountByCostCenter);

// Trading desk P&L (for trading risk combined query)
function handleTradingDeskPnl(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Trading] ${req.method} /api/trading/desk-pnl filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('trading_desk_pnl'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1800) });
}
server.get('/api/trading/desk-pnl', handleTradingDeskPnl);
server.post('/api/trading/desk-pnl', handleTradingDeskPnl);

// Trading desk risk metrics (for trading risk combined query)
function handleTradingDeskRisk(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Risk] ${req.method} /api/risk/desk-risk filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('trading_desk_risk'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1500) });
}
server.get('/api/risk/desk-risk', handleTradingDeskRisk);
server.post('/api/risk/desk-risk', handleTradingDeskRisk);

// Loan portfolio (for lending combined query)
function handleLoanPortfolio(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Lending] ${req.method} /api/lending/portfolio filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('loan_portfolio'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 2000) });
}
server.get('/api/lending/portfolio', handleLoanPortfolio);
server.post('/api/lending/portfolio', handleLoanPortfolio);

// Loan origination pipeline (for lending combined query)
function handleLoanOrigination(req, res) {
  const filters = { ...(req.body.filters || {}), ...req.query };
  console.log(`[Lending] ${req.method} /api/lending/origination filters:`, JSON.stringify(filters));
  const data = applyFilters(getRawData('loan_origination'), filters);
  res.json({ data, rowCount: data.length, executionTime: Math.floor(Math.random() * 1500) });
}
server.get('/api/lending/origination', handleLoanOrigination);
server.post('/api/lending/origination', handleLoanOrigination);

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

// === Write-back endpoint (demo mode) ===
server.post('/api/write', (req, res) => {
  const { queryName, changes } = req.body;
  console.log(`[Write-back] POST /api/write query=${queryName} changes=${JSON.stringify(changes).substring(0, 200)}`);

  if (!queryName || !changes || !Array.isArray(changes)) {
    return res.status(400).json({ error: 'queryName and changes array are required' });
  }

  // Demo mode: return success without actually modifying data
  res.json({
    success: true,
    queryName,
    rowsAffected: changes.length,
    message: `Demo mode: ${changes.length} row(s) would be updated via stored procedure.`,
    changes: changes.map((c, i) => ({
      index: i,
      status: 'applied',
      updates: c.updates || {},
    })),
  });
});

// Write-back for specific query (connector-style endpoint)
server.post('/api/queries/:id/write', (req, res) => {
  const { changes } = req.body;
  const queryId = req.params.id;
  console.log(`[Write-back] POST /api/queries/${queryId}/write changes=${(changes || []).length}`);

  if (!changes || !Array.isArray(changes)) {
    return res.status(400).json({ error: 'changes array is required' });
  }

  res.json({
    success: true,
    queryId,
    rowsAffected: changes.length,
    message: `Demo mode: ${changes.length} row(s) would be updated.`,
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

  // P&L fiscal filters
  if (filters.fiscal_year) {
    result = result.filter(
      (row) => !row.fiscal_year || row.fiscal_year === filters.fiscal_year
    );
  }
  if (filters.fiscal_quarter) {
    result = result.filter(
      (row) => !row.fiscal_quarter || row.fiscal_quarter === filters.fiscal_quarter
    );
  }
  if (filters.business_unit) {
    const units = filters.business_unit.split(',').map((u) => u.trim().toLowerCase());
    result = result.filter(
      (row) => !row.business_unit || units.includes(row.business_unit.toLowerCase())
    );
  }
  if (filters.cost_center) {
    result = result.filter(
      (row) => !row.cost_center || row.cost_center.toLowerCase().includes(filters.cost_center.toLowerCase())
    );
  }
  if (filters.gl_account) {
    result = result.filter(
      (row) => !row.gl_account || row.gl_account.toLowerCase().includes(filters.gl_account.toLowerCase())
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

    // ── P&L Demo Data ──────────────────────────────────────────────────

    case 'pnl_summary_demo':
      return [
        // Corporate
        { line_item: 'Revenue',       business_unit: 'Corporate',           fiscal_year: 'FY2025', q1_actual: 12500000, q1_budget: 12000000, q2_actual: 13200000, q2_budget: 12800000, q3_actual: 14100000, q3_budget: 13500000, q4_actual: 15800000, q4_budget: 14200000, ytd_actual: 55600000, ytd_budget: 52500000, variance_pct: '5.9%' },
        { line_item: 'COGS',          business_unit: 'Corporate',           fiscal_year: 'FY2025', q1_actual: -4375000, q1_budget: -4200000, q2_actual: -4620000, q2_budget: -4480000, q3_actual: -4935000, q3_budget: -4725000, q4_actual: -5530000, q4_budget: -4970000, ytd_actual: -19460000, ytd_budget: -18375000, variance_pct: '-5.9%' },
        { line_item: 'Gross Profit',  business_unit: 'Corporate',           fiscal_year: 'FY2025', q1_actual: 8125000, q1_budget: 7800000, q2_actual: 8580000, q2_budget: 8320000, q3_actual: 9165000, q3_budget: 8775000, q4_actual: 10270000, q4_budget: 9230000, ytd_actual: 36140000, ytd_budget: 34125000, variance_pct: '5.9%' },
        { line_item: 'OpEx',          business_unit: 'Corporate',           fiscal_year: 'FY2025', q1_actual: -5200000, q1_budget: -5400000, q2_actual: -5350000, q2_budget: -5500000, q3_actual: -5500000, q3_budget: -5600000, q4_actual: -5650000, q4_budget: -5700000, ytd_actual: -21700000, ytd_budget: -22200000, variance_pct: '2.3%' },
        { line_item: 'EBITDA',        business_unit: 'Corporate',           fiscal_year: 'FY2025', q1_actual: 2925000, q1_budget: 2400000, q2_actual: 3230000, q2_budget: 2820000, q3_actual: 3665000, q3_budget: 3175000, q4_actual: 4620000, q4_budget: 3530000, ytd_actual: 14440000, ytd_budget: 11925000, variance_pct: '21.1%' },
        { line_item: 'Net Income',    business_unit: 'Corporate',           fiscal_year: 'FY2025', q1_actual: 2045000, q1_budget: 1680000, q2_actual: 2261000, q2_budget: 1974000, q3_actual: 2566000, q3_budget: 2223000, q4_actual: 3234000, q4_budget: 2471000, ytd_actual: 10106000, ytd_budget: 8348000, variance_pct: '21.1%' },
        // Retail Banking
        { line_item: 'Revenue',       business_unit: 'Retail Banking',      fiscal_year: 'FY2025', q1_actual: 8200000, q1_budget: 7900000, q2_actual: 8650000, q2_budget: 8300000, q3_actual: 9100000, q3_budget: 8700000, q4_actual: 9800000, q4_budget: 9100000, ytd_actual: 35750000, ytd_budget: 34000000, variance_pct: '5.1%' },
        { line_item: 'COGS',          business_unit: 'Retail Banking',      fiscal_year: 'FY2025', q1_actual: -3280000, q1_budget: -3160000, q2_actual: -3460000, q2_budget: -3320000, q3_actual: -3640000, q3_budget: -3480000, q4_actual: -3920000, q4_budget: -3640000, ytd_actual: -14300000, ytd_budget: -13600000, variance_pct: '-5.1%' },
        { line_item: 'Gross Profit',  business_unit: 'Retail Banking',      fiscal_year: 'FY2025', q1_actual: 4920000, q1_budget: 4740000, q2_actual: 5190000, q2_budget: 4980000, q3_actual: 5460000, q3_budget: 5220000, q4_actual: 5880000, q4_budget: 5460000, ytd_actual: 21450000, ytd_budget: 20400000, variance_pct: '5.1%' },
        { line_item: 'Net Income',    business_unit: 'Retail Banking',      fiscal_year: 'FY2025', q1_actual: 1476000, q1_budget: 1422000, q2_actual: 1557000, q2_budget: 1494000, q3_actual: 1638000, q3_budget: 1566000, q4_actual: 1764000, q4_budget: 1638000, ytd_actual: 6435000, ytd_budget: 6120000, variance_pct: '5.1%' },
        // Investment Banking
        { line_item: 'Revenue',       business_unit: 'Investment Banking',  fiscal_year: 'FY2025', q1_actual: 18500000, q1_budget: 17000000, q2_actual: 19800000, q2_budget: 18200000, q3_actual: 21200000, q3_budget: 19500000, q4_actual: 24500000, q4_budget: 21000000, ytd_actual: 84000000, ytd_budget: 75700000, variance_pct: '11.0%' },
        { line_item: 'COGS',          business_unit: 'Investment Banking',  fiscal_year: 'FY2025', q1_actual: -5550000, q1_budget: -5100000, q2_actual: -5940000, q2_budget: -5460000, q3_actual: -6360000, q3_budget: -5850000, q4_actual: -7350000, q4_budget: -6300000, ytd_actual: -25200000, ytd_budget: -22710000, variance_pct: '-11.0%' },
        { line_item: 'Gross Profit',  business_unit: 'Investment Banking',  fiscal_year: 'FY2025', q1_actual: 12950000, q1_budget: 11900000, q2_actual: 13860000, q2_budget: 12740000, q3_actual: 14840000, q3_budget: 13650000, q4_actual: 17150000, q4_budget: 14700000, ytd_actual: 58800000, ytd_budget: 52990000, variance_pct: '11.0%' },
        { line_item: 'Net Income',    business_unit: 'Investment Banking',  fiscal_year: 'FY2025', q1_actual: 5180000, q1_budget: 4760000, q2_actual: 5544000, q2_budget: 5096000, q3_actual: 5936000, q3_budget: 5460000, q4_actual: 6860000, q4_budget: 5880000, ytd_actual: 23520000, ytd_budget: 21196000, variance_pct: '11.0%' },
        // Wealth Management
        { line_item: 'Revenue',       business_unit: 'Wealth Management',   fiscal_year: 'FY2025', q1_actual: 6800000, q1_budget: 6500000, q2_actual: 7100000, q2_budget: 6800000, q3_actual: 7500000, q3_budget: 7200000, q4_actual: 8200000, q4_budget: 7600000, ytd_actual: 29600000, ytd_budget: 28100000, variance_pct: '5.3%' },
        { line_item: 'COGS',          business_unit: 'Wealth Management',   fiscal_year: 'FY2025', q1_actual: -1700000, q1_budget: -1625000, q2_actual: -1775000, q2_budget: -1700000, q3_actual: -1875000, q3_budget: -1800000, q4_actual: -2050000, q4_budget: -1900000, ytd_actual: -7400000, ytd_budget: -7025000, variance_pct: '-5.3%' },
        { line_item: 'Gross Profit',  business_unit: 'Wealth Management',   fiscal_year: 'FY2025', q1_actual: 5100000, q1_budget: 4875000, q2_actual: 5325000, q2_budget: 5100000, q3_actual: 5625000, q3_budget: 5400000, q4_actual: 6150000, q4_budget: 5700000, ytd_actual: 22200000, ytd_budget: 21075000, variance_pct: '5.3%' },
        { line_item: 'Net Income',    business_unit: 'Wealth Management',   fiscal_year: 'FY2025', q1_actual: 2040000, q1_budget: 1950000, q2_actual: 2130000, q2_budget: 2040000, q3_actual: 2250000, q3_budget: 2160000, q4_actual: 2460000, q4_budget: 2280000, ytd_actual: 8880000, ytd_budget: 8430000, variance_pct: '5.3%' },
      ];

    case 'pnl_detail':
      return [
        // Corporate detail
        { gl_account: '4100', gl_description: 'Product Revenue',         category: 'Revenue',  business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 8500000, budget: 8200000, variance: 300000, variance_pct: '3.7%' },
        { gl_account: '4200', gl_description: 'Service Revenue',         category: 'Revenue',  business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 2800000, budget: 2600000, variance: 200000, variance_pct: '7.7%' },
        { gl_account: '4300', gl_description: 'License Revenue',         category: 'Revenue',  business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 1200000, budget: 1200000, variance: 0, variance_pct: '0.0%' },
        { gl_account: '5100', gl_description: 'Direct Labor',            category: 'COGS',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -2100000, budget: -2000000, variance: -100000, variance_pct: '-5.0%' },
        { gl_account: '5200', gl_description: 'Infrastructure Costs',    category: 'COGS',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -1500000, budget: -1400000, variance: -100000, variance_pct: '-7.1%' },
        { gl_account: '5300', gl_description: 'Third Party Services',    category: 'COGS',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -775000, budget: -800000, variance: 25000, variance_pct: '3.1%' },
        { gl_account: '6100', gl_description: 'Salaries & Benefits',     category: 'OpEx',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -3100000, budget: -3200000, variance: 100000, variance_pct: '3.1%' },
        { gl_account: '6200', gl_description: 'Marketing & Sales',       category: 'OpEx',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -1200000, budget: -1250000, variance: 50000, variance_pct: '4.0%' },
        { gl_account: '6300', gl_description: 'R&D Expenses',            category: 'OpEx',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -600000, budget: -650000, variance: 50000, variance_pct: '7.7%' },
        { gl_account: '6400', gl_description: 'General & Administrative',category: 'OpEx',     business_unit: 'Corporate', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -300000, budget: -300000, variance: 0, variance_pct: '0.0%' },
        // Investment Banking detail
        { gl_account: '4100', gl_description: 'Advisory Fees',           category: 'Revenue',  business_unit: 'Investment Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 9200000, budget: 8500000, variance: 700000, variance_pct: '8.2%' },
        { gl_account: '4200', gl_description: 'Underwriting Revenue',    category: 'Revenue',  business_unit: 'Investment Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 5800000, budget: 5200000, variance: 600000, variance_pct: '11.5%' },
        { gl_account: '4300', gl_description: 'Trading Revenue',         category: 'Revenue',  business_unit: 'Investment Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 3500000, budget: 3300000, variance: 200000, variance_pct: '6.1%' },
        { gl_account: '5100', gl_description: 'Compensation',            category: 'COGS',     business_unit: 'Investment Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -3800000, budget: -3500000, variance: -300000, variance_pct: '-8.6%' },
        { gl_account: '5200', gl_description: 'Technology & Data',       category: 'COGS',     business_unit: 'Investment Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -1750000, budget: -1600000, variance: -150000, variance_pct: '-9.4%' },
        // Retail Banking detail
        { gl_account: '4100', gl_description: 'Net Interest Income',     category: 'Revenue',  business_unit: 'Retail Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 5400000, budget: 5200000, variance: 200000, variance_pct: '3.8%' },
        { gl_account: '4200', gl_description: 'Fee Income',              category: 'Revenue',  business_unit: 'Retail Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 1800000, budget: 1700000, variance: 100000, variance_pct: '5.9%' },
        { gl_account: '4300', gl_description: 'Mortgage Revenue',        category: 'Revenue',  business_unit: 'Retail Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 1000000, budget: 1000000, variance: 0, variance_pct: '0.0%' },
        { gl_account: '5100', gl_description: 'Provision for Losses',    category: 'COGS',     business_unit: 'Retail Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -2100000, budget: -2000000, variance: -100000, variance_pct: '-5.0%' },
        { gl_account: '5200', gl_description: 'Branch Operations',       category: 'COGS',     business_unit: 'Retail Banking', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -1180000, budget: -1160000, variance: -20000, variance_pct: '-1.7%' },
        // Wealth Management detail
        { gl_account: '4100', gl_description: 'AUM Management Fees',     category: 'Revenue',  business_unit: 'Wealth Management', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 4200000, budget: 4000000, variance: 200000, variance_pct: '5.0%' },
        { gl_account: '4200', gl_description: 'Performance Fees',        category: 'Revenue',  business_unit: 'Wealth Management', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 1600000, budget: 1500000, variance: 100000, variance_pct: '6.7%' },
        { gl_account: '4300', gl_description: 'Financial Planning Fees', category: 'Revenue',  business_unit: 'Wealth Management', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: 1000000, budget: 1000000, variance: 0, variance_pct: '0.0%' },
        { gl_account: '5100', gl_description: 'Advisor Compensation',    category: 'COGS',     business_unit: 'Wealth Management', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -1200000, budget: -1125000, variance: -75000, variance_pct: '-6.7%' },
        { gl_account: '5200', gl_description: 'Platform & Custody',      category: 'COGS',     business_unit: 'Wealth Management', fiscal_quarter: 'Q1', fiscal_year: 'FY2025', actual: -500000, budget: -500000, variance: 0, variance_pct: '0.0%' },
      ];

    case 'revenue_by_region':
      return [
        { region: 'North America', business_unit: 'Corporate',          fiscal_year: 'FY2025', q1_revenue: 7500000, q2_revenue: 7900000, q3_revenue: 8450000, q4_revenue: 9500000, total_revenue: 33350000 },
        { region: 'North America', business_unit: 'Investment Banking', fiscal_year: 'FY2025', q1_revenue: 11100000, q2_revenue: 11880000, q3_revenue: 12720000, q4_revenue: 14700000, total_revenue: 50400000 },
        { region: 'North America', business_unit: 'Retail Banking',     fiscal_year: 'FY2025', q1_revenue: 5740000, q2_revenue: 6055000, q3_revenue: 6370000, q4_revenue: 6860000, total_revenue: 25025000 },
        { region: 'North America', business_unit: 'Wealth Management',  fiscal_year: 'FY2025', q1_revenue: 4080000, q2_revenue: 4260000, q3_revenue: 4500000, q4_revenue: 4920000, total_revenue: 17760000 },
        { region: 'Europe',        business_unit: 'Corporate',          fiscal_year: 'FY2025', q1_revenue: 3125000, q2_revenue: 3300000, q3_revenue: 3525000, q4_revenue: 3950000, total_revenue: 13900000 },
        { region: 'Europe',        business_unit: 'Investment Banking', fiscal_year: 'FY2025', q1_revenue: 4625000, q2_revenue: 4950000, q3_revenue: 5300000, q4_revenue: 6125000, total_revenue: 21000000 },
        { region: 'Europe',        business_unit: 'Retail Banking',     fiscal_year: 'FY2025', q1_revenue: 1640000, q2_revenue: 1730000, q3_revenue: 1820000, q4_revenue: 1960000, total_revenue: 7150000 },
        { region: 'Europe',        business_unit: 'Wealth Management',  fiscal_year: 'FY2025', q1_revenue: 1700000, q2_revenue: 1775000, q3_revenue: 1875000, q4_revenue: 2050000, total_revenue: 7400000 },
        { region: 'Asia Pacific',  business_unit: 'Corporate',          fiscal_year: 'FY2025', q1_revenue: 1875000, q2_revenue: 2000000, q3_revenue: 2125000, q4_revenue: 2350000, total_revenue: 8350000 },
        { region: 'Asia Pacific',  business_unit: 'Investment Banking', fiscal_year: 'FY2025', q1_revenue: 2775000, q2_revenue: 2970000, q3_revenue: 3180000, q4_revenue: 3675000, total_revenue: 12600000 },
        { region: 'Asia Pacific',  business_unit: 'Retail Banking',     fiscal_year: 'FY2025', q1_revenue: 820000, q2_revenue: 865000, q3_revenue: 910000, q4_revenue: 980000, total_revenue: 3575000 },
        { region: 'Asia Pacific',  business_unit: 'Wealth Management',  fiscal_year: 'FY2025', q1_revenue: 1020000, q2_revenue: 1065000, q3_revenue: 1125000, q4_revenue: 1230000, total_revenue: 4440000 },
      ];

    case 'budget_vs_actual':
      return [
        { cost_center: 'Technology',      category: 'OpEx',     fiscal_year: 'FY2025', budget: 18500000, actual: 17800000, variance: 700000, variance_pct: '3.8%', status: 'Under Budget' },
        { cost_center: 'Sales & Marketing',category: 'OpEx',    fiscal_year: 'FY2025', budget: 12000000, actual: 12450000, variance: -450000, variance_pct: '-3.8%', status: 'Over Budget' },
        { cost_center: 'Human Resources', category: 'OpEx',     fiscal_year: 'FY2025', budget: 4200000, actual: 4100000, variance: 100000, variance_pct: '2.4%', status: 'Under Budget' },
        { cost_center: 'Legal & Compliance',category: 'OpEx',   fiscal_year: 'FY2025', budget: 3800000, actual: 4200000, variance: -400000, variance_pct: '-10.5%', status: 'Over Budget' },
        { cost_center: 'Operations',      category: 'OpEx',     fiscal_year: 'FY2025', budget: 8500000, actual: 8200000, variance: 300000, variance_pct: '3.5%', status: 'Under Budget' },
        { cost_center: 'Risk Management', category: 'OpEx',     fiscal_year: 'FY2025', budget: 2800000, actual: 2750000, variance: 50000, variance_pct: '1.8%', status: 'Under Budget' },
        { cost_center: 'Finance',         category: 'OpEx',     fiscal_year: 'FY2025', budget: 2200000, actual: 2180000, variance: 20000, variance_pct: '0.9%', status: 'On Track' },
        { cost_center: 'Facilities',      category: 'OpEx',     fiscal_year: 'FY2025', budget: 5000000, actual: 5100000, variance: -100000, variance_pct: '-2.0%', status: 'Over Budget' },
        { cost_center: 'Research',        category: 'OpEx',     fiscal_year: 'FY2025', budget: 6500000, actual: 6200000, variance: 300000, variance_pct: '4.6%', status: 'Under Budget' },
        { cost_center: 'Executive Office',category: 'OpEx',     fiscal_year: 'FY2025', budget: 1500000, actual: 1480000, variance: 20000, variance_pct: '1.3%', status: 'On Track' },
      ];

    case 'gl_transactions':
      return [
        { journal_id: 'JE-2025-001', gl_account: '4100', posting_date: '2025-01-05', description: 'Q1 Product revenue recognition - Platform licenses', debit: 0, credit: 2800000, balance: 2800000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-002', gl_account: '4100', posting_date: '2025-01-15', description: 'Q1 Product revenue recognition - Enterprise deals', debit: 0, credit: 1950000, balance: 4750000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-003', gl_account: '4200', posting_date: '2025-01-20', description: 'Q1 Service revenue - Consulting engagements', debit: 0, credit: 1400000, balance: 6150000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-004', gl_account: '5100', posting_date: '2025-01-31', description: 'January payroll - Engineering division', debit: 700000, credit: 0, balance: 5450000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-005', gl_account: '5100', posting_date: '2025-02-28', description: 'February payroll - Engineering division', debit: 700000, credit: 0, balance: 4750000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-006', gl_account: '5200', posting_date: '2025-02-15', description: 'AWS infrastructure charges - Q1 allocation', debit: 450000, credit: 0, balance: 4300000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-007', gl_account: '6100', posting_date: '2025-02-28', description: 'February salaries & benefits accrual', debit: 1050000, credit: 0, balance: 3250000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-008', gl_account: '6200', posting_date: '2025-03-10', description: 'Q1 Marketing campaign spend - Digital', debit: 380000, credit: 0, balance: 2870000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-009', gl_account: '6200', posting_date: '2025-03-15', description: 'Q1 Sales commission accrual', debit: 520000, credit: 0, balance: 2350000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-010', gl_account: '6300', posting_date: '2025-03-20', description: 'Q1 R&D project expenses - AI platform', debit: 280000, credit: 0, balance: 2070000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-011', gl_account: '4100', posting_date: '2025-04-05', description: 'Q2 Product revenue recognition - Platform', debit: 0, credit: 3100000, balance: 5170000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-012', gl_account: '4200', posting_date: '2025-04-20', description: 'Q2 Service revenue - Implementation projects', debit: 0, credit: 1600000, balance: 6770000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-013', gl_account: '5100', posting_date: '2025-04-30', description: 'April payroll - All divisions', debit: 720000, credit: 0, balance: 6050000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-014', gl_account: '6400', posting_date: '2025-05-15', description: 'Q2 G&A - Office lease and utilities', debit: 150000, credit: 0, balance: 5900000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-015', gl_account: '4300', posting_date: '2025-06-30', description: 'Q2 License revenue recognition', debit: 0, credit: 1200000, balance: 7100000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-ADJ1', gl_account: '4100', posting_date: '2025-03-31', description: 'Q1 Revenue adjustment - Deferred recognition', debit: 150000, credit: 0, balance: 1920000, fiscal_year: 'FY2025' },
        { journal_id: 'JE-2025-ADJ2', gl_account: '5200', posting_date: '2025-06-30', description: 'Q2 COGS adjustment - Vendor credit received', debit: 0, credit: 85000, balance: 7185000, fiscal_year: 'FY2025' },
      ];

    // ── Cross-source join data ───────────────────────────────────────

    case 'headcount_by_cost_center':
      return [
        { cost_center: 'Technology',       headcount: 142, avg_salary: 165000, open_positions: 18, attrition_rate: '8.2%' },
        { cost_center: 'Sales & Marketing', headcount: 95, avg_salary: 128000, open_positions: 12, attrition_rate: '14.5%' },
        { cost_center: 'Human Resources',  headcount: 28, avg_salary: 112000, open_positions: 3,  attrition_rate: '5.1%' },
        { cost_center: 'Legal & Compliance', headcount: 35, avg_salary: 155000, open_positions: 5, attrition_rate: '4.8%' },
        { cost_center: 'Operations',       headcount: 78, avg_salary: 98000,  open_positions: 8,  attrition_rate: '11.2%' },
        { cost_center: 'Risk Management',  headcount: 22, avg_salary: 148000, open_positions: 2,  attrition_rate: '3.6%' },
        { cost_center: 'Finance',          headcount: 31, avg_salary: 135000, open_positions: 1,  attrition_rate: '6.5%' },
        { cost_center: 'Facilities',       headcount: 45, avg_salary: 72000,  open_positions: 4,  attrition_rate: '18.3%' },
        { cost_center: 'Research',         headcount: 56, avg_salary: 158000, open_positions: 9,  attrition_rate: '6.0%' },
        { cost_center: 'Executive Office', headcount: 8,  avg_salary: 310000, open_positions: 0,  attrition_rate: '0.0%' },
      ];

    case 'trading_desk_pnl':
      return [
        { desk: 'Equities',       asset_class: 'Equity',       realized_pnl: 4200000,  unrealized_pnl: 1850000,  total_pnl: 6050000,   trades: 12450, win_rate: '58%' },
        { desk: 'Fixed Income',   asset_class: 'Bonds',        realized_pnl: 2800000,  unrealized_pnl: -420000,  total_pnl: 2380000,   trades: 3200,  win_rate: '62%' },
        { desk: 'FX',             asset_class: 'Currency',     realized_pnl: 1560000,  unrealized_pnl: 780000,   total_pnl: 2340000,   trades: 28900, win_rate: '51%' },
        { desk: 'Commodities',    asset_class: 'Commodity',    realized_pnl: 890000,   unrealized_pnl: 340000,   total_pnl: 1230000,   trades: 4100,  win_rate: '55%' },
        { desk: 'Derivatives',    asset_class: 'Options/Swaps', realized_pnl: 3100000, unrealized_pnl: -1200000, total_pnl: 1900000,   trades: 8700,  win_rate: '48%' },
        { desk: 'Credit',         asset_class: 'Credit',       realized_pnl: 1750000,  unrealized_pnl: 520000,   total_pnl: 2270000,   trades: 2100,  win_rate: '64%' },
      ];

    case 'trading_desk_risk':
      return [
        { desk: 'Equities',       var_95: 2800000, var_99: 4500000, stress_loss: -8200000,  exposure_gross: 185000000, exposure_net: 42000000,  risk_limit: 5000000, limit_usage: '90%' },
        { desk: 'Fixed Income',   var_95: 1200000, var_99: 2100000, stress_loss: -3800000,  exposure_gross: 320000000, exposure_net: 18000000,  risk_limit: 2500000, limit_usage: '84%' },
        { desk: 'FX',             var_95: 950000,  var_99: 1600000, stress_loss: -2900000,  exposure_gross: 420000000, exposure_net: 35000000,  risk_limit: 2000000, limit_usage: '80%' },
        { desk: 'Commodities',    var_95: 680000,  var_99: 1100000, stress_loss: -2100000,  exposure_gross: 95000000,  exposure_net: 22000000,  risk_limit: 1500000, limit_usage: '73%' },
        { desk: 'Derivatives',    var_95: 3200000, var_99: 5800000, stress_loss: -12000000, exposure_gross: 450000000, exposure_net: -8000000,  risk_limit: 6000000, limit_usage: '97%' },
        { desk: 'Credit',         var_95: 780000,  var_99: 1350000, stress_loss: -2500000,  exposure_gross: 210000000, exposure_net: 52000000,  risk_limit: 1800000, limit_usage: '75%' },
      ];

    case 'loan_portfolio':
      return [
        { segment: 'Mortgages',       region: 'North America', outstanding: 4200000000, avg_rate: '5.85%', weighted_ltv: '72%', npl_count: 142, npl_amount: 38500000,  npl_ratio: '0.92%', provision: 52000000 },
        { segment: 'Mortgages',       region: 'Europe',        outstanding: 2100000000, avg_rate: '4.20%', weighted_ltv: '68%', npl_count: 89,  npl_amount: 21200000,  npl_ratio: '1.01%', provision: 28000000 },
        { segment: 'Commercial',      region: 'North America', outstanding: 1800000000, avg_rate: '6.50%', weighted_ltv: '60%', npl_count: 23,  npl_amount: 45000000,  npl_ratio: '2.50%', provision: 62000000 },
        { segment: 'Commercial',      region: 'Europe',        outstanding: 950000000,  avg_rate: '5.75%', weighted_ltv: '55%', npl_count: 15,  npl_amount: 28000000,  npl_ratio: '2.95%', provision: 38000000 },
        { segment: 'Consumer',        region: 'North America', outstanding: 820000000,  avg_rate: '9.20%', weighted_ltv: 'N/A', npl_count: 312, npl_amount: 18500000,  npl_ratio: '2.26%', provision: 24000000 },
        { segment: 'Consumer',        region: 'Asia Pacific',  outstanding: 380000000,  avg_rate: '8.50%', weighted_ltv: 'N/A', npl_count: 178, npl_amount: 9800000,   npl_ratio: '2.58%', provision: 13000000 },
        { segment: 'Auto',            region: 'North America', outstanding: 560000000,  avg_rate: '7.10%', weighted_ltv: '85%', npl_count: 95,  npl_amount: 8200000,   npl_ratio: '1.46%', provision: 11000000 },
        { segment: 'Small Business',  region: 'North America', outstanding: 420000000,  avg_rate: '8.75%', weighted_ltv: 'N/A', npl_count: 67,  npl_amount: 14500000,  npl_ratio: '3.45%', provision: 19000000 },
      ];

    case 'loan_origination':
      return [
        { segment: 'Mortgages',       pipeline_count: 845,  pipeline_value: 312000000, avg_deal_size: 369231,  approval_rate: '72%', avg_days_to_close: 45, funded_mtd: 189000000, funded_count: 412 },
        { segment: 'Commercial',      pipeline_count: 128,  pipeline_value: 580000000, avg_deal_size: 4531250, approval_rate: '48%', avg_days_to_close: 90, funded_mtd: 145000000, funded_count: 31 },
        { segment: 'Consumer',        pipeline_count: 2340, pipeline_value: 42000000,  avg_deal_size: 17949,   approval_rate: '85%', avg_days_to_close: 7,  funded_mtd: 28000000,  funded_count: 1560 },
        { segment: 'Auto',            pipeline_count: 1200, pipeline_value: 48000000,  avg_deal_size: 40000,   approval_rate: '78%', avg_days_to_close: 3,  funded_mtd: 35000000,  funded_count: 875 },
        { segment: 'Small Business',  pipeline_count: 310,  pipeline_value: 95000000,  avg_deal_size: 306452,  approval_rate: '38%', avg_days_to_close: 60, funded_mtd: 22000000,  funded_count: 72 },
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
