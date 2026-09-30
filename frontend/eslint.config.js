import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
  // 레이어 경계 (.claude/docs/ARCHITECTURE.md). 같은 도메인·composition 안은 상대경로로 import 하므로
  // 다른 레이어를 가리키는 # 별칭만 막으면 된다.
  layerBoundary(
    'src/shared/**',
    '^#(page|composition|domain|entity)/',
    'shared 는 상위 레이어를 import 할 수 없습니다.',
  ),
  layerBoundary(
    'src/entity/**',
    '^#(page|composition|domain|entity)/',
    'entity 는 shared 만 import 할 수 있습니다 (entity 간 참조 금지).',
  ),
  layerBoundary(
    'src/domain/support/**',
    '^#(page|composition|domain/core|domain/support)/',
    'support 는 entity·shared 만 import 할 수 있습니다 (core·다른 support 참조 금지).',
  ),
  layerBoundary(
    'src/domain/core/**',
    '^#(page|composition|domain/core)/',
    'core 는 support·entity·shared 만 import 할 수 있습니다 (다른 core 참조 금지).',
  ),
  layerBoundary(
    'src/composition/**',
    '^#(page|composition)/',
    'composition 은 page·다른 composition 을 import 할 수 없습니다.',
  ),
])

function layerBoundary(files, regex, message) {
  return {
    files: [files],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex, message }] }],
    },
  }
}
