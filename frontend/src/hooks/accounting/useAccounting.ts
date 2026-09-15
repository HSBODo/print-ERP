import { useQuery } from '@tanstack/react-query'
import { accountingApi, type MedicalCategory } from '@/api/accounting'

/** 마트 적재 현황 — "데이터 기준" 표기와 그래프 연도 후보. 배치가 하루 한 번이라 오래 캐시해도 된다. */
export function useAccountingStatus() {
  return useQuery({
    queryKey: ['accounting-status'],
    queryFn: accountingApi.getStatus,
    staleTime: 5 * 60 * 1000,
  })
}

export function useMedicalReceipts(from: string, to: string) {
  return useQuery({
    queryKey: ['accounting-medical-receipts', from, to],
    queryFn: () => accountingApi.getMedicalReceipts(from, to),
  })
}

export function useVisionReceipts(from: string, to: string) {
  return useQuery({
    queryKey: ['accounting-vision-receipts', from, to],
    queryFn: () => accountingApi.getVisionReceipts(from, to),
  })
}

export function useMedicalMonthly(years: number[], category: MedicalCategory) {
  return useQuery({
    queryKey: ['accounting-medical-monthly', years, category],
    queryFn: () => accountingApi.getMedicalMonthly(years, category),
    enabled: years.length > 0,
  })
}

export function useVisionMonthly(years: number[]) {
  return useQuery({
    queryKey: ['accounting-vision-monthly', years],
    queryFn: () => accountingApi.getVisionMonthly(years),
    enabled: years.length > 0,
  })
}
