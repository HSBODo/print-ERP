import { type ReactNode, useEffect, useEffectEvent } from 'react'

import type { FilterState } from '#shared/hooks/useFilter'

import { FilterContext } from '../context'

interface Props {
  /** useFilter 결과 — 값 타입과 무관하게 조회·초기화만 쓴다 */
  filter: Pick<FilterState<object>, 'search' | 'reset'>
  /** 조회 중엔 [조회]·F1 을 잠근다 */
  isFetching?: boolean
  /** 조건이 그대로인데 [조회]를 누르면 다시 불러온다 */
  refetch?: () => unknown
  children: ReactNode
}

/**
 * 조회 조건 묶음 — useFilter 상태를 받아 하위의 [조회]·[초기화]·Enter 와, 화면 전체의 F1 을 연결한다.
 * 모양은 그리지 않는다 (줄은 Filter.Bar).
 */
export function Root({ filter, isFetching = false, refetch, children }: Props) {
  const search = () => {
    if (filter.search() === 'unchanged') void refetch?.()
  }

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== 'F1') return
    event.preventDefault()
    if (!isFetching) search()
  })

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <FilterContext value={{ isFetching, search, reset: filter.reset }}>
      {children}
    </FilterContext>
  )
}
