// @vitest-environment happy-dom
import { createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vitest'

import { routeTree } from '@/routeTree.gen'

// 통계 페이지가 아닌 라우트 (staticData.page 없음)
const NON_STATS_PATHS = ['/', '/login']

/**
 * 파일 라우트의 페이지 메타 선언 검사.
 *
 * 페이지의 표시명·상태·권한은 각 라우트의 staticData.page 가 유일한 출처다.
 * 메뉴 트리 → 라우트 방향은 타입(PagePath)이, 라우트 → 메뉴 방향은 navigation.test 가 검사한다.
 */
describe('파일 라우트 페이지 메타', () => {
  const routes = Object.values(createRouter({ routeTree }).routesByPath)

  it('통계 페이지 라우트는 모두 staticData.page 를 선언해야 한다', () => {
    // RouteGate 는 staticData.page 가 없는 라우트를 판정 없이 통과시킨다 → 선언 누락 = 권한 우회.
    // ADMIN 전용 페이지라도 URL 만 알면 누구나 열리고, 사이드바에도 나타나지 않는다.
    const missing = routes
      .filter(
        (route) =>
          !NON_STATS_PATHS.includes(route.fullPath) &&
          !route.options.staticData?.page,
      )
      .map((route) => route.fullPath)
    expect(missing).toEqual([])
  })

  it('통계 페이지가 아닌 라우트는 staticData.page 를 선언하지 않는다', () => {
    const unexpected = routes
      .filter(
        (route) =>
          NON_STATS_PATHS.includes(route.fullPath) &&
          route.options.staticData?.page,
      )
      .map((route) => route.fullPath)
    expect(unexpected).toEqual([])
  })
})
