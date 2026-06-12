import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // Next.js config (includes React, React Hooks, @next/eslint-plugin-next, TypeScript parser)
  ...nextConfig,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Project-wide rule overrides
  {
    name: "project/rules",
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": "warn",
      // React Compiler-era rules from eslint-plugin-react-hooks v7 (pulled in
      // via eslint-config-next). They flag pre-existing, working patterns
      // (fetch-on-mount effects, ref access in render) that lint clean on
      // main. Keep them as warnings rather than block CI on a 63-site
      // behavioral refactor; revisit if/when adopting the React Compiler.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/immutability": "warn",
    },
  },

  // Relax rules for test files
  {
    name: "project/tests",
    files: [
      "**/*.test.{ts,tsx,js,jsx}",
      "**/*.spec.{ts,tsx,js,jsx}",
      "**/__tests__/**",
    ],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },

  // Relax rules for CommonJS files (mock-api, scripts)
  {
    name: "project/commonjs",
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  // Global ignores
  {
    ignores: [".next/", "node_modules/", "dist/", "**/dist/"],
  }
);
