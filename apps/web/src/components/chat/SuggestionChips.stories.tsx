import type { Meta, StoryObj } from '@storybook/react';
import { SuggestionChips } from './SuggestionChips';
import { fn } from '@storybook/test';

const meta: Meta<typeof SuggestionChips> = {
  title: 'Chat/SuggestionChips',
  component: SuggestionChips,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: { onSelect: fn() },
};

export default meta;
type Story = StoryObj<typeof SuggestionChips>;

export const Default: Story = {
  args: {
    suggestions: ['Show revenue report', 'List all queries', 'Active users today'],
  },
};

export const ManySuggestions: Story = {
  args: {
    suggestions: [
      'Monthly revenue',
      'Active users',
      'Error rate',
      'Customer churn',
      'Infrastructure costs',
      'Hiring pipeline',
      'Daily orders',
      'Performance metrics',
    ],
  },
};

export const SingleSuggestion: Story = {
  args: { suggestions: ['Help'] },
};
