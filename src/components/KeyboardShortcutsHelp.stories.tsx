import type { Meta, StoryObj } from '@storybook/react';
import { KeyboardShortcutsHelp } from './KeyboardShortcutsHelp';
import { fn } from '@storybook/test';

const meta: Meta<typeof KeyboardShortcutsHelp> = {
  title: 'Components/KeyboardShortcutsHelp',
  component: KeyboardShortcutsHelp,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: { onClose: fn() },
};

export default meta;
type Story = StoryObj<typeof KeyboardShortcutsHelp>;

export const Default: Story = {};
