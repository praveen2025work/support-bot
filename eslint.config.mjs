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

  // Global ignores
  {
    ignores: [".next/", "node_modules/", "dist/", "services/engine/dist/"],
  }
);
