import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Info, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useSmsOffsets, useUpdateSmsOffsets } from '@/hooks/sms/useSmsOffsets'
import { useAuthStore } from '@/stores/authStore'
import type { SmsMessageKind, SmsOffsetRow } from '@/api/sms'

/**
 * 문자 발송 1·2·3차 설정 편집 카드 — 상단: tier-level(시각·종류), 하단: 4×3 오프셋 그리드.
 *
 * <b>편집 대상은 발송 그룹 4종(SMILE·LASIK·LASEK·ICL)만.</b> ETC(백내장·재수술) 는 발송 대상이
 * 아니라 서버 응답에도 안 오고 여기 표시되지 않는다.
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

type OffsetDraft = { groupCode: string; label: string; tier1: number; tier2: number; tier3: number }
type TierDraft = {
  tier1Time: string; tier2Time: string; tier3Time: string
  tier1Kind: SmsMessageKind; tier2Kind: SmsMessageKind; tier3Kind: SmsMessageKind
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
    if (v < OFFSET_MIN || v > OFFSET_MAX) return `${OFFSET_MIN}~${OFFSET_MAX} 사이`
  }
  if (d.tier1 > d.tier2 || d.tier2 > d.tier3) return '차수 순서 어긋남'
  return null
}

const timeInvalid = (time: string, kind: SmsMessageKind): string | null => {
  if (!/^\d{2}:\d{2}$/.test(time)) return '형식 HH:mm'
  const [hh, mm] = time.split(':').map(Number)
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return '잘못된 시각'
  // 광고톡만 hour 제한. 알림톡은 자유.
  if (kind === 'AD' && (hh < AD_MIN_HOUR || hh > AD_MAX_HOUR)) {
    return `광고톡 ${AD_MIN_HOUR}..${AD_MAX_HOUR}시`
  }
  return null
}

const KIND_LABEL: Record<SmsMessageKind, string> = { NOTIFICATION: '알림톡', AD: '광고톡' }

export function SmsOffsetGrid() {
  const [open, setOpen] = useState(false)
  // 관리자 전용 카드 — 오프셋·발송 시각은 발송 정책의 근간이라 일반 사용자가 실수로 바꾸면 안 된다.
  // 뱃지만 붙이면 편집 필드는 그대로 보여 오해 소지가 있으니 카드 자체를 감춘다.
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === 'ADMIN'
  const { data, isLoading, isError } = useSmsOffsets()
  const updateMutation = useUpdateSmsOffsets()

  /**
   * 서버값(data) 위에 사용자 편집만 덮어씌우는 방식 — data 재조회 시 편집중이던 값이 흔들리지 않고
   * lint(react-hooks/set-state-in-effect)도 통과한다.
   */
  const [offsetOverrides, setOffsetOverrides] = useState<Record<string, Partial<OffsetDraft>>>({})
  const [tierOverrides, setTierOverrides] = useState<Partial<TierDraft>>({})

  const drafts = useMemo<OffsetDraft[]>(() => {
    if (!data) return []
    return data.map((r) => {
      const base = toOffsetDraft(r)
      const patch = offsetOverrides[r.groupCode]
      return patch ? { ...base, ...patch } : base
    })
  }, [data, offsetOverrides])

  const tiers: TierDraft = useMemo(() => {
    const base = data?.[0]
    return {
      tier1Time: tierOverrides.tier1Time ?? base?.tier1Time ?? '10:00',
      tier2Time: tierOverrides.tier2Time ?? base?.tier2Time ?? '10:00',
      tier3Time: tierOverrides.tier3Time ?? base?.tier3Time ?? '10:00',
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
  const dirty = Object.keys(offsetOverrides).length > 0 || Object.keys(tierOverrides).length > 0
  const hasError = offsetErrors.some((e) => e !== null) || timeErrors.some((e) => e !== null)

  const updateOffsetCell = (idx: number, key: 'tier1' | 'tier2' | 'tier3', raw: string) => {
    const parsed = raw === '' || raw === '-' ? 0 : Number.parseInt(raw, 10)
    if (Number.isNaN(parsed)) return
    const code = drafts[idx].groupCode
    setOffsetOverrides((prev) => ({ ...prev, [code]: { ...(prev[code] ?? {}), [key]: parsed } }))
  }

  const updateTime = (key: 'tier1Time' | 'tier2Time' | 'tier3Time', value: string) => {
    setTierOverrides((prev) => ({ ...prev, [key]: value }))
  }

  const updateKind = (key: 'tier1Kind' | 'tier2Kind' | 'tier3Kind', value: SmsMessageKind) => {
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

  // 훅은 위에서 전부 부른 뒤 여기서 조기 반환한다 — react-hooks/rules-of-hooks 준수.
  if (!isAdmin) return null

  return (
    <Card className="border-border/70 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
        aria-expanded={open}
      >
        <Info className="h-4 w-4 text-blue-600" />
        <span className="font-medium text-gray-900">1·2·3차 오프셋 · 발송 시각 설정</span>
        <span
          title="관리자 권한 필요"
          aria-label="관리자 전용"
          className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700"
        >
          관리자
        </span>
        <span className="text-xs text-gray-500">
          수술 그룹별 발송 예정일 + 차수별 시각/종류. 저장 즉시 반영.
        </span>
        <span className="ml-auto text-gray-400">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-100 px-5 py-4">
          {isLoading && <p className="text-sm text-gray-500">불러오는 중…</p>}
          {isError && <p className="text-sm text-red-600">설정을 불러오지 못했습니다.</p>}
          {!isLoading && !isError && drafts.length > 0 && (
            <>
              {/* tier-level: 시각 + 종류 */}
              <div className="mb-4 rounded-md border border-gray-200 bg-gray-50 px-3 py-2.5">
                <div className="mb-2 text-xs font-medium text-gray-700">발송 시각 · 종류</div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {([
                    { time: 'tier1Time', kind: 'tier1Kind', label: '1차', err: timeErrors[0] },
                    { time: 'tier2Time', kind: 'tier2Kind', label: '2차', err: timeErrors[1] },
                    { time: 'tier3Time', kind: 'tier3Kind', label: '3차', err: timeErrors[2] },
                  ] as const).map(({ time, kind, label, err }) => (
                    <div key={time} className="flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">{label}</span>
                      <input
                        type="time"
                        value={tiers[time]}
                        onChange={(e) => updateTime(time, e.target.value)}
                        className={
                          'rounded-md border px-2 py-1 text-sm ' +
                          (err ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white')
                        }
                      />
                      <select
                        value={tiers[kind]}
                        onChange={(e) => updateKind(kind, e.target.value as SmsMessageKind)}
                        className="rounded-md border border-gray-200 bg-white px-1.5 py-1 text-sm"
                      >
                        <option value="NOTIFICATION">{KIND_LABEL.NOTIFICATION}</option>
                        <option value="AD">{KIND_LABEL.AD}</option>
                      </select>
                      {err && <span className="text-[10px] text-red-600">{err}</span>}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-[10px] text-gray-500">
                  알림톡: 시간 제한 없음(정보성) · 광고톡: {AD_MIN_HOUR}..{AD_MAX_HOUR}시만 허용(21~08 발송 금지)
                </p>
              </div>

              {/* 그룹별 오프셋 그리드 */}
              <table className="w-full max-w-xl border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                    <th className="px-2 py-2 font-medium">수술 그룹</th>
                    <th className="px-2 py-2 text-center font-medium">1차 (일)</th>
                    <th className="px-2 py-2 text-center font-medium">2차 (일)</th>
                    <th className="px-2 py-2 text-center font-medium">3차 (일)</th>
                    <th className="px-2 py-2 font-medium">검증</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, i) => (
                    <tr key={d.groupCode} className="border-b border-gray-100">
                      <td className="px-2 py-2">
                        <span className="font-medium text-gray-900">{d.label}</span>
                        <span className="ml-1.5 text-[10px] text-gray-400">{d.groupCode}</span>
                      </td>
                      {(['tier1', 'tier2', 'tier3'] as const).map((k) => (
                        <td key={k} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={OFFSET_MIN}
                            max={OFFSET_MAX}
                            value={d[k]}
                            onChange={(e) => updateOffsetCell(i, k, e.target.value)}
                            className={
                              'w-16 rounded-md border px-2 py-1 text-center text-sm ' +
                              (offsetErrors[i] ? 'border-red-300 bg-red-50' : 'border-gray-200')
                            }
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-xs">
                        {offsetErrors[i] ? (
                          <span className="text-red-600">{offsetErrors[i]}</span>
                        ) : (
                          <span className="text-gray-400">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-3 flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={reset} disabled={!dirty}>
                  <RotateCcw className="mr-1 h-3.5 w-3.5" />초기화
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
                {data?.[0]?.updatedAt && (
                  <span className="ml-auto text-[11px] text-gray-400">
                    마지막 수정: {String(data[0].updatedAt).replace('T', ' ').slice(0, 16)}
                    {data[0].updatedBy ? ` · ${data[0].updatedBy}` : ''}
                  </span>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-gray-500">
                오프셋 <b>0~30일</b>, <b>1차 ≤ 2차 ≤ 3차</b> 순서. 시각은 <b>분 단위(HH:mm)</b> 편집 가능.
                <br />
                백내장·재수술은 발송 대상이 아니라 이 표에 없습니다. 오프셋 4행 + 시각·종류 3세트가 함께 저장됩니다.
              </p>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
