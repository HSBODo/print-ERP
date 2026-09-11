import type { OverseasMarketingDateType, OverseasMarketingReceptionParams } from '@/api/marketing/overseasMarketing'

const pad = (value: number) => String(value).padStart(2, '0')
const toIso = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

// 기본 조회: 문의일 기준 당월 1일 ~ 말일.
export const createDefaultParams = (): OverseasMarketingReceptionParams => {
  const now = new Date()
  return {
    from: toIso(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toIso(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    dateType: 'inquiry_date',
    dateEnabled: true,
    status: '',
    source: 'all',
    unmatched: false,
  }
}

export const DATE_TYPES: { value: OverseasMarketingDateType; label: string }[] = [
  { value: 'reg_date', label: '등록일' },
  { value: 'matched_date', label: '매칭일' },
  { value: 'inquiry_date', label: '문의일' },
  { value: 'departure_schedule', label: '출국예정' },
  { value: 'exam_date', label: '검사일' },
  { value: 'surgery_date', label: '수술일' },
]

export const STATUS_OPTIONS = [
  { value: '', label: '전체' },
  { value: '__empty__', label: '미분류' },
  { value: '검사예약', label: '검사예약' },
  { value: '외래문의', label: '외래문의' },
  { value: '수술완료', label: '수술완료' },
]

export type MatchFilter = 'all' | 'received' | 'matched' | 'review'
export const MATCH_OPTIONS: { value: MatchFilter; label: string }[] = [
  { value: 'all', label: '매칭 전체' },
  { value: 'received', label: '접수' },
  { value: 'matched', label: '매칭' },
  { value: 'review', label: '확인필요' },
]

export const PAGE_SIZE_OPTIONS = [50, 100, 200]
