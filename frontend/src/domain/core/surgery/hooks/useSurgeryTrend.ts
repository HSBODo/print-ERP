import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { surgeryApi } from '../api'
import type { SurgeryMonthlyItem } from '../type/api'

interface SurgeryData {
  lasek: number
  lasik: number
  smile: number
  smilePro: number
  icl: number
  tIcl: number
  kpl: number
  tKpl: number
  viva: number
  presbyond: number
  piolPatients: number
  catMulti: number
  catMono: number
  catEdof: number
  xtra: number
  waveVision: number
  monoVision: number
  contra: number
  personal: number
  lasekEx: number
  lasekRed: number
  reoperation: number
  reopLaser: number
  reopLens: number
  visionPatients: number
  cataractPatients: number
  total: number
}

const EMPTY: SurgeryData = {
  lasek: 0,
  lasik: 0,
  smile: 0,
  smilePro: 0,
  icl: 0,
  tIcl: 0,
  kpl: 0,
  tKpl: 0,
  viva: 0,
  presbyond: 0,
  piolPatients: 0,
  catMulti: 0,
  catMono: 0,
  catEdof: 0,
  xtra: 0,
  waveVision: 0,
  monoVision: 0,
  contra: 0,
  personal: 0,
  lasekEx: 0,
  lasekRed: 0,
  reoperation: 0,
  reopLaser: 0,
  reopLens: 0,
  visionPatients: 0,
  cataractPatients: 0,
  total: 0,
}

function toDataMap(items: SurgeryMonthlyItem[]): Record<number, SurgeryData[]> {
  const map: Record<number, SurgeryData[]> = {}
  for (const item of items) {
    if (!map[item.year])
      map[item.year] = Array.from({ length: 12 }, () => ({ ...EMPTY }))
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
      // presbyond·piolPatients 는 SurgeryMonthlyItem 스키마에서 optional (V33 신설 이후 추가).
      // 매핑 누락되면 ReportSurgeryTable 의 '프레스비욘드'·'PIOL' 컬럼이 항상 0 으로 표시된다 (2026-10-13 발견).
      presbyond: item.presbyond ?? 0,
      piolPatients: item.piolPatients ?? 0,
      catMulti: item.catMulti,
      catMono: item.catMono,
      catEdof: item.catEdof,
      xtra: item.xtra ?? 0,
      waveVision: item.waveVision ?? 0,
      monoVision: item.monoVision ?? 0,
      contra: item.contra ?? 0,
      personal: item.personal ?? 0,
      lasekEx: item.lasekEx ?? 0,
      lasekRed: item.lasekRed ?? 0,
      reoperation: item.reoperation ?? 0,
      reopLaser: item.reopLaser ?? 0,
      reopLens: item.reopLens ?? 0,
      visionPatients: item.visionPatients ?? 0,
      cataractPatients: item.cataractPatients ?? 0,
      total: item.total,
    }
  }
  return map
}

export function useSurgeryTrend(years: number[]) {
  const {
    data: apiData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['surgery-trend', years],
    queryFn: ({ signal }) => surgeryApi.getSurgeryTrend(years, signal),
    enabled: years.length > 0,
  })

  const dataMap = useMemo(() => (apiData ? toDataMap(apiData) : {}), [apiData])

  return {
    dataMap,
    isLoading,
    isError,
  }
}
