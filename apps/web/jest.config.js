/**
 * Jest config for the UI app. `@/*` resolves to `src/*`. Component tests opt
 * into jsdom per-file via an `@jest-environment jsdom` docblock; everything else
 * runs in the default node environment.
 *
 * @type {import('jest').Config}
 */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "commonjs",
          moduleResolution: "node",
          esModuleInterop: true,
          types: ["jest", "node"],
          paths: { "@/*": ["./src/*"] },
        },
      },
    ],
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
};

module.exports = config;
