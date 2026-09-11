/**
 * 4단 롤 (docs/auth/permissions.md § 2-1).
 * - ADMIN    : 개발자 전용. 시스템 조작(배치·SMS·오프셋·사용자 부여) 가능.
 * - DIRECTOR : 임원·경영진. 두 그룹 전부 열람, 시스템 조작 불가.
 * - MANAGER  : 조직 의사결정 (지금은 STAFF 와 동일 권한).
 * - STAFF    : 실무 조작.
 */
export type UserRole = 'ADMIN' | 'DIRECTOR' | 'MANAGER' | 'STAFF'

/**
 * 사용자 부서 (docs/auth/permissions.md § 2-2).
 * - ALL              : ADMIN·DIRECTOR 전용. 부서 gate 우회.
 * - MEDICAL          : 진료·수술 부서 (원장·실장·상담사·간호사 등).
 * - MARKETING        : 마케팅 부서 (채널·SMS·해외마케팅 포함).
 * - OVERSEAS_MARKETING: 해외마케팅 전담 부서 (2026-09-11 신설 · 홈 + 해외마케팅 3종만).
 *
 * 이 축은 "부서(department)" 다. 향후 "소속(회사·법인)" 축이 별도로 추가될 수 있다.
 */
export type UserDepartment = 'ALL' | 'MEDICAL' | 'MARKETING' | 'OVERSEAS_MARKETING'

export interface AuthUser {
  id: number
  loginId: string
  email: string
  name: string
  role: UserRole
  department: UserDepartment
}

export interface StoredAuthSession {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean
}

interface JwtPayload {
  exp?: number
  sub?: string
  role?: string
  dept?: string
}

const TOKEN_STORAGE_KEY = 'token'
const USER_STORAGE_KEY = 'auth-user'

const KNOWN_ROLES: UserRole[] = ['ADMIN', 'DIRECTOR', 'MANAGER', 'STAFF']
const KNOWN_DEPARTMENTS: UserDepartment[] = ['ALL', 'MEDICAL', 'MARKETING', 'OVERSEAS_MARKETING']

const emptySession = (): StoredAuthSession => ({
  token: null,
  user: null,
  isAuthenticated: false,
})

const getStorage = () => {
  if (typeof localStorage === 'undefined') {
    return null
  }

  return localStorage
}

const decodeBase64Url = (value: string) => {
  const paddedValue = value.replace(/-/g, '+').replace(/_/g, '/')
  const normalizedValue = paddedValue.padEnd(
    paddedValue.length + ((4 - (paddedValue.length % 4)) % 4),
    '=',
  )

  return atob(normalizedValue)
}

const normalizeLoginId = (value: string) => value.trim().toLowerCase()

const HANGUL_PATTERN = /[가-힣]/

const repairUtf8Mojibake = (value: string) => {
  const trimmedValue = value.trim()

  if (!trimmedValue || HANGUL_PATTERN.test(trimmedValue) || typeof TextDecoder === 'undefined') {
    return trimmedValue
  }

  const bytes: number[] = []

  for (const char of trimmedValue) {
    const code = char.charCodeAt(0)

    if (code > 0xff) {
      return trimmedValue
    }

    bytes.push(code)
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(bytes))
  } catch {
    return trimmedValue
  }
}

const deriveLoginId = (value: string) => {
  const normalizedValue = normalizeLoginId(value)
  const [candidate] = normalizedValue.split('@')
  return candidate
}

/**
 * 알 수 없는 롤은 STAFF 로 강등 (안전 기본값). 예전 'USER' 클레임도 STAFF 로 매핑됨.
 * 백엔드 JWT 는 grace 없이 알 수 없는 role 이면 401 을 던지지만 (docs/auth/permissions.md § 6-3),
 * 프론트는 저장된 사용자 캐시가 이전 스키마일 수 있어 방어적으로 정규화한다.
 */
const normalizeRole = (value: unknown): UserRole => {
  if (typeof value === 'string' && (KNOWN_ROLES as string[]).includes(value)) {
    return value as UserRole
  }
  return 'STAFF'
}

/**
 * ADMIN·DIRECTOR 는 항상 ALL. 그 외에는 알려진 값(MEDICAL·MARKETING)이 있어야 하고,
 * 값이 없거나 잘못됐으면 MEDICAL 로 강등한다.
 */
const normalizeDepartment = (value: unknown, role: UserRole): UserDepartment => {
  if (role === 'ADMIN' || role === 'DIRECTOR') {
    return 'ALL'
  }
  if (typeof value === 'string' && (KNOWN_DEPARTMENTS as string[]).includes(value)) {
    return value === 'ALL' ? 'MEDICAL' : (value as UserDepartment)
  }
  return 'MEDICAL'
}

export const normalizeAuthUser = (user: AuthUser): AuthUser => {
  const loginId = deriveLoginId(user.loginId || user.email || user.name)
  const email = user.email.trim().toLowerCase()
  const repairedName = repairUtf8Mojibake(user.name)
  const name = repairedName || loginId
  const role = normalizeRole(user.role)

  return {
    id: user.id,
    loginId,
    email,
    name,
    role,
    department: normalizeDepartment(user.department, role),
  }
}

