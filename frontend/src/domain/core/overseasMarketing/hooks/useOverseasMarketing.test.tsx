// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// API 는 통째로 목으로 대체 — 훅의 캐시 키·무효화 스코프만 검증한다(HTTP 는 관심사 X).
vi.mock('../api', () => ({
  overseasMarketingApi: {
    getReceptions: vi.fn(),
    getStatistics: vi.fn(),
    getReservationStats: vi.fn(),
    getSyncAvailability: vi.fn(),
    syncSheet: vi.fn(),
    syncCrm: vi.fn(),
    updateReservationStat: vi.fn(),
    confirmMatch: vi.fn(),
    createReception: vi.fn(),
    updateReception: vi.fn(),
    deleteReception: vi.fn(),
  },
}))

import { overseasMarketingApi } from '../api'
import type { OverseasMarketingReceptionParams } from '../type/api'
import {
  useOverseasMarketingCrmSync,
  useOverseasMarketingMatchConfirm,
  useOverseasMarketingReceptionCreate,
  useOverseasMarketingReceptionDelete,
  useOverseasMarketingReceptionUpdate,
  useOverseasMarketingReceptions,
  useOverseasMarketingSheetSync,
  useOverseasMarketingStatistics,
  useOverseasReservationStatUpdate,
  useOverseasReservationStats,
} from './useOverseasMarketing'

/**
 * 해외마케팅 훅의 캐시 키·무효화 스코프를 못 박는다.
 *
 * 왜 잠가두나 — 무효화 스코프가 조용히 넓어지면 (a) 예약통계 셀 수정 한 번에 접수 리스트 전체가 리페치되어
 * 큰 MSSQL 조회가 반복적으로 발생하거나, (b) 반대로 스코프가 좁아지면 시트 동기화 후에도 화면이 옛 데이터를
 * 계속 보여 준다. 둘 다 조용한 사고라서 테스트로 지킨다.
 */
