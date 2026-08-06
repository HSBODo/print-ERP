import { useMemo, useState } from 'react'
import { RotateCcw, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PanelShell } from '@/components/PanelShell'
import { useReservationChannel } from '@/hooks/reservation/useReservationChannel'
import type { ReservationChannelFunnelItem } from '@/api/reservation/reservationChannel'

/**
 * 예약통계_채널별 — 예약자 리스트를 채널로 묶어 단계별로 좁혀 보는 화면.
 *
 * 단계는 예약자 리스트에서 차례로 걸러낸 것이라 합계가 항상 리스트와 맞는다.
 *   예약 → 취소 제외 → 접수(내원) → 검사 → 수술
 *
 * 채널 판정은 v_reservation_channel 이 한다(내원동기 매체명 > 직원 설정표 > 예약경로).
 * 화면은 판정을 하지 않는다 — 규칙을 바꾸려면 뷰만 고치면 된다.
 */

/* ── 단계 정의 ── 순서가 곧 퍼널 순서다. */
type StageKey = keyof Pick<ReservationChannelFunnelItem, 'reserved' | 'notCancel' | 'visited' | 'examined' | 'surgery'>
const STAGES: { key: StageKey; label: string; hint: string; color: string }[] = [
  { key: 'reserved',  label: '예약',   hint: '등록일 기준 전체 예약 건', color: '#1E3A8A' },
  { key: 'notCancel', label: '취소 제외', hint: '예약 상태가 취소(C)가 아닌 건', color: '#2563EB' },
  { key: 'visited',   label: '접수',   hint: '미내원(Y)까지 뺀, 실제 내원한 건', color: '#0EA5E9' },
  { key: 'examined',  label: '검사',   hint: '검사등록일이 있는 건', color: '#10B981' },
  { key: 'surgery',   label: '수술',   hint: '수술등록일이 있는 건', color: '#F59E0B' },
]

/* ── 기간 헬퍼 (예약자 리스트와 같은 규칙: 진행 중인 달은 오늘까지) ── */
const pad = (n: number) => String(n).padStart(2, '0')
const todayIso = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
const currentMonth = () => todayIso().slice(0, 7)
const monthRange = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  const from = `${month}-01`
  let to = `${month}-${pad(new Date(y, m, 0).getDate())}`
  const today = todayIso()
  if (to > today) to = today
  return { from, to }
}

const nf = (n: number) => n.toLocaleString('ko-KR')
/** 소수 1자리. 100%·0% 처럼 딱 떨어지면 정수로 — 숫자가 많은 화면이라 자릿수를 줄인다. */
const pct = (num: number, den: number) => {
  if (!den) return '—'
  const v = (num * 100) / den
  return `${Number.isInteger(v) ? v : v.toFixed(1)}%`
}