const readJwtPayload = (token: string): JwtPayload | null => {
  const [, payload] = token.split('.')

  if (!payload) {
    return null
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as JwtPayload
  } catch {
    return null
  }
}

const normalizeStoredUser = (value: unknown): AuthUser | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const loginIdSource =
    typeof record.loginId === 'string'
      ? record.loginId
      : typeof record.email === 'string'
        ? record.email
        : typeof record.name === 'string'
          ? record.name
          : ''
  const loginId = loginIdSource ? deriveLoginId(loginIdSource) : ''

  if (!loginId) {
    return null
  }

  const email =
    typeof record.email === 'string'
      ? record.email.trim().toLowerCase()
      : ''
  const name =
    typeof record.name === 'string' && repairUtf8Mojibake(record.name)
      ? repairUtf8Mojibake(record.name)
      : loginId
  const role = normalizeRole(record.role)

  return normalizeAuthUser({
    id: typeof record.id === 'number' ? record.id : 0,
    loginId,
    email,
    name,
    role,
    department: normalizeDepartment(record.department, role),
  })
}

const readStoredUser = (): AuthUser | null => {
  const storage = getStorage()

  if (!storage) {
    return null
  }

  const rawUser = storage.getItem(USER_STORAGE_KEY)

  if (!rawUser) {
    return null
  }

  try {
    const user = normalizeStoredUser(JSON.parse(rawUser))

    if (!user) {
      storage.removeItem(USER_STORAGE_KEY)
    }

    return user
  } catch {
    storage.removeItem(USER_STORAGE_KEY)
    return null
  }
}

const buildFallbackUser = (payload: JwtPayload): AuthUser | null => {
  if (!payload.sub) {
    return null
  }

  const loginId = deriveLoginId(payload.sub)
  const role = normalizeRole(payload.role)

  return {
    id: 0,
    loginId,
    email: payload.sub.includes('@') ? payload.sub.trim().toLowerCase() : '',
    name: loginId,
    role,
    department: normalizeDepartment(payload.dept, role),
  }
}

export const clearStoredAuthSession = () => {
  const storage = getStorage()

  storage?.removeItem(TOKEN_STORAGE_KEY)
  storage?.removeItem(USER_STORAGE_KEY)
}

export const persistAuthSession = (token: string, user: AuthUser) => {
  const storage = getStorage()
  const normalizedUser = normalizeAuthUser(user)

  storage?.setItem(TOKEN_STORAGE_KEY, token)
  storage?.setItem(USER_STORAGE_KEY, JSON.stringify(normalizedUser))
}

export const readStoredAuthSession = (): StoredAuthSession => {
  const storage = getStorage()

  if (!storage) {
    return emptySession()
  }

  const token = storage.getItem(TOKEN_STORAGE_KEY)

  if (!token) {
    return emptySession()
  }

  const payload = readJwtPayload(token)
  const isExpired =
    !payload?.sub ||
    typeof payload.exp !== 'number' ||
    payload.exp * 1000 <= Date.now()

  if (isExpired) {
    clearStoredAuthSession()
    return emptySession()
  }

  const user = readStoredUser() ?? buildFallbackUser(payload)

  return {
    token,
    user,
    isAuthenticated: true,
  }
}

// ─── Role/Department 판정 헬퍼 (docs/auth/permissions.md § 3, § 5-2) ─────────────

/** 시스템 조작(배치·SMS·오프셋·사용자 부여) 권한 — ADMIN 만. DIRECTOR 는 불가. */
export const canSystemOp = (user: Pick<AuthUser, 'role'> | null | undefined): boolean =>
  user?.role === 'ADMIN'

/**
 * 매니저 이상 (ADMIN·DIRECTOR·MANAGER). STAFF 만 제외.
 * SMS 큐 [실패·취소 재실행] 처럼 실무 판단이 필요하지만 실 발송·정책 조작은 아닌 액션에 쓴다.
 * 부서 gate 는 별도 — 이 헬퍼는 롤 축만 본다.
 */
export const canManagerOp = (user: Pick<AuthUser, 'role'> | null | undefined): boolean =>
  user?.role === 'ADMIN' || user?.role === 'DIRECTOR' || user?.role === 'MANAGER'

/**
 * 부서 gate 통과 판정. ADMIN·DIRECTOR (department='ALL') 는 항상 통과.
 * MANAGER·STAFF 는 자기 부서가 태그 배열에 포함돼야 통과.
 * 태그 배열이 비어 있으면 페이지에 부서 스코프가 없음 → 항상 통과.
 */
export const matchesDepartment = (
  user: Pick<AuthUser, 'department'> | null | undefined,
  departments: readonly UserDepartment[] | undefined,
): boolean => {
  if (!departments || departments.length === 0) return true
  if (!user) return false
  if (user.department === 'ALL') return true
  return departments.includes(user.department)
}
