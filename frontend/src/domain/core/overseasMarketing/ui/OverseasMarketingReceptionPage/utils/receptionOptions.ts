import { type DateRange, thisMonthRange } from '#shared/utils/date'

import type {
  OverseasMarketingDateType,
  OverseasMarketingReceptionParams,
} from '../../../type/api'

/** 조회 조건 — [조회]를 눌러야 반영된다. 기본: 문의일 기준 당월 1일 ~ 말일, 상태 전체 */
export interface ReceptionFilterValues {
  dateType: OverseasMarketingDateType
  range: DateRange
  status: string
}

export const defaultReceptionFilter = (): ReceptionFilterValues => ({
  dateType: 'inquiry_date',
  range: thisMonthRange(),
  status: '',
})

/** API 파라미터 — 화면에서 고르지 않는 값(dateEnabled·source·unmatched)은 고정 */
export const toReceptionParams = ({
  dateType,
  range,
  status,
}: ReceptionFilterValues): OverseasMarketingReceptionParams => ({
  ...range,
  dateType,
  status,
  dateEnabled: true,
  source: 'all',
  unmatched: false,
})

export const DATE_TYPES: { value: OverseasMarketingDateType; label: string }[] =
  [
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
