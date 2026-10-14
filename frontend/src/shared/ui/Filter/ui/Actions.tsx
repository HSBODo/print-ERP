import { RotateCcw, Search } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '#shared/ui/Button'

import { useFilterContext } from '../context'

/** 바 오른쪽 끝 — [초기화][조회] 다음에 children(CSV 등 화면 버튼)을 붙인다 */
export function Actions({ children }: { children?: ReactNode }) {
  const { isFetching, search, reset } = useFilterContext()

  return (
    <div className="ml-auto flex items-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-xs"
        onClick={reset}
      >
        <RotateCcw className="h-3.5 w-3.5" />
        초기화
      </Button>
      <Button
        type="button"
        size="sm"
        disabled={isFetching}
        className="bg-blue-600 text-xs text-white hover:bg-blue-700"
        onClick={search}
        title="조회 (F1)"
      >
        <Search className="h-3.5 w-3.5" />
        조회
      </Button>
      {children}
    </div>
  )
}
