import { describe, expect, it } from 'vitest'
import {
  groupOf,
  groupOptionsOf,
  matchesStatusFilter,
  targetStateOf,
  tierCellOf,
} from './smsTableModel'
import type { SmsTarget, SmsTemplate } from '../../../type/api'

/**
 * 문자 발송 관리 표의 **판정 규칙**을 고정한다.
 * 색과 라벨이 곧 "점검해야 할 칸"의 신호라, 조용히 바뀌면 놓친 발송을 못 잡는다.
 */

const log = (
  over: Partial<SmsTarget['logs'][number]> = {},
): SmsTarget['logs'][number] => ({
  id: 1,
  targetId: 1,
  templateCode: 'T1',
  templateLabel: '수술 후 안내 1차',
  requestedChannel: 'ALIMTALK',
  messageType: 'ATA',
  solapiGroupId: 'G4V',
  solapiMessageId: 'M4V',
  statusCode: '4000',
  status: 'SUCCESS',
  failReason: '',
  sentAt: '2026-08-13 09:00',
  sentBy: 'admin',
  deliveredAt: '2026-08-13 09:01',
  replacement: false,
  ...over,
})

const target = (over: Partial<SmsTarget> = {}): SmsTarget => ({
  id: 1,
  chartNo: '2234451',
  name: '홍길동',
  phone: '01080690814',
  phoneValid: true,
  surgeryDate: '2026-08-06',
  scheduleBase: '2026-08-06',
  rebased: false,
  surgeryType: '시력교정',
  opType: 'smilePro',
  surgeryR: 'SMILE PRO',
  surgeryL: 'SMILE PRO',
  status: 'SENDABLE',
  source: 'AUTO',
  optedOut: false,
  logs: [],
  tierQueues: {},
  ...over,
})

/**
 * 서버가 내려주는 차수 × 그룹 정의 — 화면은 이 매핑만 보고 분류와 예정일을 정한다.
 * 스마일 1차는 D+1, 2·3차는 D+7 · D+14 (SurgeryGroup 확정안).
 */
const group = (
  groupCode: string,
  groupLabel: string,
  opTypes: string[],
  offsetDays: number,
) => ({
  groupCode,
  groupLabel,
  opTypes,
  offsetDays,
  alimtalkReady: true,
  smsReady: true,
})
const tierOf = (
  tier: number,
  offsets: [number, number, number, number, number],
): SmsTemplate => ({
  code: `T${tier}`,
  label: `수술 후 안내 ${tier}차`,
  tier,
  groups: [
    group('SMILE', '스마일수술', ['smilePro', 'smile'], offsets[0]),
    group('LASIK', '라식', ['lasik'], offsets[1]),
    group('LASEK', '라섹', ['lasek'], offsets[2]),
    group(
      'ICL',
      '렌즈삽입',
      ['icl', 'tIcl', 'kpl', 'tKpl', 'viva'],
      offsets[3],
    ),
    group('ETC', '기타', [], offsets[4]),
  ],
})
const tiers: SmsTemplate[] = [
  tierOf(1, [1, 1, 5, 3, 1]),
  tierOf(2, [7, 7, 7, 7, 7]),
  tierOf(3, [14, 14, 14, 14, 14]),
]

describe('수술 분류', () => {
  it('같은 문구를 쓰는 수술은 한 분류로 묶인다', () => {
    // 스마일프로와 스마일라식, ICL 계열(KPL·VIVA 포함)은 각각 한 문구를 공유한다.
    expect(groupOf(tiers, 'smilePro')?.label).toBe('스마일')
    expect(groupOf(tiers, 'smile')?.label).toBe('스마일')
    expect(groupOf(tiers, 'viva')?.label).toBe('렌즈삽입')
    expect(groupOf(tiers, 'lasek')?.label).toBe('라섹')
  })

  it('TF 범위 밖(백내장·재수술)과 빈 값은 기타로 떨어진다', () => {
    expect(groupOf(tiers, 'catMulti')?.code).toBe('ETC')
    expect(groupOf(tiers, '')?.code).toBe('ETC')
  })

  it('템플릿을 못 받았으면 분류를 지어내지 않는다', () => {
    // 전부 '기타'로 보이면 설정이 안 읽힌 상태와 진짜 기타가 구분되지 않는다.
    expect(groupOf([], 'smilePro')).toBeNull()
  })

  it('필터 목록은 데이터 존재 여부와 무관하게 4대 분류(스마일·라식·라섹·렌즈삽입) + 기타를 고정 노출한다', () => {
    // 이번달에 라식이 없다는 이유로 라식 버튼이 사라지면 관리자가 "라식 필터가 왜 없지" 를
    // 묻는다. 매번 필터가 나타났다 사라지는 화면은 사용법이 흔들린다. 기타(ETC)는 발송되지
    // 않지만 "누가 분류에서 빠졌나" 확인 창구라 필터에는 남긴다 — 4대 분류 뒤에 붙인다.
    expect(groupOptionsOf(tiers).map((o) => o.label)).toEqual([
      '스마일',
      '라식',
      '라섹',
      '렌즈삽입',
      '기타',
    ])
  })

  it('템플릿을 못 받았어도 필터 목록은 고정으로 낸다', () => {
    // 로딩 중이거나 서버가 값을 못 준 순간에도 필터 개수·라벨은 흔들리지 않아야 한다.
    expect(groupOptionsOf([]).map((o) => o.label)).toEqual([
      '스마일',
      '라식',
      '라섹',
      '렌즈삽입',
      '기타',
    ])
  })
})

