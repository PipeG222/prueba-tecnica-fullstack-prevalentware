// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import nextPlugin from '@next/eslint-plugin-next';
import prettier from 'eslint-plugin-prettier';

export default [
  // Sustituye .eslintignore
  {
    ignores: ['**/.next/**', 'node_modules/**', '.vercel/**', 'dist/**', 'build/**'],
  },

  // Reglas base JS
  js.configs.recommended,

  // Reglas base TS
  ...tseslint.configs.recommended,

  // Plugins y reglas del proyecto
  {
    plugins: {
      '@next/next': nextPlugin,
      prettier,
    },
    rules: {
      // No rompas el build por formato
      'prettier/prettier': 'warn',
      // Suaviza algunas reglas ruidosas
      '@next/next/no-html-link-for-pages': 'warn',
      'no-console': 'off',
      'react/function-component-definition': 'off',
      complexity: ['warn', 20],
    },
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
];
