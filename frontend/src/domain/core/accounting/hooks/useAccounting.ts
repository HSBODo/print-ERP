import { useQuery } from '@tanstack/react-query'
import { accountingApi } from '../api'
import type { MedicalCategory } from '../type/accounting'

export interface DateRange {
  from: string
  to: string
}

/** 마트 적재 현황 — "데이터 기준" 표기와 그래프 연도 후보. 배치가 하루 한 번이라 오래 캐시해도 된다. */
export function useAccountingStatus() {
  return useQuery({
    queryKey: ['accounting-status'],
    queryFn: ({ signal }) => accountingApi.getStatus(signal),
    staleTime: 5 * 60 * 1000,
  })
}

/** range 가 null 이면 조회하지 않는다 — 리스트 화면은 [조회] 를 누르기 전·초기화 직후 빈 표를 보여준다. */
export function useMedicalReceipts(range: DateRange | null) {
  return useQuery({
    queryKey: ['accounting-medical-receipts', range?.from, range?.to],
    queryFn: ({ signal }) => accountingApi.getMedicalReceipts(range!.from, range!.to, signal),
    enabled: range !== null,
  })
}

export function useVisionReceipts(range: DateRange | null) {
  return useQuery({
    queryKey: ['accounting-vision-receipts', range?.from, range?.to],
    queryFn: ({ signal }) => accountingApi.getVisionReceipts(range!.from, range!.to, signal),
    enabled: range !== null,
  })
}

export function useMedicalMonthly(years: number[], category: MedicalCategory) {
  return useQuery({
    queryKey: ['accounting-medical-monthly', years, category],
    queryFn: ({ signal }) => accountingApi.getMedicalMonthly(years, category, signal),
    enabled: years.length > 0,
  })
}

export function useVisionMonthly(years: number[]) {
  return useQuery({
    queryKey: ['accounting-vision-monthly', years],
    queryFn: ({ signal }) => accountingApi.getVisionMonthly(years, signal),
    enabled: years.length > 0,
  })
}
