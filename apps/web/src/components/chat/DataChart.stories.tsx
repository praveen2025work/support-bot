import type { Meta, StoryObj } from '@storybook/react';
import { DataChart } from './DataChart';

const meta: Meta<typeof DataChart> = {
  title: 'Chat/DataChart',
  component: DataChart,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof DataChart>;

export const BarChart: Story = {
  args: {
    data: [
      { month: 'January', revenue: 125000, costs: 89000 },
      { month: 'February', revenue: 132000, costs: 94000 },
      { month: 'March', revenue: 141000, costs: 95000 },
      { month: 'April', revenue: 155000, costs: 98000 },
    ],
  },
};

export const LineChart: Story = {
  args: {
    data: [
      { date: '2026-03-01', daily_active: 15420, monthly_active: 48300 },
      { date: '2026-03-02', daily_active: 14890, monthly_active: 48150 },
      { date: '2026-03-03', daily_active: 16100, monthly_active: 48500 },
      { date: '2026-03-04', daily_active: 15750, monthly_active: 48400 },
      { date: '2026-03-05', daily_active: 13200, monthly_active: 48100 },
    ],
  },
};

export const SingleColumn: Story = {
  args: {
    data: [
      { service: 'auth-service', errors: 23 },
      { service: 'payment-service', errors: 8 },
      { service: 'api-gateway', errors: 45 },
    ],
  },
};

export const EmptyData: Story = {
  args: { data: [] },
};