describe('대상 상태 판정', () => {
  it('번호가 무효면 무엇보다 먼저 발송 불가이고 토글할 수 없다', () => {
    // 데이터 문제라 사람이 되돌릴 수 있는 값이 아니다 — 홀딩보다 우선한다.
    const state = targetStateOf(
      target({ phoneValid: false, status: 'HOLD' }),
      tiers,
      '2026-08-20',
    )
    expect(state.label).toBe('발송 불가')
    expect(state.locked).toBe(true)
  })

  it('홀딩은 발송 이력보다 우선한다', () => {
    const state = targetStateOf(
      target({ status: 'HOLD', logs: [log()] }),
      tiers,
      '2026-08-20',
    )
    expect(state.label).toBe('홀딩')
    expect(state.bucket).toBe('발송 중지')
    expect(state.locked).toBe(false)
  })

  it('수신거부는 무엇보다 먼저이고 잠겨 있다', () => {
    // 홀딩은 이 수술 건 하나지만 수신거부는 사람 단위다 — 상태 알약으로 되돌릴 값이 아니다.
    const state = targetStateOf(
      target({ optedOut: true, logs: [log()] }),
      tiers,
      '2026-08-20',
    )
    expect(state.label).toBe('수신거부')
    expect(state.locked).toBe(true)
    expect(state.needsCheck).toBe(false)
    // 홀딩 탭과 섞지 않는다 — 홀딩 해제를 누르다 거부한 사람까지 되살리면 안 된다.
    expect(state.bucket).toBe('수신거부')
    expect(matchesStatusFilter(state, '발송 중지')).toBe(false)
    expect(matchesStatusFilter(state, '수신거부')).toBe(true)
  })

  it('수신거부 대상의 차수 칸은 제외로 표시한다', () => {
    const cell = tierCellOf(target({ optedOut: true }), 7, 'T1', '2026-08-20')
    expect(cell.label).toBe('제외')
    expect(cell.title).toContain('수신거부')
  })

  it('템플릿을 못 받았으면 옛 두 마디로 물러선다', () => {
    // 차수를 모르는 상태에서 '1차 실패' 같은 문구를 지어내면 안 된다.
    expect(
      targetStateOf(target({ logs: [log()] }), [], '2026-08-20').label,
    ).toBe('발송')
    expect(targetStateOf(target(), [], '2026-08-20').label).toBe('대기')
  })
})

/**
 * 1~3차가 있어서 '발송'·'대기' 두 마디로는 몇 차가 문제인지 못 읽는다.
 * 표시에는 차수를 붙이되 필터 묶음(bucket)은 옛 4분류 그대로여야 한다.
 */
