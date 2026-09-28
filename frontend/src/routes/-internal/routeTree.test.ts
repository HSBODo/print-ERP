// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { getMenuStatus, statsPages } from '@/config/navigation'

// statsPages 에 없는 라우트 (통계 페이지가 아닌 화면)
const NON_STATS_PATHS = ['/', '/login']

/**
 * statsPages(메뉴·권한 정의) 와 src/routes 파일 라우트의 대조.
 *
 * 파일 기반 라우팅에서는 페이지 정의가 두 곳으로 나뉜다 — statsPages(사람이 관리하는 메뉴·권한 목록)와
 * src/routes(파일 구조에서 생성되는 실제 화면). statsPages.path 는 string 이라 타입으로 묶이지 않고,
 * 한쪽만 고쳐도 빌드·런타임 모두 조용히 통과한다.
 *
 * 메뉴 트리의 구조·순서(섹션 → 그룹 → 페이지)는 여러 페이지에 걸친 정보이고 URL 구조와도 달라서
 * 라우트 파일로 옮길 수 없다. 그래서 페이지 정보를 라우트 staticData 로 옮기더라도 이 대조는 남는다.
 */
describe('statsPages ↔ 파일 라우트 대조', () => {
  const routePaths = Object.keys(createRouter({ routeTree }).routesByPath)
  const statsPaths = statsPages.map((page) => page.path)

  it('라우트가 없는 통계 페이지는 pending 뿐이어야 한다', () => {
    // 'complete' 로 표시됐는데 라우트가 없으면 사이드바 메뉴가 NotFound 로 이어진다 → 금지.
    const missing = statsPages
      .filter((page) => !routePaths.includes(page.path))
      .filter((page) => getMenuStatus(page.id) !== 'pending')
      .map((page) => page.id)
    expect(missing).toEqual([])
  })

  it('모든 라우트는 statsPages 에 정의돼 있어야 한다', () => {
    // RouteGate 는 경로로 statsPages 를 찾아 차단 여부를 판정하고, 못 찾으면 그대로 통과시킨다.
    // 라우트 파일만 추가하고 statsPages 를 빠뜨리면 ADMIN 전용 페이지라도 URL 만 알면 누구나 열린다.
    const orphan = routePaths.filter((path) => !statsPaths.includes(path) && !NON_STATS_PATHS.includes(path))
    expect(orphan).toEqual([])
  })

  it('statsPages path 는 중복이 없어야 한다', () => {
    expect(new Set(statsPaths).size).toBe(statsPaths.length)
  })
})
