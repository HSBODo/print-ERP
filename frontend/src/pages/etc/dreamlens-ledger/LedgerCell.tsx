import { useState } from 'react'
import { suggestionListId, type LedgerColumn } from './ledgerColumns'

const displayValue = (column: LedgerColumn, value: string | number | null | undefined) => {
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
}: {
  column: LedgerColumn
  value: string | number | null | undefined
  busy: boolean
  onCommit: (next: string | number | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => {
    if (busy) return
    setDraft(column.type === 'number' ? String(Number(value ?? 0)) : value == null ? '' : String(value))
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
  const align = column.type === 'number' ? 'text-right tabular-nums' : 'text-center'

  if (editing) {
    return (
      <td className="border border-border/60 bg-amber-50 p-0">
        <input
          type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
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
      style={{ width: column.width, minWidth: column.width, maxWidth: column.width }}
      className={`cursor-pointer border border-border/60 px-1.5 py-1 text-xs hover:bg-amber-50 ${
        busy ? 'opacity-50' : ''
      }`}
    >
      {/* 컬럼 폭을 넘는 값이 옆 칸을 밀지 않도록 말줄임 처리한다(표가 어긋나는 걸 막는다). */}
      <div className={`truncate ${align}`}>{text || <span className="text-transparent">-</span>}</div>
    </td>
  )
}
