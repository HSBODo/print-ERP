// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest'

import { testRouter as router, testRoutes } from '../../../test/testRoutes'
import {
  buildMenu,
  HIDDEN_PAGE_PATHS,
  MENU_TREE,
  type MenuItem,
  type PagePath,
} from './navigation'

const getPage = (path: PagePath) =>
  router.routesByPath[path]?.options.staticData?.page

// ADMIN · 개발 환경 = 필터가 가장 적은 메뉴
const fullMenu = () =>
  buildMenu(MENU_TREE, getPage, { role: 'ADMIN', department: 'ALL' }, false)

/** 트리를 재귀 탐색해 실제 링크(href !== '#')만 수집. */
const collectPaths = (items: MenuItem[]): string[] =>
  items.flatMap((item) =>
    item.children
      ? collectPaths(item.children)
      : item.href === '#'
        ? []
        : [item.href],
  )

describe('navigation menu', () => {
  it('모든 통계 페이지 라우트는 메뉴에 있거나 HIDDEN_PAGE_PATHS 에 있어야 한다', () => {
    // 라우트만 추가하고 메뉴 등록을 잊으면 사이드바에서 영영 안 보인다 → 숨길 거면 HIDDEN_PAGE_PATHS 에 명시.
    const paths = collectPaths(fullMenu())
    const pageRoutes = testRoutes
      .filter((route) => route.options.staticData?.page)
      .map((route) => route.fullPath)

    expect(
      pageRoutes.filter(
        (path) => !paths.includes(path) && !HIDDEN_PAGE_PATHS.includes(path),
      ),
    ).toEqual([])
  })

  it('HIDDEN_PAGE_PATHS 는 메뉴 트리에 다시 들어가 있으면 안 된다', () => {
    const paths = collectPaths(fullMenu())
    expect(HIDDEN_PAGE_PATHS.filter((path) => paths.includes(path))).toEqual([])
  })

  it('관리자 메뉴(계정 관리)는 메뉴에 노출된다', () => {
    expect(collectPaths(fullMenu())).toContain('/admin/accounts')
  })

  it('메뉴 잎 경로는 중복이 없어야 한다', () => {
    const paths = collectPaths(fullMenu())
    expect(new Set(paths).size).toBe(paths.length)
  })
})
