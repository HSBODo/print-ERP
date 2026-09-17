import { ChevronDown } from 'lucide-react'

interface AccountingPaginationProps {
  totalRows: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function pageItems(page: number, pageMax: number): Array<number | string> {
  if (pageMax <= 7) return Array.from({ length: pageMax }, (_, index) => index + 1)
  if (page <= 4) return [1, 2, 3, 4, 5, 'end', pageMax]
  if (page >= pageMax - 3) return [1, 'start', pageMax - 4, pageMax - 3, pageMax - 2, pageMax - 1, pageMax]
  return [1, 'start', page - 1, page, page + 1, 'end', pageMax]
}

const buttonClass = 'h-7 min-w-7 shrink-0 rounded-md border px-2 tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-40'

function PageNavigation({ page, pageMax, onPageChange }: { page: number; pageMax: number; onPageChange: (page: number) => void }) {
  return (
    <nav aria-label="회계 페이지 이동" className="order-last flex w-full min-w-0 flex-wrap items-center justify-center gap-1 sm:order-none sm:w-auto sm:flex-1">
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className={buttonClass}>이전</button>
      {pageItems(page, pageMax).map((item) => typeof item === 'number' ? (
        <button
          key={item}
          type="button"
          aria-label={`${item}페이지`}
          aria-current={page === item ? 'page' : undefined}
          onClick={() => onPageChange(item)}
          className={`${buttonClass} ${page === item ? 'border-slate-900 bg-slate-900 text-white' : 'bg-white'}`}
        >{item}</button>
      ) : <span key={item} aria-hidden="true" className="flex h-7 w-5 shrink-0 items-center justify-center text-gray-500">…</span>)}
      <button type="button" disabled={page >= pageMax} onClick={() => onPageChange(page + 1)} className={buttonClass}>다음</button>
    </nav>
  )
}

export function AccountingPagination({ totalRows, page, pageSize, onPageChange, onPageSizeChange }: AccountingPaginationProps) {
  const pageMax = Math.max(1, Math.ceil(totalRows / pageSize))
  const safePage = Math.max(1, Math.min(page, pageMax))
  const from = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(safePage * pageSize, totalRows)

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 px-2 py-1.5 text-xs">
      <span aria-live="polite" className="shrink-0 whitespace-nowrap font-semibold tabular-nums">
        {totalRows.toLocaleString('ko-KR')}건 중 {from.toLocaleString('ko-KR')}-{to.toLocaleString('ko-KR')}
      </span>
      <PageNavigation page={safePage} pageMax={pageMax} onPageChange={onPageChange} />
      <label className="relative ml-auto flex shrink-0 items-center gap-2 whitespace-nowrap text-gray-500">
        행 수
        <select
          value={pageSize}
          onChange={(event) => { onPageSizeChange(Number(event.target.value)); onPageChange(1) }}
          className="h-7 w-[72px] appearance-none rounded-md border border-gray-300 bg-white pl-2.5 pr-7 text-gray-800"
        >
          {[50, 100, 200, 500].map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
      </label>
    </div>
  )
}
