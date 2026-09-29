// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'
import { createRouter } from '@tanstack/react-router'
import { routeTree } from '@/routeTree.gen'
import { buildMenu, HIDDEN_PAGE_PATHS, MENU_TREE, type MenuItem, type PagePath } from './navigation'

const router = createRouter({ routeTree })
const getPage = (path: PagePath) => router.routesByPath[path]?.options.staticData?.page

// ADMIN · 개발 환경 = 필터가 가장 적은 메뉴
const fullMenu = () => buildMenu(MENU_TREE, getPage, { role: 'ADMIN', department: 'ALL' }, false)

/** 트리를 재귀 탐색해 실제 링크(href !== '#')만 수집. */
const collectPaths = (items: MenuItem[]): string[] =>
  items.flatMap((item) =>
    item.children ? collectPaths(item.children) : item.href === '#' ? [] : [item.href],
  )

describe('navigation menu', () => {
  it('모든 통계 페이지 라우트는 메뉴에 있거나 HIDDEN_PAGE_PATHS 에 있어야 한다', () => {
    // 라우트만 추가하고 메뉴 등록을 잊으면 사이드바에서 영영 안 보인다 → 숨길 거면 HIDDEN_PAGE_PATHS 에 명시.
    const paths = collectPaths(fullMenu())
    const pageRoutes = Object.values(router.routesByPath)
      .filter((route) => route.options.staticData?.page)
      .map((route) => route.fullPath)

    expect(pageRoutes.filter((path) => !paths.includes(path) && !HIDDEN_PAGE_PATHS.includes(path))).toEqual([])
  })

  it('HIDDEN_PAGE_PATHS 는 메뉴 트리에 다시 들어가 있으면 안 된다', () => {
    const paths = collectPaths(fullMenu())
    expect(HIDDEN_PAGE_PATHS.filter((path) => paths.includes(path))).toEqual([])
  })

  it('숨기지 않은 핵심 메뉴는 그대로 노출된다(레포트·예약·아이리더 검사통계·해외마케팅·회계)', () => {
    const paths = collectPaths(fullMenu())

    expect(paths).toContain('/report/monthly')
    expect(paths).toContain('/report/weekly')
    expect(paths).toContain('/stats/reservation-list')
    expect(paths).toContain('/stats/reservation-overall')
    expect(paths).toContain('/stats/reservation-change')
    expect(paths).toContain('/stats/eoeis-checkup')
    expect(paths).toContain('/stats/overseas-marketing/receptions')
    expect(paths).toContain('/stats/overseas-marketing/statistics')
    expect(paths).toContain('/stats/overseas-marketing/reservation-stats')
    expect(paths).toContain('/accounting/medical-receipts')
    expect(paths).toContain('/accounting/vision-revenue')
    expect(paths).toContain('/accounting/vision-revenue-summary')
    expect(paths).toContain('/accounting/vision-revenue-chart')
    expect(paths).toContain('/accounting/medical-revenue-chart')
  })

  it('해외마케팅은 독립 최상위 섹션이며 접수리스트·통계·예약통계가 순서대로 배치된다', () => {
    const menu = fullMenu()
    const marketing = menu.find((item) => item.id === 'marketing-section')
    const overseas = menu.find((item) => item.id === 'overseas-marketing-section')

    expect(marketing?.children?.some((item) => item.id === 'overseas-marketing-section')).toBe(false)
    expect(overseas?.kind).toBe('section')
    expect(overseas?.children?.map((item) => item.id)).toEqual([
      'overseas-marketing-receptions',
      'overseas-marketing-statistics',
      'overseas-reservation-stats',
    ])
  })

  it('메뉴 잎 경로는 중복이 없어야 한다', () => {
    const paths = collectPaths(fullMenu())
    expect(new Set(paths).size).toBe(paths.length)
  })
})
