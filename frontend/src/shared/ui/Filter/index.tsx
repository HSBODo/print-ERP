/**
 * 조회 조건 필터 — 상태는 `#shared/hooks/useFilter`.
 *
 * ```tsx
 * const filter = useFilter({ defaults: () => ({ range: thisMonthRange() }) })
 * const { rows, isFetching, refetch } = useXxxList(filter.applied.range)
 *
 * <Filter.Root filter={filter} isFetching={isFetching} refetch={refetch}>
 *   <Filter.Bar>
 *     <Filter.DateRange {...filter.field('range')} />            // 조회 조건 — [조회] 때 반영
 *     <Filter.Keyword value={keyword} onChange={setKeyword} … /> // 화면 조건 — 자리만 빌림, 바로 반영
 *     <Filter.Count value={rows.length} />
 *     <Filter.Actions>{csvButton}</Filter.Actions>
 *   </Filter.Bar>
 * </Filter.Root>
 * ```
 * 입력 컴포넌트(DateRange·Month·Select·Segment·Keyword)는 value/onChange 만 받아 필터 상태를 모른다.
 */
export * as Filter from './ui'
