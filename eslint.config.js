import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import { reactRefresh } from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Design Ref: §9.3 — layer import rules enforced with no-restricted-imports
const layerPaths = (layer) => [`@/${layer}`, `@/${layer}/*`, `../${layer}`, `../${layer}/*`];

const forbidLayers = (layers, message) => ({
  'no-restricted-imports': [
    'error',
    { patterns: [{ group: layers.flatMap(layerPaths), message }] },
  ],
});

const TEST_FILES = ['src/**/*.test.{ts,tsx}', 'src/test/**'];

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'docs', '.bkit']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite(),
    ],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
    },
  },
  {
    // domain imports nothing outside its own folder (no React, no browser, no other layers)
    files: ['src/domain/**/*.ts'],
    ignores: TEST_FILES,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^(?![.]/|@/domain/)',
              message: 'domain/ may only import from domain/ (Design §9.3).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/storage/**/*.ts'],
    ignores: TEST_FILES,
    rules: forbidLayers(
      ['state', 'components', 'theme'],
      'storage/ may only import domain/ (Design §9.3).',
    ),
  },
  {
    files: ['src/state/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: forbidLayers(['components', 'theme'], 'state/ cannot import UI layers (Design §9.3).'),
  },
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/theme/**/*.{ts,tsx}'],
    ignores: TEST_FILES,
    rules: forbidLayers(
      ['storage'],
      'UI cannot import storage/ directly; go through state/ (Design §9.3).',
    ),
  },
  prettier,
]);
