import { useAuthStore } from '../../stores/authStore'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { statsPages } from '@/config/navigation'
import type { UserDepartment, UserRole } from '@/stores/auth-session'

/** 화면 표기용 한글 라벨 — UserFormDialog 옵션 라벨과 일치시켰다. */
const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: '관리자',
  DIRECTOR: '임원',
  MANAGER: '매니저',
  STAFF: '실무자',
}

const DEPARTMENT_LABEL: Record<UserDepartment, string> = {
  ALL: '전체',
  MEDICAL: '메디컬',
  MARKETING: '마케팅',
}

/** 부서-권한 배지 색 — 부서 색이 이 사람이 어느 데이터에 접근하는지 한눈에 드러낸다. */
const SCOPE_BADGE_CLASS: Record<UserDepartment, string> = {
  ALL: 'bg-purple-50 text-purple-700 ring-purple-200',
  MEDICAL: 'bg-blue-50 text-blue-700 ring-blue-200',
  MARKETING: 'bg-amber-50 text-amber-700 ring-amber-200',
}

export function Topbar() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
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

  const currentPage = statsPages.find((p) => p.path === location.pathname)

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      {currentPage ? (
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-gray-400">{currentPage.sectionLabel}</span>
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
