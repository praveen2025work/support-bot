/**
 * Jest configuration — kept in plain JS so CI doesn't need ts-node
 * just to load the config file.
 *
 * The repo overloads the `@/` path alias: in the Next.js UI it means
 * `src/*`, but in the engine (`services/engine`) it means
 * `services/engine/src/*`. Both sides additionally share top-level folder
 * names (`core/`, `config/`, `lib/`, `training/`, `types/`), so a single
 * `moduleNameMapper` cannot disambiguate — the same specifier (`@/lib/...`)
 * resolves to a different file depending on which side imports it.
 *
 * We therefore split into two Jest projects keyed on the test's location:
 *   - "app"    → UI + integration tests; `@/*` resolves to `src/*`
 *   - "engine" → tests under `tests/nlp/` import engine source (which uses
 *                engine-internal `@/core/*`, `@/lib/*` aliases), so `@/*`
 *                resolves to `services/engine/src/*`.
 *
 * @type {import('jest').Config}
 */

/**
 * Shared ts-jest transform. `aliasTarget` aligns ts-jest's compile-time `@/`
 * resolution with the project's runtime `moduleNameMapper` so types and
 * modules resolve against the same source tree.
 *
 * @param {string} aliasTarget
 * @returns {import('@jest/types').Config.InitialProjectOptions['transform']}
 */
const tsJestTransform = (aliasTarget) => ({
  "^.+\\.tsx?$": [
    "ts-jest",
    {
      tsconfig: {
        jsx: "react-jsx",
        module: "commonjs",
        moduleResolution: "node",
        esModuleInterop: true,
        paths: { "@/*": [aliasTarget] },
      },
    },
  ],
});

/** @type {import('jest').Config} */
const config = {
  projects: [
    {
      displayName: "app",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/src", "<rootDir>/tests"],
      // tests/nlp resolve `@/` against the engine — handled by the "engine"
      // project below, so exclude them here to avoid double-running.
      testPathIgnorePatterns: [
        "/node_modules/",
        "/.next/",
        "<rootDir>/tests/nlp/",
      ],
      moduleNameMapper: {
        // A handful of engine-only subpaths surface in app-located tests that
        // import engine source; route them to the engine tree explicitly.
        "^@/training/(.*)$": "<rootDir>/services/engine/src/training/$1",
        "^@/lib/singleton$": "<rootDir>/services/engine/src/lib/singleton",
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      transform: tsJestTransform("./src/*"),
      setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
    },
    {
      displayName: "engine",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/tests/nlp"],
      testPathIgnorePatterns: [
        "/node_modules/",
        "/.next/",
        // Manual calibration experiment, not a regression check: it sweeps a
        // weight×threshold grid (120s budget) and overwrites the tracked file
        // tests/nlp/threshold-calibration-results.md, which would dirty the
        // working tree on every run. Run it explicitly when tuning:
        //   npm test -- tests/nlp/threshold-calibration.test.ts
        "threshold-calibration\\.test\\.ts$",
      ],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/services/engine/src/$1",
      },
      transform: tsJestTransform("./services/engine/src/*"),
    },
  ],
};

module.exports = config;
