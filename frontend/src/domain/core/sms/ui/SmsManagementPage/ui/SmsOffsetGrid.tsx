import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Info, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#shared/ui/Button'
import { Card } from '#shared/ui/Card'
import {
  useSmsOffsets,
  useUpdateSmsOffsets,
} from '../../../hooks/useSmsOffsets'
import { useAuthStore } from '#domain/support/session/store'
import { canSystemOp } from '#domain/support/session/session'
import type { SmsMessageKind, SmsOffsetRow } from '../../../type/api'

/**
 * 문자 발송 1·2·3차 설정 카드 — 상단: tier-level(시각·종류), 하단: 4×3 오프셋 그리드.
 *
 * <b>편집 대상은 발송 그룹 4종(SMILE·LASIK·LASEK·ICL)만.</b> ETC(백내장·재수술) 는 발송 대상이
 * 아니라 서버 응답에도 안 오고 여기 표시되지 않는다.
 *
 * <h3>권한</h3>
 * 카드 자체는 모두에게 노출되어 지금 언제·어떤 채널로 나가는지 조회할 수 있다.
 * 편집(입력·저장·초기화) 은 관리자 롤만 가능 — 발송 정책의 근간이라 실수 방지.
 * 백엔드 {@code PUT /api/sms-management/offsets} 도 hasRole('ADMIN') 로 이중 가드.
 *
 * 값 저장 즉시 서버 캐시가 무효화돼 targets 재조회가 걸린다 — 예정일이 새 오프셋 기준으로
 * 다시 계산된 상태로 화면이 갱신된다.
 *
 * <h3>유효성</h3>
 * <ul>
 *   <li>오프셋: 0..30 정수. 1차 ≤ 2차 ≤ 3차 (라섹처럼 같음 허용)</li>
 *   <li>시각: HH:mm 필수</li>
 *   <li>메시지 종류:
 *     <b>알림톡(NOTIFICATION)</b> — 시간 제한 없음 (정보성).
 *     <b>광고톡(AD)</b> — 정보통신망법상 hour 8..20 강제.
 *   </li>
 * </ul>
 */

const OFFSET_MIN = 0
const OFFSET_MAX = 30
const AD_MIN_HOUR = 8
const AD_MAX_HOUR = 20

type OffsetDraft = {
  groupCode: string
  label: string
  tier1: number
  tier2: number
  tier3: number
}
type TierDraft = {
  tier1Time: string
  tier2Time: string
  tier3Time: string
  tier1Kind: SmsMessageKind
  tier2Kind: SmsMessageKind
  tier3Kind: SmsMessageKind
}

const toOffsetDraft = (r: SmsOffsetRow): OffsetDraft => ({
  groupCode: r.groupCode,
  label: r.label,
  tier1: r.tier1Offset,
  tier2: r.tier2Offset,
  tier3: r.tier3Offset,
})

const offsetRowInvalid = (d: OffsetDraft): string | null => {
  for (const v of [d.tier1, d.tier2, d.tier3]) {
    if (!Number.isInteger(v)) return '정수만 입력'
    if (v < OFFSET_MIN || v > OFFSET_MAX)
      return `${OFFSET_MIN}~${OFFSET_MAX} 사이`
  }
  if (d.tier1 > d.tier2 || d.tier2 > d.tier3) return '차수 순서 어긋남'
  return null
}

/**
 * 서버 값 정규화 — 초 부분 절단 + 분을 5분 단위로 반내림.
 *
 * <p>두 가지 케이스 방어:
 * <ul>
 *   <li>서버가 "10:00:00" (초 포함) 로 내려 <input type="time"> 이 화면엔 "10:00" 만 보여줘도 state 는
 *       "10:00:00" 이라 저장 요청이 @JsonFormat("HH:mm") 를 어겨 400 이 뜨는 경우</li>
 *   <li>옛 저장값이 5분 단위가 아닌 경우(예: "10:03") — 반내림해 "10:00" 으로 정렬. 이후 검증도 통과.</li>
 * </ul>
 * 사용자가 직접 입력하는 값은 검증에서 5분 단위 강제 (아래 timeInvalid). load 시엔 정렬, 편집 시엔 검증.
 */
