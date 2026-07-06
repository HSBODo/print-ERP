export type UserRole = 'ADMIN' | 'USER'

export interface AuthUser {
  id: number
  loginId: string
  email: string
  name: string
  role: UserRole
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
}

const TOKEN_STORAGE_KEY = 'token'
const USER_STORAGE_KEY = 'auth-user'

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

const normalizeRole = (value: unknown): UserRole =>
  value === 'ADMIN' ? 'ADMIN' : 'USER'

export const normalizeAuthUser = (user: AuthUser): AuthUser => {
  const loginId = deriveLoginId(user.loginId || user.email || user.name)
  const email = user.email.trim().toLowerCase()
  const repairedName = repairUtf8Mojibake(user.name)
  const name = repairedName || loginId

  return {
    id: user.id,
    loginId,
    email,
    name,
    role: normalizeRole(user.role),
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

  return normalizeAuthUser({
    id: typeof record.id === 'number' ? record.id : 0,
    loginId,
    email,
    name,
    role: normalizeRole(record.role),
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

  return {
    id: 0,
    loginId,
    email: payload.sub.includes('@') ? payload.sub.trim().toLowerCase() : '',
    name: loginId,
    role: normalizeRole(payload.role),
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
