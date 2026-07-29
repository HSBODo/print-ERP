import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { withQuery } from '@/api/_shared'
import {
  CATARACT_EDITABLE_FIELDS,
  type CataractEditableField,
  type CataractStatsCellEdit,
  type CataractStatsDailyCounts,
} from '@/api/reservation/reservationStatsCataract'
import {
  buildReservationStatsDiffCsv,
  buildReservationStatsDrillDownCsv,
  buildReservationStatsParityCsv,
  type ReservationStatsDiff,
  type ReservationStatsDiffItem,
  type ReservationStatsDrillDown,
  type ReservationStatsParity,
} from '@/api/reservation/reservationStatsDiagnostics'
import { downloadCsv } from '@/utils/csv'
import {
  useReservationStatsCataract,
  useReservationStatsCataractCellEdit,
  useReservationStatsCataractSnapshots,
} from '@/hooks/reservation/useReservationStatsCataract'
import { ReservationStatsDiagnosticsModal } from './ReservationStatsDiagnosticsModal'
import { ReservationStatsToolbar } from './ReservationStatsToolbar'
import {
  CATARACT_COLUMNS,
  DEFAULT_PERIOD,
  SUMMARY_COLUMNS,
  buildCataractStatsCsv,
  getDisplayRowsFromCounts,
  monthFullLabel,
  monthShortLabel,
  type CataractColumnMeta,
  type CataractDisplayRow,
  type Granularity,
} from './reservationStatsCataractData'
import {
  ReservationStatsTableHeader,
  type StatsHeaderModel,
  type StatsHeaderNode,
} from './shared/ReservationStatsTableHeader'
import { currentMonth, periodRange } from './shared/reservationStatsDateRange'
import {
  formatChannelValue,
  formatSummaryValue,
} from './shared/reservationStatsFormat'
import { EditMark, EditableNumberCell } from './ReservationStatsCataractCells'
import { editMarkTitle } from './ReservationStatsCataractCells.utils'
import type { SummaryColumnMeta } from './shared/reservationStatsSummary'
import { columnSpan, splitColumnGroups } from './shared/reservationStatsTable'

/**
 * 예약통계_백내장 — 인바운드(컨택센터)/아웃바운드(TM)/채팅/온라인/취소 채널과 내원·부도·취소 종합을
 * 한 줄(가로 스크롤) 표로 묶은 월간 종합표. 시력교정 페이지와 동일한 조회/CSV/스냅샷 흐름을 따른다.
 * 운영 데이터(확정 스냅샷·라이브)로 표시하며, 미연결 시 시드 폴백 없이 안내만 노출한다.
 */

// Date + 25 채널 + 7 종합
const TOTAL_COL_SPAN = 1 + columnSpan(CATARACT_COLUMNS, SUMMARY_COLUMNS)

// 헤더 밴드/그룹용 컬럼 슬라이스
const CATARACT_CHANNEL_GROUPS = splitColumnGroups(CATARACT_COLUMNS, [
  { key: 'total', span: 3 },
  { key: 'inboundPlain', span: 3 },
  { key: 'inboundCataract', span: 5 },
  { key: 'outboundCataract', span: 5 },
  { key: 'outboundTail', span: 1 },
  { key: 'kakao', span: 3 },
  { key: 'online', span: 2 },
  { key: 'cancel', span: 3 },
] as const)

const TOTAL_COLS = CATARACT_CHANNEL_GROUPS.total // 백내장·노안·합계
const INBOUND_PLAIN = CATARACT_CHANNEL_GROUPS.inboundPlain // 총인입콜·응대콜·응대율
const INBOUND_CATARACT = CATARACT_CHANNEL_GROUPS.inboundCataract // 인바운드 백내장 밴드
const OUTBOUND_CATARACT = CATARACT_CHANNEL_GROUPS.outboundCataract // 아웃바운드 백내장 밴드
const OUTBOUND_TAIL = CATARACT_CHANNEL_GROUPS.outboundTail // 아웃바운드 총 예약수
const KAKAO_COLS = CATARACT_CHANNEL_GROUPS.kakao
const ONLINE_COLS = CATARACT_CHANNEL_GROUPS.online
const CANCEL_COLS = CATARACT_CHANNEL_GROUPS.cancel

