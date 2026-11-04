import {
  type AuthUser,
  matchesDepartment,
  type UserDepartment,
} from '../session'

/**
 * 페이지 접근 조건. 셋 중 하나만 지정한다.
 *   role 'ADMIN'     — ADMIN 롤 전용 (시스템 조작)
 *   role 'EXECUTIVE' — ADMIN·DIRECTOR (임원 이상) 전용
 *   department       — 해당 부서만. ADMIN·DIRECTOR (department='ALL') 는 항상 통과
 * 롤 조건이 붙은 페이지는 department='ALL' 인 사용자만 통과하므로 부서 조건을 따로 두지 않는다.
 */
export type PageAccess =
  | { role: 'ADMIN' }
  | { role: 'EXECUTIVE' }
  | { department: Exclude<UserDepartment, 'ALL'> }

/** 롤·부서 조건 판정 (구현 상태와 무관) — 페이지 접근·메뉴 노출이 같은 규칙을 쓴다. */
export const hasAccess = (
  access: PageAccess,
  user: Pick<AuthUser, 'role' | 'department'> | null | undefined,
): boolean => {
  if ('role' in access) {
    if (access.role === 'ADMIN') return user?.role === 'ADMIN'
    return user?.role === 'ADMIN' || user?.role === 'DIRECTOR'
  }
  return matchesDepartment(user ?? null, [access.department])
}
