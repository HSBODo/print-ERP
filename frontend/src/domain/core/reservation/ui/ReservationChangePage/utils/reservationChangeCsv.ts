import { downloadCsv, toCsv } from '#shared/utils/csv'
import { maskName } from '#shared/utils/mask'

import {
  BRANCH_LABEL,
  type ChangeView,
  holidayLabel,
  SOURCE_LABEL,
  STATE_LABEL,
  weekTag,
} from './reservationChangeModel'

/**
 * 변경 상세 CSV — 현재 조회 결과 전체(페이지 무관). 변경 칸은 결과 안 최대 변경 횟수만큼 펼치고
 * 칸마다 "변경n 일시" 를 같이 낸다. 이름은 CSV 에서만 마스킹(예약자 리스트와 같은 원칙).
 */
export function downloadReservationChangeCsv(
  filename: string,
  views: ChangeView[],
  asOf: string,
) {
  const maxChg = views.reduce((m, v) => Math.max(m, v.changes), 1)
  const headers = [
    '등록일',
    '등록주차',
    '등록시각',
    '등록일 출처',
    '차트번호',
    '이름',
    '구분',
    '상태',
    '명절',
    '최초 예약일',
  ]
  for (let i = 1; i <= maxChg; i++) headers.push(`변경${i}`, `변경${i} 일시`)
  if (asOf) headers.push(`기준일(${asOf}) 시점 예약일`)
  headers.push('최종 예약일', '변경횟수', '전체 변경횟수')

  const rows = views.map(({ row, steps, changes, totalChanges, asOfDate }) => {
    const cells: (string | number)[] = [
      row.registeredAt,
      weekTag(row.registeredAt),
      row.registeredTime,
      SOURCE_LABEL[row.regSource] ?? row.regSource,
      row.chartNo,
      maskName(row.name),
      BRANCH_LABEL[row.branch] ?? row.branch,
      STATE_LABEL[row.reserveState] ?? row.reserveState,
      holidayLabel(row.registeredAt),
      steps[0]?.date ?? '',
    ]
    for (let i = 1; i <= maxChg; i++) {
      const s = steps[i]
      cells.push(s ? s.date : '', s ? s.changedAt : '')
    }
    if (asOf) cells.push(asOfDate)
    cells.push(row.finalDate, changes, totalChanges)
    return cells
  })
  downloadCsv(filename, toCsv(headers, rows))
}
