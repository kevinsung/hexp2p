import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import jest from 'eslint-plugin-jest';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'release/**',
      'coverage/**',
      '__snapshots__/**',
      '**/*.prod.js',
      '**/*.prod.js.map',
      '**/*.css.d.ts',
      '**/*.sass.d.ts',
      '**/*.scss.d.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  react.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  importPlugin.flatConfigs.recommended,
  importPlugin.flatConfigs.typescript,
  promise.configs['flat/recommended'],
  {
    plugins: {
      'react-hooks': reactHooks,
    },
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-cycle': 'error',
      'import/no-extraneous-dependencies': 'off',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',
      'react/prop-types': 'off',
      'react/require-default-props': 'off',
      'no-param-reassign': ['error', { props: false }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    files: ['.erb/**/*.js'],
    rules: {
      'no-console': 'off',
      'global-require': 'off',
      'import/no-dynamic-require': 'off',
      'import/no-extraneous-dependencies': 'off',
    },
  },
  {
    files: ['src/__tests__/**', '**/*.test.{ts,tsx,js,jsx}'],
    ...jest.configs['flat/recommended'],
  },
  prettierRecommended,
);