describe('useOverseasMarketing', () => {
  let queryClient: QueryClient
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    vi.clearAllMocks()
  })
  afterEach(() => queryClient.clear())

  // ── 캐시 키 ──────────────────────────────────────────────────────

  it('접수 조회 캐시 키에 params 를 포함해 필터 변경 시 서로 다른 캐시로 저장한다', async () => {
    vi.mocked(overseasMarketingApi.getReceptions).mockResolvedValue([])
    const paramsA: OverseasMarketingReceptionParams = {
      from: '2026-01-01',
      to: '2026-01-31',
      dateType: 'reg_date',
      dateEnabled: true,
      status: '',
      source: 'all',
      unmatched: false,
    }
    const paramsB = { ...paramsA, to: '2026-02-28' }

    renderHook(() => useOverseasMarketingReceptions(paramsA, true), { wrapper })
    renderHook(() => useOverseasMarketingReceptions(paramsB, true), { wrapper })
    await waitFor(() =>
      expect(overseasMarketingApi.getReceptions).toHaveBeenCalledTimes(2),
    )

    expect(
      queryClient.getQueryData(['overseas-marketing', 'receptions', paramsA]),
    ).toBeDefined()
    expect(
      queryClient.getQueryData(['overseas-marketing', 'receptions', paramsB]),
    ).toBeDefined()
  })

  it('통계·예약통계는 연도·granularity 별로 캐시가 분리된다', async () => {
    vi.mocked(overseasMarketingApi.getStatistics).mockResolvedValue({} as never)
    vi.mocked(overseasMarketingApi.getReservationStats).mockResolvedValue(
      {} as never,
    )

    renderHook(() => useOverseasMarketingStatistics(2025, 'month'), { wrapper })
    renderHook(() => useOverseasMarketingStatistics(2026, 'month'), { wrapper })
    renderHook(() => useOverseasReservationStats(2026, 'week'), { wrapper })
    await waitFor(() =>
      expect(overseasMarketingApi.getStatistics).toHaveBeenCalledTimes(2),
    )

    expect(
      queryClient.getQueryData([
        'overseas-marketing',
        'statistics',
        2025,
        'month',
      ]),
    ).toBeDefined()
    expect(
      queryClient.getQueryData([
        'overseas-marketing',
        'statistics',
        2026,
        'month',
      ]),
    ).toBeDefined()
    expect(
      queryClient.getQueryData([
        'overseas-marketing',
        'reservation-stats',
        2026,
        'week',
      ]),
    ).toBeDefined()
  })

  it('enabled=false 이면 조회를 시작하지 않는다', () => {
    vi.mocked(overseasMarketingApi.getReceptions).mockResolvedValue([])
    renderHook(
      () =>
        useOverseasMarketingReceptions(
          {
            from: '2026-01-01',
            to: '2026-01-31',
            dateType: 'reg_date',
            dateEnabled: true,
            status: '',
            source: 'all',
            unmatched: false,
          },
          false,
        ),
      { wrapper },
    )

    expect(overseasMarketingApi.getReceptions).not.toHaveBeenCalled()
  })

  // ── 무효화 스코프 (핵심) ─────────────────────────────────────────

  it('시트 동기화는 해외마케팅 전체 캐시를 무효화한다', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(overseasMarketingApi.syncSheet).mockResolvedValue({} as never)

    const { result } = renderHook(() => useOverseasMarketingSheetSync(), {
      wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['overseas-marketing'],
    })
  })

  it('CRM 동기화도 해외마케팅 전체 캐시를 무효화한다', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(overseasMarketingApi.syncCrm).mockResolvedValue({} as never)

    const { result } = renderHook(() => useOverseasMarketingCrmSync(), {
      wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync()
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['overseas-marketing'],
    })
  })

  it('매칭 확정은 접수·통계 양쪽에 영향이 있으므로 전체 캐시를 무효화한다', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(overseasMarketingApi.confirmMatch).mockResolvedValue({} as never)

    const { result } = renderHook(() => useOverseasMarketingMatchConfirm(), {
      wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({ rowNumber: 100, customerNo: 'C100' })
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['overseas-marketing'],
    })
  })

  it('예약통계 셀 수정은 예약통계 캐시만 무효화하고 접수 리스트는 건드리지 않는다', async () => {
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    vi.mocked(overseasMarketingApi.updateReservationStat).mockResolvedValue(
      {} as never,
    )

    const { result } = renderHook(() => useOverseasReservationStatUpdate(), {
      wrapper,
    })
    await act(async () => {
      await result.current.mutateAsync({
        date: '2026-09-01',
        groupKey: 'total',
        metricKey: 'inq',
        value: 5,
      })
    })

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['overseas-marketing', 'reservation-stats'],
    })
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ['overseas-marketing'],
    })
  })

  it('접수 CRUD 는 접수 리스트만 무효화하고 예약통계·통계는 건드리지 않는다', async () => {
    vi.mocked(overseasMarketingApi.createReception).mockResolvedValue(
      {} as never,
    )
    vi.mocked(overseasMarketingApi.updateReception).mockResolvedValue(
      {} as never,
    )
    vi.mocked(overseasMarketingApi.deleteReception).mockResolvedValue(
      {} as never,
    )

    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    const create = renderHook(() => useOverseasMarketingReceptionCreate(), {
      wrapper,
    })
    await act(async () => {
      await create.result.current.mutateAsync({} as never)
    })

    const update = renderHook(() => useOverseasMarketingReceptionUpdate(), {
      wrapper,
    })
    await act(async () => {
      await update.result.current.mutateAsync({
        rowNumber: 1,
        input: {} as never,
      })
    })

    const remove = renderHook(() => useOverseasMarketingReceptionDelete(), {
      wrapper,
    })
    await act(async () => {
      await remove.result.current.mutateAsync(1)
    })

    // 3번 모두 receptions 스코프로만 무효화. 상위 ['overseas-marketing'] 은 절대 무효화 X.
    const receptionsInvalidations = invalidate.mock.calls.filter(
      ([arg]) =>
        Array.isArray(arg?.queryKey) &&
        arg.queryKey.length === 2 &&
        arg.queryKey[0] === 'overseas-marketing' &&
        arg.queryKey[1] === 'receptions',
    )
    expect(receptionsInvalidations).toHaveLength(3)
    expect(invalidate).not.toHaveBeenCalledWith({
      queryKey: ['overseas-marketing'],
    })
  })
})
