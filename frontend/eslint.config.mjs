import js from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import react from 'eslint-plugin-react';
import reactNative from 'eslint-plugin-react-native';
import prettier from 'eslint-plugin-prettier';
import importPlugin from 'eslint-plugin-import';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  {
    ignores: [
      'node_modules/**',
      './node_modules/**',
      'android/**',
      'ios/**',
      '.expo/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'assets/**',
      'scripts/**',
      'utils/plugins/**',
      './scripts/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      'no-undef': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: [
      '*.config.js',
      '*.config.cjs',
      '*.config.ts',
      'metro.config.js',
      'babel.config.js',
      '.eslintrc.js',
      'scripts/**/*.{js,ts}',
    ],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
    rules: {},
  },
  // App/src rules
  {
    files: ['app/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.node, ...globals.browser },
    },

    plugins: {
      '@typescript-eslint': typescriptEslint,
      react,
      'react-native': reactNative,
      prettier,
      import: importPlugin,
      'unused-imports': unusedImports,
    },

    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        typescript: { alwaysTryTypes: true, project: './tsconfig.json' },
        node: { extensions: ['.js', '.jsx', '.ts', '.tsx'] },
      },
    },

    rules: {
      // Project rules
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-restricted-types': [
        'error',
        {
          types: {
            'React.FC': {
              message: 'Useless and has some drawbacks, see https://github.com/facebook/create-react-app/pull/8177',
            },
            'React.FunctionComponent': {
              message: 'Useless and has some drawbacks, see https://github.com/facebook/create-react-app/pull/8177',
            },
            'React.FunctionalComponent': {
              message:
                'Preact specific, useless and has some drawbacks, see https://github.com/facebook/create-react-app/pull/8177',
            },
          },
        },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',

      // React/React Native
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react',
              importNames: ['default'],
              message:
                "Don't import default React. Import specific hooks/functions instead, e.g. import { useState } from 'react'.",
            },
          ],
        },
      ],
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
      'react-native/no-inline-styles': 'off',
      'react-native/no-color-literals': 'off',
      'react-native/no-raw-text': ['error', { skip: ['BasicText', 'BasicButton', 'TextParagraph', 'TextLabel', 'H2'] }],

      // React hooks

      // Import rules
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-unused-modules': 'off',
      'import/no-unresolved': 'error',
      'import/no-duplicates': 'error',
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-absolute-path': 'error',
      'import/no-self-import': 'error',
      'import/no-cycle': 'error',
      'import/no-useless-path-segments': 'error',

      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[object.name="React"][property.name=/^(use[A-Z]|useEffect|useState|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect|useImperativeHandle|useDebugValue)$/]',
          message: 'Импортируйте хуки напрямую вместо React.{Hook}.',
        },
        {
          selector: 'JSXOpeningElement[name.name="a"] > JSXAttribute[name.name="href"]',
          message:
            'Ссылки — только через Link/Button из @/ui/kit: голый <a href="/…"> на GitHub Pages уходит мимо базового пути (/klg-synagogue).',
        },
      ],
    },
  },
  // Web-first site: views render DOM elements (div/p/a), so the RN raw-text rule does not apply.
  {
    files: ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    rules: { "react-native/no-raw-text": "off" },
  },
  // Raw <a href> only where the href is already built by routeHref (kit Link, admin AdmLink) or is a #hash.
  {
    files: ['src/ui/kit/link.tsx', 'src/screens/admin/shared/gate.tsx', 'src/ui/layout/site-shell.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'MemberExpression[object.name="React"][property.name=/^(use[A-Z]|useEffect|useState|useCallback|useMemo|useRef|useContext|useReducer|useLayoutEffect|useImperativeHandle|useDebugValue)$/]',
          message: 'Импортируйте хуки напрямую вместо React.{Hook}.',
        },
      ],
    },
  },
  { files: ["e2e/**/*.mjs"], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
];
