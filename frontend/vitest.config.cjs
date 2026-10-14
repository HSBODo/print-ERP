const path = require('path')

module.exports = {
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '#composition': path.resolve(__dirname, './src/composition'),
      '#domain': path.resolve(__dirname, './src/domain'),
      '#entity': path.resolve(__dirname, './src/entity'),
      '#page': path.resolve(__dirname, './src/routes'),
      '#shared': path.resolve(__dirname, './src/shared'),
    },
  },
  test: {
    // 기본은 node(로직/유틸 테스트). 컴포넌트 테스트(.test.tsx)는 파일 상단
    // `// @vitest-environment happy-dom` 도크블록으로 DOM 환경을 켠다.
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    pool: 'threads',
    maxWorkers: 2,
  },
}
