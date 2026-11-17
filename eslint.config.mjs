import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

const nodeGlobals = Object.fromEntries(
  [
    '__dirname',
    '__filename',
    'AbortController',
    'AbortSignal',
    'Buffer',
    'clearImmediate',
    'clearInterval',
    'clearTimeout',
    'console',
    'fetch',
    'process',
    'queueMicrotask',
    'setImmediate',
    'setInterval',
    'setTimeout',
    'structuredClone',
    'TextDecoder',
    'TextEncoder',
    'URL',
    'URLSearchParams',
  ].map((name) => [name, 'readonly']),
);

export default defineConfig(
  globalIgnores(['**/node_modules/', '**/dist/', '**/coverage/', '**/.next/', '**/next-env.d.ts']),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['apps/admin/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    rules: {
      'react-hooks/exhaustive-deps': 'error',
    },
  },
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': 'off',
    },
  },
  {
    // API tests in apps/api/test, the admin's next to what they test.
    files: ['**/test/**/*.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': [
        'error',
        {
          allowForKnownSafeCalls: [
            { from: 'package', package: 'node:test', name: ['describe', 'it', 'test'] },
          ],
        },
      ],
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    files: ['**/*.{js,cjs}'],
    languageOptions: { sourceType: 'commonjs', globals: nodeGlobals },
  },
  {
    // Shared packages are plain ES modules, run by both the API and the admin as they are.
    files: ['**/*.mjs', 'packages/**/*.js'],
    languageOptions: { sourceType: 'module', globals: nodeGlobals },
  },
  {
    rules: {
      eqeqeq: ['error', 'smart'],
      'func-style': ['error', 'expression'],
      'no-constant-condition': ['error', { checkLoops: 'all' }],
      'no-empty': ['error', { allowEmptyCatch: false }],
      'no-restricted-syntax': [
        'error',
        { selector: 'FunctionDeclaration', message: 'Use arrow functions.' },
        {
          selector: 'FunctionExpression:not(MethodDefinition[kind!="method"] > FunctionExpression)',
          message: 'Use arrow functions.',
        },
        { selector: 'ForStatement[test=null]', message: 'Use a loop with an explicit condition.' },
        {
          selector: 'CatchClause > BlockStatement[body.length=0]',
          message: 'Handle or rethrow the error.',
        },
      ],
      'prefer-arrow-callback': 'error',
    },
  },
  prettier,
);