describe('차수까지 반영한 상태 문구', () => {
  const today = '2026-08-20' // 기준일 08-06 → 1차 08-07 · 2차 08-13 · 3차 08-20

  it('아무것도 안 나갔으면 그냥 대기다 — 1차는 차수를 붙이지 않는다', () => {
    // 갓 등록된 정상 상태라 대부분이 여기다. 숫자를 붙이면 컬럼이 도배돼 신호가 죽는다.
    const state = targetStateOf(
      target({ surgeryDate: '2026-08-19', scheduleBase: '2026-08-19' }),
      tiers,
      today,
    )
    expect(state.label).toBe('대기')
    expect(state.bucket).toBe('발송 대기')
  })

  it('앞 차수가 나갔으면 다음 차수를 대기로 알려준다', () => {
    const state = targetStateOf(
      target({
        surgeryDate: '2026-08-18',
        scheduleBase: '2026-08-18',
        logs: [log({ templateCode: 'T1' })],
      }),
      tiers,
      today,
    )
    expect(state.label).toBe('2차 대기')
    expect(state.bucket).toBe('발송')
  })

  it('실패가 가장 급하다 — 다른 차수 상태보다 앞선다', () => {
    const state = targetStateOf(
      target({
        logs: [
          log({ templateCode: 'T1', status: 'FAILED', failReason: '수신거부' }),
        ],
      }),
      tiers,
      today,
    )
    expect(state.label).toBe('1차 실패')
    expect(state.className).toContain('red')
  })

  it('예정일이 지났는데 안 나갔으면 몇 차인지 찍는다', () => {
    // 1차는 도달했고 2차(08-13)가 오늘(08-20)까지 안 나간 상태.
    const state = targetStateOf(
      target({ logs: [log({ templateCode: 'T1' })] }),
      tiers,
      today,
    )
    expect(state.label).toBe('2차 미발송')
    expect(state.bucket).toBe('발송')
  })

  it('접수만 된 차수는 미도달로 구분한다 — 접수는 완료가 아니다', () => {
    const state = targetStateOf(
      target({
        surgeryDate: '2026-08-18',
        scheduleBase: '2026-08-18',
        logs: [
          log({
            templateCode: 'T1',
            status: 'PENDING',
            deliveredAt: '',
            sentAt: '2026-08-19 09:00',
          }),
        ],
      }),
      tiers,
      today,
      '2026-08-20 09:00',
    )
    expect(state.label).toBe('1차 미도달')
    expect(state.needsCheck).toBe(true)
  })

  it('유예 안의 접수 건은 점검 필요로 잡지 않는다', () => {
    const state = targetStateOf(
      target({
        surgeryDate: '2026-08-18',
        scheduleBase: '2026-08-18',
        logs: [
          log({
            templateCode: 'T1',
            status: 'PENDING',
            deliveredAt: '',
            sentAt: '2026-08-20 09:30',
          }),
        ],
      }),
      tiers,
      today,
      '2026-08-20 09:00',
    )
    expect(state.label).toBe('1차 접수')
    expect(state.needsCheck).toBe(false)
  })

  it('세 차수가 모두 도달해야 완료다', () => {
    const state = targetStateOf(
      target({
        logs: [
          log({ templateCode: 'T1' }),
          log({ id: 2, templateCode: 'T2' }),
          log({ id: 3, templateCode: 'T3' }),
        ],
      }),
      tiers,
      today,
    )
    expect(state.label).toBe('완료')
    expect(state.bucket).toBe('발송')
  })
})

