import { describe, expect, it } from 'vitest'

import { isMenuHidden, menuItems, statsPages, type MenuItem } from './navigation'

/** 3단 트리를 재귀 탐색해 실제 링크(href !== '#')만 수집. */
const collectPaths = (items: MenuItem[]): string[] =>
  items.flatMap((item) =>
    item.children ? collectPaths(item.children) : item.href === '#' ? [] : [item.href],
  )

const menuPaths = () => collectPaths(menuItems)

describe('navigation menu', () => {
  it('statsPages에 정의된 모든 통계 페이지는 메뉴에 노출 경로가 있어야 한다(숨김 메뉴 제외)', () => {
    const paths = menuPaths()

    expect(
      statsPages
        .filter((page) => !isMenuHidden(page.id))
        .map((page) => page.path)
        .filter((path) => !paths.includes(path)),
    ).toEqual([])
  })

  it('숨김 메뉴는 사이드바에 노출되지 않는다(예약건수·마케팅~기타)', () => {
    const paths = menuPaths()

    // 예약: 예약 건수 숨김
    expect(paths).not.toContain('/stats/reservation')
    // 외래 아래: 마케팅·취소&부도·객단가·기타 그룹 전체 숨김(샘플 경로)
    expect(paths).not.toContain('/stats/marketing')
    expect(paths).not.toContain('/stats/cancel-rate')
    expect(paths).not.toContain('/stats/unit-price')
    expect(paths).not.toContain('/stats/b2b-revenue')
  })

  it('숨기지 않은 핵심 메뉴는 그대로 노출된다(레포트·예약·아이리더 검사통계)', () => {
    const paths = menuPaths()

    expect(paths).toContain('/report/monthly')
    expect(paths).toContain('/report/weekly')
    expect(paths).toContain('/stats/reservation-list')
    expect(paths).toContain('/stats/reservation-overall')
    expect(paths).toContain('/stats/reservation-change')
    expect(paths).toContain('/stats/eoeis-checkup')
    expect(paths).toContain('/accounting/medical-receipts')
    expect(paths).toContain('/accounting/vision-revenue')
    expect(paths).toContain('/accounting/vision-revenue-summary')
    expect(paths).toContain('/accounting/vision-revenue-chart')
    expect(paths).toContain('/accounting/medical-revenue-chart')
  })

  it('메뉴의 통계 링크는 statsPages에 정의된 경로만 사용해야 한다', () => {
    const statsPagePaths = statsPages.map((page) => page.path)
    const linkedStatsPaths = menuPaths().filter((path) => path.startsWith('/stats') || path.startsWith('/report'))

    expect(linkedStatsPaths.filter((path) => !statsPagePaths.includes(path))).toEqual([])
  })
})
