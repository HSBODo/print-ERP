import { afterEach, describe, expect, it, vi } from 'vitest'

import { api } from '#shared/api/client'

import { mockApiAdapter } from '../../test/mockApiAdapter'

describe('api client', () => {
  const defaultAdapter = api.defaults.adapter

  afterEach(() => {
    api.defaults.adapter = defaultAdapter
  })

  it('returns parsed json under the /api base url', async () => {
    const adapter = vi.fn(mockApiAdapter(200, JSON.stringify({ ok: true })))
    api.defaults.adapter = adapter

    const { data } = await api.get('/health')
    expect(data).toEqual({ ok: true })
    expect(adapter).toHaveBeenCalledWith(
      expect.objectContaining({ baseURL: '/api', url: '/health' }),
    )
  })

  it('sends request bodies as json', async () => {
    const adapter = vi.fn(mockApiAdapter(200, JSON.stringify({ id: 1 })))
    api.defaults.adapter = adapter

    await api.post('/dreamlens-ledger', { name: '홍길동' })
    const config = adapter.mock.calls[0][0]
    expect(config.data).toBe(JSON.stringify({ name: '홍길동' }))
    expect(config.headers['Content-Type']).toBe('application/json')
  })

  it('serializes params with comma-joined arrays and without nullish values', () => {
    expect(
      api.getUri({
        url: '/stats/x',
        params: {
          years: [2025, 2026],
          mock: true,
          empty: null,
          skip: undefined,
        },
      }),
    ).toBe('/api/stats/x?years=2025%2C2026&mock=true')
    expect(
      api.getUri({ url: '/stats/x', params: { category: '40대 이상' } }),
    ).toBe('/api/stats/x?category=40%EB%8C%80+%EC%9D%B4%EC%83%81')
  })
})
