import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { api } from '#shared/api/client'

import { mockApiAdapter } from '../../../test/mockApiAdapter'
import { initApiClient } from './initApiClient'

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

describe('initApiClient', () => {
  const localStorage = new MemoryStorage()
  const fixedNow = new Date('2026-04-11T00:00:00Z').getTime()
  const token = createToken({
    sub: 'admin',
    exp: Math.floor(fixedNow / 1000) + 3600,
  })
  const defaultAdapter = api.defaults.adapter

  beforeAll(() => {
    initApiClient()
  })

  beforeEach(() => {
    vi.stubGlobal('localStorage', localStorage)
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow)
    localStorage.clear()
    localStorage.setItem('token', token)
    localStorage.setItem(
      'auth-user',
      JSON.stringify({
        id: 1,
        loginId: 'admin',
        email: 'admin@example.com',
        name: '관리자',
      }),
    )
  })

  afterEach(() => {
    api.defaults.adapter = defaultAdapter
    vi.restoreAllMocks()
  })

  it('저장된 세션 토큰을 Bearer 로 붙인다', async () => {
    const adapter = vi.fn(mockApiAdapter(200, JSON.stringify({ ok: true })))
    api.defaults.adapter = adapter

    await api.get('/health')
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe(
      `Bearer ${token}`,
    )
  })

  it('로그인 외 401 이면 저장된 세션을 지운다', async () => {
    api.defaults.adapter = mockApiAdapter(
      401,
      JSON.stringify({ message: '인증이 필요합니다.' }),
    )

    await expect(api.get('/stats/reservation/monthly')).rejects.toThrow(
      '세션이 만료되었습니다. 다시 로그인해주세요.',
    )
    expect(localStorage).toHaveLength(0)
  })

  it('로그인 401 이면 세션을 건드리지 않는다', async () => {
    api.defaults.adapter = mockApiAdapter(
      401,
      JSON.stringify({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }),
    )

    await expect(
      api.post('/auth/login', { loginId: 'admin', password: 'wrong' }),
    ).rejects.toThrow('아이디 또는 비밀번호가 올바르지 않습니다.')
    expect(localStorage).toHaveLength(2)
  })

  it('에러 응답의 json message 를 에러 메시지로 쓴다', async () => {
    api.defaults.adapter = mockApiAdapter(
      403,
      JSON.stringify({ message: '권한이 없습니다.' }),
      {
        statusText: 'Forbidden',
      },
    )

    await expect(api.get('/secure')).rejects.toThrow('권한이 없습니다.')
  })

  it('json 이 아닌 에러 응답은 본문 텍스트를 쓴다', async () => {
    api.defaults.adapter = mockApiAdapter(503, '서비스 점검 중', {
      statusText: 'Service Unavailable',
      contentType: 'text/plain',
    })

    await expect(api.get('/maintenance')).rejects.toThrow('서비스 점검 중')
  })

  it('에러 본문이 비면 상태 코드를 쓴다', async () => {
    api.defaults.adapter = mockApiAdapter(500)

    await expect(api.get('/broken')).rejects.toThrow('HTTP 500')
  })
})
