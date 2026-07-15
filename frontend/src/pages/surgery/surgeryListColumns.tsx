import type { ReactNode } from 'react'
import type { SurgeryListItem } from '@/api/surgery/surgeryList'
import { calcAge, dash } from './surgeryListUtils'
import { maskName, maskPhone } from '@/utils/mask'

/** SurgeryListPage 컬럼/뱃지 렌더 설정 (순수 로직은 surgeryListUtils.ts). */

const SURGERY_CATEGORY_STYLE: Record<string, string> = {
  시력교정: 'bg-sky-50 text-sky-700',
  백내장: 'bg-amber-50 text-amber-700',
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

/**
 * 셀 렌더 헬퍼 — 객체 메서드로 묶어 둔다.
 * (모듈 스코프의 JSX 반환 const는 react-refresh가 컴포넌트로 오인하므로 의도적으로 객체화)
 */
const cell = {
  badge: (text: string, className?: string): ReactNode =>
    text ? (
      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${className ?? 'bg-gray-100 text-gray-600'}`}>{text}</span>
    ) : (
      <span className="text-gray-300">—</span>
    ),
  truncate: (v: string, w = '14rem'): ReactNode => (
    <span className="block truncate text-gray-700" style={{ maxWidth: w }} title={v}>{dash(v)}</span>
  ),
}

export interface Column {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  min?: string
  render?: (r: SurgeryListItem, rowNumber: number) => ReactNode
  /** CSV 출력값(표시 변환이 다른 칼럼만). 미지정 시 r[key] 원값. */
  csv?: (r: SurgeryListItem, rowNumber: number) => string | number
  /** CSV에서 Excel 숫자 변환 방지(텍스트 강제) — 차트번호·전화·우편번호. */
  text?: boolean
}

export const COLUMNS: Column[] = [
  { key: 'rowNo', label: 'No', align: 'right', min: '3.5rem', render: (_r, rowNumber) => rowNumber.toLocaleString('ko-KR'), csv: (_r, rowNumber) => rowNumber },
  { key: 'surgeryDate', label: '수술일', align: 'center', min: '6rem' },
  { key: 'examDate', label: '검사일', align: 'center', min: '6rem' },
  { key: 'surgeryCategory', label: '수술분류', align: 'center', min: '5.5rem', render: (r) => cell.badge(r.surgeryCategory, SURGERY_CATEGORY_STYLE[r.surgeryCategory]) },
  { key: 'patientType', label: '신/구환', align: 'center', min: '4.5rem', render: (r) => cell.badge(r.patientType, PATIENT_TYPE_STYLE[r.patientType]) },
  { key: 'surgeryTime', label: '예약시간', align: 'center', min: '4.5rem', render: (r) => dash(r.surgeryTime) },
  { key: 'chartNo', label: '차트번호', align: 'center', min: '6rem', text: true },
  { key: 'name', csv: (r) => maskName(r.name), label: '고객명', align: 'center', min: '5rem', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: 'nameEng', csv: (r) => maskName(r.nameEng), label: '고객명(영)', align: 'left', min: '7rem' },
  { key: 'surgeryR', label: '수술방법R', align: 'center', min: '7rem', render: (r) => dash(r.surgeryR) },
  { key: 'surgeryL', label: '수술방법L', align: 'center', min: '7rem', render: (r) => dash(r.surgeryL) },
  { key: 'surgeon', label: '집도의', align: 'center', min: '5rem', render: (r) => dash(r.surgeon) },
  { key: 'recommendedR', label: '적절수술R', align: 'center', min: '7rem', render: (r) => dash(r.recommendedR) },
  { key: 'recommendedL', label: '적절수술L', align: 'center', min: '7rem', render: (r) => dash(r.recommendedL) },
  { key: 'surgeryReserveDate', label: '수술예약일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryReserveDate) },
  { key: 'surgeryRegDate', label: '수술예약등록일', align: 'center', min: '6rem', render: (r) => dash(r.surgeryRegDate) },
  { key: 'estimate', label: '견적가', align: 'left', min: '12rem', render: (r) => cell.truncate(r.estimate, '13rem') },
  { key: 'surgeryRate', label: '수술가율', align: 'center', min: '4.5rem', render: (r) => dash(r.surgeryRate) },
  { key: 'payment', label: '수납금액', align: 'right', min: '6rem', render: (r) => <span className="tabular-nums">{dash(r.payment)}</span> },
  { key: 'counselor', label: '상담사', align: 'center', min: '5rem' },
  { key: 'doctor', label: '상담의', align: 'center', min: '5rem' },
  { key: 'optometrist', label: '검안사', align: 'center', min: '5rem' },
  { key: 'grade', label: '등급', align: 'center', min: '3.5rem', render: (r) => cell.badge(r.grade, GRADE_STYLE[r.grade]) },
  { key: 'birth', label: '생년월일', align: 'center', min: '6rem' },
  { key: 'age', label: '만나이', align: 'right', min: '3.5rem', csv: (r) => calcAge(r.birth), render: (r) => calcAge(r.birth) },
  { key: 'lunar', label: '양/음', align: 'center', min: '3.5rem' },
  { key: 'phone2', csv: (r) => maskPhone(r.phone2), label: '휴대전화', align: 'left', min: '8rem', text: true },
  { key: 'phone1', csv: (r) => maskPhone(r.phone1), label: '집전화', align: 'left', min: '7rem', text: true },
  { key: 'email', label: '이메일', align: 'left', min: '10rem', render: (r) => cell.truncate(r.email, '11rem') },
  { key: 'route', label: '예약경로', align: 'center', min: '5rem', render: (r) => dash(r.route) },
  { key: 'section', label: '섹션', align: 'center', min: '3.5rem', render: (r) => dash(r.section) },
  { key: 'motiveL', label: '내원동기(대)', align: 'center', min: '6rem', render: (r) => dash(r.motiveL) },
  { key: 'motiveM', label: '내원동기(중)', align: 'center', min: '6rem', render: (r) => dash(r.motiveM) },
  { key: 'motiveS', label: '내원동기(세)', align: 'center', min: '6rem', render: (r) => dash(r.motiveS) },
  { key: 'motiveMemo', label: '동기메모', align: 'left', min: '7rem', render: (r) => cell.truncate(r.motiveMemo, '7rem') },
  { key: 'job', label: '직업', align: 'center', min: '6rem' },
  { key: 'nationality', label: '국적', align: 'center', min: '4.5rem' },
  { key: 'insurance', label: '보험사', align: 'center', min: '4.5rem' },
  { key: 'zip', label: '우편번호', align: 'center', min: '4.5rem', text: true },
  { key: 'addr1', label: '주소1', align: 'left', min: '12rem', render: (r) => cell.truncate(r.addr1, '14rem') },
  { key: 'addr2', label: '주소2', align: 'left', min: '8rem', render: (r) => cell.truncate(r.addr2, '9rem') },
  { key: 'lastVisit', label: '최근내원일', align: 'center', min: '6rem' },
  { key: 'examMemo', label: '검사특이사항', align: 'left', min: '16rem', render: (r) => cell.truncate(r.examMemo, '18rem') },
  { key: 'memo', label: '고객메모', align: 'left', min: '12rem', render: (r) => cell.truncate(r.memo, '14rem') },
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
