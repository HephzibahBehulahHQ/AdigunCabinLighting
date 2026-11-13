import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'dist-gateway/**', 'node_modules/**', '.playwright-browsers/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.es2022 } },
  },
  {
    files: ['gateway/**/*.{ts,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.es2022 } },
  },
);
