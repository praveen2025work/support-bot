import type { Meta, StoryObj } from '@storybook/react';
import { ErrorBoundary } from './ErrorBoundary';

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Chat/ErrorBoundary',
  component: ErrorBoundary,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
};

export default meta;
type Story = StoryObj<typeof ErrorBoundary>;

export const NoError: Story = {
  args: {
    children: <div className="p-4 bg-green-50 rounded">Content renders normally</div>,
  },
};

function BrokenComponent(): React.JSX.Element {
  throw new Error('Something went wrong!');
}

export const WithError: Story = {
  args: {
    children: <BrokenComponent />,
  },
};
