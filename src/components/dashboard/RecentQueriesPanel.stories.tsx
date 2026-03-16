import type { Meta, StoryObj } from '@storybook/react';
import { RecentQueriesPanel } from './RecentQueriesPanel';
import { fn } from '@storybook/test';

const sampleRecents = [
  { queryName: 'monthly_revenue', groupId: 'default', userMessage: 'run monthly revenue', intent: 'query.execute', timestamp: new Date().toISOString(), executionMs: 1250 },
  { queryName: 'active_users', groupId: 'default', userMessage: 'show active users', intent: 'query.execute', timestamp: new Date(Date.now() - 300000).toISOString(), executionMs: 890 },
  { queryName: 'error_rate', groupId: 'engineering', userMessage: 'check error rate', intent: 'query.execute', timestamp: new Date(Date.now() - 600000).toISOString(), executionMs: 5000 },
  { queryName: 'daily_orders', groupId: 'default', userMessage: 'run daily orders', intent: 'query.execute', timestamp: new Date(Date.now() - 3600000).toISOString(), executionMs: 2100 },
];

const meta: Meta<typeof RecentQueriesPanel> = {
  title: 'Dashboard/RecentQueriesPanel',
  component: RecentQueriesPanel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    recents: sampleRecents,
    onClear: fn(),
    onAddFavorite: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RecentQueriesPanel>;

export const Default: Story = {};

export const Empty: Story = {
  args: { recents: [] },
};

export const SingleRecent: Story = {
  args: { recents: [sampleRecents[0]] },
};
