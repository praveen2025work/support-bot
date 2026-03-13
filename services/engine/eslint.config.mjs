import tseslint from "typescript-eslint";

export default tseslint.config(
  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Project rules
  {
    name: "engine/rules",
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },

  // Global ignores
  {
    ignores: ["dist/", "node_modules/", "data/"],
  }
);