/* ── 셀 스타일 (시력교정 페이지와 동일 규칙) ── */
const cellBase = 'border-b border-r border-slate-400 px-2.5 py-1 whitespace-nowrap'
const numCell = `${cellBase} text-right tabular-nums`
const labelCell = `${cellBase} text-center`
const groupHead = 'border-b border-r border-slate-400 px-2.5 py-1.5 text-center font-semibold'
const divider = 'border-l-2 border-l-slate-600'
const leftDivider = 'border-r-2 border-r-slate-600'

const headH = 'h-8'
const stickyRow1 = 'sticky top-0 z-20'
const stickyRow2 = 'sticky top-8 z-20'
const stickyRow3 = 'sticky top-16 z-20'
const stickyCorner = 'sticky top-0 left-0 z-30'
const headBottom = 'shadow-[inset_0_-2px_0_0_#475569]'
const headerClasses = {
  groupHead,
  headH,
  headBottom,
  stickyCorner,
  stickyRows: [stickyRow1, stickyRow2, stickyRow3],
  leftDivider,
} as const

const isCountChar = (ch: string) => /[0-9A-Za-z가-힣★]/.test(ch)
const countChars = (s: string) => [...s].filter(isCountChar).length
/**
 * 백내장 헤더 라벨 — 공백을 줄바꿈 지점으로 삼아 단어 단위로 줄바꿈한다(단어 중간은 쪼개지 않음).
 * 한 줄에 size(기본 4)글자(공백·기호 제외)까지 인접 단어를 묶고, 한 단어가 그보다 길면 그 단어만 한 줄에 둔다.
 *   '재문의 비율' → ['재문의','비율'] / '컨택센터 현장(CRM)' → ['컨택센터','현장(CRM)'] / '총 DB 예약율' → ['총 DB','예약율']
 */
function chunkLabel(label: string, size = 4): string[] {
  const lines: string[] = []
  let cur = ''
  let curCount = 0
  for (const word of label.split(' ')) {
    if (!word) continue
    const wc = countChars(word)
    if (cur === '') {
      cur = word
      curCount = wc
    } else if (curCount + wc <= size) {
      cur += ' ' + word
      curCount += wc
    } else {
      lines.push(cur)
      cur = word
      curCount = wc
    }
  }
  if (cur) lines.push(cur)
  return lines
}

function ColLabel({ label }: { label: string }) {
  return (
    <>
      {chunkLabel(label).map((part, i) => (
        <span key={i} className="block whitespace-nowrap">
          {part}
        </span>
      ))}
    </>
  )
}

type CataractHeaderColumn = CataractColumnMeta | SummaryColumnMeta

const leaf = (
  column: CataractHeaderColumn,
  className: string,
): StatsHeaderNode<CataractHeaderColumn> => ({
  kind: 'leaf',
  column,
  className,
})

const group = (
  label: string,
  className: string,
  children: readonly StatsHeaderNode<CataractHeaderColumn>[],
): StatsHeaderNode<CataractHeaderColumn> => ({
  kind: 'group',
  label,
  className,
  children,
})

const midLeafClass = (col: CataractColumnMeta) =>
  `bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`

const cataractLeaves = (columns: readonly CataractColumnMeta[]) =>
  columns.map((col) => leaf(col, midLeafClass(col)))

const cataractSummaryLeaves = SUMMARY_COLUMNS.map((col, i) =>
  leaf(
    col,
    `${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100'}`,
  ),
)

const CATARACT_HEADER_NODES: StatsHeaderNode<CataractHeaderColumn>[] = [
  group(
    '총 예약 (아웃바운드 포함)',
    'bg-sky-200',
    TOTAL_COLS.map((col) => leaf(col, 'bg-sky-50 font-semibold text-sky-800')),
  ),
  group('인바운드 (컨택센터)', 'bg-amber-100', [
    ...cataractLeaves(INBOUND_PLAIN),
    group('백내장', 'bg-rose-50 text-rose-700', cataractLeaves(INBOUND_CATARACT)),
  ]),
  group('아웃바운드 (TM)', 'bg-amber-200', [
    group('백내장', 'bg-rose-50 text-rose-700', cataractLeaves(OUTBOUND_CATARACT)),
    ...cataractLeaves(OUTBOUND_TAIL),
  ]),
  group('채팅 (카카오톡)', 'bg-sky-100', cataractLeaves(KAKAO_COLS)),
  group('온라인예약', 'bg-emerald-100', cataractLeaves(ONLINE_COLS)),
  group('취소', 'bg-slate-100', cataractLeaves(CANCEL_COLS)),
  group('예약 종합 (내원 · 부도 · 취소)', `${divider} bg-emerald-200`, cataractSummaryLeaves),
]

