import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, setAuthHandlers } from '#shared/api/client'

describe('api client', () => {
  const onUnauthorized = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    onUnauthorized.mockReset()
    setAuthHandlers({ getToken: () => null, onUnauthorized })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds the bearer token and returns parsed json', async () => {
    const token = 'header.payload.signature'
    setAuthHandlers({ getToken: () => token, onUnauthorized })

    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(api.get<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true })
    expect(fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Bearer ${token}`,
        }),
      }),
    )
  })

  it('supports successful empty responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(null, {
        status: 204,
      }),
    )

    await expect(api.delete<undefined>('/auth/session')).resolves.toBeUndefined()
  })

  it('uses json error messages when present', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: '권한이 없습니다.' }), {
        status: 403,
        statusText: 'Forbidden',
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(api.get('/secure')).rejects.toThrow('권한이 없습니다.')
  })

  it('falls back to plain text errors for non-json responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('서비스 점검 중', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain' },
      }),
    )

    await expect(api.get('/maintenance')).rejects.toThrow('서비스 점검 중')
  })

  it('does not redirect login requests on 401 and preserves the server message', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: '아이디 또는 비밀번호가 올바르지 않습니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(api.post('/auth/login', { loginId: 'admin', password: 'wrong' }))
      .rejects.toThrow('아이디 또는 비밀번호가 올바르지 않습니다.')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('calls onUnauthorized for non-login 401 responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ message: '인증이 필요합니다.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    )

    await expect(api.get('/stats/reservation/monthly')).rejects.toThrow('세션이 만료되었습니다. 다시 로그인해주세요.')
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })
})
