import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  ...tseslint.configs.recommended,
  globalIgnores([
    "**/dist/**",
    "**/.output/**",
    "**/out/**",
    "**/.wrangler/**",
    "**/.next/**",
    "**/node_modules/**",
    "src/routeTree.gen.ts",
    "public/sw.js",
    "public/theme-init.js",
  ]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
]);
