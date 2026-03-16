import { promises as fsp } from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';
import { paths } from '@/lib/env-config';
import { generateId } from '@/lib/generate-id';

export interface ScheduledQuery {
  id: string;
  queryName: string;
  groupId: string;
  userId: string;
  cronExpression: string;
  filters: Record<string, string>;
  label: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
}

const SCHEDULE_FILE = path.join(paths.data.root, 'schedules.json');

async function readSchedules(): Promise<ScheduledQuery[]> {
  try {
    await fsp.access(SCHEDULE_FILE);
    return JSON.parse(await fsp.readFile(SCHEDULE_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function writeSchedules(schedules: ScheduledQuery[]): Promise<void> {
  await fsp.writeFile(SCHEDULE_FILE, JSON.stringify(schedules, null, 2), 'utf-8');
}

export async function listSchedules(userId?: string): Promise<ScheduledQuery[]> {
  const schedules = await readSchedules();
  if (userId) return schedules.filter((s) => s.userId === userId);
  return schedules;
}

export async function createSchedule(params: {
  queryName: string;
  groupId: string;
  userId: string;
  cronExpression: string;
  filters?: Record<string, string>;
  label?: string;
}): Promise<ScheduledQuery> {
  const schedules = await readSchedules();
  const schedule: ScheduledQuery = {
    id: generateId(),
    queryName: params.queryName,
    groupId: params.groupId,
    userId: params.userId,
    cronExpression: params.cronExpression,
    filters: params.filters || {},
    label: params.label || params.queryName,
    enabled: true,
    createdAt: new Date().toISOString(),
    runCount: 0,
  };
  schedule.nextRunAt = getNextRunTime(schedule.cronExpression);
  schedules.push(schedule);
  await writeSchedules(schedules);
  logger.info({ id: schedule.id, queryName: schedule.queryName }, 'Schedule created');
  return schedule;
}

export async function updateSchedule(id: string, updates: Partial<Pick<ScheduledQuery, 'cronExpression' | 'filters' | 'label' | 'enabled'>>): Promise<ScheduledQuery | null> {
  const schedules = await readSchedules();
  const idx = schedules.findIndex((s) => s.id === id);
  if (idx === -1) return null;
  Object.assign(schedules[idx], updates);
  if (updates.cronExpression) {
    schedules[idx].nextRunAt = getNextRunTime(updates.cronExpression);
  }
  await writeSchedules(schedules);
  return schedules[idx];
}

export async function deleteSchedule(id: string): Promise<boolean> {
  const schedules = await readSchedules();
  const idx = schedules.findIndex((s) => s.id === id);
  if (idx === -1) return false;
  schedules.splice(idx, 1);
  await writeSchedules(schedules);
  return true;
}

export async function markScheduleRun(id: string): Promise<void> {
  const schedules = await readSchedules();
  const schedule = schedules.find((s) => s.id === id);
  if (!schedule) return;
  schedule.lastRunAt = new Date().toISOString();
  schedule.runCount++;
  schedule.nextRunAt = getNextRunTime(schedule.cronExpression);
  await writeSchedules(schedules);
}

function getNextRunTime(cronExpression: string): string {
  // Simple next-run calculator for common patterns
  const now = new Date();
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return new Date(now.getTime() + 3600000).toISOString();

  const [minute, hour] = parts;
  const next = new Date(now);

  if (hour !== '*' && minute !== '*') {
    next.setHours(parseInt(hour), parseInt(minute), 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (minute !== '*') {
    next.setMinutes(parseInt(minute), 0, 0);
    if (next <= now) next.setHours(next.getHours() + 1);
  } else {
    next.setTime(now.getTime() + 3600000);
  }

  return next.toISOString();
}
