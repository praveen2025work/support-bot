import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  moduleNameMapper: {
    // Route engine-specific imports that surface in tests/* (which import
    // services/engine source files) to the engine's own paths.
    "^@/training/(.*)$": "<rootDir>/services/engine/src/training/$1",
    "^@/lib/singleton$": "<rootDir>/services/engine/src/lib/singleton",
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
          paths: { "@/*": ["./src/*"] },
        },
      },
    ],
  },
  testPathIgnorePatterns: ["/node_modules/", "/.next/"],
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
};

export default config;