const normalizeTime = (t: string | null | undefined): string => {
  if (!t) return '10:00'
  const m = /^(\d{1,2}):(\d{2})/.exec(t)
  if (!m) return t
  const hh = m[1].padStart(2, '0')
  const mm = Number(m[2])
  const aligned = Math.floor(mm / 5) * 5
  return hh + ':' + String(aligned).padStart(2, '0')
}

const timeInvalid = (time: string, kind: SmsMessageKind): string | null => {
  if (!/^\d{2}:\d{2}$/.test(time)) return '형식 HH:mm'
  const [hh, mm] = time.split(':').map(Number)
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return '잘못된 시각'
  // 폴러가 5분 사이클이라 그 외 분값은 다음 사이클로 밀린다 → UI 단계에서 5분 단위만 허용.
  // load 시엔 normalizeTime 이 반내림해 정렬하므로 이 err 는 사용자가 직접 5분 외 값을 입력했을 때만 발생.
  if (mm % 5 !== 0) return '5분 단위'
  // 광고톡만 hour 제한. 알림톡은 자유.
  if (kind === 'AD' && (hh < AD_MIN_HOUR || hh > AD_MAX_HOUR)) {
    return `광고톡 ${AD_MIN_HOUR}..${AD_MAX_HOUR}시`
  }
  return null
}

const KIND_LABEL: Record<SmsMessageKind, string> = {
  NOTIFICATION: '알림톡',
  AD: '광고톡',
}

/**
 * 발송 그룹 정본 순서 — 백엔드 응답이 HashMap 기반이라 매 로드마다 순서가 바뀌므로
 * 여기서 강제. 목록에 없는 groupCode 는 알파벳 뒤로 밀림 (안전 fallback).
 */
const GROUP_ORDER: Record<string, number> = {
  SMILE: 0,
  LASIK: 1,
  LASEK: 2,
  ICL: 3,
}

const compareGroup = (a: string, b: string) => {
  const ai = GROUP_ORDER[a] ?? Number.MAX_SAFE_INTEGER
  const bi = GROUP_ORDER[b] ?? Number.MAX_SAFE_INTEGER
  if (ai !== bi) return ai - bi
  return a.localeCompare(b)
}

