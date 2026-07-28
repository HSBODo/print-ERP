import { useMemo, useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import {
  menuItems,
  type MenuItem,
  type MenuStatus,
} from '@/config/navigation'
import { useAuthStore } from '@/stores/authStore'

// 운영 빌드(PROD)에서는 pending(미완성) 메뉴를 숨긴다. 개발에서는 빨강으로 표시한다.
const isProd = !import.meta.env.DEV

/** 트리 어느 깊이든 재귀적으로 pending 링크를 제거하고, 자식이 모두 사라진 그룹도 정리한다(섹션은 유지). */
const prunePending = (items: MenuItem[]): MenuItem[] =>
  items
    .map((item) => (item.children ? { ...item, children: prunePending(item.children) } : item))
    .filter((item) => {
      if (item.children === undefined) return item.status !== 'pending'
      if (item.kind === 'section') return true
      return item.children.length > 0
    })

const hidePendingForProd = (items: MenuItem[]): MenuItem[] => (isProd ? prunePending(items) : items)

// 재귀적으로 adminOnly 항목을 제거하고, 자식이 모두 사라진 그룹도 정리한다(섹션은 유지).
// 최상위 admin-section뿐 아니라 그룹 안 잎(예: 검사 > 월별/주간 검사자 종합지표)도 커버.
const pruneAdmin = (items: MenuItem[]): MenuItem[] =>
  items
    .filter((item) => !item.adminOnly)
    .map((item) => (item.children ? { ...item, children: pruneAdmin(item.children) } : item))
    .filter((item) => {
      if (item.children === undefined) return true
      if (item.kind === 'section') return true
      return item.children.length > 0
    })

const hideAdminForNonAdmin = (items: MenuItem[], isAdmin: boolean): MenuItem[] =>
  isAdmin ? items : pruneAdmin(items)

// 구현 상태별 텍스트 색상 (활성 상태가 아닐 때만 적용)
const statusTextClass = (status?: MenuStatus): string => {
  if (status === 'pending') return 'text-red-500 hover:text-red-600'
  if (status === 'backend-only') return 'text-amber-600 hover:text-amber-700'
  return 'text-gray-500 hover:text-gray-900'
}

/** 깊이 depth 에서 활성 경로가 서브트리에 존재하는지 검사(활성 그룹 하이라이트용). */
const containsPath = (item: MenuItem, pathname: string): boolean => {
  if (item.href === pathname) return true
  return item.children?.some((child) => containsPath(child, pathname)) ?? false
}

/** 현재 경로가 속한 모든 컨테이너 id 를 수집(자동 펼침용). */
const collectOpenIds = (items: MenuItem[], pathname: string, acc: Set<string> = new Set()): Set<string> => {
  for (const item of items) {
    if (item.children && item.children.length > 0 && containsPath(item, pathname)) {
      acc.add(item.id)
      collectOpenIds(item.children, pathname, acc)
    }
  }
  return acc
}

/** 트리에서 잎(leaf) 링크만 추출 — collapsed 팝오버 용. */
const flattenLeaves = (items: MenuItem[]): MenuItem[] =>
  items.flatMap((item) => (item.children ? flattenLeaves(item.children) : [item]))

export function Sidebar({ collapsed, onToggleSidebar, onNavigate }: { collapsed: boolean; onToggleSidebar: () => void; onNavigate?: () => void }) {
  const location = useLocation()
  const role = useAuthStore((s) => s.user?.role)
  const visibleMenuItems = useMemo(
    () => hideAdminForNonAdmin(hidePendingForProd(menuItems), role === 'ADMIN'),
    [role],
  )

  const [openMenus, setOpenMenus] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('sidebar-open-menus')
      if (saved) return new Set(JSON.parse(saved))
    } catch {
      // ignore
    }
    // 첫 방문 기본값: 섹션은 모두 펼침(3단 트리라 접혀있으면 하위가 안 보임).
    return new Set(visibleMenuItems.filter((i) => i.kind === 'section').map((i) => i.id))
  })
  // 경로가 바뀌면 그 페이지가 속한 컨테이너들을 자동으로 펼친다.
  const [autoOpenedPath, setAutoOpenedPath] = useState<string | null>(null)
  if (autoOpenedPath !== location.pathname) {
    setAutoOpenedPath(location.pathname)
    const activeIds = collectOpenIds(visibleMenuItems, location.pathname)
    if (activeIds.size > 0 && ![...activeIds].every((id) => openMenus.has(id))) {
      setOpenMenus((prev) => {
        const next = new Set(prev)
        activeIds.forEach((id) => next.add(id))
        return next
      })
    }
  }

  const toggleMenu = (id: string) => {
    setOpenMenus((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      localStorage.setItem('sidebar-open-menus', JSON.stringify([...next]))
      return next
    })
  }

  const closeAllMenus = () => {
    setOpenMenus(new Set())
    localStorage.setItem('sidebar-open-menus', JSON.stringify([]))
  }

  const isOpen = (id: string) => openMenus.has(id)

  return (
    <aside
      className={`bg-white border-r border-gray-200 h-full flex flex-col transition-all duration-200 ${collapsed ? 'w-16' : 'w-[224px]'} flex-shrink-0`}
    >
      <div className={`h-14 min-h-14 flex items-center border-b border-gray-200 px-3 flex-shrink-0 ${collapsed ? 'justify-center' : 'justify-between'}`}>
        {!collapsed && <span className="text-base font-bold text-gray-900">Analytics &amp; KPI</span>}
        <button type="button" title="메뉴 접기/펼치기" onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg">
          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {visibleMenuItems.map((item) => (
            <SidebarNode
              key={item.id}
              item={item}
              depth={0}
              collapsed={collapsed}
              pathname={location.pathname}
              openMenus={openMenus}
              onToggle={toggleMenu}
              onNavigate={onNavigate}
              onHomeClick={closeAllMenus}
              isOpen={isOpen}
            />
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-100 text-xs text-gray-400">
        {!collapsed && <span>&copy; 2026 B&VIIT Group</span>}
      </div>
    </aside>
  )
}

interface SidebarNodeProps {
  item: MenuItem
  depth: number
  collapsed: boolean
  pathname: string
  openMenus: Set<string>
  onToggle: (id: string) => void
  onNavigate?: () => void
  onHomeClick: () => void
  isOpen: (id: string) => boolean
}

function SidebarNode({
  item,
  depth,
  collapsed,
  pathname,
  openMenus,
  onToggle,
  onNavigate,
  onHomeClick,
  isOpen,
}: SidebarNodeProps) {
  const Icon = item.icon
  const hasChildren = item.children !== undefined
  const isEmptySection = hasChildren && item.children!.length === 0
  const isActive = hasChildren ? containsPath(item, pathname) : pathname === item.href

  // depth 0: 아이콘 + 라벨 / depth ≥1: 아이콘 없이 라벨만(들여쓰기로 계층 표현).
  // 라벨이 잘리지 않도록 depth 가 깊어질수록 좌우 패딩을 줄인다.
  const padY = depth === 0 ? 'py-2.5' : 'py-2'
  const padX = depth === 0 ? 'px-3' : depth === 1 ? 'px-2' : 'px-1.5'
  const fontWeight = depth === 0 ? 'font-medium' : depth === 1 ? 'font-medium' : ''
  const fontSize = 'text-sm'
  // 자식 ul 들여쓰기 — depth 0 은 넉넉히, depth 1(잎을 담는 그룹) 은 좁게.
  const childWrapperClass =
    depth === 0
      ? 'mt-1 space-y-0.5 ml-[15px] border-l border-gray-200 pl-3'
      : 'mt-0.5 space-y-0.5 ml-2 border-l border-gray-200 pl-2'

  if (hasChildren) {
    // 컨테이너(섹션 / 그룹) — 접기/펼치기.
    const openState = isOpen(item.id)

    return (
      <li className="relative">
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          aria-expanded={openState}
          aria-haspopup={collapsed && depth === 0 ? 'menu' : undefined}
          aria-label={collapsed && depth === 0 ? item.label : undefined}
          title={collapsed && depth === 0 ? item.label : undefined}
          className={`flex items-center w-full rounded-lg ${fontSize} ${fontWeight} transition-colors
            ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-100'}
            ${collapsed && depth === 0 ? `justify-center px-0 ${padY}` : `gap-2 ${padX} ${padY}`}`}
        >
          {depth === 0 && Icon && <Icon className="h-[18px] w-[18px] flex-shrink-0" />}
          {(!collapsed || depth > 0) && (
            <>
              <span className="flex-1 text-left truncate">{item.label}</span>
              {isEmptySection ? (
                <span className="text-xs text-gray-400">비어있음</span>
              ) : (
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform ${openState ? 'rotate-180' : ''}`}
                />
              )}
            </>
          )}
        </button>
        {!collapsed && openState && !isEmptySection && (
          <ul className={childWrapperClass}>
            {item.children!.map((child) => (
              <SidebarNode
                key={child.id}
                item={child}
                depth={depth + 1}
                collapsed={collapsed}
                pathname={pathname}
                openMenus={openMenus}
                onToggle={onToggle}
                onNavigate={onNavigate}
                onHomeClick={onHomeClick}
                isOpen={isOpen}
              />
            ))}
          </ul>
        )}
        {/* collapsed 팝오버는 최상위 섹션/그룹에서만 표시. 내부 잎을 flat 하게 보여 스크롤 최소화. */}
        {collapsed && depth === 0 && openState && (
          <div className="absolute left-full top-0 z-30 ml-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
            <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
              {item.label}
            </div>
            {isEmptySection ? (
              <div className="px-2 py-2 text-sm text-gray-400">비어있음</div>
            ) : (
              <ul className="space-y-1">
                {flattenLeaves(item.children ?? []).map((leaf) => (
                  <li key={leaf.id}>
                    <Link
                      to={leaf.href}
                      className={`block rounded-md px-2.5 py-2 text-sm transition-colors ${
                        pathname === leaf.href
                          ? 'bg-blue-50 font-medium text-blue-600'
                          : `${statusTextClass(leaf.status)} hover:bg-gray-50`
                      }`}
                    >
                      {leaf.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </li>
    )
  }

  // 잎(리프) — Link.
  return (
    <li className="relative">
      <Link
        to={item.href}
        title={collapsed && depth === 0 ? item.label : undefined}
        onClick={item.id === 'home' ? onHomeClick : onNavigate}
        className={`flex items-center rounded-lg ${fontSize} ${fontWeight} transition-colors
          ${isActive
            ? 'text-blue-600 bg-blue-50'
            : `${statusTextClass(item.status) || 'text-gray-700'} hover:bg-gray-100`}
          ${collapsed && depth === 0 ? `justify-center px-0 ${padY}` : `gap-2 ${padX} ${padY}`}`}
      >
        {depth === 0 && Icon && <Icon className="h-[18px] w-[18px] flex-shrink-0" />}
        {(!collapsed || depth > 0) && <span className="truncate">{item.label}</span>}
      </Link>
    </li>
  )
}
