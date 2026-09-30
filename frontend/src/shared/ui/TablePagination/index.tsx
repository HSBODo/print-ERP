import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import {
  DEFAULT_PAGE_SIZE_OPTIONS,
  type PaginationState,
} from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { cn } from '#shared/utils/cn'

interface TablePaginationProps {
  pagination: PaginationState
  pageSizeOptions?: readonly number[]
  /** 건수 단위 (예: 명) */
  unit?: string
  className?: string
}

const formatNumber = (value: number) => value.toLocaleString('ko-KR')

/**
 * 표 하단 페이지 이동 — [건수] [처음 · 이전 · 현재/전체 · 다음 · 마지막] [행 수].
 * 버튼 구성은 shadcn data-table 의 DataTablePagination 을 따른다. usePagination 결과를 그대로 받는다.
 */
export function TablePagination({
  pagination,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  unit = '건',
  className,
}: TablePaginationProps) {
  const {
    page,
    pageMax,
    pageSize,
    total,
    rangeStart,
    rangeEnd,
    setPage,
    setPageSize,
  } = pagination
  const isFirst = page <= 1
  const isLast = page >= pageMax

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 bg-white px-2 py-1.5 text-xs',
        className,
      )}
    >
      <span
        aria-live="polite"
        className="min-w-32 whitespace-nowrap font-semibold tabular-nums text-gray-800"
      >
        {formatNumber(total)}
        {unit} 중 {formatNumber(rangeStart)}-{formatNumber(rangeEnd)}
      </span>
      <nav
        aria-label="페이지 이동"
        className="flex flex-1 items-center justify-center gap-1"
      >
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="처음 페이지"
          disabled={isFirst}
          onClick={() => setPage(1)}
        >
          <ChevronsLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="이전 페이지"
          disabled={isFirst}
          onClick={() => setPage(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-16 whitespace-nowrap px-2 text-center font-medium tabular-nums text-gray-800">
          {formatNumber(page)} / {formatNumber(pageMax)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="다음 페이지"
          disabled={isLast}
          onClick={() => setPage(page + 1)}
        >
          <ChevronRight />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="마지막 페이지"
          disabled={isLast}
          onClick={() => setPage(pageMax)}
        >
          <ChevronsRight />
        </Button>
      </nav>
      <label className="relative ml-auto flex items-center gap-2 whitespace-nowrap text-muted-foreground">
        행 수
        <select
          value={pageSize}
          onChange={(event) => setPageSize(Number(event.target.value))}
          className="h-7 w-18 appearance-none rounded-md border border-border/80 bg-white pl-2.5 pr-7 text-xs text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500"
        />
      </label>
    </div>
  )
}