export function SmsOffsetGrid() {
  const [open, setOpen] = useState(false)
  // 모두에게 카드를 노출해 시간·오프셋을 조회할 수 있게 하되, 수정은 관리자만.
  // 발송 정책의 근간이라 일반 사용자가 실수로 바꾸면 안 되지만, "지금 몇 시에 나가는지"
  // 를 관리자만 보면 협업이 어렵다 — 조회는 열고 편집만 잠근다.
  const user = useAuthStore((s) => s.user)
  const isAdmin = canSystemOp(user)
  const { data, isLoading, isError } = useSmsOffsets()
  const updateMutation = useUpdateSmsOffsets()

  /**
   * 서버값(data) 위에 사용자 편집만 덮어씌우는 방식 — data 재조회 시 편집중이던 값이 흔들리지 않고
   * lint(react-hooks/set-state-in-effect)도 통과한다.
   */
  const [offsetOverrides, setOffsetOverrides] = useState<
    Record<string, Partial<OffsetDraft>>
  >({})
  const [tierOverrides, setTierOverrides] = useState<Partial<TierDraft>>({})

  const drafts = useMemo<OffsetDraft[]>(() => {
    if (!data) return []
    return data
      .map((r) => {
        const base = toOffsetDraft(r)
        const patch = offsetOverrides[r.groupCode]
        return patch ? { ...base, ...patch } : base
      })
      .sort((a, b) => compareGroup(a.groupCode, b.groupCode))
  }, [data, offsetOverrides])

  const tiers: TierDraft = useMemo(() => {
    const base = data?.[0]
    return {
      tier1Time: tierOverrides.tier1Time ?? normalizeTime(base?.tier1Time),
      tier2Time: tierOverrides.tier2Time ?? normalizeTime(base?.tier2Time),
      tier3Time: tierOverrides.tier3Time ?? normalizeTime(base?.tier3Time),
      tier1Kind: tierOverrides.tier1Kind ?? base?.tier1Kind ?? 'NOTIFICATION',
      tier2Kind: tierOverrides.tier2Kind ?? base?.tier2Kind ?? 'NOTIFICATION',
      tier3Kind: tierOverrides.tier3Kind ?? base?.tier3Kind ?? 'NOTIFICATION',
    }
  }, [data, tierOverrides])

  const offsetErrors = useMemo(() => drafts.map(offsetRowInvalid), [drafts])
  const timeErrors = useMemo(
    () =>
      [
        timeInvalid(tiers.tier1Time, tiers.tier1Kind),
        timeInvalid(tiers.tier2Time, tiers.tier2Kind),
        timeInvalid(tiers.tier3Time, tiers.tier3Kind),
      ] as const,
    [tiers],
  )
  const dirty =
    Object.keys(offsetOverrides).length > 0 ||
    Object.keys(tierOverrides).length > 0
  const hasError =
    offsetErrors.some((e) => e !== null) || timeErrors.some((e) => e !== null)

  const updateOffsetCell = (
    idx: number,
    key: 'tier1' | 'tier2' | 'tier3',
    raw: string,
  ) => {
    const parsed = raw === '' || raw === '-' ? 0 : Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const code = drafts[idx].groupCode
    setOffsetOverrides((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? {}), [key]: parsed },
    }))
  }

  const updateTime = (
    key: 'tier1Time' | 'tier2Time' | 'tier3Time',
    value: string,
  ) => {
    setTierOverrides((prev) => ({ ...prev, [key]: value }))
  }

  const updateKind = (
    key: 'tier1Kind' | 'tier2Kind' | 'tier3Kind',
    value: SmsMessageKind,
  ) => {
    setTierOverrides((prev) => ({ ...prev, [key]: value }))
  }

  const reset = () => {
    setOffsetOverrides({})
    setTierOverrides({})
  }

  const save = () => {
    if (hasError || !dirty) return
    updateMutation.mutate(
      {
        rows: drafts.map((d) => ({
          groupCode: d.groupCode,
          tier1Offset: d.tier1,
          tier2Offset: d.tier2,
          tier3Offset: d.tier3,
        })),
        tier1Time: tiers.tier1Time,
        tier2Time: tiers.tier2Time,
        tier3Time: tiers.tier3Time,
        tier1Kind: tiers.tier1Kind,
        tier2Kind: tiers.tier2Kind,
        tier3Kind: tiers.tier3Kind,
      },
      {
        onSuccess: () => {
          setOffsetOverrides({})
          setTierOverrides({})
          toast.success('저장 완료. 예정일·발송 시각이 새 값으로 반영됩니다.')
        },
        onError: (err) => toast.error(`저장 실패: ${(err as Error).message}`),
      },
    )
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
        aria-expanded={open}
      >
        <Info className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-gray-900">
          1·2·3차 오프셋 · 발송 시각 설정
        </span>
        <span className="text-xs text-gray-500">
          수술 그룹별 발송 예정일 + 차수별 시각/종류. 저장 즉시 반영.
        </span>
        <span className="ml-auto text-gray-400">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {isLoading && <p className="text-sm text-gray-500">불러오는 중…</p>}
          {isError && (
            <p className="text-sm text-red-600">설정을 불러오지 못했습니다.</p>
          )}
          {!isLoading && !isError && drafts.length > 0 && (
            <>
              {/* tier-level: 시각 + 종류 */}
              <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="mb-2 text-xs font-medium text-gray-700">
                  발송 시각 · 종류
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {(
                    [
                      {
                        time: 'tier1Time',
                        kind: 'tier1Kind',
                        label: '1차',
                        err: timeErrors[0],
                      },
                      {
                        time: 'tier2Time',
                        kind: 'tier2Kind',
                        label: '2차',
                        err: timeErrors[1],
                      },
                      {
                        time: 'tier3Time',
                        kind: 'tier3Kind',
                        label: '3차',
                        err: timeErrors[2],
                      },
                    ] as const
                  ).map(({ time, kind, label, err }) => (
                    <div key={time} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">{label}</span>
                      <input
                        type="time"
                        step={300}
                        value={tiers[time]}
                        onChange={(e) => updateTime(time, e.target.value)}
                        disabled={!isAdmin}
                        title={
                          isAdmin ? undefined : '수정은 관리자만 가능합니다'
                        }
                        className={
                          'rounded-md border px-2 py-1 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ' +
                          (err
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white')
                        }
                      />
                      <select
                        value={tiers[kind]}
                        onChange={(e) =>
                          updateKind(kind, e.target.value as SmsMessageKind)
                        }
                        disabled={!isAdmin}
                        title={
                          isAdmin ? undefined : '수정은 관리자만 가능합니다'
                        }
                        className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="NOTIFICATION">
                          {KIND_LABEL.NOTIFICATION}
                        </option>
                        <option value="AD">{KIND_LABEL.AD}</option>
                      </select>
                      {err && (
                        <span className="text-[10px] text-red-600">{err}</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-500">
                  알림톡: 시간 제한 없음(정보성) · 광고톡: {AD_MIN_HOUR}..
                  {AD_MAX_HOUR}시만 허용(21~08 발송 금지)
                </p>
              </div>

              {/* 그룹별 오프셋 그리드 */}
              <table className="w-full max-w-xl border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="px-2 py-2 font-medium">수술 그룹</th>
                    <th className="px-2 py-2 text-center font-medium">
                      1차 (일)
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      2차 (일)
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      3차 (일)
                    </th>
                    <th className="px-2 py-2 font-medium">검증</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, i) => (
                    <tr key={d.groupCode} className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <span className="font-medium text-gray-900">
                          {d.label}
                        </span>
                        <span className="ml-1.5 text-[10px] text-gray-400">
                          {d.groupCode}
                        </span>
                      </td>
                      {(['tier1', 'tier2', 'tier3'] as const).map((k) => (
                        <td key={k} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={OFFSET_MIN}
                            max={OFFSET_MAX}
                            value={d[k]}
                            onChange={(e) =>
                              updateOffsetCell(i, k, e.target.value)
                            }
                            disabled={!isAdmin}
                            title={
                              isAdmin ? undefined : '수정은 관리자만 가능합니다'
                            }
                            className={
                              'w-16 rounded-md border px-2 py-1 text-center text-sm disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ' +
                              (offsetErrors[i]
                                ? 'border-red-300 bg-red-50'
                                : 'border-gray-200')
                            }
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-xs">
                        {offsetErrors[i] ? (
                          <span className="text-red-600">
                            {offsetErrors[i]}
                          </span>
                        ) : (
                          <span className="text-gray-400">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex items-center gap-2">
                {isAdmin ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reset}
                      disabled={!dirty}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      초기화
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={save}
                      disabled={!dirty || hasError || updateMutation.isPending}
                    >
                      <Save className="mr-1 h-3.5 w-3.5" />
                      {updateMutation.isPending ? '저장 중…' : '저장'}
                    </Button>
                    <span
                      title="관리자 권한 필요"
                      aria-label="관리자 전용"
                      className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
                    >
                      관리자
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] text-gray-500">
                    수정은 관리자만 가능합니다.
                  </span>
                )}
                {data?.[0]?.updatedAt && (
                  <span className="ml-auto text-[11px] text-gray-400">
                    마지막 수정:{' '}
                    {String(data[0].updatedAt).replace('T', ' ').slice(0, 16)}
                    {data[0].updatedBy ? ` · ${data[0].updatedBy}` : ''}
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                오프셋 <b>0~30일</b>, <b>1차 ≤ 2차 ≤ 3차</b> 순서. 시각은{' '}
                <b>5분 단위(HH:mm)</b> — 폴러 사이클과 맞춤. 옛 저장값이 5분
                단위가 아니면 로드 시 자동 반내림.
                <br />
                백내장·재수술은 발송 대상이 아니라 이 표에 없습니다. 오프셋 4행
                + 시각·종류 3세트가 함께 저장됩니다.
              </p>

              <div className="mt-3 rounded-md border border-blue-100 bg-blue-50/60 px-3 py-2.5 text-[12px] leading-relaxed text-gray-700">
                <div className="mb-1.5 font-semibold text-blue-900">
                  발송 시각은 이렇게 정해집니다
                </div>
                <p className="text-gray-700">
                  <b>실패·취소된 문자를 다시 보내거나</b>,{' '}
                  <b>발송중지를 풀거나</b>, <b>오프셋 시간을 바꾸면</b> 예정
                  시각이 다음 규칙으로 정해집니다.
                </p>
                <ul className="mt-1.5 space-y-1 pl-1">
                  <li>
                    ·{' '}
                    <b className="text-blue-900">
                      예정 시간이 아직 안 지났다면
                    </b>{' '}
                    — 원래 시각 그대로 발송합니다.
                  </li>
                  <li>
                    · <b className="text-blue-900">예정 시간이 이미 지났다면</b>{' '}
                    — 곧바로 다음 발송 사이클(최대 5분 안)에 나갑니다.
                  </li>
                </ul>
                <div className="mt-2 rounded bg-white/60 px-2 py-1.5 text-[11px] text-gray-600">
                  <div className="mb-0.5 font-medium text-gray-700">
                    예시 (지금이 오늘 15시라고 가정)
                  </div>
                  <ul className="space-y-0.5">
                    <li>
                      · 어제 10시에 나갈 예정이었던 문자 → 지금{' '}
                      <b>곧바로 발송</b> (오늘 15시)
                    </li>
                    <li>
                      · 오늘 10시에 나갈 예정 → 아침 9시에 조작 →{' '}
                      <b>원래대로 오늘 10시</b>에 발송
                    </li>
                    <li>
                      · 내일 10시에 나갈 예정 → <b>내일 10시에 그대로</b> 발송
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-2 rounded-md border border-amber-200 bg-amber-50/60 px-3 py-2.5 text-[12px] leading-relaxed text-gray-700">
                <div className="mb-1.5 font-semibold text-amber-900">
                  발송중지를 풀면 어떤 문자가 다시 나가나요?
                </div>
                <p className="text-gray-700">
                  발송중지를 풀면 <b>아직 나가지 않은 문자만</b> 다시 발송
                  대기로 돌아갑니다.
                </p>
                <ul className="mt-1.5 space-y-1 pl-1">
                  <li>
                    · <b className="text-emerald-700">발송중지로 취소된 문자</b>{' '}
                    — 자동으로 다시 나갑니다.
                    <div className="pl-3 text-[11px] text-gray-500">
                      예정 시간이 <b>아직 안 지났으면</b> 원래 시각에,{' '}
                      <b>이미 지났으면</b> 곧바로 다음 발송 사이클(최대 5분
                      안)에 나갑니다.
                    </div>
                  </li>
                  <li>
                    ·{' '}
                    <b className="text-gray-500">
                      이미 나간 문자 (성공 · 실패 무관)
                    </b>{' '}
                    — 다시 안 나갑니다.
                  </li>
                  <li>
                    · <b className="text-red-600">실패한 문자</b> — 자동으로
                    재시도하지 않습니다 (실수로 대량 재발송되는 것을 막기 위해).
                  </li>
                </ul>
                <p className="mt-2 rounded bg-white/60 px-2 py-1.5 text-[11px] text-gray-600">
                  실패한 문자를 다시 보내려면 큐 상태 카드의{' '}
                  <b className="text-red-600">[실패 재실행]</b> 버튼을 눌러야
                  합니다.
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
