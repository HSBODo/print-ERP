import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type AuthUser,
  clearStoredAuthSession,
  persistAuthSession,
  readStoredAuthSession,
} from './session'

class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length() {
    return this.store.size
  }

  clear() {
    this.store.clear()
  }

  getItem(key: string) {
    return this.store.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.store.delete(key)
  }

  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
}

const createToken = (payload: Record<string, unknown>) => {
  const encode = (value: object) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '')

  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.signature`
}

describe('auth session storage', () => {
  const localStorage = new MemoryStorage()
  const fixedNow = new Date('2026-04-11T00:00:00Z').getTime()
  const user: AuthUser = {
    id: 1,
    loginId: 'admin',
    email: 'admin@example.com',
    name: '관리자',
    role: 'ADMIN',
    department: 'ALL',
  }

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorage)
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow)
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('restores a persisted valid session', () => {
    const token = createToken({
      sub: user.loginId,
      exp: Math.floor(fixedNow / 1000) + 3600,
    })

    persistAuthSession(token, user)

    expect(readStoredAuthSession()).toEqual({
      token,
      user,
      isAuthenticated: true,
    })
  })

  it('clears expired sessions', () => {
    const token = createToken({
      sub: user.loginId,
      exp: Math.floor(fixedNow / 1000) - 60,
    })

    persistAuthSession(token, user)

    expect(readStoredAuthSession()).toEqual({
      token: null,
      user: null,
      isAuthenticated: false,
    })
    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('auth-user')).toBeNull()
  })

  it('falls back to the token subject when user storage is missing', () => {
    const token = createToken({
      sub: 'viewer',
      exp: Math.floor(fixedNow / 1000) + 3600,
    })

    localStorage.setItem('token', token)

    expect(readStoredAuthSession()).toEqual({
      token,
      user: {
        id: 0,
        loginId: 'viewer',
        email: '',
        name: 'viewer',
        role: 'STAFF',
        department: 'TEAM_A',
      },
      isAuthenticated: true,
    })
  })

  it('hydrates legacy stored users that only have email data', () => {
    const token = createToken({
      sub: 'admin',
      exp: Math.floor(fixedNow / 1000) + 3600,
    })

    localStorage.setItem('token', token)
    localStorage.setItem(
      'auth-user',
      JSON.stringify({
        id: 1,
        email: 'admin@example.com',
        name: '관리자',
        role: 'ADMIN',
      }),
    )

    expect(readStoredAuthSession()).toEqual({
      token,
      user,
      isAuthenticated: true,
    })
  })

  it('repairs broken utf-8 names from stored sessions', () => {
    const token = createToken({
      sub: 'admin',
      exp: Math.floor(fixedNow / 1000) + 3600,
    })

    localStorage.setItem('token', token)
    localStorage.setItem(
      'auth-user',
      JSON.stringify({
        id: 1,
        loginId: 'admin',
        email: 'admin@example.com',
        name: 'ê´ë¦¬ì',
        role: 'ADMIN',
      }),
    )

    expect(readStoredAuthSession()).toEqual({
      token,
      user,
      isAuthenticated: true,
    })
  })

  it('clears both storage keys on logout helper', () => {
    persistAuthSession(
      createToken({
        sub: user.loginId,
        exp: Math.floor(fixedNow / 1000) + 3600,
      }),
      user,
    )

    clearStoredAuthSession()

    expect(localStorage.getItem('token')).toBeNull()
    expect(localStorage.getItem('auth-user')).toBeNull()
  })
})
