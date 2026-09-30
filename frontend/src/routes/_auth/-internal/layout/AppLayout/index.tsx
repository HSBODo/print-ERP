import { Menu, X } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { useIsMobile } from '#shared/hooks/useIsMobile'

import { Sidebar } from '../Sidebar'
import { Topbar } from '../Topbar'

export function AppLayout({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile()
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  /* ── 모바일 ── */
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col">
        {/* 모바일 헤더 */}
        <header className="flex h-12 flex-shrink-0 items-center border-b border-gray-200 bg-white px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="rounded-lg p-1.5 hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <span className="ml-3 text-sm font-bold text-gray-900">
            Analytics &amp; KPI
          </span>
        </header>

        {/* 드로어 오버레이 */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 w-[260px] bg-white shadow-xl">
              <div className="flex h-12 items-center justify-between border-b border-gray-200 px-4">
                <span className="text-sm font-bold text-gray-900">메뉴</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg p-1.5 hover:bg-gray-100"
                >
                  <X className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <Sidebar
                collapsed={false}
                onToggleSidebar={() => setDrawerOpen(false)}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
          </>
        )}

        {/* 컨텐츠 */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3">
          {children}
        </main>
      </div>
    )
  }

  /* ── 데스크톱 ── */
  return (
    <div className="flex h-screen">
      <Sidebar
        collapsed={collapsed}
        onToggleSidebar={() =>
          setCollapsed((c) => {
            const next = !c
            localStorage.setItem('sidebar-collapsed', String(next))
            return next
          })
        }
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-gray-50 p-3">
          {children}
        </main>
      </div>
    </div>
  )
}
