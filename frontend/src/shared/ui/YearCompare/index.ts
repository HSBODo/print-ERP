/**
 * 월별 연도 비교 — 연도마다 선 하나 + 월×연도 표. 데이터는 `./useYearCompare`.
 *
 * ```tsx
 * const filter = useFilterBar('year', [CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR])
 * const { dataMap, isLoading, isError } = useXxxTrend(filter.years)
 * const yc = useYearCompare(filter.years, (year, monthIndex) => dataMap[year]?.[monthIndex]?.count)
 *
 * <FilterBar {...filter} yearOnly yearChipColors={yc.yearColors} />
 * <YearCompare.Card isLoading={isLoading} isError={isError} title="…" description="…"
 *   tabs={<YearCompare.Tabs value={tab} onChange={setTab} tabs={TABS} />}>
 *   <YearCompare.Chart {...yc} format="count" />  // 위에 연도 범례 포함
 *   <YearCompare.Table {...yc} format="count" />
 * </YearCompare.Card>
 * ```
 * format: count = 건수(Y축 0부터 · 표 합계) / percent = 비율(Y축 데이터 범위 · 표 평균)
 * percentDigits: 비율 소수 자릿수(기본 1) — Chart·Table 에 같이 넘긴다
 */
export * as YearCompare from './ui'
