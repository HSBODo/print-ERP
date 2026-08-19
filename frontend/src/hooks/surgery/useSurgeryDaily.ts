import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { surgeryApi, type SurgeryDailyItem, type SurgeryDailyMeta } from '@/api/surgery'

/** 수술별 비중 일별 셀 — 일자(date)는 dataMap 키로 분리하고 값은 지표만 보유. */
export interface SurgeryDailyData {
  lasek: number; lasik: number; smile: number; smilePro: number
  icl: number; tIcl: number; kpl: number; tKpl: number; viva: number
  /** 노안 레이저(PRESBYOND) — PIOL 그룹 밖의 독립 항목 */
  presbyond: number
  /** PIOL DISTINCT 환자 수 — 유형별 합산이 아니다(양안 다른 렌즈 환자 이중 계상 방지) */
  piolPatients: number
  catMulti: number; catMono: number; catEdof: number
  xtra: number; waveVision: number; monoVision: number; contra: number; personal: number
  lasekEx: number; lasekRed: number
  reoperation: number; reopLaser: number; reopLens: number
  visionPatients: number; cataractPatients: number; total: number
}

function toDataMap(items: SurgeryDailyItem[]): Record<string, SurgeryDailyData> {
  const map: Record<string, SurgeryDailyData> = {}
  for (const item of items) {
    map[item.date] = {
      lasek: item.lasek, lasik: item.lasik, smile: item.smile, smilePro: item.smilePro,
      icl: item.icl, tIcl: item.tIcl, kpl: item.kpl, tKpl: item.tKpl, viva: item.viva,
      presbyond: item.presbyond ?? 0, piolPatients: item.piolPatients ?? 0,
      catMulti: item.catMulti, catMono: item.catMono, catEdof: item.catEdof,
      xtra: item.xtra ?? 0, waveVision: item.waveVision ?? 0,
      monoVision: item.monoVision ?? 0, contra: item.contra ?? 0, personal: item.personal ?? 0,
      lasekEx: item.lasekEx ?? 0, lasekRed: item.lasekRed ?? 0,
      reoperation: item.reoperation ?? 0, reopLaser: item.reopLaser ?? 0, reopLens: item.reopLens ?? 0,
      visionPatients: item.visionPatients ?? 0,
      cataractPatients: item.cataractPatients ?? 0,
      total: item.total,
    }
  }
  return map
}

/**
 * 일자별 수술 유형별 건수 (수술일 기준). from/to는 'YYYY-MM-DD'.
 * postgres-mart 는 mart_surgery_daily 조회(D-1 배치 적재), mssql-only 는 소스 라이브 집계.
 * 비는 날은 호출부에서 EMPTY로 보완한다. meta는 출처(MART/LIVE) 표시.
 */
export function useSurgeryDaily(from: string, to: string, enabled: boolean) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['surgery-daily', from, to],
    queryFn: () => surgeryApi.getSurgeryDaily(from, to),
    enabled: enabled && Boolean(from) && Boolean(to),
  })

  const rows = data?.data
  const dataMap = useMemo(() => (rows ? toDataMap(rows) : {}), [rows])
  const latestDate = useMemo(
    () => (rows && rows.length > 0 ? rows.reduce((m, r) => (r.date > m ? r.date : m), rows[0].date) : null),
    [rows],
  )
  const meta: SurgeryDailyMeta = data?.meta

  return { dataMap, meta, latestDate, isLoading, isError }
}
