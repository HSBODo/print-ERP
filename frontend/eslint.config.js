import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import boundaries from 'eslint-plugin-boundaries'
import importPlugin from 'eslint-plugin-import'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import sonarjs from 'eslint-plugin-sonarjs'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// 레이어 (.claude/docs/ARCHITECTURE.md) — page 레이어는 TanStack 파일 라우트(src/routes)다.
const LAYERS = ['routes', 'composition', 'domain', 'entity', 'shared']
const ALIAS = {
  routes: '#page',
  composition: '#composition',
  domain: '#domain',
  entity: '#entity',
  shared: '#shared',
}

const sharedConfig = {
  files: ['**/*.{ts,tsx}'],
  extends: [
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    reactHooks.configs.flat.recommended,
    reactRefresh.configs.vite,
    sonarjs.configs.recommended,
  ],
  plugins: { 'simple-import-sort': simpleImportSort },
  languageOptions: {
    ecmaVersion: 2020,
    globals: globals.browser,
    parserOptions: {
      projectService: {
        allowDefaultProject: ['.storybook/*.ts', '.storybook/*.tsx'],
      },
      tsconfigRootDir: import.meta.dirname,
    },
  },
  rules: {
    '@typescript-eslint/no-unused-expressions': [
      'error',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
      },
    ],
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    // 사내 컨벤션: any 사용 금지
    '@typescript-eslint/no-explicit-any': 'error',
    // 사내 컨벤션: 추론이 안 되면 as 로 최대한 비슷한 타입을 지정한다 (x! 로 바꾸지 않는다)
    '@typescript-eslint/non-nullable-type-assertion-style': 'off',

    'array-callback-return': ['warn', { checkForEach: true }],
    'no-console': ['error', { allow: ['error'] }],

    'simple-import-sort/imports': 'warn',

    'sonarjs/cognitive-complexity': ['warn', 10],
    'sonarjs/no-ignored-exceptions': 'off',

    'react-hooks/purity': 'warn',
    'react-hooks/set-state-in-effect': 'warn',
    'react-hooks/refs': 'warn',
    'react-refresh/only-export-components': 'warn',
  },
}

const architectureConfig = {
  files: ['src/**/*.{ts,tsx}'],
  extends: [
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
  ],
  plugins: { boundaries },
  rules: {
    ...boundaries.configs.recommended.rules,

    'import/no-cycle': ['error', { maxDepth: Infinity }],
    'import/no-self-import': 'error',
    'import/no-unresolved': 'error',

    'boundaries/element-types': 'off',

    // 다른 레이어는 상대경로 대신 # 별칭으로 import 한다.
    'no-restricted-imports': [
      'error',
      {
        patterns: LAYERS.map((layer) => ({
          group: [`../**/${layer}/**`],
          message: `${layer} 레이어는 절대 경로 ${ALIAS[layer]} 를 사용하세요`,
        })),
      },
    ],

    'boundaries/dependencies': [
      'error',
      {
        default: 'disallow',
        policies: [
          {
            from: { element: { type: 'page' } },
            allow: {
              to: {
                element: {
                  type: [
                    'composition',
                    'domain-core',
                    'domain-support',
                    'entity',
                    'shared',
                  ],
                },
              },
            },
          },
          {
            from: { element: { type: 'composition' } },
            allow: {
              to: {
                element: {
                  type: ['domain-core', 'domain-support', 'entity', 'shared'],
                },
              },
            },
          },
          {
            from: { element: { type: 'domain-core' } },
            allow: {
              to: {
                element: [
                  {
                    type: 'domain-core',
                    captured: { domainName: '{{domainName}}' },
                  },
                  { type: 'domain-support' },
                  { type: 'entity' },
                  { type: 'shared' },
                ],
              },
            },
          },
          {
            from: { element: { type: 'domain-support' } },
            allow: {
              to: {
                element: [
                  {
                    type: 'domain-support',
                    captured: { domainName: '{{domainName}}' },
                  },
                  { type: 'entity' },
                  { type: 'shared' },
                ],
              },
            },
          },
          {
            from: { element: { type: 'entity' } },
            allow: {
              to: {
                element: [
                  {
                    type: 'entity',
                    captured: { entityName: '{{entityName}}' },
                  },
                  { type: 'shared' },
                ],
              },
            },
          },
          {
            from: { element: { type: 'shared' } },
            allow: { to: { element: { type: ['shared'] } } },
          },
        ],
      },
    ],
  },
  settings: {
    'boundaries/elements': [
      { type: 'page', pattern: 'src/routes/**/*' },
      { type: 'composition', pattern: 'src/composition/**/*' },
      {
        type: 'domain-core',
        pattern: 'src/domain/core/*/**',
        capture: ['domainName'],
      },
      {
        type: 'domain-support',
        pattern: 'src/domain/support/*/**',
        capture: ['domainName'],
      },
      {
        type: 'entity',
        pattern: 'src/entity/*/**',
        capture: ['entityName'],
      },
      { type: 'shared', pattern: 'src/shared/**/*' },
    ],
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: './tsconfig.json',
      },
    },
  },
}

