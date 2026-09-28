import { type SurgeryMonthlyItem } from '@/api/surgery'
import { type ChartConfig } from '#shared/ui/Chart'

export type SurgeryKey =
  | 'lasek'
  | 'lasik'
  | 'smile'
  | 'smilePro'
  | 'icl'
  | 'tIcl'
  | 'kpl'
  | 'tKpl'
  | 'viva'
  | 'catMulti'
  | 'catMono'
  | 'catEdof'

export type FamilyKey = 'refractive' | 'implant' | 'cataract'

export type MonthlyData = Record<SurgeryKey, number>

export const SURGERY_TYPES: {
  key: SurgeryKey
  label: string
  family: FamilyKey
  color: string
}[] = [
  { key: 'lasek', label: '라섹', family: 'refractive', color: 'var(--chart-1)' },
  { key: 'lasik', label: '라식', family: 'refractive', color: '#3b82f6' },
  { key: 'smile', label: '스마일', family: 'refractive', color: 'var(--chart-3)' },
  { key: 'smilePro', label: '스마일프로', family: 'refractive', color: '#fb7185' },
  { key: 'icl', label: 'ICL', family: 'implant', color: 'var(--chart-4)' },
  { key: 'tIcl', label: 'T-ICL', family: 'implant', color: '#f59e0b' },
  { key: 'kpl', label: 'KPL', family: 'implant', color: '#10b981' },
  { key: 'tKpl', label: 'T-KPL', family: 'implant', color: '#14b8a6' },
  { key: 'viva', label: 'VIVA', family: 'implant', color: '#8b5cf6' },
  { key: 'catMulti', label: '백내장(다초점)', family: 'cataract', color: '#f97316' },
  { key: 'catMono', label: '백내장(단초점)', family: 'cataract', color: '#64748b' },
  { key: 'catEdof', label: '백내장(연속초점)', family: 'cataract', color: '#ef4444' },
]

export const FAMILY_META: Record<FamilyKey, { label: string; color: string }> = {
  refractive: { label: '굴절교정', color: 'var(--chart-1)' },
  implant: { label: '렌즈삽입/특수', color: 'var(--chart-4)' },
  cataract: { label: '백내장', color: '#f97316' },
}

export const barConfig = Object.fromEntries(
  SURGERY_TYPES.map((type) => [
    type.key,
    {
      label: type.label,
      color: type.color,
    },
  ]),
) satisfies ChartConfig

export const familyConfig = Object.fromEntries(
  Object.entries(FAMILY_META).map(([key, value]) => [
    key,
    {
      label: value.label,
      color: value.color,
    },
  ]),
) satisfies ChartConfig

export const EMPTY_DATA: MonthlyData = {
  lasek: 0,
  lasik: 0,
  smile: 0,
  smilePro: 0,
  icl: 0,
  tIcl: 0,
  kpl: 0,
  tKpl: 0,
  viva: 0,
  catMulti: 0,
  catMono: 0,
  catEdof: 0,
}

export function toYearMap(items: SurgeryMonthlyItem[]): Record<number, MonthlyData[]> {
  const result: Record<number, MonthlyData[]> = {}
  for (const item of items) {
    if (!result[item.year]) {
      result[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY_DATA }))
    }
    result[item.year][item.month - 1] = {
      lasek: item.lasek,
      lasik: item.lasik,
      smile: item.smile,
      smilePro: item.smilePro,
      icl: item.icl,
      tIcl: item.tIcl,
      kpl: item.kpl,
      tKpl: item.tKpl,
      viva: item.viva,
      catMulti: item.catMulti,
      catMono: item.catMono,
      catEdof: item.catEdof,
    }
  }
  return result
}
