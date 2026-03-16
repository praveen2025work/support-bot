import type { Meta, StoryObj } from '@storybook/react';
import { DashboardHeader } from './DashboardHeader';
import { fn } from '@storybook/test';

const sampleGroups = [
  { id: 'default', name: 'Default Bot', description: 'General assistant' },
  { id: 'engineering', name: 'Engineering Bot', description: 'Engineering queries' },
  { id: 'finance', name: 'Finance Bot', description: 'Finance reports' },
];

const meta: Meta<typeof DashboardHeader> = {
  title: 'Dashboard/DashboardHeader',
  component: DashboardHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    userName: 'jdoe',
    groupId: 'default',
    groups: sampleGroups,
    onGroupChange: fn(),
    onAddFavorite: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof DashboardHeader>;

export const Default: Story = {};

export const NoUser: Story = {
  args: { userName: undefined },
};
