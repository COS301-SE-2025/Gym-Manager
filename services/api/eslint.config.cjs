const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettier = require('eslint-plugin-prettier');


module.exports = [
  js.configs.recommended,
  {
    ignores: [
      '**/*.test.ts',
      '**/*.test.tsx',
      '**/*.spec.ts',
      '**/*.spec.tsx',
      'tests/**',
      '__tests__/**',
      'node_modules/**',
      'src/tests/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
        console: true,
        process: true,
        module: true
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['warn'],
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'variableLike', // variables, functions, parameters
          format: ['camelCase', 'UPPER_CASE'],
          leadingUnderscore: 'allow',
          trailingUnderscore: 'forbid',
        },
        {
          selector: 'typeLike', // classes, interfaces, types, enums
          format: ['PascalCase'],
        },
      ],
    },
  },
];
