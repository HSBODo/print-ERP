import { useState } from 'react'

import {
  editMarkTitle,
  type StatsCellEdit,
} from '../../utils/reservationStatsEditableCell.utils'
import { formatChannelValue } from '../../utils/reservationStatsFormat'

/** 수기 보정 표시 — 작은 빨강 점. title은 셀(td)에 둔다. */
export function EditMark() {
  return (
    <span className="ml-0.5 align-super text-[8px] leading-none text-rose-500">
      ●
    </span>
  )
}

/**
 * 온라인예약·인입콜 등 원시 카운트 손보정 셀 — 클릭하면 입력으로 전환, Enter/포커스아웃 저장, Esc 취소.
 * 라이브가 어긋나는 일자를 PDF/레거시 값으로 직접 고칠 때 쓴다.
 * cellClassName: 표 셀 공통 스타일(numCell)을 주입받아 페이지 스타일과 분리한다.
 */
export function EditableNumberCell({
  value,
  edit,
  busy,
  onSave,
  cellClassName,
}: {
  value: number
  edit: StatsCellEdit | undefined
  busy: boolean
  onSave: (next: number) => void
  cellClassName: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const start = () => {
    setDraft(String(value))
    setEditing(true)
  }
  const commit = () => {
    setEditing(false)
    const next = Number(draft)
    if (!Number.isInteger(next) || next < 0 || next === value) return
    onSave(next)
  }

  if (editing) {
    return (
      <td className={`${cellClassName} bg-amber-50 p-0`}>
        <input
          type="number"
          min={0}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onFocus={(e) => e.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit()
            } else if (e.key === 'Escape') {
              e.preventDefault()
              setEditing(false)
            }
          }}
          className="w-14 bg-transparent px-1.5 py-1 text-right tabular-nums outline-none ring-1 ring-amber-400"
        />
      </td>
    )
  }

  return (
    <td
      onClick={busy ? undefined : start}
      title={edit ? editMarkTitle(edit) : '클릭하여 수정'}
      className={`${cellClassName} cursor-pointer hover:bg-amber-50 ${edit ? 'text-rose-600' : ''} ${
        busy ? 'opacity-60' : ''
      }`}
    >
      {formatChannelValue(value, 'num')}
      {edit ? <EditMark /> : null}
    </td>
  )
}
