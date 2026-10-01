import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { api } from '#shared/api/client'
import { useFilter } from '#shared/hooks/useFilter'
import { downloadCsv } from '#shared/utils/csv'

import {
  useReservationStatsSnapshots,
  useReservationStatsSystem,
  useReservationStatsSystemCellEdit,
} from '../../hooks/useReservationStatsSystem'
import {
  RESERVATION_STATS_EDITABLE_FIELDS,
  type ReservationStatsCellEdit,
  type ReservationStatsDailyCounts,
  type ReservationStatsDiff,
  type ReservationStatsDiffItem,
  type ReservationStatsDrillDown,
  type ReservationStatsEditableField,
  type ReservationStatsParity,
} from '../../type/api'
import {
  isSingleMonthRange,
  defaultStatsRange,
  validateStatsRange,
} from '../../utils/reservationStatsDateRange'
import {
  buildReservationStatsDiffCsv,
  buildReservationStatsDrillDownCsv,
  buildReservationStatsParityCsv,
} from '../../utils/reservationStatsDiagnostics'
import { editMarkTitle } from '../../utils/reservationStatsEditableCell.utils'
import {
  formatChannelValue,
  formatNumber,
  formatSummaryValue,
} from '../../utils/reservationStatsFormat'
import {
  buildReservationStatsCsv,
  CHANNEL_COLUMNS,
  type ColumnMeta,
  type DisplayRow,
  getRangeDisplayRowsFromCounts,
  type Granularity,
  monthFullLabel,
  monthShortLabel,
  SUMMARY_COLUMNS,
  type SummaryColumnMeta,
} from '../../utils/reservationStatsSystemData'
import {
  columnSpan,
  splitColumnGroups,
} from '../../utils/reservationStatsTable'
import { ReservationStatsDiagnosticsModal } from '../ReservationStatsDiagnosticsModal'
import {
  ReservationStatsTableHeader,
  type StatsHeaderModel,
  type StatsHeaderNode,
} from '../ReservationStatsTableHeader'
import { ReservationStatsToolbar } from '../ReservationStatsToolbar'
import { EditableNumberCell, EditMark } from './ReservationStatsEditableCell'

/**
 * 예약통계시스템 — 콜/온라인/채팅/취소 채널과 내원·부도·취소 종합을 한 줄(가로 스크롤) 표로 묶은 월간 종합표.
 * 분리된 툴바(ReservationStatsToolbar)에서 월 선택·조회·초기화·CSV를 처리하고, 조회 단위(월/주/일/전체)는 즉시 전환된다.
 * 운영 데이터(확정 스냅샷·라이브)로 표시하며, 미연결 시 시드 폴백 없이 안내만 노출한다.
 */

const TOTAL_COL_SPAN = 2 + columnSpan(CHANNEL_COLUMNS, SUMMARY_COLUMNS) // 구분 + 총예약 + 채널 + 종합

const SYSTEM_CHANNEL_GROUPS = splitColumnGroups(CHANNEL_COLUMNS, [
  { key: 'inboundCall', span: 8 },
  { key: 'tm', span: 10 },
  { key: 'home', span: 3 },
  { key: 'naver', span: 6 },
  { key: 'kakao', span: 3 },
  { key: 'cancel', span: 3 },
] as const)

/* ── 셀 스타일 ──
 * border-separate + 셀별 하단/우측 보더(1px) — sticky 헤더 배경 비침(border-collapse 렌더 버그) 방지.
 * 표 외곽 상/좌 라인은 스크롤 컨테이너의 border가 담당한다. */
const cellBase =
  'border-b border-r border-slate-400 px-2.5 py-1 whitespace-nowrap'
/** 숫자·% 데이터 셀 — 우측 정렬. */
const numCell = `${cellBase} text-right tabular-nums`
/** 구분(Date) 등 라벨 셀 — 가운데 정렬. */
const labelCell = `${cellBase} text-center`
const groupHead =
  'border-b border-r border-slate-400 px-2.5 py-1.5 text-center font-semibold'
/** 채널/종합 블록 경계의 굵은 구분선. */
const divider = 'border-l-2 border-l-slate-600'
/** 고정 좌측(Date) 열 우측 구분선. */
const leftDivider = 'border-r-2 border-r-slate-600'

