import type { Meta, StoryObj } from '@storybook/react';
import { AddFavoriteModal } from './AddFavoriteModal';
import { fn } from '@storybook/test';

const sampleQueries = [
  { name: 'monthly_revenue', description: 'Monthly revenue breakdown', type: 'api', filters: [{ key: 'region', binding: 'query' }] },
  { name: 'active_users', description: 'Daily active users', type: 'api', filters: [{ key: 'date_range', binding: 'body' }] },
  { name: 'error_rate', description: 'Error rates by service', type: 'api', filters: [] },
  { name: 'daily_orders', description: 'Daily order volume', type: 'url', filters: [{ key: 'region', binding: 'query' }] },
];

const meta: Meta<typeof AddFavoriteModal> = {
  title: 'Dashboard/AddFavoriteModal',
  component: AddFavoriteModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    queries: sampleQueries,
    groupId: 'default',
    onAdd: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AddFavoriteModal>;

export const Default: Story = {};

export const NoQueries: Story = {
  args: { queries: [] },
};
