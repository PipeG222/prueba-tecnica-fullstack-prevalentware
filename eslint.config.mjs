// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-plugin-prettier';

export default [
  // Ignorar artefactos de build
  {
    ignores: ['**/.next/**', 'node_modules/**', '.vercel/**', 'dist/**', 'build/**'],
  },

  // Reglas base JS
  js.configs.recommended,

  // Reglas base TS (sin type-checking pesado)
  ...tseslint.configs.recommended,

  // Reglas del proyecto
  {
    plugins: {
      '@next/next': nextPlugin,
      prettier,
    },
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      // Si NO quieres reglas que dependan del type-checker, deja sin "project".
      // parserOptions: { project: ['./tsconfig.json'], tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // No bloquear por formato / estilo
      'prettier/prettier': 'off', // (o 'warn' si quieres ver avisos)
      '@next/next/no-html-link-for-pages': 'off',
      'no-console': 'off',
      'no-restricted-imports': 'off',
      'react/function-component-definition': 'off',
      'func-style': 'off',
      complexity: 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
