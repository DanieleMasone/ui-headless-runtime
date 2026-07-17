import eslint from '@eslint/js';
import tsdoc from 'eslint-plugin-tsdoc';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const typedFiles = ['packages/**/*.ts', 'apps/**/*.ts', 'tests/**/*.ts', '*.config.ts'];

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/temp/**',
      'coverage/**',
      'site-dist/**',
      'docs-dist/**',
      'playwright-report/**',
      'test-results/**',
      'examples/consumers/**',
      '.tmp/**',
    ],
  },
  eslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', '*.config.js'],
    languageOptions: { globals: globals.node },
  },
  ...tseslint.configs.strictTypeChecked.map((configuration) => ({
    ...configuration,
    files: typedFiles,
  })),
  {
    files: typedFiles,
    languageOptions: {
      parserOptions: {
        project: './tsconfig.workspace.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { tsdoc },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/no-unnecessary-type-arguments': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'tsdoc/syntax': 'error',
    },
  },
  {
    files: ['apps/demo/**/*.ts'],
    languageOptions: { globals: globals.browser },
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['**/packages/**', 'ui-headless-runtime/*', '**/src/*'] },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'tsdoc/syntax': 'off',
    },
  },
  {
    files: ['*.config.ts', '**/vite.config.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'tsdoc/syntax': 'off' },
  },
);
