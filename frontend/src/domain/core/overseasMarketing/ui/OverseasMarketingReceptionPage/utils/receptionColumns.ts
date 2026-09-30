import type { CsvColumn } from '#shared/utils/csv'
import { maskName } from '#shared/utils/mask'

import type { OverseasMarketingReception } from '../../../type/api'

export type SortKey = keyof OverseasMarketingReception

export interface TableColumn {
  key: SortKey | null
  label: string
  align?: 'left' | 'center' | 'right'
  width: string
}

// 고객번호 열의 빈 값(배지 행) 묶음 순서 — 매칭 → 확인필요 → 미매칭.
export const MATCH_ORDER: Record<string, number> = {
  matched: 0,
  review: 1,
  received: 2,
}
export const PLAIN_NUMBER = /^-?[\d,]+(\.\d+)?$/

export const STATUS_STYLE: Record<string, string> = {
  검사예약: 'bg-blue-50 text-blue-700',
  수술완료: 'bg-emerald-50 text-emerald-700',
  외래문의: 'bg-violet-50 text-violet-700',
}

export const dash = (value: string) => value?.trim() || '—'

export const alignClass = (align: TableColumn['align']) => {
  if (align === 'left') return 'text-left'
  if (align === 'right') return 'text-right'
  return 'text-center'
}

export const maskContact = (value: string) => {
  const digits = value.replace(/\D/g, '')
  return digits.length >= 4 ? `***-****-${digits.slice(-4)}` : ''
}

export const maskEmail = (value: string) => {
  const [local, domain] = value.split('@')
  return local && domain ? `${local.slice(0, 1)}***@${domain}` : ''
}

export const sortValue = (row: OverseasMarketingReception, key: SortKey) => {
  const value = String(row[key] ?? '').trim()
  return value === '-' ? '' : value
}

export const COLUMNS: TableColumn[] = [
  { key: null, label: 'No', align: 'right', width: 'w-[54px]' },
  { key: null, label: '관리', width: 'w-[76px]' },
  { key: 'status', label: '상태', width: 'w-[80px]' },
  { key: 'registeredDate', label: '등록일', width: 'w-[100px]' },
  { key: 'matchedDate', label: '매칭일', width: 'w-[100px]' },
  { key: 'inquiryDate', label: '문의일', width: 'w-[100px]' },
  { key: 'customerNo', label: '고객번호', width: 'w-[110px]' },
  { key: 'name', label: '이름', align: 'left', width: 'w-[120px]' },
  { key: 'nationality', label: '국적', width: 'w-[100px]' },
  { key: 'gender', label: '성별', width: 'w-[56px]' },
  { key: 'birthDate', label: '생년월일', width: 'w-[104px]' },
  { key: 'contact', label: '연락처', align: 'left', width: 'w-[140px]' },
  { key: 'email', label: '이메일', align: 'left', width: 'w-[180px]' },
  { key: 'ethnicity', label: '민족', width: 'w-[96px]' },
  { key: 'occupation', label: '직업', align: 'left', width: 'w-[104px]' },
  { key: 'contactLens', label: '콘택트렌즈', width: 'w-[96px]' },
  {
    key: 'medicalConditions',
    label: '병력',
    align: 'left',
    width: 'w-[160px]',
  },
  {
    key: 'medicationAllergy',
    label: '복용약/알레르기',
    align: 'left',
    width: 'w-[160px]',
  },
  { key: 'departureSchedule', label: '출국예정', width: 'w-[120px]' },
  { key: 'examDate', label: '검사일', width: 'w-[100px]' },
  { key: 'surgeryDate', label: '수술일', width: 'w-[100px]' },
  { key: 'surgeryCost', label: '수술비', align: 'right', width: 'w-[100px]' },
  { key: 'examCost', label: '검사비', align: 'right', width: 'w-[100px]' },
  { key: 'channel', label: '유입경로', width: 'w-[100px]' },
  { key: 'channelId', label: '채널ID', width: 'w-[120px]' },
  { key: 'onlineChannel', label: '온라인채널', width: 'w-[104px]' },
  { key: 'agentChannel', label: '에이전트', width: 'w-[100px]' },
  { key: 'agentId', label: '에이전트ID', width: 'w-[110px]' },
  { key: 'operationRight', label: 'OP_R', width: 'w-[80px]' },
  { key: 'operationLeft', label: 'OP_L', width: 'w-[80px]' },
  { key: 'dreamlens', label: '드림렌즈', width: 'w-[120px]' },
  { key: 'referral', label: '소개', align: 'left', width: 'w-[140px]' },
  { key: 'outpatient1', label: '외래1', align: 'left', width: 'w-[160px]' },
  {
    key: 'outpatient1Cost',
    label: '외래1비',
    align: 'right',
    width: 'w-[96px]',
  },
  { key: 'outpatient2', label: '외래2', align: 'left', width: 'w-[160px]' },
  {
    key: 'outpatient2Cost',
    label: '외래2비',
    align: 'right',
    width: 'w-[96px]',
  },
  { key: 'outpatient3', label: '외래3', align: 'left', width: 'w-[160px]' },
  {
    key: 'outpatient3Cost',
    label: '외래3비',
    align: 'right',
    width: 'w-[96px]',
  },
  { key: 'createdBy', label: '추가자', width: 'w-[110px]' },
  { key: 'modifiedBy', label: '수정자', width: 'w-[100px]' },
  { key: 'remark', label: '비고', align: 'left', width: 'w-[220px]' },
]

export const CSV_COLUMNS: CsvColumn<OverseasMarketingReception>[] =
  COLUMNS.filter((column) => column.label !== '관리').map((column) => {
    if (!column.key)
      return { key: 'rowNo', label: column.label, csv: (_row, index) => index }
    if (column.key === 'name')
      return {
        key: column.key,
        label: column.label,
        csv: (row) => maskName(row.name),
      }
    if (column.key === 'contact')
      return {
        key: column.key,
        label: column.label,
        csv: (row) => maskContact(row.contact),
      }
    if (column.key === 'email')
      return {
        key: column.key,
        label: column.label,
        csv: (row) => maskEmail(row.email),
      }
    return {
      key: column.key,
      label: column.label,
      text: column.key === 'customerNo',
    }
  })
