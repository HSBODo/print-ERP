import type { ReactNode } from 'react'
import type { AllExamListItem } from '@/api/exam/allExamList'
import { calcAge, dash } from './examListUtils'
import { maskName, maskPhone } from '@/utils/mask'

/** AllExamListPage 컬럼/뱃지 렌더 설정 (순수 로직은 examListUtils.ts 재사용). */

const GROUP_STYLE: Record<string, string> = {
  시력교정: 'bg-sky-50 text-sky-700',
  드림렌즈: 'bg-fuchsia-50 text-fuchsia-700',
  백내장: 'bg-amber-50 text-amber-700',
}
const INTRO_STYLE: Record<string, string> = {
  일반: 'bg-gray-100 text-gray-600',
  고객소개: 'bg-emerald-50 text-emerald-700',
  직원소개: 'bg-violet-50 text-violet-700',
}
const JOB_STYLE: Record<string, string> = {
  직장인: 'bg-blue-50 text-blue-700',
  학생: 'bg-teal-50 text-teal-700',
  기타: 'bg-gray-100 text-gray-600',
}
const PATIENT_STYLE: Record<string, string> = {
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
  render?: (r: AllExamListItem, rowNumber: number) => ReactNode
  /** CSV 출력값(표시 변환이 다른 칼럼만). 미지정 시 r[key] 원값. */
  csv?: (r: AllExamListItem, rowNumber: number) => string | number
  /** CSV에서 Excel 숫자 변환 방지(텍스트 강제) — 차트번호·전화번호. */
  text?: boolean
}

export const COLUMNS: Column[] = [
  { key: 'rowNo', label: 'No', align: 'right', min: '3.5rem', render: (_r, n) => n.toLocaleString('ko-KR'), csv: (_r, n) => n },
  { key: 'examDate', label: '검사일', align: 'center', min: '6rem' },
  { key: 'examGroup', label: '검사구분', align: 'center', min: '5rem', render: (r) => cell.badge(r.examGroup, GROUP_STYLE[r.examGroup]) },
  { key: 'patientType', label: '신/구환', align: 'center', min: '4.5rem', render: (r) => cell.badge(r.patientType, PATIENT_STYLE[r.patientType]) },
  { key: 'introType', label: '내원동기구분', align: 'center', min: '5.5rem', render: (r) => cell.badge(r.introType, INTRO_STYLE[r.introType]) },
  { key: 'motiveL', label: '내원동기(대)', align: 'center', min: '6rem', render: (r) => dash(r.motiveL) },
  { key: 'motiveM', label: '내원동기(중)', align: 'center', min: '6rem', render: (r) => dash(r.motiveM) },
  { key: 'jobBucket', label: '직업구분', align: 'center', min: '4.5rem', render: (r) => cell.badge(r.jobBucket, JOB_STYLE[r.jobBucket]) },
  { key: 'job', label: '직업', align: 'center', min: '6rem', render: (r) => dash(r.job) },
  { key: 'chartNo', label: '차트번호', align: 'center', min: '6rem', text: true },
  { key: 'name', csv: (r) => maskName(r.name), label: '고객명', align: 'center', min: '5rem', render: (r) => <span className="font-medium text-gray-900">{r.name}</span> },
  { key: 'grade', label: '등급', align: 'center', min: '3.5rem', render: (r) => cell.badge(r.grade, GRADE_STYLE[r.grade]) },
  { key: 'birth', label: '생년월일', align: 'center', min: '6rem' },
  { key: 'age', label: '만나이', align: 'right', min: '3.5rem', csv: (r) => calcAge(r.birth), render: (r) => calcAge(r.birth) },
  { key: 'phone2', csv: (r) => maskPhone(r.phone2), label: '휴대전화', align: 'left', min: '8rem', text: true },
  { key: 'counselor', label: '상담사', align: 'center', min: '5rem', render: (r) => dash(r.counselor) },
  { key: 'doctor', label: '상담의', align: 'center', min: '5rem', render: (r) => dash(r.doctor) },
  { key: 'optometrist', label: '검안사', align: 'center', min: '5rem', render: (r) => dash(r.optometrist) },
  { key: 'lastVisit', label: '최근내원일', align: 'center', min: '6rem' },
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
