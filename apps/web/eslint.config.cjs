// eslint.config.cjs
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const next = require('eslint-config-next');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  // Ignore generated & vendor files
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/*.min.*',
    ],
  },

  // Base JS rules
  js.configs.recommended,

  // Next.js recommended (includes core-web-vitals)
  ...next,

  // TypeScript recommended (non type-checked; no project needed)
  ...tseslint.configs.recommended,

  // TS/TSX specifics
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      ecmaFeatures: { jsx: true },
      globals: { JSX: 'readonly' },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // TS already handles undefineds; avoids 'React is not defined'
      'no-undef': 'off',

      // Keep naming sane but allow leading underscores in type params
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'typeParameter', format: ['PascalCase'], leadingUnderscore: 'allow' },
      ],
    },
  },

  // Be lenient in declaration files
  {
    files: ['**/*.d.ts'],
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/naming-convention': 'off',
    },
  },
];
