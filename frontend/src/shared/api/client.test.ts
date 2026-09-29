import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, apiClient } from '#shared/api/client'
import { mockApiAdapter } from '../../test/mockApiAdapter'

describe('api client', () => {
  const defaultAdapter = apiClient.defaults.adapter

  afterEach(() => {
    apiClient.defaults.adapter = defaultAdapter
  })

  it('returns parsed json under the /api base url', async () => {
    const adapter = vi.fn(mockApiAdapter(200, JSON.stringify({ ok: true })))
    apiClient.defaults.adapter = adapter

    await expect(api.get<{ ok: boolean }>('/health')).resolves.toEqual({ ok: true })
    expect(adapter).toHaveBeenCalledWith(expect.objectContaining({ baseURL: '/api', url: '/health' }))
  })

  it('sends request bodies as json', async () => {
    const adapter = vi.fn(mockApiAdapter(200, JSON.stringify({ id: 1 })))
    apiClient.defaults.adapter = adapter

    await api.post('/dreamlens-ledger', { name: '홍길동' })
    const config = adapter.mock.calls[0][0]
    expect(config.data).toBe(JSON.stringify({ name: '홍길동' }))
    expect(config.headers['Content-Type']).toBe('application/json')
  })

  it('supports successful empty responses', async () => {
    apiClient.defaults.adapter = mockApiAdapter(204)

    await expect(api.delete<undefined>('/auth/session')).resolves.toBeUndefined()
  })

  it('uses json error messages when present', async () => {
    apiClient.defaults.adapter = mockApiAdapter(403, JSON.stringify({ message: '권한이 없습니다.' }), {
      statusText: 'Forbidden',
    })

    await expect(api.get('/secure')).rejects.toThrow('권한이 없습니다.')
  })

  it('falls back to plain text errors for non-json responses', async () => {
    apiClient.defaults.adapter = mockApiAdapter(503, '서비스 점검 중', {
      statusText: 'Service Unavailable',
      contentType: 'text/plain',
    })

    await expect(api.get('/maintenance')).rejects.toThrow('서비스 점검 중')
  })

  it('falls back to the status when the error body is empty', async () => {
    apiClient.defaults.adapter = mockApiAdapter(500)

    await expect(api.get('/broken')).rejects.toThrow('HTTP 500')
  })
})
