import { Button } from '#shared/ui/Button'
import { StyledSelect } from './SmsToolbar'
import { buildPaginationItems } from './smsTableModel'

const PAGE_SIZE_OPTIONS = [50, 100, 200] as const

/** 표 하단 페이지 이동 — 수술자 리스트와 같은 모양. 페이지를 옮기면 선택은 호출측이 비운다. */
export function SmsPagination({
  total, rangeStart, rangeEnd, page, pageMax, pageSize, onPage, onPageSize,
}: {
  total: number
  rangeStart: number
  rangeEnd: number
  page: number
  pageMax: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}) {
  const items = buildPaginationItems(page, pageMax)
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-b-lg bg-white px-2 py-1.5 text-xs">
      <span className="min-w-[8rem] font-semibold text-gray-800" aria-live="polite">
        {total.toLocaleString('ko-KR')}명 중 {rangeStart.toLocaleString('ko-KR')}-{rangeEnd.toLocaleString('ko-KR')}
      </span>
      <nav className="flex flex-1 items-center justify-center gap-1" aria-label="페이지 네비게이션">
        <Button type="button" variant="outline" size="sm" className="text-xs" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          이전
        </Button>
        {items.map((item) => (
          typeof item === 'number' ? (
            <Button
              key={item}
              type="button"
              variant={item === page ? 'default' : 'outline'}
              size="icon-sm"
              className="text-xs"
              aria-current={item === page ? 'page' : undefined}
              onClick={() => onPage(item)}
            >
              {item}
            </Button>
          ) : (
            <span key={item} className="px-1 text-muted-foreground">...</span>
          )
        ))}
        <Button type="button" variant="outline" size="sm" className="text-xs" disabled={page >= pageMax} onClick={() => onPage(page + 1)}>
          다음
        </Button>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-muted-foreground">행 수</span>
        <StyledSelect ariaLabel="행 수" value={String(pageSize)} onChange={(v) => onPageSize(Number(v))} className="w-16">
          {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </StyledSelect>
      </div>
    </div>
  )
}
