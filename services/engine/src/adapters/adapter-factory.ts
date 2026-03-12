import type { IPlatformAdapter } from './adapter.interface';
import { WebAdapter } from './web/web-adapter';
import { TeamsAdapter } from './teams/teams-adapter';

const adapters: Record<string, () => IPlatformAdapter> = {
  web: () => new WebAdapter(),
  widget: () => new WebAdapter(),
  teams: () => new TeamsAdapter(),
};

export function createAdapter(platform: string): IPlatformAdapter {
  const factory = adapters[platform];
  if (!factory) throw new Error(`Unknown platform: ${platform}`);
  return factory();
}
