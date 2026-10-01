import { describe, expect, it, vi } from 'vitest'

import type { StoredAuthSession } from '#domain/support/session/session'

vi.mock('#domain/support/session/session', () => ({
  readStoredAuthSession: vi.fn(),
}))

import { readStoredAuthSession } from '#domain/support/session/session'

import { requireAuth } from './requireAuth'

const session = vi.mocked(readStoredAuthSession)
const sessionWith = (token: string | null): StoredAuthSession => ({
  token,
  user: null,
  isAuthenticated: Boolean(token),
})

describe('requireAuth (라우트 인증 가드)', () => {
  it('토큰이 있으면 통과한다(예외 없음)', () => {
    session.mockReturnValue(sessionWith('jwt-token'))
    expect(() => requireAuth()).not.toThrow()
  })

  it('토큰이 없으면 /login 리다이렉트를 던진다', () => {
    session.mockReturnValue(sessionWith(null))

    let thrown: unknown
    try {
      requireAuth()
    } catch (e) {
      thrown = e
    }

    expect(thrown).toBeDefined()
    const redirectObj = thrown as { to?: string; options?: { to?: string } }
    expect(redirectObj.to ?? redirectObj.options?.to).toBe('/login')
  })
})