const cataractHeaderModel = (period: string): StatsHeaderModel<CataractHeaderColumn> => ({
  corner: {
    content: (
      <>
        {monthShortLabel(period)}
        <br />
        Date
      </>
    ),
    className: 'bg-slate-100',
  },
  nodes: CATARACT_HEADER_NODES,
})

/* ── 셀 손보정(원시 카운트 21개 = 채널 18 + 종합 3) ── */
const EDITABLE_FIELD_SET = new Set<string>(CATARACT_EDITABLE_FIELDS)
const EDITABLE_FIELD_LABEL: Record<CataractEditableField, string> = {
  totalCataract: '총예약 백내장',
  totalPresbyopia: '총예약 노안',
  inboundCall: '총 인입콜',
  answeredCall: '응대콜',
  newExamInquiry: '총 신규검사문의',
  newReInquiry: '신규 재문의',
  newPatient: '★신환',
  tmTotalDb: 'TM 총 DB',
  tmValidDb: 'TM 유효 DB',
  tmReservation: 'TM 예약수',
  kakaoTotalInquiry: '카톡 총문의',
  kakaoCataractReservation: '카톡 백내장 검사예약',
  kakaoPresbyopiaReservation: '카톡 노안 검사예약',
  onlineReservation: '온라인 예약수',
  onlineNoShow: '온라인 부도수',
  cancelOnline: '취소 온라인',
  cancelCrm: '취소 컨택센터 현장(CRM)',
  cancelKakao: '취소 카톡',
  visit: '내원',
  noShowReservation: '예약(부도)',
  cancel: '취소',
}

type ManualEditsByDate = Map<string, Record<string, CataractStatsCellEdit>>

/** dailies → date별 수기 보정 이력(field → 이력) 맵. 마커·툴팁 표시에 사용. */
function buildManualEditsByDate(dailies: CataractStatsDailyCounts[] | undefined): ManualEditsByDate {
  const map: ManualEditsByDate = new Map()
  for (const d of dailies ?? []) {
    if (!d.manualEdits?.length) continue
    const byField: Record<string, CataractStatsCellEdit> = {}
    for (const e of d.manualEdits) byField[e.field] = e
    map.set(d.date, byField)
  }
  return map
}

