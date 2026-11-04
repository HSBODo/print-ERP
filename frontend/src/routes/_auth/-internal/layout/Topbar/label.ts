import type { UserDepartment, UserRole } from '#domain/support/session/session'

/** 화면 표기용 한글 라벨 — UserFormDialog 옵션 라벨과 일치시켰다. */
export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: '관리자',
  DIRECTOR: '임원',
  MANAGER: '매니저',
  STAFF: '실무자',
}

export const DEPARTMENT_LABEL: Record<UserDepartment, string> = {
  ALL: '전체',
  TEAM_A: 'A팀',
  TEAM_B: 'B팀',
}

/** 부서-권한 배지 색 — 부서 색이 이 사람이 어느 데이터에 접근하는지 한눈에 드러낸다. */
export const SCOPE_BADGE_CLASS: Record<UserDepartment, string> = {
  ALL: 'bg-purple-50 text-purple-700 ring-purple-200',
  TEAM_A: 'bg-blue-50 text-blue-700 ring-blue-200',
  TEAM_B: 'bg-amber-50 text-amber-700 ring-amber-200',
}
