import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, apiClient } from '#shared/api/client'
import { mockApiAdapter } from '../../../test/mockApiAdapter'
import { connectApiClientAuth } from './apiClientAuth'

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

describe('connectApiClientAuth', () => {
  const localStorage = new MemoryStorage()
  const fixedNow = new Date('2026-04-11T00:00:00Z').getTime()
  const token = createToken({ sub: 'admin', exp: Math.floor(fixedNow / 1000) + 3600 })
  const defaultAdapter = apiClient.defaults.adapter

  beforeAll(() => {
    connectApiClientAuth()
  })

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorage)
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow)
    localStorage.clear()
    localStorage.setItem('token', token)
    localStorage.setItem(
      'auth-user',
      JSON.stringify({ id: 1, loginId: 'admin', email: 'admin@bviit.com', name: '관리자' }),
    )
  })

  afterEach(() => {
    apiClient.defaults.adapter = defaultAdapter
    vi.restoreAllMocks()
  })

  it('저장된 세션 토큰을 Bearer 로 붙인다', async () => {
    const adapter = vi.fn(mockApiAdapter(200, JSON.stringify({ ok: true })))
    apiClient.defaults.adapter = adapter

    await api.get('/health')
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe(`Bearer ${token}`)
  })

  it('로그인 외 401 이면 저장된 세션을 지운다', async () => {
    apiClient.defaults.adapter = mockApiAdapter(401, JSON.stringify({ message: '인증이 필요합니다.' }))

    await expect(api.get('/stats/reservation/monthly')).rejects.toThrow('세션이 만료되었습니다. 다시 로그인해주세요.')
    expect(localStorage.length).toBe(0)
  })

  it('로그인 401 이면 세션을 건드리지 않는다', async () => {
    apiClient.defaults.adapter = mockApiAdapter(
      401,
      JSON.stringify({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }),
    )

    await expect(api.post('/auth/login', { loginId: 'admin', password: 'wrong' }))
      .rejects.toThrow('아이디 또는 비밀번호가 올바르지 않습니다.')
    expect(localStorage.length).toBe(2)
  })
})
