import type { Meta, StoryObj } from '@storybook/react';
import { FavoritesPanel } from './FavoritesPanel';
import type { FavoriteItem } from '@/types/dashboard';
import { fn } from '@storybook/test';

const sampleFavorites: FavoriteItem[] = [
  { id: 'fav1', queryName: 'monthly_revenue', label: 'Revenue Report', groupId: 'default', defaultFilters: { region: 'US' }, createdAt: new Date().toISOString() },
  { id: 'fav2', queryName: 'active_users', label: 'Active Users', groupId: 'default', defaultFilters: {}, createdAt: new Date().toISOString() },
  { id: 'fav3', queryName: 'daily_orders', label: 'Order Volume', groupId: 'default', defaultFilters: { region: 'EU' }, createdAt: new Date().toISOString() },
];

const meta: Meta<typeof FavoritesPanel> = {
  title: 'Dashboard/FavoritesPanel',
  component: FavoritesPanel,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    favorites: sampleFavorites,
    groupId: 'default',
    userName: 'jdoe',
    onRemove: fn(),
    onSaveFilters: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof FavoritesPanel>;

export const Default: Story = {};

export const Empty: Story = {
  args: { favorites: [] },
};

export const SingleFavorite: Story = {
  args: { favorites: [sampleFavorites[0]] },
};
