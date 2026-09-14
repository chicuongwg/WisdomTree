import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        ...globals.browser,
        ...globals.node,
        React: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Keep the App Router checks active even though this project owns its
      // TypeScript and formatting rules directly.
      ...nextPlugin.configs["core-web-vitals"].rules,
      // The account avatar is a same-origin authenticated endpoint and
      // Markdown may contain allowed external image URLs. Neither can use a
      // fixed next/image source list without changing their delivery model.
      "@next/next/no-img-element": "off",
      // The rules that catch REAL bugs:
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",  // ← catches missing awaits
      "no-console": ["warn", { allow: ["warn", "error"] }], // ← no stray console.logs
      "eqeqeq": ["error", "always", { "null": "ignore" }],   // ← no == surprises (except == null)
    },
  },
];
