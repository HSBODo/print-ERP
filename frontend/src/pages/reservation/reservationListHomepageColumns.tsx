import type { ReactNode } from 'react'
import type { ReservationListHomepageItem } from '@/api/reservation/reservationListHomepage'
import {
  dash,
  formatDeviceType,
  formatExamType,
  formatReserveState,
  formatSurgeryTf,
} from './reservationListHomepageUtils'

/**
 * ReservationListHomepagePage 컬럼/뱃지 렌더 설정 (순수 로직은 reservationListHomepageUtils.ts).
 * 컬럼 구성은 레거시 화면(counsel/online_list.php) 목록의 12칼럼과 동일하다.
 * 조회 전용 화면이라 레거시의 체크박스·삭제·엑셀 칼럼은 두지 않는다.
 */

const DEVICE_TYPE_STYLE: Record<string, string> = {
  PC: 'bg-sky-50 text-sky-700',
  Mobile: 'bg-blue-50 text-blue-700',
  'AI PC': 'bg-violet-50 text-violet-700',
  'AI Mobile': 'bg-fuchsia-50 text-fuchsia-700',
}

const RESERVE_STATE_STYLE: Record<string, string> = {
  예약: 'bg-emerald-50 text-emerald-700',
  취소: 'bg-red-50 text-red-600',
}

/**
 * 셀 렌더 헬퍼 — 객체 메서드로 묶어 둔다.
 * (모듈 스코프의 JSX 반환 const는 react-refresh가 컴포넌트로 오인하므로 의도적으로 객체화)
 */
const cell = {
  badge: (text: string, className?: string): ReactNode =>
    text ? (
      <span
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
          className ?? 'bg-gray-100 text-gray-600'
        }`}
      >
        {text}
      </span>
    ) : (
      <span className="text-gray-300">—</span>
    ),
  /** UTM 3종을 레거시 화면처럼 세 줄로 쌓아 표시. 전부 비었으면 —. */
  utm: (r: ReservationListHomepageItem): ReactNode => {
    const parts = [r.utmSource, r.utmMedium, r.utmCampaign].filter((v) => v && v.trim())
    if (parts.length === 0) return <span className="text-gray-300">—</span>

    return (
      <span className="flex flex-col items-center leading-tight text-[11px] text-blue-700">
        {parts.map((part, i) => (
          <span key={`${part}-${i}`} className="break-all">{part}</span>
        ))}
      </span>
    )
  },
  /** 등록일 — 레거시 화면처럼 날짜/시각 두 줄. 원본은 'YYYY-MM-DD HH:MM:SS'. */
  dateTime: (v: string): ReactNode => {
    const [date, time] = v.split(' ')
    if (!date) return <span className="text-gray-300">—</span>

    return (
      <span className="flex flex-col items-center leading-tight">
        <span>{date}</span>
        {time && <span className="text-gray-500">{time}</span>}
      </span>
    )
  },
}

export interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  min?: string
  render?: (r: ReservationListHomepageItem, rowNumber: number) => ReactNode
  /** CSV 출력값(표시 변환이 다른 칼럼만). 미지정 시 r[key] 원값. */
  csv?: (r: ReservationListHomepageItem, rowNumber: number) => string | number
  /** CSV에서 Excel 숫자 변환 방지(텍스트 강제) — 휴대폰번호는 앞자리 0이 날아간다. */
  text?: boolean
}

export const ALIGN: Record<string, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
}

export const HEADER_ALIGN: Record<string, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}

export const COLUMNS: Column[] = [
  {
    key: 'rowNo',
    label: 'No',
    align: 'right',
    min: '3.5rem',
    render: (_r, rowNumber) => rowNumber.toLocaleString('ko-KR'),
  },
  {
    key: 'deviceType',
    label: '구분',
    align: 'center',
    min: '5.5rem',
    csv: (r) => formatDeviceType(r.deviceType),
    render: (r) => {
      const label = formatDeviceType(r.deviceType)
      return cell.badge(label, DEVICE_TYPE_STYLE[label])
    },
  },
  { key: 'name', label: '이름', align: 'center', min: '5rem', render: (r) => dash(r.name) },
  { key: 'phone', label: '휴대폰번호', align: 'center', min: '8rem', text: true, render: (r) => dash(r.phone) },
  { key: 'reserveDate', label: '예약일', align: 'center', min: '6rem', render: (r) => dash(r.reserveDate) },
  { key: 'reserveTime', label: '예약시간', align: 'center', min: '5rem', render: (r) => dash(r.reserveTime) },
  {
    key: 'utm',
    label: 'UTM',
    align: 'center',
    min: '9rem',
    // 화면은 3줄로 쌓지만 CSV 는 한 셀이라 ' / ' 로 잇는다(빈 항목은 제외).
    csv: (r) => [r.utmSource, r.utmMedium, r.utmCampaign].filter((v) => v && v.trim()).join(' / '),
    render: (r) => cell.utm(r),
  },
  {
    key: 'referralCode',
    label: '추천인코드',
    align: 'center',
    min: '6rem',
    render: (r) => dash(r.referralCode),
  },
  {
    key: 'examType',
    label: '진료구분',
    align: 'center',
    min: '9rem',
    csv: (r) => formatExamType(r.examType),
    // 코드 '1'은 레거시에도 라벨이 없어 빈칸 — dash 로 감싸지 않고 그대로 비워 둔다.
    render: (r) => formatExamType(r.examType) || <span className="text-gray-300">—</span>,
  },
  {
    key: 'surgeryTf',
    label: '당일수술',
    align: 'center',
    min: '5.5rem',
    csv: (r) => formatSurgeryTf(r.surgeryTf),
    render: (r) => cell.badge(formatSurgeryTf(r.surgeryTf), 'bg-amber-50 text-amber-700'),
  },
  {
    key: 'isReserve',
    label: '예약상태',
    align: 'center',
    min: '5.5rem',
    csv: (r) => formatReserveState(r.isReserve),
    render: (r) => {
      const label = formatReserveState(r.isReserve)
      return cell.badge(label, RESERVE_STATE_STYLE[label])
    },
  },
  { key: 'regDate', label: '등록일', align: 'center', min: '7rem', render: (r) => cell.dateTime(r.regDate) },
]

/**
 * CSV 칼럼 — 표 칼럼/순서와 동일하되 No 만 화면과 같은 역순 번호로 맞춘다.
 * (columnsToCsv 는 1부터 증가하는 행번호를 넘기는데, 이 화면의 No 는 총건수에서 1씩 감소한다)
 */
export const csvColumnsOf = (total: number): Column[] =>
  COLUMNS.map((col) =>
    col.key === 'rowNo' ? { ...col, csv: (_r, rowNumber) => total - (rowNumber - 1) } : col,
  )
