import type { Meta, StoryObj } from '@storybook/react';
import { ChatInput } from './ChatInput';
import { fn } from '@storybook/test';

const meta: Meta<typeof ChatInput> = {
  title: 'Chat/ChatInput',
  component: ChatInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  args: {
    onSend: fn(),
    disabled: false,
    onNewSession: fn(),
    onClearChat: fn(),
    onDisconnect: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ChatInput>;

export const Default: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};
