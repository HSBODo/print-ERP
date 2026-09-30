import {
  BRANCH_LABEL,
  type ChangeStep,
  type ChangeView,
  fullPath,
  holidayLabel,
  SOURCE_LABEL,
  STATE_LABEL,
  weekTag,
} from '../utils/reservationChangeModel'

/**
 * 변경 상세 표 — 등록일 · 식별 · 최초 예약일(파랑) → 변경1~N → [기준일 시점 예약일(보라)] → 최종 예약일(빨강) · 변경횟수.
 * 변경 칸에 마우스를 올리면 그때 변경한 시각이 보인다. 변경 칸 수(maxChanges)는 조회 결과 전체 기준이라
 * 페이지를 넘겨도 헤더가 흔들리지 않는다. 7회 이상은 마지막 칸에 "+n" 으로 접고 전체 경로를 툴팁에 담는다.
 */

const STATE_STYLE: Record<string, string> = {
  Y: 'bg-blue-50 text-blue-700',
  I: 'bg-emerald-50 text-emerald-700',
  H: 'bg-gray-100 text-gray-600',
  C: 'bg-red-50 text-red-600',
}

const TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-border/60 bg-gray-50 px-2.5 py-1.5 text-left font-semibold'
const TD = 'whitespace-nowrap px-2.5 py-1 text-left'

const Week = ({ date }: { date: string }) => {
  const tag = weekTag(date)
  return tag ? (
    <span className="ml-1 text-[10.5px] text-gray-400">{tag}</span>
  ) : null
}

const DateCell = ({
  date,
  className,
  title,
}: {
  date: string
  className?: string
  title?: string
}) =>
  date ? (
    <span className={className} title={title}>
      {date}
      <Week date={date} />
    </span>
  ) : (
    <span className="text-gray-300">—</span>
  )

const Badge = ({ text, className }: { text: string; className: string }) => (
  <span
    className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className}`}
  >
    {text}
  </span>
)

interface Props {
  views: ChangeView[]
  maxChanges: number
  asOf: string
  loading: boolean
  emptyText: string
}

export function ReservationChangeDetailTable({
  views,
  maxChanges,
  asOf,
  loading,
  emptyText,
}: Props) {
  const columnCount = 7 + maxChanges + (asOf ? 1 : 0) + 2
  return (
    <table className="w-full border-collapse text-[12px]">
      <thead>
        <tr className="text-[12px] text-gray-700">
          <th className={TH}>등록일</th>
          <th className={TH}>차트번호</th>
          <th className={TH}>이름</th>
          <th className={TH}>구분</th>
          <th className={TH}>상태</th>
          <th className={TH}>명절</th>
          <th className={TH}>최초 예약일</th>
          {Array.from({ length: maxChanges }, (_, i) => (
            <th key={i} className={TH}>
              변경{i + 1}
            </th>
          ))}
          {asOf && <th className={TH}>기준일 시점 예약일</th>}
          <th className={TH}>최종 예약일</th>
          <th className={`${TH} text-right`}>변경횟수</th>
        </tr>
      </thead>
      <tbody>
        {loading && (
          <tr>
            <td
              colSpan={columnCount}
              className="px-3 py-12 text-center text-sm text-muted-foreground"
            >
              불러오는 중…
            </td>
          </tr>
        )}
        {!loading && views.length === 0 && (
          <tr>
            <td
              colSpan={columnCount}
              className="px-3 py-12 text-center text-sm text-muted-foreground"
            >
              {emptyText}
            </td>
          </tr>
        )}
        {!loading &&
          views.map(({ row, steps, full, changes, totalChanges, asOfDate }) => {
            const path = fullPath(full)
            const holiday = holidayLabel(row.registeredAt)
            const first: ChangeStep | undefined = steps[0]
            return (
              <tr
                key={row.reserveNum}
                className="border-b border-border/40 transition-colors hover:bg-blue-50/40"
              >
                <td
                  className={TD}
                  title={`등록일 출처: ${SOURCE_LABEL[row.regSource] ?? row.regSource}`}
                >
                  {row.registeredAt}
                  <Week date={row.registeredAt} />
                  <span className="ml-1.5 text-gray-400">
                    {row.registeredTime}
                    {row.regSource === 'N' ? ' 채번' : ''}
                  </span>
                </td>
                <td className={TD}>{row.chartNo}</td>
                <td className={`${TD} font-medium text-gray-900`}>
                  {row.name}
                </td>
                <td className={TD}>{BRANCH_LABEL[row.branch] ?? row.branch}</td>
                <td className={TD}>
                  <Badge
                    text={STATE_LABEL[row.reserveState] ?? row.reserveState}
                    className={
                      STATE_STYLE[row.reserveState] ??
                      'bg-gray-100 text-gray-600'
                    }
                  />
                </td>
                <td className={TD}>
                  {holiday ? (
                    <Badge
                      text={holiday}
                      className="bg-amber-50 text-amber-700"
                    />
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className={TD}>
                  <DateCell
                    date={first?.date ?? ''}
                    className="font-semibold text-blue-700"
                    title={
                      first
                        ? `등록 ${first.changedAt || '시각 미상'}`
                        : undefined
                    }
                  />
                </td>
                {Array.from({ length: maxChanges }, (_, i) => {
                  const step = steps[i + 1]
                  if (!step) return <td key={i} className={TD} />
                  const isLast = !asOf && i + 1 === steps.length - 1
                  const overflow =
                    i + 1 === maxChanges && changes > maxChanges
                      ? changes - maxChanges
                      : 0
                  return (
                    <td key={i} className={TD}>
                      <DateCell
                        date={step.date}
                        className={isLast ? 'font-semibold text-red-600' : ''}
                        title={`변경 ${step.changedAt || '시각 미상'}`}
                      />
                      {overflow > 0 && (
                        <span className="ml-1 text-gray-400" title={path}>
                          +{overflow}
                        </span>
                      )}
                    </td>
                  )
                })}
                {asOf && (
                  <td className={TD}>
                    <DateCell
                      date={asOfDate}
                      className="font-semibold text-violet-700"
                    />
                  </td>
                )}
                <td className={TD}>
                  <DateCell
                    date={row.finalDate}
                    className="font-semibold text-red-600"
                    title={path}
                  />
                </td>
                <td className={`${TD} text-right tabular-nums`}>
                  {changes}회
                  {asOf && changes !== totalChanges && (
                    <span className="ml-1 text-gray-400">
                      / 전체 {totalChanges}회
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
      </tbody>
    </table>
  )
}
