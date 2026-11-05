// @vitest-environment happy-dom
import { createRouter } from '@tanstack/react-router'
import { Folder } from 'lucide-react'
import { describe, expect, it } from 'vitest'

import { routeTree } from '@/routeTree.gen'
import type { AuthUser } from '#domain/support/session/session'

import {
  buildMenu,
  MENU_TREE,
  type MenuItem,
  type PagePath,
  resolvePageMeta,
} from '../../navigation'
import type { PageMeta } from '../../pageAccess'

/**
 * 사이드바 노출 규칙.
 * Sidebar 컴포넌트 전체 렌더 대신, Sidebar 가 쓰는 buildMenu 를 검증해 회귀를 잡는다.
 */

type MenuUser = Pick<AuthUser, 'role' | 'department'>
const asTeamAStaff: MenuUser = { role: 'STAFF', department: 'TEAM_A' }
const asTeamBStaff: MenuUser = { role: 'STAFF', department: 'TEAM_B' }
const asAdmin: MenuUser = { role: 'ADMIN', department: 'ALL' }
const asDirector: MenuUser = { role: 'DIRECTOR', department: 'ALL' }

const router = createRouter({ routeTree })
const getPage = (path: PagePath) => resolvePageMeta(router.routesByPath, path)
const menuFor = (user: MenuUser | null, isProd = false) =>
  buildMenu(MENU_TREE, getPage, user, isProd)

// 트리에서 특정 id 를 재귀로 찾는다.
const findById = (items: MenuItem[], id: string): MenuItem | undefined => {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children) {
      const child = findById(item.children, id)
      if (child) return child
    }
  }
  return undefined
}

// 트리의 모든 잎 id 를 flat 하게 뽑는다.
const collectLeafIds = (items: MenuItem[]): string[] =>
  items.flatMap((item) =>
    item.children ? collectLeafIds(item.children) : [item.id],
  )

// ─── 가상 페이지로 부서·임원 gate 검증 (실제 라우트와 무관) ───────────────
const fakePage = (
  id: string,
  access: PageMeta['access'],
  status: PageMeta['status'] = 'complete',
): PageMeta => ({ id, label: id, section: '테스트', status, access })

// buildMenu 는 경로 문자열로 getPage 를 호출한다 — 가상 경로는 타입만 맞춰 넘긴다.
const fakePath = (id: string) => `/fake/${id}` as unknown as PagePath
const FAKE_PAGES: Record<string, PageMeta> = {
  '/fake/team-a': fakePage('team-a', { department: 'TEAM_A' }),
  '/fake/team-b': fakePage('team-b', { department: 'TEAM_B' }),
  '/fake/executive': fakePage('executive', { role: 'EXECUTIVE' }),
}
const fakeGetPage = (path: PagePath) => FAKE_PAGES[path as string]
const FAKE_TREE = [
  {
    id: 'team-a-section',
    label: 'A',
    icon: Folder,
    kind: 'section' as const,
    children: [fakePath('team-a')],
  },
  {
    id: 'team-b-section',
    label: 'B',
    icon: Folder,
    kind: 'section' as const,
    children: [fakePath('team-b')],
  },
  {
    id: 'executive-section',
    label: 'E',
    icon: Folder,
    kind: 'section' as const,
    badge: 'executive' as const,
    children: [fakePath('executive')],
  },
] as unknown as Parameters<typeof buildMenu>[0]

const fakeMenuFor = (user: MenuUser | null) =>
  buildMenu(FAKE_TREE, fakeGetPage, user, false)

describe('buildMenu · 사이드바 권한·부서 gate', () => {
  it('ADMIN·DIRECTOR (department=ALL) 는 모든 부서 섹션을 본다', () => {
    for (const user of [asAdmin, asDirector]) {
      expect(collectLeafIds(fakeMenuFor(user))).toEqual([
        'team-a',
        'team-b',
        'executive',
      ])
    }
  })

  it('부서 STAFF 는 자기 부서 섹션만 보고, 자식이 빈 섹션은 통째로 제거된다', () => {
    const menuA = fakeMenuFor(asTeamAStaff)
    expect(collectLeafIds(menuA)).toEqual(['team-a'])
    expect(findById(menuA, 'team-b-section')).toBeUndefined()

    const menuB = fakeMenuFor(asTeamBStaff)
    expect(collectLeafIds(menuB)).toEqual(['team-b'])
    expect(findById(menuB, 'team-a-section')).toBeUndefined()
  })

  it('임원 섹션과 잎은 "임원↑" 배지 대상이다 (executiveOnly · adminOnly 아님)', () => {
    const menu = fakeMenuFor(asAdmin)
    const section = findById(menu, 'executive-section')
    expect(section?.executiveOnly).toBe(true)
    expect(section?.adminOnly).toBeFalsy()
    expect(findById(menu, 'executive')?.executiveOnly).toBe(true)
  })

  it('관리자 섹션은 ADMIN 에게만 보이고, 하위 잎은 "관리자" 배지(adminReal) 대상이다', () => {
    const adminMenu = menuFor(asAdmin)
    expect(
      collectLeafIds(findById(adminMenu, 'admin-section')?.children ?? []),
    ).toEqual(['account-management', 'api-docs'])
    expect(findById(adminMenu, 'account-management')?.adminReal).toBe(true)
    expect(findById(adminMenu, 'api-docs')?.adminReal).toBe(true)

    expect(findById(menuFor(asDirector), 'admin-section')).toBeUndefined()
    expect(findById(menuFor(asTeamAStaff), 'admin-section')).toBeUndefined()
  })

  it('운영(PROD)에서는 pending 페이지가 메뉴에서 빠지고, 개발에서는 남는다', () => {
    const pendingPage = fakePage('wip', { department: 'TEAM_A' }, 'pending')
    const tree = [fakePath('wip')]
    expect(buildMenu(tree, () => pendingPage, asAdmin, true)).toEqual([])
    expect(
      buildMenu(tree, () => pendingPage, asAdmin, false).map((i) => i.status),
    ).toEqual(['pending'])
  })

  it('user=null (미인증) 시 권한 조건 없는 노드(홈) 만 통과', () => {
    expect(collectLeafIds(menuFor(null))).toEqual(['home'])
  })
})
