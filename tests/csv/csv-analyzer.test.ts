/**
 * Unit tests for CSV Analyzer
 *
 * These tests exercise:
 *   - parseCsv() — basic CSV parsing, headers extraction, type detection
 *   - computeAggregation() — sum, average, min, max, count, top operations
 *   - parseAggregationFromText() — natural language to aggregation request
 *   - groupBy() — grouping by column with numeric aggregation
 *   - sortData() — ascending/descending sort on string and numeric columns
 *   - computeSummary() — full summary statistics computation
 *   - Edge cases: empty CSV, single row, NaN values, missing columns, division by zero, large datasets
 */

import {
  parseCsv,
  computeAggregation,
  parseAggregationFromText,
  groupBy,
  sortData,
  computeSummary,
  parseGroupByFromText,
  parseSortFromText,
  type CsvData,
  type AggregationRequest,
} from '../../services/engine/src/core/api-connector/csv-analyzer';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SIMPLE_CSV = `Name,Sales,Region
Alice,100,US
Bob,200,EU
Charlie,150,US
Diana,300,APAC`;

const MIXED_CSV = `Product,Price,Quantity,Category
Widget,10.5,100,Hardware
Gadget,25.0,50,Electronics
Doohickey,5.75,200,Hardware
Thingamajig,15.0,75,Electronics
Whatchamacallit,8.25,150,Misc`;

const SINGLE_ROW_CSV = `Col1,Col2
OnlyValue,42`;

const EMPTY_BODY_CSV = `Header1,Header2,Header3`;

const NAN_CSV = `Name,Value
Alice,100
Bob,not_a_number
Charlie,200
Diana,`;

// Helpers
function simpleData(): CsvData {
  return parseCsv(SIMPLE_CSV);
}

function mixedData(): CsvData {
  return parseCsv(MIXED_CSV);
}

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe('parseCsv', () => {
  it('parses a basic CSV string into headers and rows', () => {
    const data = parseCsv(SIMPLE_CSV);
    expect(data.headers).toEqual(['Name', 'Sales', 'Region']);
    expect(data.rows).toHaveLength(4);
  });

  it('correctly reads row values', () => {
    const data = parseCsv(SIMPLE_CSV);
    const first = data.rows[0];
    expect(first['Name']).toBe('Alice');
    // xlsx may parse numeric strings as numbers
    expect(Number(first['Sales'])).toBe(100);
    expect(first['Region']).toBe('US');
  });

  it('parses numeric values as numbers when possible', () => {
    const data = parseCsv(SIMPLE_CSV);
    // xlsx typically coerces number-like values
    for (const row of data.rows) {
      const sales = row['Sales'];
      expect(typeof sales === 'number' || !isNaN(Number(sales))).toBe(true);
    }
  });

  it('handles CSV with decimal numbers', () => {
    const data = parseCsv(MIXED_CSV);
    const first = data.rows[0];
    expect(Number(first['Price'])).toBeCloseTo(10.5);
  });

  it('returns empty headers and rows for empty string', () => {
    const data = parseCsv('');
    expect(data.headers).toEqual([]);
    expect(data.rows).toEqual([]);
  });

  it('handles header-only CSV (no data rows)', () => {
    const data = parseCsv(EMPTY_BODY_CSV);
    // xlsx may return empty rows array or single empty row
    expect(data.rows.length).toBeLessThanOrEqual(1);
  });

  it('handles single row CSV', () => {
    const data = parseCsv(SINGLE_ROW_CSV);
    expect(data.headers).toEqual(['Col1', 'Col2']);
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0]['Col1']).toBe('OnlyValue');
  });
});

// ---------------------------------------------------------------------------
// computeAggregation
// ---------------------------------------------------------------------------

