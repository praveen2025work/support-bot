import type { Meta, StoryObj } from '@storybook/react';
import { SearchBar } from './SearchBar';
import { fn } from '@storybook/test';

const meta: Meta<typeof SearchBar> = {
  title: 'Dashboard/SearchBar',
  component: SearchBar,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    groupId: 'default',
    onSelect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = {};

export const WithGroupId: Story = {
  args: { groupId: 'engineering' },
};
