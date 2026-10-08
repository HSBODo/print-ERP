import type { SurgeryMonthlyItem } from '../type/api'

/* ── 타입 ── */
export type GroupKey = 'total' | 'refractive' | 'lens' | 'cataract'

export interface SurgeryData {
  lasek: number
  lasik: number
  smile: number
  smilePro: number
  icl: number
  tIcl: number
  kpl: number
  tKpl: number
  viva: number
  catMulti: number
  catMono: number
  catEdof: number
  visionPatients: number
  cataractPatients: number
  total: number
}

/* ── 상수 ── */
export const SURGERY_KEYS: (keyof SurgeryData)[] = [
  'lasek',
  'lasik',
  'smile',
  'smilePro',
  'icl',
  'tIcl',
  'kpl',
  'tKpl',
  'viva',
  'catMulti',
  'catMono',
  'catEdof',
]

export const GROUPS: {
  key: GroupKey
  label: string
  types: (keyof SurgeryData)[]
}[] = [
  { key: 'total', label: '전체 수술건수', types: SURGERY_KEYS },
  {
    key: 'refractive',
    label: '시력교정',
    types: ['lasek', 'lasik', 'smile', 'smilePro'],
  },
  {
    key: 'lens',
    label: '렌즈/각막',
    types: ['icl', 'tIcl', 'kpl', 'tKpl', 'viva'],
  },
  {
    key: 'cataract',
    label: '백내장',
    types: ['catMulti', 'catMono', 'catEdof'],
  },
]

/* ── 유틸 ── */
export const EMPTY: SurgeryData = {
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
  visionPatients: 0,
  cataractPatients: 0,
  total: 0,
}

export const gSum = (d: SurgeryData, g: (typeof GROUPS)[number]) => {
  if (g.key === 'total') return d.total
  if (g.key === 'refractive') return d.visionPatients
  if (g.key === 'cataract') return d.cataractPatients
  return g.types.reduce((s, k) => s + d[k], 0)
}

/** KPI 응답 → (year → 12개월) — 빈 달은 0 */
export function toSurgeryDataMap(
  items: SurgeryMonthlyItem[],
): Record<number, SurgeryData[]> {
  return items.reduce(
    (map, item) => {
      if (!map[item.year])
        map[item.year] = Array.from({ length: 12 }, () => ({
          ...EMPTY,
        }))
      map[item.year][item.month - 1] = {
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
        visionPatients: item.visionPatients ?? 0,
        cataractPatients: item.cataractPatients ?? 0,
        total: item.total,
      }
      return map
    },
    {} as Record<number, SurgeryData[]>,
  )
}