describe('computeAggregation', () => {
  describe('sum', () => {
    it('computes sum of a numeric column', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'sum', column: 'Sales' });
      expect(result.operation).toBe('sum');
      expect(result.column).toBe('Sales');
      expect(result.result).toBe(750); // 100+200+150+300
    });
  });

  describe('avg', () => {
    it('computes average of a numeric column', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'avg', column: 'Sales' });
      expect(result.operation).toBe('avg');
      expect(result.result).toBe(187.5); // 750/4
    });

    it('rounds average to 2 decimal places', () => {
      const data = mixedData();
      const result = computeAggregation(data, { operation: 'avg', column: 'Price' });
      const num = Number(result.result);
      // (10.5 + 25.0 + 5.75 + 15.0 + 8.25) / 5 = 12.9
      expect(num).toBeCloseTo(12.9, 2);
      // Verify rounding to 2 decimal places
      const decimalPart = String(num).split('.')[1];
      expect(!decimalPart || decimalPart.length <= 2).toBe(true);
    });
  });

  describe('min', () => {
    it('computes minimum of a numeric column', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'min', column: 'Sales' });
      expect(result.result).toBe(100);
    });
  });

  describe('max', () => {
    it('computes maximum of a numeric column', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'max', column: 'Sales' });
      expect(result.result).toBe(300);
    });
  });

  describe('count', () => {
    it('counts all rows', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'count', column: '*' });
      expect(result.operation).toBe('count');
      expect(result.result).toBe(4);
    });

    it('counts all rows regardless of the column name', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'count', column: 'Sales' });
      expect(result.result).toBe(4);
    });
  });

  describe('top', () => {
    it('returns top N rows by a numeric column', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'top', column: 'Sales', limit: 2 });
      expect(result.operation).toBe('top 2');
      expect(result.topRows).toHaveLength(2);
      // First should be Diana (300), second Bob (200)
      expect(Number(result.topRows![0]['Sales'])).toBe(300);
      expect(Number(result.topRows![1]['Sales'])).toBe(200);
    });

    it('defaults to top 5 when limit is not specified', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'top', column: 'Sales' });
      expect(result.operation).toBe('top 5');
      // Only 4 rows, so topRows should be 4
      expect(result.topRows!.length).toBeLessThanOrEqual(5);
    });

    it('includes topHeaders in result', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'top', column: 'Sales', limit: 2 });
      expect(result.topHeaders).toEqual(['Name', 'Sales', 'Region']);
    });

    it('generates a human-readable summary string', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'top', column: 'Sales', limit: 2 });
      expect(typeof result.result).toBe('string');
      expect(String(result.result)).toContain('Diana');
      expect(String(result.result)).toContain('300');
    });
  });

  describe('edge cases', () => {
    it('returns "No numeric data" for non-numeric column', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'sum', column: 'Name' });
      expect(result.result).toBe('No numeric data');
    });

    it('returns "No numeric data" when column does not exist', () => {
      const data = simpleData();
      const result = computeAggregation(data, { operation: 'sum', column: 'NonExistent' });
      expect(result.result).toBe('No numeric data');
    });

    it('handles CSV with NaN values by skipping them', () => {
      const data = parseCsv(NAN_CSV);
      const result = computeAggregation(data, { operation: 'sum', column: 'Value' });
      // Only Alice=100 and Charlie=200 are valid
      expect(result.result).toBe(300);
    });

    it('handles CSV with NaN values for average (divides by valid count only)', () => {
      const data = parseCsv(NAN_CSV);
      const result = computeAggregation(data, { operation: 'avg', column: 'Value' });
      // 300 / 2 valid values = 150
      expect(result.result).toBe(150);
    });

    it('handles empty data for aggregation', () => {
      const data: CsvData = { headers: ['A', 'B'], rows: [] };
      const result = computeAggregation(data, { operation: 'sum', column: 'A' });
      expect(result.result).toBe('No numeric data');
    });

    it('count returns 0 for empty data', () => {
      const data: CsvData = { headers: ['A'], rows: [] };
      const result = computeAggregation(data, { operation: 'count', column: '*' });
      expect(result.result).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// parseAggregationFromText
// ---------------------------------------------------------------------------

describe('parseAggregationFromText', () => {
  const headers = ['Sales', 'Revenue', 'Orders', 'Region'];

  it('parses "total sales" as sum of Sales', () => {
    const req = parseAggregationFromText('total sales', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('sum');
    expect(req!.column).toBe('Sales');
  });

  it('parses "average revenue" as avg of Revenue', () => {
    const req = parseAggregationFromText('average revenue', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('avg');
    expect(req!.column).toBe('Revenue');
  });

  it('parses "mean revenue" as avg', () => {
    const req = parseAggregationFromText('mean revenue', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('avg');
  });

  it('parses "count of orders" as count', () => {
    const req = parseAggregationFromText('count of orders', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('count');
  });

  it('parses "how many orders" as count', () => {
    const req = parseAggregationFromText('how many orders', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('count');
  });

  it('parses "minimum sales" as min of Sales', () => {
    const req = parseAggregationFromText('minimum sales', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('min');
    expect(req!.column).toBe('Sales');
  });

  it('parses "lowest sales" as min of Sales', () => {
    const req = parseAggregationFromText('lowest sales', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('min');
  });

  it('parses "maximum revenue" as max of Revenue', () => {
    const req = parseAggregationFromText('maximum revenue', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('max');
    expect(req!.column).toBe('Revenue');
  });

  it('parses "highest revenue" as max', () => {
    const req = parseAggregationFromText('highest revenue', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('max');
  });

  it('parses "biggest sales" as max', () => {
    const req = parseAggregationFromText('biggest sales', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('max');
  });

  it('parses "top 5 by sales" as top with limit 5', () => {
    const req = parseAggregationFromText('top 5 by sales', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('top');
    expect(req!.limit).toBe(5);
    expect(req!.column).toBe('Sales');
  });

  it('parses "top 10 by revenue" with correct limit', () => {
    const req = parseAggregationFromText('top 10 by revenue', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('top');
    expect(req!.limit).toBe(10);
  });

  it('returns null when no operation keyword is found', () => {
    const req = parseAggregationFromText('show me the data', headers);
    expect(req).toBeNull();
  });

  it('returns null when operation is found but no matching column', () => {
    const req = parseAggregationFromText('total foobar', headers);
    expect(req).toBeNull();
  });

  it('handles case-insensitive matching', () => {
    const req = parseAggregationFromText('TOTAL SALES', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('sum');
    expect(req!.column).toBe('Sales');
  });

  it('parses "sum of revenue" correctly', () => {
    const req = parseAggregationFromText('sum of revenue', headers);
    expect(req).not.toBeNull();
    expect(req!.operation).toBe('sum');
    expect(req!.column).toBe('Revenue');
  });
});

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------

describe('groupBy', () => {
  it('groups data by a categorical column', () => {
    const data = simpleData();
    const result = groupBy(data, 'Region');
    expect(result).not.toBeNull();
    expect(result!.groupColumn).toBe('Region');
    // 3 unique regions: US, EU, APAC
    expect(result!.groups).toHaveLength(3);
  });

  it('computes correct counts per group', () => {
    const data = simpleData();
    const result = groupBy(data, 'Region')!;
    const usGroup = result.groups.find((g) => g.groupValue === 'US');
    expect(usGroup).toBeDefined();
    expect(usGroup!.count).toBe(2); // Alice and Charlie
  });

  it('computes sum aggregation for numeric columns per group', () => {
    const data = simpleData();
    const result = groupBy(data, 'Region')!;
    const usGroup = result.groups.find((g) => g.groupValue === 'US')!;
    // Alice=100, Charlie=150 => sum=250
    expect(usGroup.aggregations['Sales']).toBe(250);
  });

  it('sorts groups by groupValue alphabetically', () => {
    const data = simpleData();
    const result = groupBy(data, 'Region')!;
    const values = result.groups.map((g) => String(g.groupValue));
    const sorted = [...values].sort();
    expect(values).toEqual(sorted);
  });

  it('returns null for non-existent group column', () => {
    const data = simpleData();
    const result = groupBy(data, 'NonExistent');
    expect(result).toBeNull();
  });

  it('lists aggregated columns in result', () => {
    const data = simpleData();
    const result = groupBy(data, 'Region')!;
    expect(result.aggregatedColumns.length).toBeGreaterThan(0);
    const salesAgg = result.aggregatedColumns.find((c) => c.column === 'Sales');
    expect(salesAgg).toBeDefined();
    expect(salesAgg!.operation).toBe('sum');
  });

  it('handles groupBy on a column with partial header match', () => {
    const data = mixedData();
    // "category" should match "Category" header
    const result = groupBy(data, 'category');
    expect(result).not.toBeNull();
    expect(result!.groupColumn).toBe('Category');
  });

  it('handles data with no numeric columns for aggregation', () => {
    const data: CsvData = {
      headers: ['Name', 'City'],
      rows: [
        { Name: 'Alice', City: 'NYC' },
        { Name: 'Bob', City: 'NYC' },
        { Name: 'Charlie', City: 'LA' },
      ],
    };
    const result = groupBy(data, 'City');
    expect(result).not.toBeNull();
    // Should still have groups with counts
    expect(result!.groups).toHaveLength(2);
    const nycGroup = result!.groups.find((g) => g.groupValue === 'NYC');
    expect(nycGroup!.count).toBe(2);
  });

  it('handles empty data rows', () => {
    const data: CsvData = { headers: ['Name', 'Value'], rows: [] };
    const result = groupBy(data, 'Name');
    expect(result).not.toBeNull();
    expect(result!.groups).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// sortData
// ---------------------------------------------------------------------------

describe('sortData', () => {
  it('sorts numeric column in ascending order', () => {
    const data = simpleData();
    const sorted = sortData(data, { column: 'Sales', direction: 'asc' });
    const sales = sorted.rows.map((r) => Number(r['Sales']));
    expect(sales).toEqual([100, 150, 200, 300]);
  });

  it('sorts numeric column in descending order', () => {
    const data = simpleData();
    const sorted = sortData(data, { column: 'Sales', direction: 'desc' });
    const sales = sorted.rows.map((r) => Number(r['Sales']));
    expect(sales).toEqual([300, 200, 150, 100]);
  });

  it('sorts string column in ascending order', () => {
    const data = simpleData();
    const sorted = sortData(data, { column: 'Name', direction: 'asc' });
    const names = sorted.rows.map((r) => r['Name']);
    expect(names).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
  });

  it('sorts string column in descending order', () => {
    const data = simpleData();
    const sorted = sortData(data, { column: 'Name', direction: 'desc' });
    const names = sorted.rows.map((r) => r['Name']);
    expect(names).toEqual(['Diana', 'Charlie', 'Bob', 'Alice']);
  });

  it('preserves headers after sorting', () => {
    const data = simpleData();
    const sorted = sortData(data, { column: 'Sales', direction: 'asc' });
    expect(sorted.headers).toEqual(data.headers);
  });

  it('does not mutate original data', () => {
    const data = simpleData();
    const originalFirst = data.rows[0]['Name'];
    sortData(data, { column: 'Sales', direction: 'desc' });
    expect(data.rows[0]['Name']).toBe(originalFirst);
  });

  it('returns original data when column does not exist', () => {
    const data = simpleData();
    const sorted = sortData(data, { column: 'NonExistent', direction: 'asc' });
    expect(sorted).toEqual(data);
  });

  it('handles sorting on column with mixed types', () => {
    const data = parseCsv(NAN_CSV);
    const sorted = sortData(data, { column: 'Value', direction: 'asc' });
    expect(sorted.rows).toHaveLength(data.rows.length);
  });

  it('handles empty rows', () => {
    const data: CsvData = { headers: ['A'], rows: [] };
    const sorted = sortData(data, { column: 'A', direction: 'asc' });
    expect(sorted.rows).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// computeSummary
// ---------------------------------------------------------------------------

describe('computeSummary', () => {
  it('returns correct row count', () => {
    const data = simpleData();
    const summary = computeSummary(data);
    expect(summary.rowCount).toBe(4);
  });

  it('identifies numeric columns with correct stats', () => {
    const data = simpleData();
    const summary = computeSummary(data);
    const salesCol = summary.columns.find((c) => c.column === 'Sales');
    expect(salesCol).toBeDefined();
    expect(salesCol!.type).toBe('numeric');
    expect(salesCol!.sum).toBe(750);
    expect(salesCol!.avg).toBe(187.5);
    expect(salesCol!.min).toBe(100);
    expect(salesCol!.max).toBe(300);
  });

  it('identifies categorical columns with unique values count', () => {
    const data = simpleData();
    const summary = computeSummary(data);
    const regionCol = summary.columns.find((c) => c.column === 'Region');
    expect(regionCol).toBeDefined();
    expect(regionCol!.type).toBe('categorical');
    expect(regionCol!.uniqueValues).toBe(3); // US, EU, APAC
  });

  it('returns top values for categorical columns sorted by frequency', () => {
    const data = simpleData();
    const summary = computeSummary(data);
    const regionCol = summary.columns.find((c) => c.column === 'Region')!;
    expect(regionCol.topValues).toBeDefined();
    // US appears 2 times, others 1 time each
    expect(regionCol.topValues![0].value).toBe('US');
    expect(regionCol.topValues![0].count).toBe(2);
  });

  it('limits top values to 5', () => {
    // Create data with many categories
    const rows = Array.from({ length: 20 }, (_, i) => ({
      Name: `Item${i}`,
      Cat: `Cat${i % 10}`,
    }));
    const data: CsvData = { headers: ['Name', 'Cat'], rows };
    const summary = computeSummary(data);
    const catCol = summary.columns.find((c) => c.column === 'Cat')!;
    expect(catCol.topValues!.length).toBeLessThanOrEqual(5);
  });

  it('handles empty data', () => {
    const data: CsvData = { headers: ['A', 'B'], rows: [] };
    const summary = computeSummary(data);
    expect(summary.rowCount).toBe(0);
    expect(summary.columns).toHaveLength(2);
  });

  it('handles single row data', () => {
    const data = parseCsv(SINGLE_ROW_CSV);
    const summary = computeSummary(data);
    expect(summary.rowCount).toBe(1);
  });

  it('rounds numeric stats to 2 decimal places', () => {
    const data = mixedData();
    const summary = computeSummary(data);
    const priceCol = summary.columns.find((c) => c.column === 'Price');
    if (priceCol && priceCol.type === 'numeric') {
      const avgStr = String(priceCol.avg);
      const decPart = avgStr.split('.')[1];
      expect(!decPart || decPart.length <= 2).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// parseGroupByFromText
// ---------------------------------------------------------------------------

describe('parseGroupByFromText', () => {
  const headers = ['Region', 'Category', 'Sales'];

  it('parses "group by region" correctly', () => {
    const col = parseGroupByFromText('group by region', headers);
    expect(col).toBe('Region');
  });

  it('parses "grouped by category" correctly', () => {
    const col = parseGroupByFromText('grouped by category', headers);
    expect(col).toBe('Category');
  });

  it('returns null when no group by pattern found', () => {
    const col = parseGroupByFromText('sort by region', headers);
    expect(col).toBeNull();
  });

  it('returns null when column does not exist', () => {
    const col = parseGroupByFromText('group by foobar', headers);
    expect(col).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseSortFromText
// ---------------------------------------------------------------------------

describe('parseSortFromText', () => {
  const headers = ['Name', 'Sales', 'Region'];

  it('parses "sort by sales desc" correctly', () => {
    const req = parseSortFromText('sort by sales desc', headers);
    expect(req).not.toBeNull();
    expect(req!.column).toBe('Sales');
    expect(req!.direction).toBe('desc');
  });

  it('parses "order by name ascending" correctly', () => {
    const req = parseSortFromText('order by name ascending', headers);
    expect(req).not.toBeNull();
    expect(req!.column).toBe('Name');
    expect(req!.direction).toBe('asc');
  });

  it('parses "sorted by sales descending" correctly', () => {
    const req = parseSortFromText('sorted by sales descending', headers);
    expect(req).not.toBeNull();
    expect(req!.column).toBe('Sales');
    expect(req!.direction).toBe('desc');
  });

  it('defaults to desc when no direction specified', () => {
    const req = parseSortFromText('sort by sales', headers);
    expect(req).not.toBeNull();
    expect(req!.direction).toBe('desc');
  });

  it('returns null when no sort pattern found', () => {
    const req = parseSortFromText('group by region', headers);
    expect(req).toBeNull();
  });

  it('returns null when column does not match headers', () => {
    const req = parseSortFromText('sort by foobar', headers);
    expect(req).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Large dataset stress test
// ---------------------------------------------------------------------------

describe('large dataset handling', () => {
  it('handles 10,000 rows without error', () => {
    const rows: Record<string, string | number>[] = [];
    for (let i = 0; i < 10_000; i++) {
      rows.push({ Id: i, Value: Math.random() * 1000, Category: `Cat${i % 5}` });
    }
    const data: CsvData = { headers: ['Id', 'Value', 'Category'], rows };

    const agg = computeAggregation(data, { operation: 'count', column: '*' });
    expect(agg.result).toBe(10_000);

    const summary = computeSummary(data);
    expect(summary.rowCount).toBe(10_000);

    const grouped = groupBy(data, 'Category');
    expect(grouped).not.toBeNull();
    expect(grouped!.groups).toHaveLength(5);

    const sorted = sortData(data, { column: 'Value', direction: 'asc' });
    expect(sorted.rows).toHaveLength(10_000);
    // Verify ascending order
    for (let i = 1; i < sorted.rows.length; i++) {
      expect(Number(sorted.rows[i]['Value'])).toBeGreaterThanOrEqual(Number(sorted.rows[i - 1]['Value']));
    }
  });
});
