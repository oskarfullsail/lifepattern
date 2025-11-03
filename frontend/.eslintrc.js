module.exports = {
  root: true,
  extends: [
    'expo',
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // TypeScript specific
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    }],

    // React specific
    'react/react-in-jsx-scope': 'off', // Not needed in React Native
    'react/prop-types': 'off', // Using TypeScript instead
    'react/display-name': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // General code quality
    'no-console': 'warn', // Warn on console.log usage
    'no-debugger': 'warn',
    'no-unused-vars': 'off', // Using TypeScript version instead
    'prefer-const': 'warn',
    'no-var': 'error',

    // Code style
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],

    // Best practices
    'eqeqeq': ['error', 'always'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-return-await': 'warn',
    'require-await': 'warn',
  },
  env: {
    browser: true,
    es2021: true,
    node: true,
    'react-native/react-native': true,
  },
  ignorePatterns: [
    'node_modules/',
    'web-build/',
    '.expo/',
    'dist/',
    '*.config.js',
    'coverage/',
  ],
};
