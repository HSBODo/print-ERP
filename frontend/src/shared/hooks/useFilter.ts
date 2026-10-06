import { useState } from 'react'
import { toast } from 'sonner'

/**
 * 조회 조건(요청을 보내는 값) 상태 — `shared/ui/Filter` 와 짝.
 *
 * 같은 값을 두 벌 든다.
 * - draft   : 바에서 고치는 중인 값
 * - applied : [조회]·Enter·F1 로 확정된 값 — 조회 훅에 넘긴다
 *
 * 받아온 행을 화면에서 거르는 조건(채널·키워드 등)은 여기 넣지 않는다. 화면이 useState 로 들고 바로 반영한다.
 * 기본값은 함수로 받는다 — 초기화할 때마다 다시 계산해야 자정을 넘긴 화면도 '오늘'이 맞다.
 */

// interface 로 선언한 값 타입도 받도록 object (Record<string, unknown> 은 인덱스 시그니처가 없는 interface 를 거부한다)
type Values = object

export interface FieldBinding<T> {
  value: T
  onChange: (value: T) => void
}

/** applied: 새 조건 적용 · unchanged: 조건 그대로(다시 불러올 대상) · invalid: 검증 실패 */
export type SearchResult = 'applied' | 'unchanged' | 'invalid'

interface FilterOptions<T extends Values> {
  defaults: () => T
  /** 적용 전 검증. 문구를 돌려주면 토스트로 띄우고 적용하지 않는다 */
  validate?: (draft: T) => string | null
  /**
   * 조회할 때마다 — 보통 1페이지로 되돌리기.
   * 아래에서 선언하는 pagination 을 부를 때는 블록 본문으로 쓴다 (`() => { pagination.resetPage() }`).
   * 식 본문이면 반환 타입 추론이 filter 타입과 순환해 any 가 된다.
   */
  onSearch?: () => void
  /** 초기화 때 필터 밖 상태(로컬 조건·정렬·페이지 크기 등)를 되돌린다 */
  onReset?: () => void
}

export interface FilterState<T extends Values> {
  draft: T
  applied: T
  /** 입력 컴포넌트에 펼쳐 넘길 { value, onChange } */
  field: <K extends keyof T>(key: K) => FieldBinding<T[K]>
  /** 여러 값을 한 번에 고친다 — 엮인 값(예: 기준을 바꾸면 차수 비우기)용 */
  setDraft: (patch: Partial<T>) => void
  search: () => SearchResult
  /** 입력값을 고치면서 바로 적용 — ‹ › 같은 빠른 이동 버튼용 ([조회]를 따로 누르지 않는다) */
  apply: (patch: Partial<T>) => SearchResult
  reset: () => void
}

const isSame = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b)

export function useFilter<T extends Values>({
  defaults,
  validate,
  onSearch,
  onReset,
}: FilterOptions<T>): FilterState<T> {
  const [draft, setDraftState] = useState(defaults)
  const [applied, setApplied] = useState(defaults)

  const setDraft = (patch: Partial<T>) =>
    setDraftState((prev) => ({ ...prev, ...patch }))

  const field = <K extends keyof T>(key: K): FieldBinding<T[K]> => ({
    value: draft[key],
    onChange: (value) => setDraftState((prev) => ({ ...prev, [key]: value })),
  })

  const apply = (patch: Partial<T>): SearchResult => {
    const next = { ...draft, ...patch }
    const message = validate?.(next)
    if (message) {
      toast.error('조회 조건을 확인해 주세요', { description: message })
      return 'invalid'
    }
    setDraftState(next)
    onSearch?.()
    if (isSame(next, applied)) return 'unchanged'
    setApplied(next)
    return 'applied'
  }

  const search = () => apply({})

  const reset = () => {
    const next = defaults()
    setDraftState(next)
    setApplied(next)
    onReset?.()
  }

  return { draft, applied, field, setDraft, search, apply, reset }
}