export function ReservationChannelPage() {
  const [draftMonth, setDraftMonth] = useState(currentMonth())
  const [queryMonth, setQueryMonth] = useState(currentMonth())
  const [hasSearched, setHasSearched] = useState(true)

  const { from, to } = useMemo(() => monthRange(queryMonth), [queryMonth])
  const { rows, isLoading, isFetching, isError } = useReservationChannel(from, to, hasSearched)
  const loading = hasSearched && (isLoading || isFetching)

  /** 예약 건수 내림차순. 막대 폭은 최대 채널 기준이라 채널 간 규모가 한눈에 비교된다. */
  const sorted = useMemo(() => [...rows].sort((a, b) => b.reserved - a.reserved), [rows])
  const maxReserved = sorted[0]?.reserved ?? 0
  const total = useMemo(
    () =>
      STAGES.reduce(
        (acc, s) => ({ ...acc, [s.key]: rows.reduce((sum, r) => sum + r[s.key], 0) }),
        {} as Record<StageKey, number>,
      ),
    [rows],
  )

  const handleSearch = () => {
    setQueryMonth(draftMonth)
    setHasSearched(true)
  }
  const handleReset = () => {
    setDraftMonth(currentMonth())
    setQueryMonth(currentMonth())
    setHasSearched(true)
  }

  return (
    <PanelShell variant="bar" isLoading={loading} isError={isError}>
      <Card className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader className="gap-3 pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg">예약통계_채널별</CardTitle>
              <CardDescription className="mt-1 text-xs">
                예약자 리스트를 채널로 묶어 단계별로 좁혀 봅니다. 합계는 예약자 리스트와 같습니다.
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                aria-label="기준 월"
                type="month"
                value={draftMonth}
                onChange={(e) => setDraftMonth(e.target.value)}
                className="h-8 rounded border border-border/70 bg-white px-2 text-xs"
              />
              <Button size="sm" className="h-8 gap-1 px-3 text-xs" onClick={handleSearch}>
                <Search className="h-3.5 w-3.5" /> 조회
              </Button>
              <Button size="sm" variant="outline" className="h-8 gap-1 px-3 text-xs" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5" /> 초기화
              </Button>
            </div>
          </div>

          {/* 전체 퍼널 — 단계별 합계와 직전 단계 대비 잔존율 */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {STAGES.map((s, i) => {
              const prev = i === 0 ? 0 : total[STAGES[i - 1].key]
              return (
                <div key={s.key} className="rounded-md border border-border/60 bg-white px-3 py-2" title={s.hint}>
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </div>
                  <div className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: s.color }}>
                    {nf(total[s.key] ?? 0)}
                  </div>
                  <div className="text-[11px] tabular-nums text-gray-400">
                    {i === 0 ? '전체' : `직전 대비 ${pct(total[s.key], prev)}`}
                  </div>
                </div>
              )
            })}
          </div>
        </CardHeader>

        <CardContent className="flex min-h-0 flex-1 flex-col">
          {!sorted.length ? (
            <p className="py-10 text-center text-sm text-gray-500">해당 기간에 예약이 없습니다.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-auto">
              <table className="w-full border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-border text-gray-500">
                    <th className="w-28 whitespace-nowrap px-2 py-2 text-left font-medium">채널</th>
                    {STAGES.map((s) => (
                      <th key={s.key} className="whitespace-nowrap px-2 py-2 text-left font-medium" title={s.hint}>
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                          {s.label}
                        </span>
                      </th>
                    ))}
                    <th className="w-20 whitespace-nowrap px-2 py-2 text-right font-medium">최종 전환</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((r) => (
                    <tr key={r.channel} className="border-b border-border/60 hover:bg-gray-50/70">
                      <td className="whitespace-nowrap px-2 py-2 font-semibold text-gray-800">{r.channel}</td>
                      {STAGES.map((s, i) => {
                        const v = r[s.key]
                        // 막대 폭은 **채널 최대 예약수** 기준 — 채널끼리 규모를 비교할 수 있어야 한다.
                        // (채널 자기 예약수 기준으로 하면 3건짜리 채널도 꽉 찬 막대가 된다.)
                        const w = maxReserved ? (v / maxReserved) * 100 : 0
                        const prev = i === 0 ? 0 : r[STAGES[i - 1].key]
                        return (
                          <td key={s.key} className="px-2 py-2 align-middle">
                            <div className="flex items-center gap-2">
                              <div className="h-4 min-w-[3px] flex-1 overflow-hidden rounded-sm bg-gray-100">
                                <div
                                  className="h-full rounded-sm transition-[width]"
                                  style={{ width: `${Math.max(w, v > 0 ? 1.5 : 0)}%`, backgroundColor: s.color }}
                                />
                              </div>
                              <span className="w-11 shrink-0 text-right font-semibold tabular-nums text-gray-900">
                                {nf(v)}
                              </span>
                              <span className="w-11 shrink-0 text-right tabular-nums text-[11px] text-gray-400">
                                {i === 0 ? '' : pct(v, prev)}
                              </span>
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-2 py-2 text-right font-bold tabular-nums text-gray-900">
                        {pct(r.surgery, r.reserved)}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                    <td className="whitespace-nowrap px-2 py-2">합계</td>
                    {STAGES.map((s, i) => {
                      const prev = i === 0 ? 0 : total[STAGES[i - 1].key]
                      return (
                        <td key={s.key} className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1" />
                            <span className="w-11 shrink-0 text-right tabular-nums">{nf(total[s.key] ?? 0)}</span>
                            <span className="w-11 shrink-0 text-right tabular-nums text-[11px] text-gray-500">
                              {i === 0 ? '' : pct(total[s.key], prev)}
                            </span>
                          </div>
                        </td>
                      )
                    })}
                    <td className="px-2 py-2 text-right tabular-nums">{pct(total.surgery, total.reserved)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-3 shrink-0 text-[11px] leading-relaxed text-muted-foreground">
            ※ <b>예약 건</b> 단위입니다(사람 아님) — 같은 사람이 취소 후 다시 잡으면 2건입니다.
            단계는 뒤로 갈수록 앞 단계의 부분집합이며, 막대 폭은 채널 간 비교가 되도록 <b>가장 큰 채널의 예약수</b>를 100%로 잡았습니다.
            퍼센트는 <b>직전 단계 대비</b> 잔존율입니다.
            <br />
            ※ 채널은 <b>내원동기(중)의 매체명 → 자사 담당자 → 예약경로</b> 순으로 판정합니다.
            모두닥·카페처럼 매체를 보고 전화로 예약하면 경로는 인콜이지만 채널은 매체로 잡힙니다.
            카카오는 해피톡 소스라 예약자 리스트에 들어오지 않아 채널에 두지 않았습니다.
          </p>
        </CardContent>
      </Card>
    </PanelShell>
  )
}
