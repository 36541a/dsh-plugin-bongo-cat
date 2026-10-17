/**
 * Flat eslint config for the plain-JS tooling surface (scripts/, .verify/).
 * TypeScript sources are intentionally NOT linted here — the project has
 * no typescript-eslint dependency; type safety there is tsc's job
 * (`pnpm typecheck`, see docs/DEVELOPMENT.md).
 */
import js from '@eslint/js'

const nodeGlobals = {
  console: 'readonly',
  process: 'readonly',
  Buffer: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  queueMicrotask: 'readonly',
  performance: 'readonly',
  fetch: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  structuredClone: 'readonly'
}

export default [
  js.configs.recommended,
  {
    files: ['**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }]
    }
  },
  {
    // browser-half smoke tests drive a jsdom window via globalThis
    files: ['.verify/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...nodeGlobals,
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        location: 'readonly',
        KeyboardEvent: 'readonly',
        MouseEvent: 'readonly',
        Event: 'readonly',
        HTMLAudioElement: 'readonly',
        AudioContext: 'readonly'
      }
    }
  },
  {
    ignores: [
      'node_modules/**',
      'lib/**',
      '.verify/node_modules/**',
      '.verify/lib/**',
      '**/*.ts',
      '**/*.tsx'
    ]
  }
]
