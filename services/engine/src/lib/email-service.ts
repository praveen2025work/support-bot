import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } from './env-config';
import { logger } from './logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;
  if (!SMTP_HOST) {
    logger.warn('SMTP_HOST not configured — email sending disabled');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    logger.warn({ to, subject }, 'Email skipped — SMTP not configured');
    return false;
  }
  try {
    await t.sendMail({ from: SMTP_FROM, to, subject, html });
    logger.info({ to, subject }, 'Email sent');
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, 'Failed to send email');
    return false;
  }
}

/** Check if SMTP is configured */
export function isEmailConfigured(): boolean {
  return !!SMTP_HOST;
}

// ── Dashboard email HTML renderer ───────────────────────────────────

interface CardResult {
  label: string;
  queryName: string;
  data?: Record<string, unknown>[];
  headers?: string[];
  rowCount?: number;
  executionMs?: number;
  error?: string;
}

export function renderDashboardEmail(dashboardName: string, results: CardResult[]): string {
  const dateStr = new Date().toLocaleString();

  const cardSections = results.map((card) => {
    if (card.error) {
      return `
        <div style="margin-bottom:24px;border:1px solid #fecaca;border-radius:8px;overflow:hidden">
          <div style="background:#fef2f2;padding:12px 16px;font-weight:600;font-size:14px;color:#991b1b">${card.label}</div>
          <div style="padding:12px 16px;font-size:13px;color:#dc2626">Error: ${card.error}</div>
        </div>`;
    }

    const rows = card.data || [];
    const headers = card.headers || (rows.length > 0 ? Object.keys(rows[0]) : []);
    const maxRows = 50;
    const displayRows = rows.slice(0, maxRows);

    const headerCells = headers.map((h) => `<th style="padding:6px 10px;text-align:left;font-size:11px;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;background:#f8fafc">${h}</th>`).join('');

    const bodyCells = displayRows.map((row, i) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      const cells = headers.map((h) => `<td style="padding:5px 10px;font-size:12px;color:#334155;border-bottom:1px solid #f1f5f9">${row[h] ?? ''}</td>`).join('');
      return `<tr style="background:${bg}">${cells}</tr>`;
    }).join('');

    const truncNote = rows.length > maxRows ? `<p style="font-size:11px;color:#94a3b8;margin:4px 0 0">Showing ${maxRows} of ${rows.length} rows</p>` : '';

    return `
      <div style="margin-bottom:24px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden">
        <div style="background:#f1f5f9;padding:12px 16px;display:flex;justify-content:space-between;align-items:center">
          <span style="font-weight:600;font-size:14px;color:#1e293b">${card.label}</span>
          <span style="font-size:11px;color:#64748b">${card.rowCount ?? rows.length} rows${card.executionMs ? ` • ${card.executionMs}ms` : ''}</span>
        </div>
        ${rows.length > 0 ? `
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse">
              <thead><tr>${headerCells}</tr></thead>
              <tbody>${bodyCells}</tbody>
            </table>
          </div>
          ${truncNote}
        ` : '<div style="padding:16px;font-size:13px;color:#94a3b8">No data</div>'}
      </div>`;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
    <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
      <div style="max-width:960px;margin:0 auto;padding:24px">
        <div style="background:#ffffff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,0.1);overflow:hidden">
          <!-- Header -->
          <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:24px 32px;color:white">
            <h1 style="margin:0;font-size:22px;font-weight:700">${dashboardName}</h1>
            <p style="margin:6px 0 0;font-size:13px;opacity:0.85">Dashboard Newsletter • ${dateStr}</p>
          </div>
          <!-- Content -->
          <div style="padding:24px 32px">
            ${cardSections}
          </div>
          <!-- Footer -->
          <div style="padding:16px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center">
            MITR AI Dashboard Newsletter — Auto-generated report
          </div>
        </div>
      </div>
    </body>
    </html>`;
}
