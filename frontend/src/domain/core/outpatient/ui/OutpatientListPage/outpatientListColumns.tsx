import type { ReactNode } from 'react'

import { maskName, maskPhone } from '#shared/utils/mask'

import type { OutpatientListItem } from '../../type/api'
import { calcAge, dash } from './outpatientListUtils'

/**
 * OutpatientListPage 컬럼/뱃지 렌더 설정 (순수 로직은 outpatientListUtils.ts).
 *
 * ⚠️ 개인정보는 CSV 로 나갈 때만 마스킹한다(csv:). 화면(render)은 레거시 관리자 화면과 동일하게
 * 원문을 유지한다 — 직원이 환자 식별·연락에 쓰기 때문이다.
 */

const STATE_STYLE: Record<string, string> = {
  내원: 'bg-blue-50 text-blue-700',
  퇴원: 'bg-emerald-50 text-emerald-700',
}
const PATIENT_TYPE_STYLE: Record<string, string> = {
  신환: 'bg-emerald-50 text-emerald-700',
  구환: 'bg-gray-100 text-gray-700',
}
const GRADE_STYLE: Record<string, string> = {
  R: 'bg-emerald-50 text-emerald-700',
  A: 'bg-blue-50 text-blue-700',
  B: 'bg-amber-50 text-amber-700',
  C: 'bg-gray-100 text-gray-600',
  G: 'bg-gray-100 text-gray-500',
}

