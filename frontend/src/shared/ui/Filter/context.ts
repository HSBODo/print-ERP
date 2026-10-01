import { createContext, useContext } from 'react'

export interface FilterContextValue {
  isFetching: boolean
  search: () => void
  reset: () => void
}

export const FilterContext = createContext<FilterContextValue | null>(null)

/** Filter.Actions 처럼 [조회]·[초기화]가 꼭 필요한 곳에서 쓴다 */
export function useFilterContext(): FilterContextValue {
  const context = useContext(FilterContext)
  if (!context) throw new Error('<Filter> 안에서만 쓸 수 있습니다.')
  return context
}
