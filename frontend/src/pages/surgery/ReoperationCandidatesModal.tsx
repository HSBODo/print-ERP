import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '#shared/ui/Button'
import { useReoperationCandidates } from '@/hooks/surgery/useReoperationCandidates'
import {
  useReoperationDecisions,
  useSaveReoperationDecisions,
} from '@/hooks/surgery/useReoperationDecisions'
import type { ReoperationCandidate } from '@/api/surgery/reoperationCandidates'

/**
 * 재수술 검토 팝업 — 자동판정 후보를 체크박스로 검토하고 최종 판정을 저장한다.
 *
 * 초기 체크 상태:
 *   저장된 판정이 있으면 그 값을, 없으면 자동판정(autoIncluded)을 기본으로 쓴다.
 *   사용자가 체크박스를 뒤집으면 flipped Set 에 담아두고, 저장 시 서버로 batch upsert.
 *
 * 저장 값이 "재수술 여부의 정답" — 자동판정 SQL 이 바뀌어도 저장된 판정이 우선한다.
 */

type KeyedCandidate = ReoperationCandidate & { key: string }

type Props = {
  from: string
  to: string
  onClose: () => void
}

const dash = (v: string) => (v && v.trim() ? v : '—')

export function ReoperationCandidatesModal({ from, to, onClose }: Props) {
  const { candidates, isLoading, isFetching, isError } = useReoperationCandidates(from, to, true)
  const { decisions } = useReoperationDecisions(from, to, true)
  const saveMutation = useSaveReoperationDecisions(from, to)

  const keyed = useMemo<KeyedCandidate[]>(
    () => candidates.map((c, i) => ({ ...c, key: `${c.chartNo}-${c.reopDate}-${i}` })),
    [candidates],
  )

  // 저장된 판정을 (차트번호, 수술일, 우안, 좌안) 키로 인덱싱. 자동판정보다 우선.
  // 같은 사람·같은 날 시술명이 다른 재수술이 별건으로 존재해서 시술명까지 키에 포함해야 한다.
  const decisionKey = (chartNo: string, opDate: string, againR: string, againL: string) =>
    `${chartNo}|${opDate}|${againR}|${againL}`
  const decisionMap = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const d of decisions) map.set(decisionKey(d.chartNo, d.opDate, d.againR, d.againL), d.isReoperation)
    return map
  }, [decisions])

  // 사용자가 이번 세션에서 기본값(=저장값 or 자동판정)에서 뒤집은 행. 저장 성공 시 비운다.
  const [flipped, setFlipped] = useState<Set<string>>(new Set())

  const baseChecked = (c: KeyedCandidate) => {
    const saved = decisionMap.get(decisionKey(c.chartNo, c.reopDate, c.againR, c.againL))
    return saved ?? c.autoIncluded === 1
  }

  const isChecked = (c: KeyedCandidate) => {
    const base = baseChecked(c)
    return flipped.has(c.key) ? !base : base
  }

  const included = useMemo(() => keyed.filter((c) => c.autoIncluded === 1), [keyed])
  const excluded = useMemo(() => keyed.filter((c) => c.autoIncluded === 0), [keyed])

  const excludedGroups = useMemo(() => {
    const map = new Map<string, KeyedCandidate[]>()
    for (const c of excluded) {
      const reason = c.excludeReason || '기타'
      const arr = map.get(reason) ?? []
      arr.push(c)
      map.set(reason, arr)
    }
    return [...map.entries()]
  }, [excluded])

  const autoCount = included.length
  const finalCount = keyed.filter(isChecked).length
  const addedCount = keyed.filter((c) => c.autoIncluded === 0 && isChecked(c)).length
  const removedCount = keyed.filter((c) => c.autoIncluded === 1 && !isChecked(c)).length

  // 선택(포함)된 행의 수납금액 합계. payment 는 콤마 포함 포맷 문자열이라 숫자만 추출해 합산.
  const parseWon = (s: string) => (s ? Number(s.replace(/[^0-9]/g, '')) || 0 : 0)
  const checkedPaymentTotal = keyed.filter(isChecked).reduce((sum, c) => sum + parseWon(c.payment), 0)

  const toggle = (key: string) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const setGroup = (rows: KeyedCandidate[], desired: boolean) => {
    setFlipped((prev) => {
      const next = new Set(prev)
      for (const r of rows) {
        const base = baseChecked(r)
        if (desired !== base) next.add(r.key)
        else next.delete(r.key)
      }
      return next
    })
  }

  const hasChanges = flipped.size > 0

  const handleSave = async () => {
    if (!hasChanges || saveMutation.isPending) return
    const payload = keyed
      .filter((c) => flipped.has(c.key))
      .map((c) => ({
        chartNo: c.chartNo,
        opDate: c.reopDate,
        againR: c.againR ?? '',
        againL: c.againL ?? '',
        isReoperation: isChecked(c),
      }))
    if (payload.length === 0) return
    try {
      await saveMutation.mutateAsync(payload)
      setFlipped(new Set())
    } catch {
      // 에러 표시는 아래 저장 상태 라벨에서 처리.
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="재수술 검토"
      onClick={onClose}
    >
      <div
        className="flex max-h-[86vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">재수술 검토</h2>
            <p className="text-[11px] text-muted-foreground">{from} ~ {to} · 재수술일 기준</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 transition-colors hover:bg-gray-100"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 요약바 */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/70 bg-gray-50 px-4 py-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">재수술</span>
            <strong className="text-lg tabular-nums text-gray-900">{finalCount}</strong>
            <span className="text-xs text-muted-foreground">건</span>
          </div>
          <div className="text-[11px] text-muted-foreground">
            자동 {autoCount}건
            {addedCount > 0 && <span className="ml-1 font-medium text-emerald-600">· 추가 +{addedCount}</span>}
            {removedCount > 0 && <span className="ml-1 font-medium text-red-500">· 제외 −{removedCount}</span>}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-muted-foreground">비용</span>
            <strong className="text-sm tabular-nums text-gray-900">{checkedPaymentTotal.toLocaleString('ko-KR')}</strong>
            <span className="text-xs text-muted-foreground">원</span>
          </div>
        </div>

        {/* 본문 */}
        <div className="min-h-0 flex-1 overflow-auto text-xs">
          {isError ? (
            <div className="py-12 text-center text-sm text-red-500">데이터를 불러오지 못했습니다.</div>
          ) : isLoading || isFetching ? (
            <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중…</div>
          ) : keyed.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">해당 기간에 재수술 데이터가 없습니다.</div>
          ) : (
            <div className="flex flex-col">
              {/* 컬럼 헤더 (sticky) */}
              <div className="sticky top-0 z-10 flex items-center gap-2.5 border-b border-border/70 bg-white px-2.5 py-1.5 text-[11px] font-medium text-gray-500">
                <span className="w-3.5 shrink-0" aria-hidden="true" />
                <span className="w-11 shrink-0">수술일</span>
                <span className="w-16 shrink-0">차트번호</span>
                <span className="w-20 shrink-0">고객명</span>
                <span className="min-w-0 flex-1">수술방법 R</span>
                <span className="min-w-0 flex-1">수술방법 L</span>
                <span className="w-24 shrink-0 text-right">수납금액</span>
              </div>

              {/* 자동 포함 */}
              <div className="flex items-center gap-2 border-b border-border/40 bg-emerald-50/40 px-2.5 py-1.5">
                <span className="font-semibold text-gray-800">자동 포함</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">{included.length}건</span>
                <span className="text-[11px] text-muted-foreground">레포트 재수술 건수에 반영되는 행</span>
              </div>
              {included.length === 0 ? (
                <p className="px-2.5 py-3 text-center text-muted-foreground">자동 포함 행이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {included.map((c) => (
                    <RowItem key={c.key} c={c} checked={isChecked(c)} onToggle={() => toggle(c.key)} />
                  ))}
                </ul>
              )}

              {/* 제외됨 · 검토 필요 */}
              {excludedGroups.length > 0 && (
                <>
                  <div className="flex items-center gap-2 border-y border-border/40 bg-amber-50/40 px-2.5 py-1.5">
                    <span className="font-semibold text-gray-800">제외됨 · 검토 필요</span>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">{excluded.length}건</span>
                    <span className="text-[11px] text-muted-foreground">체크하면 포함으로 추가</span>
                  </div>
                  {excludedGroups.map(([reason, rows]) => {
                    const allChecked = rows.every((r) => isChecked(r))
                    return (
                      <div key={reason}>
                        <div className="flex items-center justify-between border-b border-border/40 bg-gray-50 px-2.5 py-1">
                          <span className="font-medium text-gray-600">
                            {reason} <span className="text-muted-foreground">({rows.length})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setGroup(rows, !allChecked)}
                            className="rounded border border-border/70 bg-white px-2 py-0.5 text-[11px] text-gray-700 transition-colors hover:bg-gray-100"
                          >
                            {allChecked ? '그룹 전체 해제' : '그룹 전체 포함'}
                          </button>
                        </div>
                        <ul className="divide-y divide-border/40">
                          {rows.map((c) => (
                            <RowItem key={c.key} c={c} checked={isChecked(c)} onToggle={() => toggle(c.key)} />
                          ))}
                        </ul>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-4 py-3">
          <p className="text-[11px] text-muted-foreground">
            {saveMutation.isError ? (
              <span className="text-red-600">저장에 실패했습니다. 다시 시도해주세요.</span>
            ) : saveMutation.isSuccess && !hasChanges ? (
              <span className="text-emerald-600">저장되었습니다.</span>
            ) : hasChanges ? (
              <span>변경 {flipped.size}건 — 저장을 눌러 확정하세요.</span>
            ) : (
              <span>체크박스를 눌러 재수술 여부를 확정합니다. 저장된 판정은 자동판정보다 우선합니다.</span>
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <Button type="button" variant="outline" size="sm" className="text-xs" onClick={onClose}>
              닫기
            </Button>
            <Button
              type="button"
              size="sm"
              className="text-xs"
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              title={hasChanges ? '' : '변경된 항목이 없습니다'}
            >
              {saveMutation.isPending ? '저장 중…' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RowItem({ c, checked, onToggle }: { c: KeyedCandidate; checked: boolean; onToggle: () => void }) {
  return (
    <li className="flex items-center gap-2.5 px-2.5 py-1.5 transition-colors hover:bg-blue-50/40">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 shrink-0 accent-blue-600"
        aria-label={`${c.name} 재수술 포함`}
      />
      <span className="w-11 shrink-0 tabular-nums text-gray-500">{c.reopDate.slice(5)}</span>
      <span className="w-16 shrink-0 tabular-nums text-gray-600">{c.chartNo}</span>
      <span className="w-20 shrink-0 truncate font-medium text-gray-800">{dash(c.name)}</span>
      <span className="min-w-0 flex-1 truncate text-gray-600" title={c.againR}>{dash(c.againR)}</span>
      <span className="min-w-0 flex-1 truncate text-gray-600" title={c.againL}>{dash(c.againL)}</span>
      <span className="w-24 shrink-0 text-right tabular-nums text-gray-700">{c.payment ? `${c.payment}원` : '—'}</span>
    </li>
  )
}
