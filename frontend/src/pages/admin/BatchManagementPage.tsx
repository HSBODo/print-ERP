import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Loader2, Play, RefreshCw } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useBatchReconcileOnedayFlag, useBatchRerun, useBatchRunLogs } from '@/hooks/admin/useBatchAdmin'
import type { BatchDomain, BatchRunLog } from '@/api/admin/batchAdmin'

type BatchJobOption = {
  value: BatchDomain
  label: string
  description: string
}

const JOB_OPTIONS: BatchJobOption[] = [
  {
    value: 'ALL',
    label: '전체 도메인 재실행',
    description: '기간 내 전 도메인(수술·예약·검사·전환·외래·전체지표·기타)을 순차 재실행합니다. min-year 가드 우회.',
  },
  {
    value: 'SURGERY',
    label: '수술 도메인만',
    description: 'mart_surgery_* 관련 잡만 재실행합니다.',
  },
  {
    value: 'ACCUMULATED_EYES',
    label: '누적 안수만',
    description: 'list_accumulated_eyes(OPERATION_ACCUMULATED_EYE_COUNT 원천) 만 재적재합니다.',
  },
  {
    value: 'RESERVATION',
    label: '예약 도메인만',
    description: 'mart_reservation_* 관련 잡만 재실행합니다.',
  },
  {
    value: 'RESERVATION_CHANGE',
    label: '예약 변경이력만',
    description: 'list_reservation_change 만 재적재합니다. 기간은 등록일이 아니라 **변경이력이 저장된 기간** — 그 기간에 저장·변경된 예약을 다시 접어 upsert 합니다. 초기 백필(2022~)은 월 단위로 나눠 돌리세요.',
  },
  {
    value: 'EXAM',
    label: '검사 도메인만',
    description: 'mart_exam_*·검사 리스트 관련 잡만 재실행합니다.',
  },
  {
    value: 'CONSULTATION',
    label: '전환·성공률 도메인만',
    description: 'mart_consultation_rate·stop_reason·cataract_reservation_rate 잡만 재실행합니다.',
  },
  {
    value: 'OUTPATIENT',
    label: '외래 도메인만',
    description: 'mart_outpatient_count_* 잡만 재실행합니다.',
  },
  {
    value: 'OVERALL',
    label: '전체지표 도메인만',
    description: 'mart_overall_exam_* 잡만 재실행합니다.',
  },
  {
    value: 'ETC',
    label: '기타 도메인만',
    description: 'mart_b2b_revenue_* 등 기타 잡만 재실행합니다.',
  },
  {
    value: 'SMS',
    label: '문자 발송 대상만',
    description:
      'list_surgery 를 소스로 sms_target 을 재적재합니다(같은 chart_no+수술일은 CRM 최신값으로 upsert, 수동 MANUAL 행은 보존). SURGERY 배치가 선행되어야 하며, 스마일·라식·라섹·렌즈삽입만 대상입니다.',
  },
]

const daysAgo = (n: number) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * 원데이 소급 보정 기본 범위 — 자동 배치와 동일한 "전전월 1일 ~ 전월 말일".
 * 관리자가 매월 자동 배치 실패로 재실행할 때 date input 을 안 건드리고 [실행] 만 눌러도
 * 자동 배치와 같은 범위가 되도록 정렬한다. toISOString 은 UTC 라 KST 새벽에 하루 어긋나므로
 * getFullYear/getMonth/getDate 로 로컬 기준으로 만든다.
 */
const defaultOnedayRange = (): { from: string; to: string } => {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  // 전전월 1일: 이번달 - 2, day=1 (Date 는 음수 month 를 자동으로 이전 연도로 처리)
  const prevPrevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1)
  // 전월 말일: 이번달 0일 = 전월 마지막 날
  const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  return { from: isoDate(prevPrevStart), to: isoDate(prevEnd) }
}

