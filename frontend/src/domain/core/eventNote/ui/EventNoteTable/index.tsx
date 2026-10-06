import type { UseQueryResult } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'

import type { EventNote, EventNotePage } from '../../type/api'
import { formatDateTime, formatPeriod } from '../../utils/format'

const COLUMN_COUNT = 8

interface Props {
  query: UseQueryResult<EventNotePage>
  /** 현재 페이지 첫 행의 순번 (1부터) */
  rangeStart: number
  /** 없으면 행 클릭 수정을 끈다 (열람 전용) */
  onEdit?: (note: EventNote) => void
  /** 없으면 삭제 버튼을 숨긴다 (열람 전용) */
  onDelete?: (note: EventNote) => void
}

/** 이벤트 노트 표 — 그리기만 한다. 행을 누르면 수정, 마지막 열은 삭제. */
export function EventNoteTable({ query, rangeStart, onEdit, onDelete }: Props) {
  const rows = query.data?.content ?? []

  return (
    <div className="max-h-[calc(100vh-14rem)] min-h-[24rem] overflow-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
          <tr className="text-left text-xs text-gray-500">
            <th className="w-12 px-4 py-3 text-right font-medium">#</th>
            <th className="w-28 px-4 py-3 font-medium">발생일</th>
            <th className="px-4 py-3 font-medium">요약</th>
            <th className="px-4 py-3 font-medium">설명</th>
            <th className="w-52 px-4 py-3 font-medium">기간</th>
            <th className="w-28 px-4 py-3 font-medium">작성자</th>
            <th className="w-36 px-4 py-3 font-medium">수정일시</th>
            <th className="w-16 px-4 py-3 text-right font-medium">삭제</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {query.isLoading && (
            <tr>
              <td
                colSpan={COLUMN_COUNT}
                className="px-4 py-12 text-center text-gray-400"
              >
                불러오는 중…
              </td>
            </tr>
          )}
          {query.isError && (
            <tr>
              <td
                colSpan={COLUMN_COUNT}
                className="px-4 py-12 text-center text-red-500"
              >
                {query.error instanceof Error
                  ? query.error.message
                  : '조회 실패'}
              </td>
            </tr>
          )}
          {rows.map((note, i) => (
            <tr
              key={note.id}
              onClick={onEdit ? () => onEdit(note) : undefined}
              className={
                onEdit
                  ? 'cursor-pointer transition-colors hover:bg-gray-50'
                  : undefined
              }
            >
              <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-400 tabular-nums">
                {rangeStart + i}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-900">
                {note.eventDate}
              </td>
              <td className="px-4 py-2.5 font-medium text-gray-900">
                {note.summary}
              </td>
              <td
                className="max-w-[24rem] truncate px-4 py-2.5 text-gray-600"
                title={note.description ?? undefined}
              >
                {note.description ?? '-'}
              </td>
              <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600">
                {formatPeriod(note)}
              </td>
              <td className="px-4 py-2.5 text-gray-600">{note.updatedBy}</td>
              <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-gray-600">
                {formatDateTime(note.updatedAt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                {onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(note)
                    }}
                    className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700"
                    aria-label={`${note.summary} 삭제`}
                    title="삭제"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </td>
            </tr>
          ))}
          {query.isSuccess && rows.length === 0 && (
            <tr>
              <td
                colSpan={COLUMN_COUNT}
                className="px-4 py-12 text-center text-gray-400"
              >
                등록된 이벤트 노트가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
