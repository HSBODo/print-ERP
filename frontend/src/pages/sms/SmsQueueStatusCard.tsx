import { useMemo, useState } from 'react'
import { AlertCircle, ChevronDown, ChevronUp, Play, RefreshCw, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useRunQueueNow, useSmsQueueRows, useSmsQueueStatus, useSolapiBalance } from '@/hooks/sms/useSmsQueue'
import { useAuthStore } from '@/stores/authStore'
import { canManagerOp, canSystemOp, matchesDepartment } from '@/stores/auth-session'
import { SmsFailedQueueModal } from './SmsFailedQueueModal'
import { CATEGORY_STYLE, groupByReason } from './smsFailReasonSummary'
import type { SmsSolapiBalance } from '@/api/sms'

/** yyyy-mm-dd 로컬 날짜 문자열 — Date.toISOString() 은 UTC 라 KST 새벽엔 하루 어긋난다. */
function todayIso(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** yyyy-mm-dd 문자열 하루 뒤 — 백엔드 to 파라미터가 exclusive 라 하루 밀어 보낸다. */
function addOneDayIso(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 1)
  const yy = dt.getFullYear()
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

/**
 * 자동 발송 큐 상태 요약 카드 — 문자 발송 리스트 상단 접힘 카드.
 *
 * <b>표시</b>
 *   · 상태별 카운트 (PENDING · PROCESSING · RECEIVED · DONE · FAILED · CANCELED)
 *   · 기간 완료량 (RECEIVED + DONE) — 아래 조회 범위 안에서
 *   · [실패·취소 재실행] 버튼 → 재실행 모달 (매니저 이상 상시 노출 · 라벨은 실패/취소 카운트에 따라 3분기)
 *   · [지금 실행] 버튼 → 5분 폴러 즉시 트리거 (ADMIN 전용)
 *
 * <b>조회 범위</b>
 *   scheduled_at 기준. 로딩 시 오늘 하루가 디폴트. date input 두 개로 관리자가 조정.
 *   백엔드 to 는 exclusive 라 화면 to+1 을 넘긴다(관리자는 to 포함 관점으로 본다).
 *
 * <b>동작</b>
 *   30초마다 자동 갱신. Phase 2 배치가 비활성(SMS_DISPATCH_ENABLED=false) 이어도
 *   카드는 표시 — 큐 상태(과거 임의 실행분·수동 실행분) 를 보여준다.
 *
 * <b>RECEIVED 관측</b>
 *   RECEIVED 는 솔라피가 접수했지만 아직 도달 확인이 안 된 중간 상태다. 정상 흐름에서는
 *   웹훅이 수 분 안에 DONE 으로 굳혀 카운트가 낮게 유지된다. RECEIVED 가 계속 쌓이면
 *   웹훅 수신 경로가 막혔다는 신호(방화벽·URL 오등록·시크릿 불일치 등).
 */
export function SmsQueueStatusCard() {
  const [collapsed, setCollapsed] = useState(false)
  const [failedOpen, setFailedOpen] = useState(false)
  // 로딩 시 오늘 하루가 디폴트. 관리자가 화면에서 다른 범위를 고르면 그 값으로 재조회.
  const [fromDate, setFromDate] = useState(todayIso)
  const [toDate, setToDate] = useState(todayIso)
  const range = useMemo(() => ({
    from: fromDate,
    // 백엔드 to 는 exclusive → toDate 가 나타내는 날의 끝까지 포함시키려면 하루 밀어 보낸다.
    to: addOneDayIso(toDate),
  }), [fromDate, toDate])
  const { data, isLoading, isError, refetch, isFetching } = useSmsQueueStatus(range)
  const balanceQuery = useSolapiBalance()
  const runNow = useRunQueueNow()
  const user = useAuthStore((s) => s.user)
  // [지금 실행] 은 SMS_DISPATCH_ENABLED 우회 트리거라 관리자 전용 — dry-run+override 조합에서
  // 실 발송이 나갈 수 있어 일반 사용자에게는 아예 보이지 않게 한다.
  const isAdmin = canSystemOp(user)
  // [실패·취소 재실행] 은 실무 판단(오래된 취소를 다시 보낼지)이 필요해 매니저 이상에게 상시 노출.
  // 부서 gate 도 함께 본다 — 백엔드 매처 "(DEPT_MARKETING or DEPT_ALL) and MANAGER↑" 와 대칭.
  // SMS 페이지 자체가 MARKETING 전용이라 실질적으로 여기서 새로 걸리는 케이스는 없지만,
  // 방어적으로 조건을 명시해 두면 페이지 게이팅이 바뀌어도 카드가 오작동하지 않는다.
  const canRerun = canManagerOp(user) && matchesDepartment(user, ['MARKETING'])

  const counts = (data?.counts ?? {}) as Partial<Record<'PENDING' | 'PROCESSING' | 'RECEIVED' | 'DONE' | 'FAILED' | 'CANCELED', number>>
  const pending = counts.PENDING ?? 0
  const processing = counts.PROCESSING ?? 0
  const received = counts.RECEIVED ?? 0
  const done = counts.DONE ?? 0
  const failed = counts.FAILED ?? 0
  const canceled = counts.CANCELED ?? 0
  const doneToday = data?.done_today ?? 0

  // 실패 사유 Top 3 — 접힘 상태에서도 "지금 실패의 대부분이 뭔지" 헤더에 노출.
  // failed > 0 일 때만 조회 (enabled). 30초 refetch 는 useSmsQueueRows 기본 캐시로 충분히 최신.
  // limit 500 은 SmsFailedQueueModal 기본(200)보다 크게 잡아 카테고리 분포 정확도 확보.
  const failedRowsQuery = useSmsQueueRows('FAILED', 500, failed > 0)
  const reasonTop = useMemo(
    () => groupByReason(failedRowsQuery.data ?? []).slice(0, 3),
    [failedRowsQuery.data],
  )

  const doRunNow = () => {
    runNow.mutate(undefined, {
      onSuccess: (stats) => {
        toast.success(
          `큐 실행됨 — 성공 ${stats.sent ?? 0} · 실패 ${stats.failed ?? 0} · 대기 ${stats.skipped ?? 0}`
        )
      },
      onError: (err) => toast.error(`큐 실행 실패: ${(err as Error).message}`),
    })
  }

  return (
    <div className="mb-2 rounded-md border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-gray-700 hover:bg-gray-50"
        aria-expanded={!collapsed}
      >
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-900">자동 발송 큐</span>
          {failed > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700">
              <AlertCircle className="h-3 w-3" />실패 {failed}
            </span>
          )}
          {/* 사유 Top 3 — 관측용이라 클릭 이벤트 없음. 실패 세부는 [실패·취소 재실행] 모달에서. */}
          {failed > 0 && reasonTop.length > 0 && (
            <span className="flex flex-wrap items-center gap-1">
              <span className="text-[10px] font-medium text-gray-400">Top</span>
              {reasonTop.map(({ category, count }) => (
                <span
                  key={category}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${CATEGORY_STYLE[category]}`}
                >
                  {category} {count}
                </span>
              ))}
            </span>
          )}
          <span className="text-[11px] font-normal text-gray-500">
            대기 {pending} · 처리중 {processing} · 접수 {received} · 완료 {doneToday}
          </span>
        </span>
        {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 p-3">
          {/* 조회 범위 — scheduled_at 기준. 로딩 시 오늘 하루가 디폴트. */}
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-600">
            <span className="font-medium text-gray-700">조회 범위</span>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value || todayIso())}
              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 tabular-nums"
              aria-label="조회 시작일"
            />
            <span className="text-gray-400">~</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value || todayIso())}
              className="rounded border border-gray-200 bg-white px-1.5 py-0.5 tabular-nums"
              aria-label="조회 종료일"
            />
            <button
              type="button"
              onClick={() => { const t = todayIso(); setFromDate(t); setToDate(t) }}
              className="rounded border border-gray-200 bg-white px-2 py-0.5 hover:bg-gray-50"
            >
              오늘
            </button>
            <span className="text-gray-400">· 발송예정일 기준</span>
          </div>
          {isLoading && <p className="py-4 text-center text-xs text-gray-500">불러오는 중…</p>}
          {isError && <p className="py-4 text-center text-xs text-red-600">큐 상태를 불러오지 못했습니다.</p>}
          {!isLoading && !isError && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="grid grid-cols-6 gap-2 text-center">
                <StatusChip label="대기" value={pending} color="text-blue-700 bg-blue-50" />
                <StatusChip label="처리중" value={processing} color="text-amber-700 bg-amber-50" />
                <StatusChip
                  label="접수"
                  value={received}
                  color="text-amber-700 bg-amber-50"
                  title="솔라피 접수 성공 · 웹훅으로 도달 확인 대기 중. 정상 흐름에서는 몇 분 안에 완료로 굳는다."
                />
                <StatusChip label="완료" value={done} color="text-emerald-700 bg-emerald-50" />
                <StatusChip label="실패" value={failed} color="text-red-700 bg-red-50" />
                <StatusChip label="취소" value={canceled} color="text-gray-600 bg-gray-100" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-500">기간 완료 {doneToday}</span>
                <SolapiBalancePanel balance={balanceQuery.data} isLoading={balanceQuery.isLoading} isError={balanceQuery.isError} />
                <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  <RefreshCw className={`mr-1 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                  새로고침
                </Button>
                {canRerun && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setFailedOpen(true)}
                    title="실패·취소된 큐를 재실행 대기열에 넣습니다. (매니저 이상)"
                  >
                    {failed > 0 && canceled > 0
                      ? '실패·취소 재실행'
                      : failed > 0
                        ? '실패 재실행'
                        : '취소 재실행'}
                    <span
                      aria-label="매니저 이상"
                      className="ml-1.5 rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
                    >
                      매니저↑
                    </span>
                  </Button>
                )}
                {isAdmin && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={doRunNow}
                    disabled={runNow.isPending}
                    title="큐를 지금 한 번 폴링해 발송을 시도합니다. (관리자 전용)"
                  >
                    <Play className="mr-1 h-3.5 w-3.5" />
                    {runNow.isPending ? '실행 중…' : '지금 실행'}
                    <span
                      aria-label="관리자 전용"
                      className="ml-1.5 rounded border border-amber-200 bg-amber-50 px-1 py-0 text-[9px] font-semibold uppercase tracking-wide text-amber-700"
                    >
                      관리자
                    </span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {failedOpen && (
        <SmsFailedQueueModal
          open
          onClose={() => setFailedOpen(false)}
          initialTab={failed > 0 ? 'FAILED' : 'CANCELED'}
        />
      )}
    </div>
  )
}

function StatusChip({ label, value, color, title }: { label: string; value: number; color: string; title?: string }) {
  return (
    <div className={`min-w-[64px] rounded-md px-2 py-1 ${color}`} title={title}>
      <div className="text-[10px] font-medium">{label}</div>
      <div className="text-sm font-semibold tabular-nums">{value}</div>
    </div>
  )
}

/**
 * 솔라피 잔액 뱃지 — 큐 카드 오른쪽 액션 옆.
 * 값이 null 이거나 configured=false 면 뱃지를 비우지 않고 상태를 그대로 노출한다 —
 * "왜 안 보이지?" 로 헷갈리지 않도록.
 */
function SolapiBalancePanel({
  balance, isLoading, isError,
}: {
  balance: SmsSolapiBalance | undefined
  isLoading: boolean
  isError: boolean
}) {
  const state = balanceStateOf(balance, isLoading, isError)
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] tabular-nums ${state.className}`}
      title={state.title}
    >
      <Wallet className="h-3 w-3 opacity-70" />
      <span className="font-medium">솔라피</span>
      <span>{state.text}</span>
    </div>
  )
}

const KRW = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })

/** 상태 분기 — 로딩·에러·미설정·조회실패·정상 5가지를 하나로 정리. */
function balanceStateOf(
  balance: SmsSolapiBalance | undefined,
  isLoading: boolean,
  isError: boolean,
): { text: string; className: string; title: string } {
  if (isLoading) {
    return { text: '조회 중…', className: 'border-gray-200 bg-white text-gray-500', title: '솔라피 잔액 조회 중' }
  }
  if (isError || !balance) {
    return { text: '조회 실패', className: 'border-red-200 bg-red-50 text-red-700', title: '솔라피 잔액을 불러오지 못했습니다.' }
  }
  if (!balance.configured) {
    return { text: '미설정', className: 'border-gray-200 bg-gray-50 text-gray-500', title: 'SOLAPI_API_KEY·SECRET 미설정' }
  }
  if (balance.errorMessage) {
    return {
      text: '조회 실패',
      className: 'border-red-200 bg-red-50 text-red-700',
      title: `솔라피 API 오류: ${balance.errorMessage}`,
    }
  }
  const point = balance.point ?? 0
  // 솔라피 콘솔의 "잔액" 은 API 의 deposit(예치금, 부가세 포함) 이다.
  // balance 필드는 부가세 제외한 실사용 가능액이라 콘솔 표시와 달라 관리자가 혼동한다.
  const deposit = balance.deposit ?? balance.balance ?? 0
  return {
    text: `잔액 ${KRW.format(deposit)}원 · 포인트 ${KRW.format(point)}원`,
    className: 'border-blue-100 bg-blue-50 text-blue-700',
    title: '솔라피 콘솔의 잔액과 동일(예치금 기준). 포인트는 발송에 우선 소진됨.',
  }
}
