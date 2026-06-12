/**
 * Jest config for the engine's integration tests under `tests/` (auth, csv,
 * session, nlp, learning). These import engine source by relative path; the
 * engine source uses the `@/*` alias meaning `src/*`, so it is mapped here.
 *
 * The engine's fast unit tests are colocated in `src/**` and run under Vitest
 * (`npm run test:unit`). `npm test` runs both.
 *
 * @type {import('jest').Config}
 */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testPathIgnorePatterns: [
    "/node_modules/",
    "/dist/",
    // Manual calibration experiment (120s, overwrites a tracked file); run
    // explicitly when tuning: npm run test:integration -- tests/nlp/threshold-calibration.test.ts
    "threshold-calibration\\.test\\.ts$",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          types: ["jest", "node"],
          paths: { "@/*": ["./src/*"] },
        },
      },
    ],
  },
};

module.exports = config;
