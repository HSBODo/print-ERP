import { type ConsultationRateItem } from '../../type/api'

export type MetricKey =
  | 'overallConsultation'
  | 'visionConsultation'
  | 'visionSurgery'
  | 'cataractSurgery'

export interface MonthlyData {
  overallConsultation: number
  visionConsultation: number
  visionSurgery: number
  cataractSurgery: number
  visionExamCount: number
  visionCounselCount: number
  visionSurgeryBooked: number
  cataractExamCount: number
  cataractSurgeryBooked: number
}

export const METRICS = [
  { key: 'overallConsultation' as const, label: '전체 상담 전환율' },
  { key: 'visionConsultation' as const, label: '시력교정 상담 전환율' },
  { key: 'visionSurgery' as const, label: '시력교정 수술 전환율' },
  { key: 'cataractSurgery' as const, label: '백내장 수술 전환율' },
]

export const DETAIL_METRIC_KEYS: Exclude<MetricKey, 'overallConsultation'>[] = [
  'visionConsultation',
  'visionSurgery',
  'cataractSurgery',
]

export const METRIC_COLORS: Record<MetricKey, string> = {
  overallConsultation: '#334155',
  visionConsultation: 'var(--chart-1)',
  visionSurgery: 'var(--chart-3)',
  cataractSurgery: 'var(--chart-4)',
}

export const EMPTY: MonthlyData = {
  overallConsultation: 0,
  visionConsultation: 0,
  visionSurgery: 0,
  cataractSurgery: 0,
  visionExamCount: 0,
  visionCounselCount: 0,
  visionSurgeryBooked: 0,
  cataractExamCount: 0,
  cataractSurgeryBooked: 0,
}

export const computeRate = (numerator: number, denominator: number) =>
  denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(1)) : 0

export function itemToData(item: ConsultationRateItem): MonthlyData {
  return {
    overallConsultation: computeRate(
      item.visionSurgeryBooked + item.cataractSurgeryBooked,
      item.visionExamCount + item.cataractExamCount,
    ),
    visionConsultation: item.visionCounselRate,
    visionSurgery: item.visionSurgeryRate,
    cataractSurgery: item.cataractSurgeryRate,
    visionExamCount: item.visionExamCount,
    visionCounselCount: item.visionCounselCount,
    visionSurgeryBooked: item.visionSurgeryBooked,
    cataractExamCount: item.cataractExamCount,
    cataractSurgeryBooked: item.cataractSurgeryBooked,
  }
}

export function toDataMap(items: ConsultationRateItem[]): Record<number, MonthlyData[]> {
  const map: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!map[item.year]) map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
    map[item.year][item.month - 1] = itemToData(item)
  }
  return map
}

export const formatRate = (value: number) => `${value.toFixed(1)}%`
export const changePoint = (base: number, next: number) => next - base