/* ── 스크롤 시 헤더 고정 — 3행을 누적 top으로 쌓는다(1·2행 높이 = h-8 = 32px). ── */
const headH = 'h-8'
const stickyRow1 = 'sticky top-0 z-20'
const stickyRow2 = 'sticky top-8 z-20'
const stickyRow3 = 'sticky top-16 z-20'
/** 좌상단 모서리(Date) — 가로·세로 동시 고정. */
const stickyCorner = 'sticky top-0 left-0 z-30'
/** 헤더 하단 경계선(border-collapse 스크롤 시에도 유지되도록 inset shadow). */
const headBottom = 'shadow-[inset_0_-2px_0_0_#475569]'
const headerClasses = {
  groupHead,
  headH,
  headBottom,
  stickyCorner,
  stickyRows: [stickyRow1, stickyRow2, stickyRow3],
  leftDivider,
} as const

/**
 * 헤더 라벨을 4글자 단위로 끊어 줄바꿈한다(4글자까지는 한 줄에서 안 깨짐).
 * 점(·)·괄호 등 기호와 공백은 글자 수로 세지 않고 직전 글자에 붙인다.
 *   '신규예약문의' → ['신규예약', '문의'] / '콜·네이버' → ['콜·네이버'] / '예약(부도)' → ['예약(부도)']
 */
const isCountChar = (ch: string) => /[0-9A-Za-z가-힣]/.test(ch)
function chunkLabel(label: string, size = 4): string[] {
  const chunks: string[] = []
  let cur = ''
  let count = 0
  for (const ch of label) {
    if (ch === ' ') continue // 공백은 무시(붙임)
    if (isCountChar(ch)) {
      if (count >= size) {
        chunks.push(cur)
        cur = ''
        count = 0
      }
      cur += ch
      count++
    } else {
      cur += ch // 기호는 글자 수 미포함, 현재 청크에 붙임
    }
  }
  if (cur) chunks.push(cur)
  // 3줄 이상으로 끊겨 마지막 줄에 한 글자만 남으면(예: '신규문의/대비예약/율') 직전 줄에 붙여 고아 글자 방지.
  if (chunks.length >= 3 && chunks[chunks.length - 1].length === 1) {
    const orphan = chunks.pop()!
    chunks[chunks.length - 1] += orphan
  }
  return chunks
}

/** 헤더 셀 라벨 — 4글자 청크마다 줄바꿈, 청크 내부는 줄바꿈 금지. */
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

type SystemHeaderColumn = ColumnMeta | SummaryColumnMeta

const leaf = (
  column: SystemHeaderColumn,
  className: string,
): StatsHeaderNode<SystemHeaderColumn> => ({
  kind: 'leaf',
  column,
  className,
})

const group = (
  label: string,
  className: string,
  children: readonly StatsHeaderNode<SystemHeaderColumn>[],
): StatsHeaderNode<SystemHeaderColumn> => ({
  kind: 'group',
  label,
  className,
  children,
})

const channelLeaves = (columns: readonly ColumnMeta[]) =>
  columns.map((col) =>
    leaf(
      col,
      `bg-white font-medium ${col.emphasis ? 'text-rose-600' : 'text-slate-700'}`,
    ),
  )

const summaryLeaves = SUMMARY_COLUMNS.map((col, i) =>
  leaf(
    col,
    `${i === 0 ? divider : ''} ${col.emphasis ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100'}`,
  ),
)

