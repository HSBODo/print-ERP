import { useMemo } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis,
} from 'recharts'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from '@/components/ui/chart'
import { CURRENT_YEAR } from '@/constants/chart'
import { formatAxisNumber } from '@/utils/stats'
import { useReservationOverallTrend } from '@/hooks/reservation/useReservationOverallTrend'
import { useSurgeryTrend } from '@/hooks/surgery/useSurgeryTrend'
import { useOverallExamMonthly } from '@/hooks/overall/useOverallExamMonthly'
import { useOutpatientCountTrend } from '@/hooks/outpatient/useOutpatientCountTrend'
import { useAccumulatedEyesTotal } from '@/hooks/marketing/useAccumulatedEyesTotal'
import { useReservationStatsSystem } from '@/hooks/reservation/useReservationStatsSystem'
import { useConsultationRateKpi } from '@/hooks/consultation/useConsultationRateKpi'

/**
 * 홈(대시보드) — 시스템 각 도메인 마트에서 이번달 요약을 조회.
 *
 * 관리자 전용 데이터(검사자 종합·전환율)는 일반 사용자에게는 403 → isError → "권한 없음" 표시로
 * graceful degradation. 다른 카드는 그대로 뜬다.
 */

const MONTHS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`)
const CURRENT_MONTH = new Date().getMonth() + 1  // 1~12
const M_IDX = CURRENT_MONTH - 1
const PREV_IDX = M_IDX > 0 ? M_IDX - 1 : 0

const CHART_YEARS = [CURRENT_YEAR]

/** 전월 대비 변화율(%). 전월이 0 이거나 값이 null 이면 null. */
const changeRate = (curr: number | null | undefined, prev: number | null | undefined): number | null => {
  if (curr == null || prev == null || prev === 0) return null
  return ((curr - prev) / prev) * 100
}

const formatNumber = (n: number | null | undefined) =>
  n == null ? '—' : n.toLocaleString()

/* ── 데이터 마스터 config ─────────────────────────────────────── */

const surgeryTrendConfig = {
  lasek: { label: '라섹', color: 'var(--chart-1)' },
  lasik: { label: '라식', color: 'var(--chart-2)' },
  smile: { label: '스마일', color: 'var(--chart-3)' },
  smilePro: { label: '스마일프로', color: 'var(--chart-4)' },
  icl: { label: 'ICL', color: 'var(--chart-5)' },
  cataract: { label: '백내장', color: '#8b5cf6' },
  other: { label: '기타', color: '#94a3b8' },
} satisfies ChartConfig

const reservationTrendConfig = {
  call: { label: '콜', color: 'var(--chart-1)' },
  online: { label: '온라인', color: 'var(--chart-3)' },
} satisfies ChartConfig

const consultationRateConfig = {
  rate: { label: '전환율(%)', color: 'var(--chart-2)' },
} satisfies ChartConfig

/* ── 페이지 ────────────────────────────────────────────────── */

export function DashboardPage() {
  // 이번달 예약 · 월별 예약 추이
  const reservation = useReservationOverallTrend(CHART_YEARS)
  const resMonthly = useMemo(() => reservation.dataMap[CURRENT_YEAR] ?? [], [reservation.dataMap])

  // 이번달 수술 · 월별 수술 추이 · 시술별 비중
  const surgery = useSurgeryTrend(CHART_YEARS)
  const sgMonthly = useMemo(() => surgery.dataMap[CURRENT_YEAR] ?? [], [surgery.dataMap])

  // 이번달 검사자 (관리자 전용)
  const overallExam = useOverallExamMonthly(CHART_YEARS)
  const overallExamThis = overallExam.items.find((it) => it.year === CURRENT_YEAR && it.month === CURRENT_MONTH)
  const overallExamPrev = overallExam.items.find((it) => it.year === CURRENT_YEAR && it.month === CURRENT_MONTH - 1)

  // 이번달 외래수
  const outpatient = useOutpatientCountTrend(CHART_YEARS)
  const opMonthly = useMemo(() => outpatient.dataMap[CURRENT_YEAR] ?? [], [outpatient.dataMap])

  // 총 누적 안수
  const eyeTotal = useAccumulatedEyesTotal()

  // 예약 채널 비중 — 이번달 예약통계_시력교정 (당월 1일 ~ 오늘)
  const monthFrom = `${CURRENT_YEAR}-${String(CURRENT_MONTH).padStart(2, '0')}-01`
  const today = new Date().toISOString().slice(0, 10)
  const resStats = useReservationStatsSystem(monthFrom, today)

  // 최근 3개월 상담 전환율 (관리자 전용)
  const consultation = useConsultationRateKpi(CHART_YEARS)

  /* ── KPI 카드 값 계산 ─────────────────────────────────────── */

  const kpiCards = useMemo(() => {
    // 예약
    const resCurr = resMonthly[M_IDX]?.reservations
    const resPrev = resMonthly[PREV_IDX]?.reservations
    // 수술
    const sgCurr = sgMonthly[M_IDX]?.total
    const sgPrev = sgMonthly[PREV_IDX]?.total
    // 외래
    const opCurr = opMonthly[M_IDX]?.outpatientCount
    const opPrev = opMonthly[PREV_IDX]?.outpatientCount

    return [
      {
        label: '이번달 예약',
        value: resCurr,
        change: changeRate(resCurr, resPrev),
        loading: reservation.isLoading,
        error: reservation.isError,
        unit: '건',
      },
      {
        label: '이번달 검사자',
        value: overallExamThis?.totalExam ?? null,
        change: changeRate(overallExamThis?.totalExam, overallExamPrev?.totalExam),
        loading: overallExam.isLoading,
        error: overallExam.isError,
        adminOnly: true,
        unit: '명',
      },
      {
        label: '이번달 수술',
        value: sgCurr,
        change: changeRate(sgCurr, sgPrev),
        loading: surgery.isLoading,
        error: surgery.isError,
        unit: '건',
      },
      {
        label: '이번달 외래수',
        value: opCurr,
        change: changeRate(opCurr, opPrev),
        loading: outpatient.isLoading,
        error: outpatient.isError,
        unit: '건',
      },
      {
        label: '총 누적 안수',
        value: eyeTotal.total,
        change: null,  // 누적 값이라 전월 대비 개념 없음
        loading: eyeTotal.isLoading,
        error: eyeTotal.isError,
        unit: '안',
        hint: '병원 전체 누적',
      },
    ]
  }, [resMonthly, sgMonthly, opMonthly, overallExamThis, overallExamPrev, eyeTotal.total,
      reservation.isLoading, reservation.isError, surgery.isLoading, surgery.isError,
      overallExam.isLoading, overallExam.isError, outpatient.isLoading, outpatient.isError,
      eyeTotal.isLoading, eyeTotal.isError])

  /* ── 차트 데이터 ─────────────────────────────────────── */

  // 월별 수술 추이 — 시술별 스택 막대
  const surgeryTrendData = MONTHS.map((month, i) => {
    const d = sgMonthly[i]
    if (!d) return { month, lasek: 0, lasik: 0, smile: 0, smilePro: 0, icl: 0, cataract: 0, other: 0 }
    return {
      month,
      lasek: d.lasek, lasik: d.lasik, smile: d.smile, smilePro: d.smilePro,
      icl: d.icl + d.tIcl + d.kpl + d.tKpl + d.viva,   // 렌즈삽입 통합
      cataract: d.catMulti + d.catMono + d.catEdof,
      other: Math.max(0, d.total - (d.lasek + d.lasik + d.smile + d.smilePro
        + d.icl + d.tIcl + d.kpl + d.tKpl + d.viva
        + d.catMulti + d.catMono + d.catEdof)),
    }
  })

  // 월별 예약 추이 — 콜/온라인 스택
  const reservationTrendData = MONTHS.map((month, i) => ({
    month,
    call: resMonthly[i]?.call ?? 0,
    online: resMonthly[i]?.online ?? 0,
  }))

  // 이번달 시술별 비중 — Pie
  const surgeryTypeThis = sgMonthly[M_IDX]
  const surgeryTypeData = surgeryTypeThis ? [
    { key: 'lasek', name: '라섹', value: surgeryTypeThis.lasek, fill: 'var(--chart-1)' },
    { key: 'lasik', name: '라식', value: surgeryTypeThis.lasik, fill: 'var(--chart-2)' },
    { key: 'smile', name: '스마일', value: surgeryTypeThis.smile + surgeryTypeThis.smilePro, fill: 'var(--chart-3)' },
    { key: 'icl', name: 'ICL/렌즈', value: surgeryTypeThis.icl + surgeryTypeThis.tIcl + surgeryTypeThis.kpl + surgeryTypeThis.tKpl + surgeryTypeThis.viva, fill: 'var(--chart-4)' },
    { key: 'cataract', name: '백내장', value: surgeryTypeThis.catMulti + surgeryTypeThis.catMono + surgeryTypeThis.catEdof, fill: '#8b5cf6' },
  ].filter((d) => d.value > 0) : []
  const surgeryTypeTotal = surgeryTypeData.reduce((s, d) => s + d.value, 0)

  // 예약 채널 비중 — Pie (이번달 예약통계_시력교정 합계)
  const channelData = useMemo(() => {
    const dailies = resStats.dailies ?? []
    const sum = dailies.reduce((acc, d) => ({
      inCall: acc.inCall + (d.callReservation ?? 0),
      tm: acc.tm + (d.tmReservation ?? 0) + (d.tmRecounselReservation ?? 0),
      naver: acc.naver + (d.naverReservation ?? 0),
      kakao: acc.kakao + (d.kakaoReservation ?? 0),
    }), { inCall: 0, tm: 0, naver: 0, kakao: 0 })
    return [
      { key: 'inCall', name: '인콜', value: sum.inCall, fill: 'var(--chart-1)' },
      { key: 'tm', name: 'TM/재상담', value: sum.tm, fill: 'var(--chart-2)' },
      { key: 'naver', name: '네이버', value: sum.naver, fill: 'var(--chart-5)' },
      { key: 'kakao', name: '카카오', value: sum.kakao, fill: '#eab308' },
    ].filter((d) => d.value > 0)
  }, [resStats.dailies])
  const channelTotal = channelData.reduce((s, d) => s + d.value, 0)

  // 최근 3개월 전환율 (관리자 전용) — consultationRateKpi 응답 구조 유연 처리
  const consultationRows = useMemo(() => {
    const raw = consultation.data as unknown
    if (!Array.isArray(raw)) return []
    // 항목은 { label, rate } 또는 { year, month, rate } 등 다양할 수 있어 형태 안 맞으면 빈배열.
    // 여기서는 이름 기반 요약을 기대 — 실제 구조는 백엔드 스펙에 따름.
    return (raw as Array<{ label?: string; name?: string; rate?: number; value?: number }>)
      .slice(0, 5)
      .map((r) => ({
        label: r.label ?? r.name ?? '—',
        rate: r.rate ?? r.value ?? 0,
      }))
      .filter((r) => r.label !== '—')
  }, [consultation.data])

  return (
    <div className="space-y-6">
      {/* ── KPI 5개 ── */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {kpiCards.map((card) => {
          const TrendIcon = card.change != null && card.change >= 0 ? TrendingUp : TrendingDown
          const positive = card.change != null && card.change >= 0
          return (
            <Card key={card.label} className="border-border/70 shadow-sm">
              <CardHeader className="gap-2">
                <CardDescription className="flex items-center gap-1.5">
                  {card.label}
                  {card.adminOnly && (
                    <span className="rounded bg-amber-50 px-1 text-[10px] font-medium text-amber-700">
                      관리자
                    </span>
                  )}
                </CardDescription>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-2xl font-semibold tracking-tight text-gray-900">
                    {card.loading ? '…' : card.error ? '—' :
                      <>
                        {formatNumber(card.value)}
                        <span className="ml-1 text-sm font-normal text-gray-400">{card.unit}</span>
                      </>}
                  </CardTitle>
                  {card.change != null && (
                    <span
                      className={
                        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ' +
                        (positive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700')
                      }
                    >
                      <TrendIcon className="h-3 w-3" />
                      {positive ? '+' : ''}{card.change.toFixed(1)}%
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {card.hint ?? (card.error ? '데이터 조회 실패' : '전월 대비')}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </section>

      {/* ── 큰 차트 2개 ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>월별 수술 추이</CardTitle>
            <CardDescription>{CURRENT_YEAR}년 · 시술별 스택</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={surgeryTrendConfig} className="h-80 w-full">
              <BarChart data={surgeryTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxisNumber} width={40} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                <Bar dataKey="lasek" stackId="sg" fill="var(--color-lasek)" radius={[0, 0, 6, 6]} />
                <Bar dataKey="lasik" stackId="sg" fill="var(--color-lasik)" />
                <Bar dataKey="smile" stackId="sg" fill="var(--color-smile)" />
                <Bar dataKey="smilePro" stackId="sg" fill="var(--color-smilePro)" />
                <Bar dataKey="icl" stackId="sg" fill="var(--color-icl)" />
                <Bar dataKey="cataract" stackId="sg" fill="var(--color-cataract)" />
                <Bar dataKey="other" stackId="sg" fill="var(--color-other)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>월별 예약 추이</CardTitle>
            <CardDescription>{CURRENT_YEAR}년 · 콜/온라인</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={reservationTrendConfig} className="h-80 w-full">
              <BarChart data={reservationTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={formatAxisNumber} width={40} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dashed" />} />
                <Bar dataKey="call" stackId="res" fill="var(--color-call)" radius={[0, 0, 6, 6]} />
                <Bar dataKey="online" stackId="res" fill="var(--color-online)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* ── 작은 차트 3개 ── */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* 이번달 시술별 비중 */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>이번달 시술별 비중</CardTitle>
            <CardDescription>{CURRENT_YEAR}-{String(CURRENT_MONTH).padStart(2, '0')} 기준</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {surgeryTypeData.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {surgery.isLoading ? '불러오는 중…' : '이번달 수술 없음'}
              </div>
            ) : (
              <>
                <ChartContainer config={surgeryTrendConfig} className="mx-auto h-56 w-full max-w-[260px]">
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={surgeryTypeData} dataKey="value" nameKey="key"
                         innerRadius={56} outerRadius={84} paddingAngle={3} strokeWidth={3}>
                      {surgeryTypeData.map((d) => <Cell key={d.key} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {surgeryTypeData.map((d) => (
                    <div key={d.key} className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span>{d.name}</span>
                      <span className="ml-auto font-medium text-foreground">
                        {surgeryTypeTotal ? Math.round((d.value / surgeryTypeTotal) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 예약 채널 비중 */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>예약 채널 비중</CardTitle>
            <CardDescription>{CURRENT_YEAR}-{String(CURRENT_MONTH).padStart(2, '0')} 시력교정 예약</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {channelData.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                {resStats.isLoading ? '불러오는 중…' : resStats.isError ? '조회 실패' : '이번달 예약 없음'}
              </div>
            ) : (
              <>
                <ChartContainer
                  config={{
                    inCall: { label: '인콜', color: 'var(--chart-1)' },
                    tm: { label: 'TM/재상담', color: 'var(--chart-2)' },
                    naver: { label: '네이버', color: 'var(--chart-5)' },
                    kakao: { label: '카카오', color: '#eab308' },
                  } satisfies ChartConfig}
                  className="mx-auto h-56 w-full max-w-[260px]"
                >
                  <PieChart>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Pie data={channelData} dataKey="value" nameKey="key"
                         innerRadius={56} outerRadius={84} paddingAngle={3} strokeWidth={3}>
                      {channelData.map((d) => <Cell key={d.key} fill={d.fill} />)}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {channelData.map((d) => (
                    <div key={d.key} className="flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.fill }} />
                      <span>{d.name}</span>
                      <span className="ml-auto font-medium text-foreground">
                        {channelTotal ? Math.round((d.value / channelTotal) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* 상담 전환율 (관리자 전용) */}
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>상담 전환율</CardTitle>
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                관리자
              </span>
            </div>
            <CardDescription>{CURRENT_YEAR}년 · 최근 기준</CardDescription>
          </CardHeader>
          <CardContent>
            {consultation.isError ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                권한이 없거나 조회 실패
              </div>
            ) : consultation.isLoading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                불러오는 중…
              </div>
            ) : consultationRows.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                표시할 데이터 없음
              </div>
            ) : (
              <ChartContainer config={consultationRateConfig} className="h-56 w-full">
                <BarChart data={consultationRows} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide domain={[0, 100]} />
                  <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={80} />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent formatter={(v) => `${Number(v).toFixed(1)}%`} />}
                  />
                  <Bar dataKey="rate" fill="var(--color-rate)" radius={6} barSize={16} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
