import {
  listSchedules,
  markScheduleRun,
  type ScheduledQuery,
} from "./schedule-service";
import { sendEmail } from "../email/email-service";
import { logger } from "@/lib/logger";

const CHECK_INTERVAL_MS = 60_000; // every 60 seconds
let intervalHandle: ReturnType<typeof setInterval> | null = null;

/**
 * Start the schedule executor loop.
 * Checks every 60s for due schedules, executes them, and sends email.
 */
export function startScheduleExecutor(): void {
  if (intervalHandle) return; // already running

  logger.info("Schedule executor started (checking every 60s)");
  intervalHandle = setInterval(runDueSchedules, CHECK_INTERVAL_MS);

  // Also run once immediately on startup
  runDueSchedules();
}

export function stopScheduleExecutor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
    logger.info("Schedule executor stopped");
  }
}

async function runDueSchedules(): Promise<void> {
  try {
    const schedules = await listSchedules();
    const now = new Date();

    for (const schedule of schedules) {
      if (!schedule.enabled) continue;
      if (!schedule.nextRunAt) continue;

      const nextRun = new Date(schedule.nextRunAt);
      if (nextRun > now) continue;

      // This schedule is due
      logger.info(
        { id: schedule.id, queryName: schedule.queryName },
        "Executing scheduled query",
      );

      await executeSchedule(schedule);
    }
  } catch (err) {
    logger.error(
      { error: (err as Error).message },
      "Schedule executor tick failed",
    );
  }
}

async function executeSchedule(schedule: ScheduledQuery): Promise<void> {
  try {
    // Build a summary of what was scheduled
    const filterSummary = Object.entries(schedule.filters)
      .map(([k, v]) => `${k} = ${v}`)
      .join(", ");

    const runTime = new Date().toLocaleString("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    const htmlBody = `
      <html>
      <body style="font-family: Arial, sans-serif; color: #333;">
        <h2>Scheduled Report: ${schedule.label || schedule.queryName}</h2>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 4px 12px; font-weight: bold;">Query</td><td style="padding: 4px 12px;">${schedule.queryName}</td></tr>
          <tr><td style="padding: 4px 12px; font-weight: bold;">Group</td><td style="padding: 4px 12px;">${schedule.groupId}</td></tr>
          <tr><td style="padding: 4px 12px; font-weight: bold;">Filters</td><td style="padding: 4px 12px;">${filterSummary || "None"}</td></tr>
          <tr><td style="padding: 4px 12px; font-weight: bold;">Schedule</td><td style="padding: 4px 12px;">${schedule.cronExpression}</td></tr>
          <tr><td style="padding: 4px 12px; font-weight: bold;">Run #</td><td style="padding: 4px 12px;">${schedule.runCount + 1}</td></tr>
          <tr><td style="padding: 4px 12px; font-weight: bold;">Executed At</td><td style="padding: 4px 12px;">${runTime}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">
          This is an automated report from the Chatbot Platform.
          To modify or disable this schedule, visit the Dashboard &gt; Schedule settings.
        </p>
      </body>
      </html>
    `.trim();

    // Send email if recipients configured
    const recipients = (schedule as ScheduledQuery & { recipients?: string[] })
      .recipients;
    if (recipients && recipients.length > 0) {
      await sendEmail({
        to: recipients,
        subject: `Scheduled Report: ${schedule.label || schedule.queryName} — ${runTime}`,
        htmlBody,
      });
    } else {
      logger.info(
        { id: schedule.id },
        "No recipients configured — skipping email",
      );
    }

    // Mark as run (updates lastRunAt, runCount, nextRunAt)
    await markScheduleRun(schedule.id);

    logger.info(
      { id: schedule.id, runCount: schedule.runCount + 1 },
      "Schedule executed successfully",
    );
  } catch (err) {
    logger.error(
      { id: schedule.id, error: (err as Error).message },
      "Schedule execution failed",
    );
  }
}
