import { extractNumericColumns, computeColumnStats } from '@/core/anomaly/numeric-utils';
import type { CsvData } from '@/core/api-connector/csv-analyzer';

/** Compiled insight report with HTML and CSV summary. */
export interface InsightReport {
  html: string;
  csvSummary: string;
  sections: string[];
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format a number for display (up to 2 decimal places, with commas).
 */
function formatNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

/**
 * Compile an insight report from dataset and analysis results.
 *
 * Generates a self-contained HTML report with inline styles containing
 * a data profile summary, column statistics table, and any analysis
 * results passed in. Also produces a CSV summary with one row per column.
 *
 * @param data            - Parsed CSV data.
 * @param analysisResults - Named analysis results to include in the report.
 * @returns An InsightReport with HTML, CSV summary, and section names.
 */
export function compileInsightReport(
  data: CsvData,
  analysisResults: Record<string, unknown>
): InsightReport {
  const sections: string[] = [];
  const htmlParts: string[] = [];

  // Inline style constants
  const baseStyle = 'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #333; max-width: 900px; margin: 0 auto; padding: 20px;';
  const headerStyle = 'color: #1a1a2e; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 24px;';
  const tableStyle = 'border-collapse: collapse; width: 100%; margin: 12px 0;';
  const thStyle = 'background: #f5f5f5; border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-weight: 600;';
  const tdStyle = 'border: 1px solid #ddd; padding: 8px 12px;';
  const cardStyle = 'background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin: 12px 0;';

  // Header
  htmlParts.push(`<div style="${baseStyle}">`);
  htmlParts.push(`<h1 style="${headerStyle}">Data Insight Report</h1>`);

  // Section 1: Data Profile Summary
  sections.push('Data Profile');
  const numericCols = extractNumericColumns(data.rows as Record<string, unknown>[]);
  const nonNumericCols = data.headers.filter((h) => !numericCols.includes(h));

  htmlParts.push(`<h2 style="${headerStyle}">Data Profile</h2>`);
  htmlParts.push(`<div style="${cardStyle}">`);
  htmlParts.push(`<p><strong>Rows:</strong> ${formatNumber(data.rows.length)}</p>`);
  htmlParts.push(`<p><strong>Columns:</strong> ${data.headers.length} (${numericCols.length} numeric, ${nonNumericCols.length} other)</p>`);
  htmlParts.push(`<p><strong>Column names:</strong> ${data.headers.map(escapeHtml).join(', ')}</p>`);
  htmlParts.push(`</div>`);

  // Section 2: Column Statistics
  sections.push('Column Statistics');
  htmlParts.push(`<h2 style="${headerStyle}">Column Statistics</h2>`);
  htmlParts.push(`<table style="${tableStyle}">`);
  htmlParts.push(`<tr>`);
  htmlParts.push(`<th style="${thStyle}">Column</th>`);
  htmlParts.push(`<th style="${thStyle}">Type</th>`);
  htmlParts.push(`<th style="${thStyle}">Non-Null</th>`);
  htmlParts.push(`<th style="${thStyle}">Unique</th>`);
  htmlParts.push(`<th style="${thStyle}">Mean</th>`);
  htmlParts.push(`<th style="${thStyle}">Std Dev</th>`);
  htmlParts.push(`<th style="${thStyle}">Min</th>`);
  htmlParts.push(`<th style="${thStyle}">Max</th>`);
  htmlParts.push(`</tr>`);

  // CSV summary header
  const csvRows: string[] = ['Column,Type,NonNull,Unique,Mean,StdDev,Min,Max'];

  for (const header of data.headers) {
    const values = data.rows.map((r) => r[header]);
    const nonNull = values.filter((v) => v !== undefined && v !== null && v !== '');
    const unique = new Set(nonNull.map(String)).size;
    const isNumeric = numericCols.includes(header);

    let type = 'string';
    let mean = '';
    let stdDev = '';
    let min = '';
    let max = '';

    if (isNumeric) {
      type = 'numeric';
      const nums = nonNull.map((v) => typeof v === 'number' ? v : parseFloat(String(v))).filter((v) => !isNaN(v));
      if (nums.length > 0) {
        const stats = computeColumnStats(nums);
        mean = formatNumber(stats.mean);
        stdDev = formatNumber(stats.stdDev);
        min = formatNumber(stats.min);
        max = formatNumber(stats.max);
      }
    }

    htmlParts.push(`<tr>`);
    htmlParts.push(`<td style="${tdStyle}">${escapeHtml(header)}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${type}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${nonNull.length}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${unique}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${mean}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${stdDev}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${min}</td>`);
    htmlParts.push(`<td style="${tdStyle}">${max}</td>`);
    htmlParts.push(`</tr>`);

    csvRows.push(
      `"${header}","${type}",${nonNull.length},${unique},${mean || ''},${stdDev || ''},${min || ''},${max || ''}`
    );
  }

  htmlParts.push(`</table>`);

  // Section 3: Key Insights
  sections.push('Key Insights');
  htmlParts.push(`<h2 style="${headerStyle}">Key Insights</h2>`);
  htmlParts.push(`<ul style="line-height: 1.8;">`);

  // Auto-generate basic insights
  if (data.rows.length > 0) {
    htmlParts.push(`<li>Dataset contains <strong>${formatNumber(data.rows.length)}</strong> records across <strong>${data.headers.length}</strong> columns.</li>`);
  }

  // Check for missing data
  const missingCols = data.headers.filter((h) => {
    const nullCount = data.rows.filter((r) => r[h] === undefined || r[h] === null || r[h] === '').length;
    return nullCount > 0;
  });
  if (missingCols.length > 0) {
    htmlParts.push(`<li><strong>${missingCols.length}</strong> column(s) contain missing values.</li>`);
  }

  // Numeric column ranges
  for (const col of numericCols.slice(0, 3)) {
    const nums = data.rows
      .map((r) => typeof r[col] === 'number' ? r[col] as number : parseFloat(String(r[col])))
      .filter((v) => !isNaN(v));
    if (nums.length > 0) {
      const colMin = Math.min(...nums);
      const colMax = Math.max(...nums);
      htmlParts.push(`<li><strong>${escapeHtml(col)}</strong> ranges from ${formatNumber(colMin)} to ${formatNumber(colMax)}.</li>`);
    }
  }

  htmlParts.push(`</ul>`);

  // Section 4: Analysis Results (if any)
  const resultKeys = Object.keys(analysisResults);
  if (resultKeys.length > 0) {
    sections.push('Analysis Results');
    htmlParts.push(`<h2 style="${headerStyle}">Analysis Results</h2>`);

    for (const key of resultKeys) {
      const value = analysisResults[key];
      htmlParts.push(`<h3 style="color: #2d3436; margin-top: 16px;">${escapeHtml(key)}</h3>`);
      htmlParts.push(`<div style="${cardStyle}">`);

      if (typeof value === 'object' && value !== null) {
        const obj = value as Record<string, unknown>;
        // Render nlDescription if present
        if (typeof obj.nlDescription === 'string') {
          htmlParts.push(`<p>${escapeHtml(obj.nlDescription)}</p>`);
        }
        // Render accuracy if present
        if (typeof obj.accuracy === 'number') {
          htmlParts.push(`<p><strong>Accuracy:</strong> ${(obj.accuracy * 100).toFixed(1)}%</p>`);
        }
        // Render k if present
        if (typeof obj.k === 'number') {
          htmlParts.push(`<p><strong>Clusters:</strong> ${obj.k}</p>`);
        }
        // Render varianceExplained if present
        if (Array.isArray(obj.varianceExplained)) {
          const [pc1, pc2] = obj.varianceExplained as number[];
          htmlParts.push(`<p><strong>Variance explained:</strong> PC1 ${(pc1 * 100).toFixed(1)}%, PC2 ${(pc2 * 100).toFixed(1)}%</p>`);
        }
      } else {
        htmlParts.push(`<p>${escapeHtml(String(value))}</p>`);
      }

      htmlParts.push(`</div>`);
    }
  }

  htmlParts.push(`</div>`);

  return {
    html: htmlParts.join('\n'),
    csvSummary: csvRows.join('\n'),
    sections,
  };
}
