import type { Meta, StoryObj } from '@storybook/react';
import { TablePagination } from './TablePagination';
import { fn } from '@storybook/test';

const meta: Meta<typeof TablePagination> = {
  title: 'Chat/TablePagination',
  component: TablePagination,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    onPageChange: fn(),
    onExport: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TablePagination>;

export const Default: Story = {
  args: { totalRows: 100, pageSize: 20 },
};

export const SmallDataset: Story = {
  args: { totalRows: 5, pageSize: 20 },
};

export const LargeDataset: Story = {
  args: { totalRows: 1000, pageSize: 50 },
};

export const NoExport: Story = {
  args: { totalRows: 50, pageSize: 20, onExport: undefined },
};