describe('차수 칸 판정', () => {
  const today = '2026-08-20'

  it('도달했으면 도달 시각을 진한 검정으로 보여준다', () => {
    const cell = tierCellOf(target({ logs: [log()] }), 7, 'T1', today)
    expect(cell.text).toBe('08-13 09:01')
    expect(cell.label).toBe('도달')
    expect(cell.className).toContain('text-gray-900')
  })

  it('막 나간 건은 접수 — 결과가 아직 안 올 시간이라 점검 대상이 아니다', () => {
    // 도달 결과는 통신사 회신 뒤에 확정된다. 이걸 곧바로 미도달로 찍으면
    // 발송 당일엔 잘 나간 건까지 전부 점검 대상으로 보인다.
    const cell = tierCellOf(
      target({
        logs: [
          log({
            status: 'PENDING',
            deliveredAt: '',
            sentAt: '2026-08-20 10:30',
          }),
        ],
      }),
      7,
      'T1',
      today,
      '2026-08-20 09:40',
    )
    expect(cell.label).toBe('접수')
    expect(cell.className).not.toContain('amber')
  })

  it('유예 시간이 지나도 도달이 없으면 미도달(주황)이다', () => {
    const cell = tierCellOf(
      target({
        logs: [
          log({
            status: 'PENDING',
            deliveredAt: '',
            sentAt: '2026-08-20 08:00',
          }),
        ],
      }),
      7,
      'T1',
      today,
      '2026-08-20 09:40',
    )
    expect(cell.label).toBe('미도달')
    expect(cell.className).toContain('amber')
  })

  it('예정일이 지났는데 이력이 없으면 미발송(빨강) — 점검해야 할 칸이다', () => {
    // 기준일 08-06 + 7 = 08-13 이고 오늘은 08-20 이라 이미 지났다.
    const cell = tierCellOf(target(), 7, 'T1', today)
    expect(cell.text).toBe('08-13')
    expect(cell.label).toBe('미발송')
    expect(cell.className).toContain('text-red-500')
  })

  it('아직 예정일 전이면 회색 예정이다', () => {
    const cell = tierCellOf(target(), 21, 'T3', today)
    expect(cell.label).toBe('예정')
    expect(cell.className).toContain('text-gray-400')
  })

  it('홀딩·발송 불가는 예정일이 지나도 빨강이 아니라 제외로 둔다', () => {
    // 의도적으로 막은 건이라 "놓친 발송"으로 표시하면 신호가 죽는다.
    expect(tierCellOf(target({ status: 'HOLD' }), 7, 'T1', today).label).toBe(
      '제외',
    )
    expect(
      tierCellOf(target({ phoneValid: false }), 7, 'T1', today).label,
    ).toBe('제외')
  })

  it('예정일은 수술일이 아니라 기준일에서 센다(재조정된 행)', () => {
    // 홀딩 해제·연락처 수정으로 기준일이 밀리면 예정일도 함께 밀려야 한다.
    const cell = tierCellOf(
      target({ scheduleBase: '2026-08-16' }),
      7,
      'T1',
      today,
    )
    expect(cell.text).toBe('08-23')
    expect(cell.label).toBe('예정')
  })

  it('알림톡이 문자로 대체됐으면 표시한다', () => {
    const cell = tierCellOf(
      target({ logs: [log({ replacement: true, messageType: 'SMS' })] }),
      7,
      'T1',
      today,
    )
    expect(cell.replaced).toBe(true)
  })
})

describe('상태 필터', () => {
  const today = '2026-08-20'
  // 유예 경계를 고정한다 — 실제 시각에 기대면 테스트가 시간에 따라 흔들린다.
  const stateOf = (t: SmsTarget) =>
    targetStateOf(t, tiers, today, '2026-08-20 09:00')

  it('점검 필요는 실패·미발송·미도달을 묶음 너머로 모은다', () => {
    // 이 셋은 '발송'과 '발송 대기'에 흩어져 있어 기존 탭으로는 한 번에 못 본다.
    const failed = stateOf(target({ logs: [log({ status: 'FAILED' })] }))
    const overdue = stateOf(target()) // 1차 예정일(08-07)이 지났는데 미발송
    const undelivered = stateOf(
      target({
        surgeryDate: '2026-08-18',
        scheduleBase: '2026-08-18',
        logs: [log({ status: 'PENDING', deliveredAt: '' })],
      }),
    )
    for (const state of [failed, overdue, undelivered]) {
      expect(matchesStatusFilter(state, '점검 필요')).toBe(true)
    }
    expect(overdue.bucket).toBe('발송 대기')
    expect(failed.bucket).toBe('발송')
  })

  it('정상 진행·홀딩·수신거부는 점검 필요에 걸리지 않는다', () => {
    const waiting = stateOf(
      target({ surgeryDate: '2026-08-19', scheduleBase: '2026-08-19' }),
    )
    const held = stateOf(target({ status: 'HOLD' }))
    expect(matchesStatusFilter(waiting, '점검 필요')).toBe(false)
    expect(matchesStatusFilter(held, '점검 필요')).toBe(false)
    expect(matchesStatusFilter(held, '발송 중지')).toBe(true)
  })

  it('발송 불가(번호 무효)는 자기 탭과 점검 필요 양쪽에 걸린다', () => {
    // 매일 여는 창구가 '점검 필요' 하나라 자기 탭에만 두면 CRM 번호 고칠 사람을 계속 놓친다.
    // 겹치는 카운트 헷갈림보다 놓치는 사고가 크다는 실사용 판단(2026-09-09).
    const unsendable = stateOf(target({ phoneValid: false }))
    expect(matchesStatusFilter(unsendable, '점검 필요')).toBe(true)
    expect(matchesStatusFilter(unsendable, '발송 불가')).toBe(true)
  })

  it('전체는 무엇이든 통과시킨다', () => {
    expect(matchesStatusFilter(stateOf(target()), '전체')).toBe(true)
  })
})
