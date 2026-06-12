/**
 * Ambient module shims for engine-side path aliases.
 *
 * Tests under `tests/**` import engine source via relative paths. When
 * tsc descends into those engine files it tries to resolve their
 * internal `@/...` imports — but the root tsconfig maps `@/*` to
 * `./src/*` (the Next.js app), not the engine. These declarations
 * tell tsc those engine paths exist as opaque modules; jest resolves
 * them correctly at runtime via moduleNameMapper in jest.config.ts.
 *
 * Do NOT add new entries unless an engine test import surfaces a new
 * unresolved alias — every shim here is a maintenance liability.
 */

declare module "@/lib/singleton" {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  export const singleton: any;
  export const getEngine: () => any;
  export const getNlpService: () => any;
  export const getFuzzyMatcher: () => any;
  export const getApiClient: () => any;
  export const getQueryService: () => any;
  export const getResponseGenerator: () => any;
  export const getSessionManager: () => any;
  export const getLearningService: () => any;
  export const getGroupConfig: () => any;
  export const invalidateEngine: (groupId: string) => Promise<void>;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

declare module "@/training/faq.json" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const value: any[];
  export default value;
}
