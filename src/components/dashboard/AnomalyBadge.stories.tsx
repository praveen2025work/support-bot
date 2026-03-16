import type { Meta, StoryObj } from '@storybook/react';
import { AnomalyBadge, AnomalyAlert } from './AnomalyBadge';

const warningAnomaly = {
  queryName: 'monthly_revenue',
  columnName: 'revenue',
  currentValue: 185000,
  expectedMean: 130000,
  zScore: 2.3,
  severity: 'warning' as const,
  direction: 'spike' as const,
  message: 'Revenue is 42% above the expected baseline',
};

const criticalAnomaly = {
  queryName: 'error_rate',
  columnName: 'errors',
  currentValue: 450,
  expectedMean: 25,
  zScore: 4.1,
  severity: 'critical' as const,
  direction: 'spike' as const,
  message: 'Error count is 1700% above the expected baseline',
};

const dropAnomaly = {
  queryName: 'active_users',
  columnName: 'daily_active',
  currentValue: 5200,
  expectedMean: 15000,
  zScore: -3.5,
  severity: 'critical' as const,
  direction: 'drop' as const,
  message: 'Daily active users dropped 65% below baseline',
};

// ── AnomalyBadge ──
const badgeMeta: Meta<typeof AnomalyBadge> = {
  title: 'Dashboard/AnomalyBadge',
  component: AnomalyBadge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

export default badgeMeta;
type BadgeStory = StoryObj<typeof AnomalyBadge>;

export const Warning: BadgeStory = {
  args: { anomalies: [warningAnomaly] },
};

export const Critical: BadgeStory = {
  args: { anomalies: [criticalAnomaly] },
};

export const MultipleAnomalies: BadgeStory = {
  args: { anomalies: [warningAnomaly, criticalAnomaly, dropAnomaly] },
};

// ── AnomalyAlert (block) ──
export const AlertWarning: BadgeStory = {
  render: () => <AnomalyAlert anomalies={[warningAnomaly]} />,
};

export const AlertCritical: BadgeStory = {
  render: () => <AnomalyAlert anomalies={[criticalAnomaly, dropAnomaly]} />,
};
