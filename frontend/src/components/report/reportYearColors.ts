/**
 * 월간보고 PDF 색상 — 절대연도가 아닌 '당해연도 대비 위치'로 매핑(연도가 넘어가도 자동 유지).
 * 당해연도(기준) = 빨강 · 전년도 = 진회색 · 전전년도 = 연파랑
 */
export const REPORT_YEAR_COLORS = ['#E11D2E', '#595959', '#9CC3D5']

/** latest = 당해연도(기준). latest-year(0=당해·1=전년·2=전전년)로 색을 고른다. */
export const colorOf = (year: number, latest: number) =>
  REPORT_YEAR_COLORS[latest - year] ?? '#6B7280'