const SYSTEM_HEADER_NODES: StatsHeaderNode<SystemHeaderColumn>[] = [
  group('콜', 'bg-amber-100', [
    group(
      '검사 인입콜',
      'bg-amber-50',
      channelLeaves(SYSTEM_CHANNEL_GROUPS.inboundCall),
    ),
    group('TM', 'bg-amber-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.tm)),
  ]),
  group('온라인 예약', 'bg-emerald-100', [
    group(
      '홈페이지',
      'bg-emerald-50',
      channelLeaves(SYSTEM_CHANNEL_GROUPS.home),
    ),
    group(
      '네이버',
      'bg-emerald-50',
      channelLeaves(SYSTEM_CHANNEL_GROUPS.naver),
    ),
  ]),
  group('채팅', 'bg-sky-100', [
    group('카카오톡', 'bg-sky-50', channelLeaves(SYSTEM_CHANNEL_GROUPS.kakao)),
  ]),
  group(
    '취소',
    'bg-slate-100',
    SYSTEM_CHANNEL_GROUPS.cancel.map((col) => leaf(col, 'bg-slate-50')),
  ),
  group(
    '예약 종합 (내원 · 부도 · 취소)',
    `${divider} bg-emerald-200`,
    summaryLeaves,
  ),
]

/* ── 셀 손보정(원시 카운트 24개 = 채널 21 + 종합 3) ── */
const EDITABLE_FIELD_SET = new Set<string>(RESERVATION_STATS_EDITABLE_FIELDS)
const EDITABLE_FIELD_LABEL: Record<ReservationStatsEditableField, string> = {
  inboundCall: '인입콜',
  answeredCall: '응대콜',
  newInquiry: '신규예약문의',
  callReservation: '검사 예약수',
  tmTotalDb: 'TM 총 DB',
  tmValidDb: 'TM 유효 DB',
  tmReservation: 'TM 예약수',
  tmRecounsel: 'TM 재상담',
  tmRecounselValid: 'TM 재상담 유효수',
  tmRecounselReservation: 'TM 재상담 예약수',
  homeReceived: '홈페이지 예약접수',
  homeReservation: '홈페이지 예약수',
  naverReceived: '네이버 예약접수',
  naverRejected: '네이버 파트너거절',
  naverValid: '네이버 유효접수',
  naverReservation: '네이버 예약수',
  kakaoInquiry: '카톡 문의',
  kakaoReservation: '카톡 예약수',
  cancelCallNaver: '취소 콜·네이버',
  cancelHome: '취소 홈페이지',
  cancelKakao: '취소 카톡',
  visit: '내원',
  noShowReservation: '예약(부도)',
  cancel: '취소',
}

type ManualEditsByDate = Map<string, Record<string, ReservationStatsCellEdit>>

/** dailies → date별 수기 보정 이력(field → 이력) 맵. 마커·툴팁 표시에 사용. */
function buildManualEditsByDate(
  dailies: ReservationStatsDailyCounts[] | undefined,
): ManualEditsByDate {
  const map: ManualEditsByDate = new Map()
  for (const d of dailies ?? []) {
    if (!d.manualEdits?.length) continue
    const byField: Record<string, ReservationStatsCellEdit> = {}
    for (const e of d.manualEdits) byField[e.field] = e
    map.set(d.date, byField)
  }
  return map
}

const systemHeaderModel = (
  period: string,
): StatsHeaderModel<SystemHeaderColumn> => ({
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
  leadingCells: [
    {
      key: 'totalReservation',
      content: '총예약',
      className: 'bg-sky-500 text-white',
    },
  ],
  nodes: SYSTEM_HEADER_NODES,
})

export function ReservationStatsSystemPage() {
  // 조회 기간은 [조회] 때 반영(92일 제한), 조회 단위는 받아온 일자별 값을 다시 묶기만 해서 바로 반영.
  const filter = useFilter({
    defaults: () => ({ range: defaultStatsRange() }),
    validate: validateStatsRange,
    onSearch: () => {
      clearDiagnostics()
    },
    onReset: () => {
      setGranularity('month')
      clearDiagnostics()
    },
  })
  const { from: appliedFrom, to: appliedTo } = filter.applied.range
  const [granularity, setGranularity] = useState<Granularity>('month')
  const [diagnosticDiff, setDiagnosticDiff] =
    useState<ReservationStatsDiff | null>(null)
  const [diagnosticDrillDown, setDiagnosticDrillDown] =
    useState<ReservationStatsDrillDown | null>(null)
  const [diagnosticParity, setDiagnosticParity] =
    useState<ReservationStatsParity | null>(null)

  const { dailies, meta, isLoading, isFetching, isError, refetch } =
    useReservationStatsSystem(appliedFrom, appliedTo)
  // 운영 데이터가 오면 카운트→행 계산.
  // 미연결/실패(503)는 시드로 폴백하지 않는다(잘못된 수치 표시 방지) — tbody에서 미연결 안내.
  const live = Boolean(dailies && !isError)
  const rows = !live
    ? []
    : getRangeDisplayRowsFromCounts(
        granularity,
        dailies!,
        appliedFrom,
        appliedTo,
      )
  const hasData = rows.length > 0
  const appliedSingleMonth = isSingleMonthRange(appliedFrom, appliedTo)
  // 진단·CSV 라벨 등 월 단위 값이 필요할 때 사용. 여러 달 범위면 from 의 월을 대표값으로.
  const appliedPeriod = appliedFrom.slice(0, 7)

  const {
    getDiff,
    isDiffing,
    getDrillDown,
    isDrillingDown,
    getParity,
    isCheckingParity,
  } = useReservationStatsSnapshots()
  const { editCell, isEditing } = useReservationStatsSystemCellEdit()
  const tableViewportClass =
    granularity === 'month' ? 'max-h-[72vh]' : 'min-h-0 flex-1'

  // 셀 손보정: 확정 스냅샷 or 마트(D-1 배치 적재)일 때 허용. 라이브는 저장 대상 없음.
  // 편집은 period(YYYY-MM) 단위 스냅샷 저장이라 단일 월 범위에서만 활성.
  const cellEditEnabled =
    live &&
    appliedSingleMonth &&
    (meta?.source === 'SNAPSHOT' || meta?.source === 'MART')
  // 일자별 수기 보정 이력(date → field → 이력) — 마커·툴팁 표시용.
  const manualEditsByDate = useMemo(
    () => buildManualEditsByDate(dailies),
    [dailies],
  )

  const handleEditCell = async (
    date: string,
    field: ReservationStatsEditableField,
    value: number,
  ) => {
    try {
      await editCell({ period: appliedPeriod, date, field, value })
      toast.success('수정 완료', {
        description: `${date} ${EDITABLE_FIELD_LABEL[field]} → ${value}`,
      })
    } catch (e) {
      toast.error('수정 실패', {
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }

  const clearDiagnostics = () => {
    setDiagnosticDiff(null)
    setDiagnosticDrillDown(null)
    setDiagnosticParity(null)
  }
  const handleDownloadCsv = () => {
    if (!hasData) return
    downloadCsv(
      `예약통계_${appliedFrom}_${appliedTo}_${granularity}.csv`,
      buildReservationStatsCsv(rows),
    )
  }
  const handleRunDiagnostics = async () => {
    // 진단은 확정 스냅샷 vs 라이브 재조회 비교라 period(YYYY-MM) 단위. 여러 달 범위에서는 불가.
    if (!appliedSingleMonth) {
      toast.error('진단 불가', {
        description: '진단은 같은 달 범위에서만 가능합니다.',
      })
      return
    }
    try {
      const diff = await getDiff(appliedPeriod)
      if (!diff.snapshotExists) {
        toast.error('진단 불가', {
          description: `${appliedPeriod} 스냅샷이 없습니다.`,
        })
        return
      }
      if (diff.diffCount === 0) {
        toast.success('진단 완료', {
          description: '스냅샷과 라이브 재조회값의 차이가 없습니다.',
        })
        return
      }
      setDiagnosticDiff(diff)
      setDiagnosticDrillDown(null)
      setDiagnosticParity(null)
      toast('진단 완료', {
        description: `${diff.diffCount.toLocaleString('ko-KR')}건의 차이를 확인했습니다.`,
      })
    } catch (e) {
      toast.error('진단 실패', {
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }
  const drillDownPathFor = (
    diff: ReservationStatsDiff,
    item: ReservationStatsDiffItem,
  ) =>
    api.getUri({
      url: '/stats/reservation-stats-system/diagnostics/drill-down',
      params: { period: diff.period, date: item.date, field: item.field },
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
      toast.error('상세 진단 실패', {
        description: e instanceof Error ? e.message : undefined,
      })
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
      toast(parity.mismatchCount === 0 ? 'Parity 정상' : 'Parity 차이 확인', {
        description,
      })
    } catch (e) {
      toast.error('Parity 검사 실패', {
        description: e instanceof Error ? e.message : undefined,
      })
    }
  }
  const handleDownloadDiagnosticDiffCsv = () => {
    if (!diagnosticDiff) return
    downloadCsv(
      `예약통계_진단_${diagnosticDiff.period}.csv`,
      buildReservationStatsDiffCsv(diagnosticDiff, (item) =>
        drillDownPathFor(diagnosticDiff, item),
      ),
    )
  }
  const handleDownloadDiagnosticDrillDownCsv = () => {
    if (!diagnosticDrillDown) return
    downloadCsv(
      `예약통계_진단상세_${diagnosticDrillDown.period}_${diagnosticDrillDown.date}_${diagnosticDrillDown.field}.csv`,
      buildReservationStatsDrillDownCsv(diagnosticDrillDown),
    )
  }
  const handleDownloadDiagnosticParityCsv = () => {
    if (!diagnosticParity) return
    downloadCsv(
      `예약통계_parity_${diagnosticParity.period}_${diagnosticParity.field}.csv`,
      buildReservationStatsParityCsv(diagnosticParity),
    )
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] min-h-[32rem] flex-col gap-3 overflow-hidden p-1 text-xs text-gray-800">
      <ReservationStatsToolbar
        filter={filter}
        isFetching={isLoading || isFetching}
        refetch={refetch}
        granularity={granularity}
        onGranularityChange={setGranularity}
        onDownloadCsv={handleDownloadCsv}
        canDownload={hasData}
        onRunDiagnostics={handleRunDiagnostics}
        isDiagnosing={isDiffing}
        canRunDiagnostics={!isDiffing}
        dataMeta={meta}
      />

      <div
        className={`${tableViewportClass} overflow-auto rounded-md border border-slate-400 bg-white`}
      >
        <table className="min-w-[1800px] border-separate border-spacing-0 text-xs">
          <ReservationStatsTableHeader
            model={systemHeaderModel(appliedPeriod)}
            classes={headerClasses}
            renderLabel={(label) => <ColLabel label={label} />}
          />
          <tbody>
            {isLoading || isFetching ? (
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
                <td
                  colSpan={TOTAL_COL_SPAN}
                  className={`${labelCell} bg-white py-8 text-sm text-muted-foreground`}
                >
                  {isError
                    ? '운영 데이터에 연결되지 않았습니다 (미연결). 잠시 후 다시 조회해주세요.'
                    : appliedSingleMonth
                      ? `${monthFullLabel(appliedPeriod)} 조회 결과가 없습니다.`
                      : `${appliedFrom} ~ ${appliedTo} 조회 결과가 없습니다.`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {diagnosticDiff && (
        <ReservationStatsDiagnosticsModal
          title="예약통계 진단"
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

/** 데이터 로딩 중 표시 — 임시 데이터 대신 펄스 스켈레톤 행. */
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROW_COUNT }).map((_, r) => (
        <tr key={r} className="bg-white">
          <th
            className={`${labelCell} ${leftDivider} sticky left-0 z-10 bg-white`}
          >
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
  row: DisplayRow
  edits: Record<string, ReservationStatsCellEdit> | undefined
  cellEditEnabled: boolean
  isEditing: boolean
  onEditCell: (
    date: string,
    field: ReservationStatsEditableField,
    value: number,
  ) => void
}) {
  const { channel, summary, tier, isTotal, muted, weekStart } = row
  const isSunday = row.weekday === '일'
  // 손보정 가능 셀 = 일(day) 행 + 확정 스냅샷 + 미음영(데이터 있는 날).
  const canEditRow =
    cellEditEnabled && tier === 'day' && !muted && Boolean(row.date)

  const rowBg =
    tier === 'month'
      ? 'bg-sky-50 font-semibold'
      : tier === 'week'
        ? 'bg-amber-100/70 font-medium'
        : muted
          ? 'bg-slate-50 text-slate-400'
          : 'bg-white hover:bg-sky-50/60'
  // 좌측 Date 셀 — 일요일은 붉은 글씨(달력 관례).
  const leftBg =
    tier === 'month'
      ? 'bg-sky-100 text-sky-700'
      : tier === 'week'
        ? 'bg-amber-100 text-amber-800'
        : isSunday
          ? 'bg-rose-50 text-rose-600'
          : 'bg-amber-50 text-slate-700'
  // 일별 주 경계(토→일)는 가볍게: 셀과 같은 톤의 2px로 은은하게만 구분(다른 구분선은 진하게 유지).
  const topBorder =
    weekStart && tier === 'day' ? 'border-t-2 border-t-slate-400' : ''

  return (
    <tr className={`${rowBg} ${topBorder} transition-colors`}>
      <th
        className={`${labelCell} ${leftDivider} sticky left-0 z-10 font-semibold ${leftBg}`}
      >
        {row.label}
        {row.weekday ? ` (${row.weekday})` : ''}
      </th>
      <td
        className={`${numCell} font-semibold ${isTotal ? 'text-sky-700' : muted ? '' : 'bg-sky-50/60 text-sky-700'}`}
      >
        {muted ? (
          <span className="text-slate-300">–</span>
        ) : (
          formatNumber(channel.totalReservation)
        )}
      </td>

      {CHANNEL_COLUMNS.map((col) => {
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
              onSave={(next) =>
                onEditCell(
                  row.date!,
                  col.key as ReservationStatsEditableField,
                  next,
                )
              }
              cellClassName={numCell}
            />
          )
        }
        return (
          <td
            key={col.key}
            title={edit ? editMarkTitle(edit) : undefined}
            className={`${numCell} ${col.emphasis ? 'text-rose-600' : ''}`}
          >
            {formatChannelValue(channel[col.key], col.fmt)}
            {edit ? <EditMark /> : null}
          </td>
        )
      })}

      {SUMMARY_COLUMNS.map((col, i) => {
        if (muted) {
          return (
            <td
              key={col.key}
              className={`${numCell} text-slate-300 ${i === 0 ? divider : ''}`}
            >
              –
            </td>
          )
        }
        const edit = edits?.[col.key]
        if (canEditRow && row.date && EDITABLE_FIELD_SET.has(col.key)) {
          return (
            <EditableNumberCell
              key={col.key}
              value={summary[col.key]}
              edit={edit}
              busy={isEditing}
              onSave={(next) =>
                onEditCell(
                  row.date!,
                  col.key as ReservationStatsEditableField,
                  next,
                )
              }
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