const STATUS_STYLE: Record<BatchRunLog['status'], string> = {
  RUNNING: 'bg-blue-100 text-blue-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
}

/**
 * runType 표시 라벨 · 색상 — 사람 트리거(MANUAL) 와 시스템 자동(POLLER) 을 구분.
 * DAILY/MONTHLY_RECONCILE 은 정기 스케줄 (하루/한 달 주기), POLLER 는 고빈도 폴러 (5분·시간대) — 셋 다 자동이지만
 * 성격이 달라 라벨을 나눔.
 */
const RUNTYPE_LABEL: Record<BatchRunLog['runType'], string> = {
  DAILY: '일간',
  MONTHLY_RECONCILE: '월간 재계산',
  MANUAL: '수동',
  POLLER: '폴러',
}

const RUNTYPE_STYLE: Record<BatchRunLog['runType'], string> = {
  DAILY: 'bg-gray-100 text-gray-700',
  MONTHLY_RECONCILE: 'bg-indigo-100 text-indigo-700',
  MANUAL: 'bg-amber-100 text-amber-800',
  POLLER: 'bg-slate-100 text-slate-600',
}

const formatDateTime = (iso: string | null) => {
  if (!iso) return '-'
  return iso.replace('T', ' ').slice(0, 19)
}

const formatDuration = (ms: number | null) => {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  const min = Math.floor(ms / 60_000)
  const sec = Math.floor((ms % 60_000) / 1000)
  return `${min}m ${sec}s`
}

