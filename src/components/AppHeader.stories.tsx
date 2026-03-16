import type { Meta, StoryObj } from '@storybook/react';
import { AppHeader } from './AppHeader';
import { fn } from '@storybook/test';

const sampleGroups = [
  { id: 'default', name: 'Default Bot', description: 'General assistant' },
  { id: 'engineering', name: 'Engineering Bot', description: 'Engineering queries' },
  { id: 'finance', name: 'Finance Bot', description: 'Finance reports' },
];

const meta: Meta<typeof AppHeader> = {
  title: 'Components/AppHeader',
  component: AppHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    groupId: 'default',
    groups: sampleGroups,
    onGroupChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof AppHeader>;

export const Default: Story = {};

export const SingleGroup: Story = {
  args: { groups: [sampleGroups[0]] },
};

export const NoGroups: Story = {
  args: { groups: [] },
};
