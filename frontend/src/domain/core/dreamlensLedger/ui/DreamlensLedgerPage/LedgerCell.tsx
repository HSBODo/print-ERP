import { useState, type CSSProperties } from 'react'
import { suggestionListId, type LedgerColumn } from './ledgerColumns'

const displayValue = (
  column: LedgerColumn,
  value: string | number | null | undefined,
) => {
  if (column.type === 'number') {
    const amount = Number(value ?? 0)
    // 시트와 동일하게 0 원은 빈 칸으로 둔다 — 40컬럼이라 0 이 깔리면 읽기 어렵다.
    return amount === 0 ? '' : amount.toLocaleString('ko-KR')
  }
  return value == null ? '' : String(value)
}

/**
 * 장부 셀 — 클릭하면 입력으로 전환, Enter/포커스아웃 저장, Esc 취소.
 * 값이 바뀌지 않았으면 저장 요청을 보내지 않는다.
 */
export function LedgerCell({
  column,
  value,
  busy,
  onCommit,
  stickyLeft,
  stickyBgClass = '',
  frozenEdge = false,
}: {
  column: LedgerColumn
  value: string | number | null | undefined
  busy: boolean
  onCommit: (next: string | number | null) => void
  /** 좌측 고정 컬럼이면 left 오프셋(px). 없으면 일반 셀. */
  stickyLeft?: number
  /** 고정 셀은 뒤 내용이 비쳐 보이므로 불투명 배경이 필요하다(행 상태에 맞춰 주입). */
  stickyBgClass?: string
  /** 고정 구간의 마지막 컬럼 — 오른쪽에 경계선을 그린다. */
  frozenEdge?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => {
    if (busy) return
    setDraft(
      column.type === 'number'
        ? String(Number(value ?? 0))
        : value == null
          ? ''
          : String(value),
    )
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    if (column.type === 'number') {
      const next = Number(draft)
      if (!Number.isFinite(next) || next < 0) return
      if (next === Number(value ?? 0)) return
      onCommit(Math.round(next))
      return
    }
    const trimmed = draft.trim()
    const next = trimmed === '' ? null : trimmed
    if (next === (value ?? null)) return
    onCommit(next)
  }

  // 숫자만 우측(자릿수 비교), 나머지는 중앙 정렬.
  const align =
    column.type === 'number' ? 'text-right tabular-nums' : 'text-center'

  // border-collapse 표에서는 고정 셀의 테두리가 스크롤 중 사라질 수 있어
  // 고정 구간 경계는 box-shadow 로 그린다(항상 보인다).
  const sticky: { className: string; style?: CSSProperties } =
    stickyLeft === undefined
      ? { className: '' }
      : {
          className: `sticky z-10 ${stickyBgClass}`,
          style: {
            left: stickyLeft,
            boxShadow: frozenEdge ? '1px 0 0 0 #cbd5e1' : undefined,
          },
        }

  if (editing) {
    return (
      <td
        className={`border border-border/60 bg-amber-50 p-0 ${stickyLeft === undefined ? '' : 'sticky z-10'}`}
        style={sticky.style}
      >
        <input
          type={
            column.type === 'number'
              ? 'number'
              : column.type === 'date'
                ? 'date'
                : 'text'
          }
          min={column.type === 'number' ? 0 : undefined}
          // 백엔드 @Size 와 같은 상한 — 여기서 막아야 길게 붙여넣어도 저장 실패로 끝나지 않는다.
          maxLength={column.maxLength}
          list={column.suggestions ? suggestionListId(column.key) : undefined}
          autoFocus
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commit()
            } else if (event.key === 'Escape') {
              event.preventDefault()
              setEditing(false)
            }
          }}
          style={{ width: column.width }}
          className={`bg-transparent px-1.5 py-1 text-xs outline-none ring-1 ring-amber-400 ${align}`}
        />
      </td>
    )
  }

  const text = displayValue(column, value)

  return (
    <td
      onClick={start}
      // 값이 있으면 전체 값을 툴팁으로 — 폭을 넘겨 말줄임된 값도 확인할 수 있게.
      title={text ? `${text}\n(클릭하여 수정)` : '클릭하여 수정'}
      style={{
        width: column.width,
        minWidth: column.width,
        maxWidth: column.width,
        ...sticky.style,
      }}
      className={`cursor-pointer border border-border/60 px-1.5 py-1 text-xs hover:bg-amber-50 ${
        busy ? 'opacity-50' : ''
      } ${sticky.className}`}
    >
      {/* 컬럼 폭을 넘는 값이 옆 칸을 밀지 않도록 말줄임 처리한다(표가 어긋나는 걸 막는다). */}
      <div className={`truncate ${align}`}>
        {text || <span className="text-transparent">-</span>}
      </div>
    </td>
  )
}
