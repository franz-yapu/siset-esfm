import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const FRONTERA = 'ADR-0001: docs/adr/0001-monolito-modular.md';

export default tseslint.config(
  { ignores: ['**/dist', '**/node_modules', '**/coverage'] },

  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },

  {
    files: ['*.js', 'scripts/**/*.{js,mjs}'],
    languageOptions: { globals: globals.node },
  },

  {
    files: ['apps/web/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },

  {
    files: ['apps/api/**/*.ts'],
    languageOptions: { globals: globals.node },
  },

  // Fronteras del monolito modular. Dentro de un módulo: `./archivo`; hacia otro
  // módulo: `@/modulos/<modulo>` (su index.ts); hacia lo transversal: `@/compartido/...`.
  {
    files: ['apps/api/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modulos/*/*'],
              message: `Importá el módulo por su index: \`@/modulos/<modulo>\` (${FRONTERA}).`,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/modulos/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modulos/*/*'],
              message: `Importá el módulo por su index: \`@/modulos/<modulo>\` (${FRONTERA}).`,
            },
            {
              group: ['../*'],
              message: `Desde un módulo no se sale con rutas relativas: usá \`@/modulos/<modulo>\` o \`@/compartido/...\` (${FRONTERA}).`,
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/api/src/compartido/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/modulos', '@/modulos/*', '**/modulos/*'],
              message: `\`compartido/\` no depende de ningún módulo (${FRONTERA}).`,
            },
          ],
        },
      ],
    },
  },

  prettier,
);
