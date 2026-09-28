import { useAuthStore } from '#domain/support/session/store'
import { useMatches, useNavigate } from '@tanstack/react-router'
import { DEPARTMENT_LABEL, ROLE_LABEL, SCOPE_BADGE_CLASS } from '#domain/support/session/utils/label'

export function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  // 현재 라우트의 staticData.page — 통계 페이지가 아니면(홈 등) undefined.
  const currentPage = useMatches({ select: (matches) => matches.at(-1)?.staticData.page })
  const displayName = user?.name || user?.loginId || user?.email
  // 이름(ID) 부서-권한 — 헤더 우측 노출. loginId 가 없으면 () 를 아예 안 붙인다.
  const loginIdSuffix = user?.loginId && user.loginId !== user?.name ? `(${user.loginId})` : ''
  const scopeLabel = user
    ? `${DEPARTMENT_LABEL[user.department]}-${ROLE_LABEL[user.role]}`
    : ''

  const handleLogout = () => {
    if (!window.confirm('로그아웃 하시겠습니까?')) return
    logout()
    navigate({ to: '/login' })
  }

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      {currentPage ? (
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-gray-400">{currentPage.section}</span>
          <span className="text-gray-300">&gt;</span>
          <span className="text-gray-900 font-semibold">{currentPage.label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <span className="px-2.5 py-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-medium rounded">
            통계 대시보드
          </span>
          <span className="text-gray-400">병원 경영 핵심 지표를 한눈에 확인하세요</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-3">
        {displayName && (
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span>{displayName}{loginIdSuffix}</span>
            {user && scopeLabel && (
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${SCOPE_BADGE_CLASS[user.department]}`}
              >
                {scopeLabel}
              </span>
            )}
          </span>
        )}
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-700"
        >
          로그아웃
        </button>
      </div>
    </header>
  )
}