export function ReservationStatsCataractPage() {
  const [draftMonth, setDraftMonth] = useState(DEFAULT_PERIOD)
  const [appliedMonth, setAppliedMonth] = useState(DEFAULT_PERIOD)
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [hasSearched, setHasSearched] = useState(false)
  const [diagnosticDiff, setDiagnosticDiff] = useState<ReservationStatsDiff | null>(null)
  const [diagnosticDrillDown, setDiagnosticDrillDown] = useState<ReservationStatsDrillDown | null>(null)
  const [diagnosticParity, setDiagnosticParity] = useState<ReservationStatsParity | null>(null)

  const { from, to, lastDay } = periodRange(appliedMonth)
  const { dailies, meta, isLoading, isFetching, isError, refetch } = useReservationStatsCataract(from, to, hasSearched)
  const live = Boolean(dailies && !isError)
  // 미연결/실패(503)는 시드로 폴백하지 않는다(잘못된 수치 표시 방지) — tbody에서 미연결 안내.
  const rows = !hasSearched || !live ? [] : getDisplayRowsFromCounts(granularity, dailies!, appliedMonth, lastDay)
  const hasData = rows.length > 0

  const { getDiff, isDiffing, getDrillDown, isDrillingDown, getParity, isCheckingParity } =
    useReservationStatsCataractSnapshots()
  const { editCell, isEditing } = useReservationStatsCataractCellEdit()
  const tableViewportClass = granularity === 'month' ? 'max-h-[72vh]' : 'min-h-0 flex-1'

  // 셀 손보정: 확정 스냅샷 or 마트(D-1 배치 적재)일 때 허용. 라이브는 저장 대상 없음.
  const cellEditEnabled = live && (meta?.source === 'SNAPSHOT' || meta?.source === 'MART')
  // 일자별 수기 보정 이력(date → field → 이력) — 마커·툴팁 표시용.
  const manualEditsByDate = useMemo(() => buildManualEditsByDate(dailies), [dailies])

  const handleEditCell = async (date: string, field: CataractEditableField, value: number) => {
    try {
      await editCell({ period: appliedMonth, date, field, value })
      toast.success('수정 완료', { description: `${date} ${EDITABLE_FIELD_LABEL[field]} → ${value}` })
    } catch (e) {
      toast.error('수정 실패', { description: e instanceof Error ? e.message : undefined })
    }
  }

  // 조회 = 호출 통합: 서버 GET이 당월·미잠금이면 자동 증분 채움까지 처리한다.
  // 같은 월을 다시 조회하면 쿼리 키가 안 바뀌므로 refetch로 강제 갱신(서버 자동 채움 재평가).
  const handleSearch = () => {
    const sameMonth = hasSearched && appliedMonth === draftMonth
    setAppliedMonth(draftMonth)
    setHasSearched(true)
    setDiagnosticDiff(null)
    setDiagnosticDrillDown(null)
    setDiagnosticParity(null)
    if (sameMonth) refetch()
  }
  const handleReset = () => {
    setDraftMonth(DEFAULT_PERIOD)
    setAppliedMonth(DEFAULT_PERIOD)
    setGranularity('month')
    setHasSearched(false)
    setDiagnosticDiff(null)
    setDiagnosticDrillDown(null)
    setDiagnosticParity(null)
  }
  const handleDownloadCsv = () => {
    if (!hasData) return
    downloadCsv(`예약통계_백내장_${appliedMonth}_${granularity}.csv`, buildCataractStatsCsv(rows))
  }
  const handleRunDiagnostics = async () => {
    try {
      const diff = await getDiff(draftMonth)
      if (!diff.snapshotExists) {
        toast.error('진단 불가', { description: `${draftMonth} 스냅샷이 없습니다.` })
        return
      }
      if (diff.diffCount === 0) {
        toast.success('진단 완료', { description: '스냅샷과 라이브 재조회값의 차이가 없습니다.' })
        return
      }
      setDiagnosticDiff(diff)
      setDiagnosticDrillDown(null)
      setDiagnosticParity(null)
      toast('진단 완료', { description: `${diff.diffCount.toLocaleString('ko-KR')}건의 차이를 확인했습니다.` })
    } catch (e) {
      toast.error('진단 실패', { description: e instanceof Error ? e.message : undefined })
    }
  }
  const drillDownPathFor = (diff: ReservationStatsDiff, item: ReservationStatsDiffItem) =>
    withQuery('/api/stats/reservation-stats-cataract/diagnostics/drill-down', {
      period: diff.period,
      date: item.date,
      field: item.field,
    })
  const handleSelectDiagnosticDiff = async (item: ReservationStatsDiffItem) => {
    if (!diagnosticDiff) return
    try {
      setDiagnosticDrillDown(null)
      setDiagnosticParity(null)
      const drillDown = await getDrillDown({
        period: diagnosticDiff.period,
        date: item.date,
        field: item.field,
      })
      setDiagnosticDrillDown(drillDown)
    } catch (e) {
      toast.error('상세 진단 실패', { description: e instanceof Error ? e.message : undefined })
    }
  }
  const handleCheckDiagnosticParity = async (field: string) => {
    if (!diagnosticDiff) return
    try {
      const parity = await getParity({ period: diagnosticDiff.period, field })
      setDiagnosticParity(parity)
      const description =
        parity.mismatchCount === 0
          ? 'daily 집계값과 drill-down 합계가 일치합니다.'
          : `${parity.mismatchCount.toLocaleString('ko-KR')}개 일자에서 차이를 확인했습니다.`
      toast(parity.mismatchCount === 0 ? 'Parity 정상' : 'Parity 차이 확인', { description })
    } catch (e) {
      toast.error('Parity 검사 실패', { description: e instanceof Error ? e.message : undefined })
    }
  }
  const handleDownloadDiagnosticDiffCsv = () => {
    if (!diagnosticDiff) return
    downloadCsv(
      `예약통계_백내장_진단_${diagnosticDiff.period}.csv`,
      buildReservationStatsDiffCsv(diagnosticDiff, (item) => drillDownPathFor(diagnosticDiff, item)),
    )
  }
  const handleDownloadDiagnosticDrillDownCsv = () => {
    if (!diagnosticDrillDown) return
    downloadCsv(
      `예약통계_백내장_진단상세_${diagnosticDrillDown.period}_${diagnosticDrillDown.date}_${diagnosticDrillDown.field}.csv`,
      buildReservationStatsDrillDownCsv(diagnosticDrillDown),
    )
  }
  const handleDownloadDiagnosticParityCsv = () => {
    if (!diagnosticParity) return
    downloadCsv(
      `예약통계_백내장_parity_${diagnosticParity.period}_${diagnosticParity.field}.csv`,
      buildReservationStatsParityCsv(diagnosticParity),
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden p-1 text-xs text-gray-800">
      <ReservationStatsToolbar
        draftMonth={draftMonth}
        onDraftMonthChange={setDraftMonth}
        maxMonth={currentMonth()}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onSearch={handleSearch}
        onReset={handleReset}
        onDownloadCsv={handleDownloadCsv}
        canDownload={hasData}
        onRunDiagnostics={handleRunDiagnostics}
        isDiagnosing={isDiffing}
        canRunDiagnostics={!isDiffing}
        dataMeta={hasSearched ? meta : undefined}
      />

      <div className={`${tableViewportClass} overflow-auto rounded-md border border-slate-400 bg-white`}>
        <table className="min-w-[1800px] border-separate border-spacing-0 text-xs">
          <ReservationStatsTableHeader
            model={cataractHeaderModel(appliedMonth)}
            classes={headerClasses}
            renderLabel={(label) => <ColLabel label={label} />}
          />
          <tbody>
            {!hasSearched ? (
              <tr>
                <td colSpan={TOTAL_COL_SPAN} className={`${labelCell} bg-white py-12 text-sm text-muted-foreground`}>
                  기준 월을 선택하고 <span className="font-semibold text-slate-700">조회</span> 버튼을 눌러 데이터를 불러오세요.
                </td>
              </tr>
            ) : isLoading || isFetching ? (
              <SkeletonRows />
            ) : hasData ? (
              rows.map((row) => (
                <BodyRow
                  key={`${granularity}-${row.label}`}
                  row={row}
                  edits={row.date ? manualEditsByDate.get(row.date) : undefined}
                  cellEditEnabled={cellEditEnabled}
                  isEditing={isEditing}
                  onEditCell={handleEditCell}
                />
              ))
            ) : (
              <tr>
                <td colSpan={TOTAL_COL_SPAN} className={`${labelCell} bg-white py-8 text-sm text-muted-foreground`}>
                  {isError
                    ? '운영 데이터에 연결되지 않았습니다 (미연결). 잠시 후 다시 조회해주세요.'
                    : `${monthFullLabel(appliedMonth)} 조회 결과가 없습니다.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {diagnosticDiff && (
        <ReservationStatsDiagnosticsModal
          title="예약통계 백내장 진단"
          diff={diagnosticDiff}
          drillDown={diagnosticDrillDown}
          parity={diagnosticParity}
          isDrillingDown={isDrillingDown}
          isCheckingParity={isCheckingParity}
          onClose={() => {
            setDiagnosticDiff(null)
            setDiagnosticDrillDown(null)
            setDiagnosticParity(null)
          }}
          onSelectDiff={handleSelectDiagnosticDiff}
          onCheckParity={handleCheckDiagnosticParity}
          onDownloadDiffCsv={handleDownloadDiagnosticDiffCsv}
          onDownloadDrillDownCsv={handleDownloadDiagnosticDrillDownCsv}
          onDownloadParityCsv={handleDownloadDiagnosticParityCsv}
        />
      )}
    </div>
  )
}

const SKELETON_ROW_COUNT = 12

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, r) => (
        <tr key={r} className="bg-white">
          <th className={`${labelCell} ${leftDivider} sticky left-0 z-10 bg-white`}>
            <div className="mx-auto h-3 w-8 animate-pulse rounded bg-slate-200" />
          </th>
          {Array.from({ length: TOTAL_COL_SPAN - 1 }).map((__, c) => (
            <td key={c} className={numCell}>
              <div className="ml-auto h-3 w-9 animate-pulse rounded bg-slate-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function BodyRow({
  row,
  edits,
  cellEditEnabled,
  isEditing,
  onEditCell,
}: {
  row: CataractDisplayRow
  edits: Record<string, CataractStatsCellEdit> | undefined
  cellEditEnabled: boolean
  isEditing: boolean
  onEditCell: (date: string, field: CataractEditableField, value: number) => void
}) {
  const { channel, summary, tier, muted, weekStart } = row
  const isSunday = row.weekday === '일'
  // 손보정 가능 셀 = 일(day) 행 + 확정 스냅샷 + 미음영(데이터 있는 날).
  const canEditRow = cellEditEnabled && tier === 'day' && !muted && Boolean(row.date)

  const rowBg =
    tier === 'month'
      ? 'bg-sky-50 font-semibold'
      : tier === 'week'
        ? 'bg-amber-100/70 font-medium'
        : muted
          ? 'bg-slate-50 text-slate-400'
          : 'bg-white hover:bg-sky-50/60'
  const leftBg =
    tier === 'month'
      ? 'bg-sky-100 text-sky-700'
      : tier === 'week'
        ? 'bg-amber-100 text-amber-800'
        : isSunday
          ? 'bg-rose-50 text-rose-600'
          : 'bg-amber-50 text-slate-700'
  const topBorder = weekStart && tier === 'day' ? 'border-t-2 border-t-slate-400' : ''

  return (
    <tr className={`${rowBg} ${topBorder} transition-colors`}>
      <th className={`${labelCell} ${leftDivider} sticky left-0 z-10 font-semibold ${leftBg}`}>
        {row.label}
        {row.weekday ? ` (${row.weekday})` : ''}
      </th>

      {CATARACT_COLUMNS.map((col) => {
        if (muted) {
          return (
            <td key={col.key} className={`${numCell} text-slate-300`}>
              –
            </td>
          )
        }
        const edit = edits?.[col.key]
        if (canEditRow && row.date && EDITABLE_FIELD_SET.has(col.key)) {
          return (
            <EditableNumberCell
              key={col.key}
              value={channel[col.key]}
              edit={edit}
              busy={isEditing}
              onSave={(next) => onEditCell(row.date!, col.key as CataractEditableField, next)}
              cellClassName={numCell}
            />
          )
        }
        return (
          <td
            key={col.key}
            title={edit ? editMarkTitle(edit) : undefined}
            className={`${numCell} ${col.emphasis ? 'text-rose-600' : ''} ${
              col.key === 'totalSum' ? 'bg-sky-50/60 font-semibold text-sky-700' : ''
            }`}
          >
            {formatChannelValue(channel[col.key], col.fmt)}
            {edit ? <EditMark /> : null}
          </td>
        )
      })}

      {SUMMARY_COLUMNS.map((col, i) => {
        if (muted) {
          return (
            <td key={col.key} className={`${numCell} text-slate-300 ${i === 0 ? divider : ''}`}>
              –
            </td>
          )
        }
        const edit = edits?.[col.key]
        if (canEditRow && row.date && EDITABLE_FIELD_SET.has(col.key)) {
          return (
            <EditableNumberCell
              key={col.key}
              value={summary[col.key] as number}
              edit={edit}
              busy={isEditing}
              onSave={(next) => onEditCell(row.date!, col.key as CataractEditableField, next)}
              cellClassName={`${numCell} ${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-50' : ''}`}
            />
          )
        }
        return (
          <td
            key={col.key}
            title={edit ? editMarkTitle(edit) : undefined}
            className={`${numCell} ${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-50 text-rose-600' : ''}`}
          >
            {formatSummaryValue(summary[col.key], col.fmt)}
            {edit ? <EditMark /> : null}
          </td>
        )
      })}
    </tr>
  )
}