const testConfig = {
  files: ['**/*.test.{ts,tsx}'],
  rules: {
    // 테스트 픽스처의 password류 필드명은 실제 자격증명이 아니므로 오탐을 끈다
    'sonarjs/no-hardcoded-passwords': 'off',
    // 테스트 픽스처의 IP 문자열은 실제 서버 주소가 아니므로 오탐을 끈다
    'sonarjs/no-hardcoded-ip': 'off',
  },
}

// 점진 전환 — 도입 시점에 기존 위반이 남아 있어 warn 으로 내린 규칙.
// 위반을 모두 고치면 목록에서 빼서 원래 등급(error)으로 되돌린다. (eslint 우회 주석은 쓰지 않는다)
const GRADUAL_RULES = [
  '@typescript-eslint/no-base-to-string',
  '@typescript-eslint/no-floating-promises',
  '@typescript-eslint/no-misused-promises',
  '@typescript-eslint/no-unnecessary-type-assertion',
  '@typescript-eslint/no-unsafe-argument',
  '@typescript-eslint/no-unsafe-assignment',
  '@typescript-eslint/no-unsafe-call',
  '@typescript-eslint/no-unsafe-member-access',
  '@typescript-eslint/no-unsafe-return',
  '@typescript-eslint/only-throw-error',
  '@typescript-eslint/prefer-nullish-coalescing',
  '@typescript-eslint/prefer-optional-chain',
  '@typescript-eslint/prefer-promise-reject-errors',
  '@typescript-eslint/require-await',
  '@typescript-eslint/restrict-template-expressions',
  'sonarjs/concise-regex',
  'sonarjs/deprecation',
  'sonarjs/different-types-comparison',
  'sonarjs/function-return-type',
  'sonarjs/no-all-duplicated-branches',
  'sonarjs/no-alphabetical-sort',
  'sonarjs/no-floating-point-equality',
  'sonarjs/no-inverted-boolean-check',
  'sonarjs/no-nested-conditional',
  'sonarjs/no-nested-functions',
  'sonarjs/no-nested-template-literals',
  'sonarjs/no-redundant-optional',
  'sonarjs/prefer-read-only-props',
  'sonarjs/prefer-specific-assertions',
  'sonarjs/reduce-initial-value',
  'sonarjs/redundant-type-aliases',
  'sonarjs/super-linear-regex',
]

const gradualConfig = {
  files: ['**/*.{ts,tsx}'],
  rules: Object.fromEntries(GRADUAL_RULES.map((rule) => [rule, 'warn'])),
}

export default defineConfig([
  globalIgnores([
    'dist',
    'storybook-static',
    'coverage',
    'public',
    'src/routeTree.gen.ts',
  ]),
  sharedConfig,
  architectureConfig,
  testConfig,
  gradualConfig,
])