export function BatchManagementPage() {
  const [jobType, setJobType] = useState<BatchDomain>(JOB_OPTIONS[0].value)
  const [from, setFrom] = useState<string>(daysAgo(30))
  const [to, setTo] = useState<string>(daysAgo(1))
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  // 원데이 소급 보정 전용 범위 — 재실행 UI 의 from/to 와 분리한다. 성격이 다르고
  // 정기 자동 실행 범위(전전월 1일 ~ 전월 말일) 를 기본값으로 미리 잡아 둔다.
  const [onedayFrom, setOnedayFrom] = useState<string>(() => defaultOnedayRange().from)
  const [onedayTo, setOnedayTo] = useState<string>(() => defaultOnedayRange().to)

  const toggleExpanded = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const rerun = useBatchRerun()
  const reconcileOneday = useBatchReconcileOnedayFlag()
  const isRunning = rerun.isPending || reconcileOneday.isPending
  const logsQuery = useBatchRunLogs(50, autoRefresh || isRunning)

  const selectedJob = useMemo(
    () => JOB_OPTIONS.find((option) => option.value === jobType) ?? JOB_OPTIONS[0],
    [jobType],
  )

  const handleRun = () => {
    if (!from || !to) return
    rerun.mutate({ from, to, domain: jobType })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">데이터 배치 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          마트 재적재 배치를 수동 실행하고 실행 이력을 확인합니다. ADMIN 권한 전용.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">배치 실행</CardTitle>
          <CardDescription>{selectedJob.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">배치 종류</span>
              <select
                value={jobType}
                onChange={(event) => setJobType(event.target.value as BatchDomain)}
                disabled={isRunning}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {JOB_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">시작일 (from)</span>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                disabled={isRunning}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm">
              <span className="text-muted-foreground">종료일 (to)</span>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                disabled={isRunning}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <Button onClick={handleRun} disabled={isRunning || !from || !to} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {isRunning ? '실행 중...' : '실행'}
            </Button>

            {rerun.isError ? (
              <p className="text-sm text-red-600">
                실행 실패: {rerun.error instanceof Error ? rerun.error.message : String(rerun.error)}
              </p>
            ) : null}
            {rerun.isSuccess ? (
              <p className="text-sm text-emerald-700">
                요청 접수 완료 — 배치 결과는 아래 이력에서 확인
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">안전 장치 · 중복 방지 안내</CardTitle>
          <CardDescription>
            같은 날짜를 여러 번 실행해도 마트에 중복 행이 생기지 않는 이유
          </CardDescription>
        </CardHeader>
        <CardContent>
          <details className="text-sm">
            <summary className="cursor-pointer select-none font-medium text-foreground">
              펼쳐서 보기 (upsert · 방어 가드 · 실행 이력)
            </summary>
            <div className="mt-4 space-y-4 text-muted-foreground">
              <section>
                <h4 className="font-medium text-foreground">1) 중복 방지 — upsert / delete+insert</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    월별·일별 집계 마트(<code className="rounded bg-muted px-1 text-xs">mart_surgery_monthly</code>,{' '}
                    <code className="rounded bg-muted px-1 text-xs">mart_surgery_daily</code>,{' '}
                    <code className="rounded bg-muted px-1 text-xs">mart_reservation_monthly</code> 등)는{' '}
                    <code className="rounded bg-muted px-1 text-xs">ON CONFLICT (yr, mo)</code> /{' '}
                    <code className="rounded bg-muted px-1 text-xs">ON CONFLICT (dt)</code> 로 <b>upsert</b> — 같은 키가 있으면 새 값으로 덮어쓴다.
                  </li>
                  <li>
                    리스트 마트(<code className="rounded bg-muted px-1 text-xs">list_reservation</code>,{' '}
                    <code className="rounded bg-muted px-1 text-xs">list_exam</code>, 수술자 리스트 등)는 지정 기간을{' '}
                    <b>delete → insert</b> — 사후 취소·수정분까지 반영된다.
                  </li>
                  <li>같은 날짜 범위를 여러 번 재실행해도 <b>행 수가 늘지 않고 최신 값으로만 갱신</b>된다.</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium text-foreground">2) Min-year 가드 (자동 스케줄 전용)</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>자동 배치(매일 03:00 daily / 매월 1일 03:30 reconcile)는 <b>2026년 이후</b> 데이터만 처리한다.</li>
                  <li>2024·2025 확정값(하드코딩·수동 seed)을 자동 배치가 실수로 덮어쓰지 않도록 방어한다.</li>
                  <li>이 화면의 <b>관리자 수동 실행은 min-year 가드를 우회</b>한다 — 초기 backfill·보정 시 자유롭게 사용. (단, 아래 3)의 골든 확정값 잠금은 수동도 못 뚫는다.)</li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium text-foreground">
                  3) 2026 상반기 골든 확정값 잠금 <span className="text-xs text-red-600">(수동도 우회 불가)</span>
                </h4>
                <p className="mt-1">
                  Min-year 와 별개로, <b>지표 정의가 과거와 달라진 특정 월</b>은 SQL·잡 로직 안에서 개별 방어된다. 수동 실행도 이 로직을 그대로 통과하므로 덮어쓰지 못한다.
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <b>백내장 검사수 · 2026-01~05</b> —{' '}
                    <code className="rounded bg-muted px-1 text-xs">mart_examination_monthly.cataract</code> 컬럼만{' '}
                    <code className="rounded bg-muted px-1 text-xs">upsert-examination-monthly.sql</code> 의 <b>CASE 문에서 기존값 유지</b>. 백내장 검사수는 CUSTOM 담당자 값을 참조해 과거 달이 소급 변동하므로, 신규 정의(사람 기준)는 2026-06 부터 적용. 2026-01~05 는 골든 seed(V22) 고정.
                  </li>
                  <li>
                    <b>예약통계(시력교정·백내장) · 2026-01~06</b> —{' '}
                    <code className="rounded bg-muted px-1 text-xs">reservation_stats_period_lock</code> 테이블에 (product_type, period)로 잠금 등록.{' '}
                    <code className="rounded bg-muted px-1 text-xs">ReservationStatsDailyMartJob</code> 이 실행 시 잠긴 월을 skip. 손보정(override)은 이력 남겨서 별도 허용.
                  </li>
                </ul>
                <p className="mt-2 text-xs">
                  🔒 24·25 확정값은 "옛날 데이터라 통째 자동만 막으면 됨" → min-year. 2026-01~05 는 "지표 정의가 달라져서 새 SQL 로 재계산하면 안 됨" → SQL/잡 안쪽 개별 잠금.
                </p>
              </section>

              <section>
                <h4 className="font-medium text-foreground">4) 동시 실행 · 성공 로그</h4>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    앱 레벨 락은 없다. 아래 실행 이력에서{' '}
                    <span className="rounded bg-blue-100 px-1 text-xs text-blue-700">RUNNING</span> 상태가 있으면 겹치지 않게 대기.
                  </li>
                  <li>
                    자동 스케줄은 매일 D-1 하루만 처리한다(고정 범위). <code className="rounded bg-muted px-1 text-xs">batch_watermark</code>(마트별 마지막 성공 적재일)는 감사 로그로만 남고 다음 배치 시작점 결정에는 쓰지 않는다. 수동 재실행은 지정 기간을 그대로 재적재한다.
                  </li>
                </ul>
              </section>

              <section>
                <h4 className="font-medium text-foreground">
                  5) 실행 이력 (<code className="rounded bg-muted px-1 text-xs">batch_run_log</code>)
                </h4>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  <li>
                    시작 시 <span className="rounded bg-blue-100 px-1 text-xs text-blue-700">RUNNING</span> 삽입 → 완료 시{' '}
                    <span className="rounded bg-emerald-100 px-1 text-xs text-emerald-700">SUCCESS</span>(행수·테이블 통계) / 실패 시{' '}
                    <span className="rounded bg-red-100 px-1 text-xs text-red-700">FAILED</span>(에러 메시지)로 업데이트.
                  </li>
                  <li>
                    유일성 제약 없이 append-only. 같은 기간을 여러 번 재실행하면 <b>이력이 여러 줄로 남아</b> 재실행 시점을 그대로 볼 수 있다(마트 행은 갱신, 이력은 누적).
                  </li>
                </ul>
              </section>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* 검사 도메인 특수 보정 — 원데이 검사 소급 보정.
          매월 자동 실행되므로 이 카드는 실패·backfill·개발 검증용 재실행 진입점이다. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">원데이 검사 소급 보정 (검사 도메인)</CardTitle>
          <CardDescription>
            검사일 이후 재검사 예약이 등록된 검사자를 원데이 → 일반으로 되돌린다. 매월 1일 03:30 KST 자동 실행되며(전전월~전월 범위), 이 카드는 스케줄러 실패·backfill·개발 검증용 재실행. min-year 가드 없음.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="oneday-from">검사일 시작</label>
              <input
                id="oneday-from"
                type="date"
                value={onedayFrom}
                onChange={(e) => setOnedayFrom(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground" htmlFor="oneday-to">검사일 끝</label>
              <input
                id="oneday-to"
                type="date"
                value={onedayTo}
                onChange={(e) => setOnedayTo(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1 text-sm"
              />
            </div>
            <Button
              onClick={() => reconcileOneday.mutate({ from: onedayFrom, to: onedayTo })}
              disabled={reconcileOneday.isPending || !onedayFrom || !onedayTo || onedayFrom > onedayTo}
              className="gap-1"
            >
              {reconcileOneday.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />실행 중…
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />원데이 보정 실행
                </>
              )}
            </Button>
          </div>
          {reconcileOneday.isSuccess && (
            <p className="text-xs text-emerald-700">
              실행 완료 — {reconcileOneday.data?.from} ~ {reconcileOneday.data?.to}. 상세 통계는 아래 실행 이력에서 확인.
            </p>
          )}
          {reconcileOneday.isError && (
            <p className="text-xs text-red-700">
              실행 실패: {(reconcileOneday.error as Error)?.message ?? '알 수 없는 오류'}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">실행 이력 (batch_run_log)</CardTitle>
            <CardDescription>
              최근 50건. 자동 새로고침 활성 시 3초마다 갱신.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(event) => setAutoRefresh(event.target.checked)}
              />
              자동 새로고침
            </label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logsQuery.refetch()}
              disabled={logsQuery.isFetching}
              className="gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${logsQuery.isFetching ? 'animate-spin' : ''}`} />
              새로고침
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {logsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> 이력 로딩 중...
            </div>
          ) : logsQuery.isError ? (
            <p className="text-sm text-red-600">
              이력 조회 실패: {logsQuery.error instanceof Error ? logsQuery.error.message : String(logsQuery.error)}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="w-8 px-2 py-2" />
                    <th className="px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">잡</th>
                    <th className="px-3 py-2 font-medium">타입</th>
                    <th className="px-3 py-2 font-medium">기간</th>
                    <th className="px-3 py-2 font-medium">상태</th>
                    <th className="px-3 py-2 font-medium text-right">행수</th>
                    <th className="px-3 py-2 font-medium">시작</th>
                    <th className="px-3 py-2 font-medium">종료</th>
                    <th className="px-3 py-2 font-medium text-right">소요</th>
                    <th className="px-3 py-2 font-medium">에러</th>
                  </tr>
                </thead>
                <tbody>
                  {(logsQuery.data ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-6 text-center text-muted-foreground">
                        실행 이력이 없습니다.
                      </td>
                    </tr>
                  ) : (
                    (logsQuery.data ?? []).flatMap((log) => {
                      const hasStats = log.tableStats && Object.keys(log.tableStats).length > 0
                      const isExpanded = expandedIds.has(log.id)
                      const rows = [
                        <tr
                          key={log.id}
                          className={`border-b last:border-0 hover:bg-muted/20 ${hasStats ? 'cursor-pointer' : ''}`}
                          onClick={() => hasStats && toggleExpanded(log.id)}
                        >
                          <td className="px-2 py-2 text-muted-foreground">
                            {hasStats ? (
                              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                            ) : null}
                          </td>
                          <td className="px-3 py-2 tabular-nums text-muted-foreground">{log.id}</td>
                          <td className="px-3 py-2 font-mono text-xs">{log.jobName}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-medium ${RUNTYPE_STYLE[log.runType]}`}
                              title={log.runType}
                            >
                              {RUNTYPE_LABEL[log.runType]}
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-xs">
                            {log.targetFrom ?? '-'} ~ {log.targetTo ?? '-'}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[log.status]}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{log.rowsUpserted.toLocaleString()}</td>
                          <td className="px-3 py-2 tabular-nums text-xs">{formatDateTime(log.startedAt)}</td>
                          <td className="px-3 py-2 tabular-nums text-xs">{formatDateTime(log.finishedAt)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-xs">{formatDuration(log.durationMs)}</td>
                          <td className="px-3 py-2 max-w-[240px] truncate text-xs text-red-600" title={log.errorMessage ?? ''}>
                            {log.errorMessage ?? ''}
                          </td>
                        </tr>,
                      ]
                      if (hasStats && isExpanded) {
                        rows.push(
                          <tr key={`${log.id}-stats`} className="border-b last:border-0 bg-muted/10">
                            <td />
                            <td colSpan={10} className="px-3 py-3">
                              <div className="text-xs font-medium text-muted-foreground">테이블별 upsert 행수</div>
                              <div className="mt-2 grid grid-cols-2 gap-x-8 gap-y-1 md:grid-cols-3 lg:grid-cols-4">
                                {Object.entries(log.tableStats ?? {}).map(([table, count]) => (
                                  <div key={table} className="flex items-baseline justify-between gap-2 text-xs">
                                    <span className="font-mono text-foreground">{table}</span>
                                    <span className="tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>,
                        )
                      }
                      return rows
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