const cell = {
  badge: (text: string, className?: string): ReactNode =>
    text ? (
      <span
        className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className ?? 'bg-gray-100 text-gray-600'}`}
      >
        {text}
      </span>
    ) : (
      <span className="text-gray-300">—</span>
    ),
  yn: (v: string): ReactNode =>
    v === 'Y' ? (
      <span className="font-medium text-red-500">Y</span>
    ) : (
      <span className="text-gray-300">—</span>
    ),
  truncate: (v: string, w = '14rem'): ReactNode => (
    <span
      className="block truncate text-gray-700"
      style={{ maxWidth: w }}
      title={v}
    >
      {dash(v)}
    </span>
  ),
}

export interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  min?: string
  groupStart?: boolean
  render?: (r: OutpatientListItem, rowNumber: number) => ReactNode
  /** CSV 출력값. 미지정 시 r[key] 원값. */
  csv?: (r: OutpatientListItem, rowNumber: number) => string | number
  /** CSV에서 Excel 숫자 변환 방지(텍스트 강제). */
  text?: boolean
}

export const COLUMNS: Column[] = [
  {
    key: 'rowNo',
    label: 'No',
    align: 'right',
    min: '3.5rem',
    groupStart: true,
    render: (_r, rowNumber) => rowNumber.toLocaleString('ko-KR'),
    csv: (_r, rowNumber) => rowNumber,
  },
  {
    key: 'reserveDate',
    label: '예약일',
    align: 'center',
    min: '6rem',
    groupStart: true,
  },
  { key: 'reserveTime', label: '예약시간', align: 'center', min: '4.5rem' },
  {
    key: 'state',
    label: '상태',
    align: 'center',
    min: '4.5rem',
    render: (r) => cell.badge(r.state, STATE_STYLE[r.state]),
  },
  { key: 'reserveType', label: '진료구분', align: 'center', min: '5rem' },
  {
    key: 'patientType',
    label: '신/구환',
    align: 'center',
    min: '4.5rem',
    render: (r) => cell.badge(r.patientType, PATIENT_TYPE_STYLE[r.patientType]),
  },
  {
    key: 'chartNo',
    label: '차트번호',
    align: 'center',
    min: '6rem',
    groupStart: true,
    text: true,
  },
  {
    key: 'name',
    label: '고객명',
    align: 'center',
    min: '5rem',
    csv: (r) => maskName(r.name),
    render: (r) => <span className="font-medium text-gray-900">{r.name}</span>,
  },
  {
    key: 'nameEng',
    label: '고객명(영)',
    align: 'left',
    min: '7rem',
    csv: (r) => maskName(r.nameEng),
  },
  {
    key: 'grade',
    label: '등급',
    align: 'center',
    min: '3.5rem',
    render: (r) => cell.badge(r.grade, GRADE_STYLE[r.grade]),
  },
  { key: 'birth', label: '생년월일', align: 'center', min: '6rem' },
  {
    key: 'age',
    label: '만나이',
    align: 'right',
    min: '3.5rem',
    csv: (r) => calcAge(r.birth),
    render: (r) => calcAge(r.birth),
  },
  { key: 'lunar', label: '양/음', align: 'center', min: '3.5rem' },
  {
    key: 'phone2',
    label: '휴대전화',
    align: 'left',
    min: '8rem',
    groupStart: true,
    text: true,
    csv: (r) => maskPhone(r.phone2),
  },
  {
    key: 'phone1',
    label: '집전화',
    align: 'left',
    min: '7rem',
    text: true,
    csv: (r) => maskPhone(r.phone1),
  },
  {
    key: 'email',
    label: '이메일',
    align: 'left',
    min: '10rem',
    render: (r) => cell.truncate(r.email, '11rem'),
  },
  {
    key: 'doctor',
    label: '담당의사',
    align: 'center',
    min: '5rem',
    groupStart: true,
  },
  { key: 'counselor', label: '예약상담사', align: 'center', min: '5rem' },
  { key: 'registeredBy', label: '등록직원', align: 'center', min: '5rem' },
  {
    key: 'happyCall',
    label: '해피콜',
    align: 'center',
    min: '4rem',
    groupStart: true,
    render: (r) => cell.yn(r.happyCall),
  },
  {
    key: 'todayFlag',
    label: '당일예약',
    align: 'center',
    min: '4rem',
    render: (r) => cell.yn(r.todayFlag),
  },
  {
    key: 'oldFlag',
    label: '구환플래그',
    align: 'center',
    min: '4.5rem',
    render: (r) => cell.yn(r.oldFlag),
  },
  {
    key: 'comment',
    label: '예약메모',
    align: 'left',
    min: '14rem',
    render: (r) => cell.truncate(r.comment, '16rem'),
  },
  {
    key: 'route',
    label: '예약경로',
    align: 'center',
    min: '5rem',
    groupStart: true,
    render: (r) => dash(r.route),
  },
  {
    key: 'section',
    label: '섹션',
    align: 'center',
    min: '3.5rem',
    render: (r) => dash(r.section),
  },
  {
    key: 'motiveL',
    label: '내원동기(대)',
    align: 'center',
    min: '6rem',
    render: (r) => dash(r.motiveL),
  },
  {
    key: 'motiveM',
    label: '내원동기(중)',
    align: 'center',
    min: '6rem',
    render: (r) => dash(r.motiveM),
  },
  {
    key: 'motiveS',
    label: '내원동기(세)',
    align: 'center',
    min: '6rem',
    render: (r) => dash(r.motiveS),
  },
  {
    key: 'motiveMemo',
    label: '동기메모',
    align: 'left',
    min: '7rem',
    render: (r) => cell.truncate(r.motiveMemo, '7rem'),
  },
  { key: 'job', label: '직업', align: 'center', min: '6rem', groupStart: true },
  { key: 'nationality', label: '국적', align: 'center', min: '4.5rem' },
  { key: 'insurance', label: '보험사', align: 'center', min: '4.5rem' },
  { key: 'zip', label: '우편번호', align: 'center', min: '4.5rem', text: true },
  {
    key: 'addr1',
    label: '주소1',
    align: 'left',
    min: '12rem',
    render: (r) => cell.truncate(r.addr1, '14rem'),
  },
  {
    key: 'addr2',
    label: '주소2',
    align: 'left',
    min: '8rem',
    render: (r) => cell.truncate(r.addr2, '9rem'),
  },
  { key: 'lastVisit', label: '최근내원일', align: 'center', min: '6rem' },
  {
    key: 'memo',
    label: '고객메모',
    align: 'left',
    min: '12rem',
    render: (r) => cell.truncate(r.memo, '14rem'),
  },
]

export const ALIGN: Record<NonNullable<Column['align']>, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right tabular-nums',
}
export const HEADER_ALIGN: Record<NonNullable<Column['align']>, string> = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
}
