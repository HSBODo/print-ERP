import type { SmsTarget, SmsTemplate, SmsTemplateGroup } from '@/api/sms'

/**
 * 문자 발송 관리 표의 **읽는 규칙**만 모은 곳 — 화면 컴포넌트에서 분리했다.
 * 색·라벨·판정이 한곳에 있어야 "설명과 실제가 다른" 사고가 안 난다.
 */

const pad = (n: number) => String(n).padStart(2, '0')
export const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const todayIso = () => toIso(new Date())
/** 기본 조회일 = D-1. 당일은 수술이 아직 마트에 안 실려 있어 기준으로 쓰지 않는다. */
export const yesterdayIso = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return toIso(d)
}
export const toMonthValue = (iso: string) => iso.slice(0, 7)
export const toMonthStart = (month: string) => `${month}-01`
export const toMonthEnd = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return `${month}-${pad(new Date(y, m, 0).getDate())}`
}
const addDays = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toIso(d)
}
const md = (iso: string) => iso.slice(5, 10)

/**
 * 수술 종류 이름표 — 코드는 마트 surgery_op_type() 이 정한다(분류 규칙의 정본).
 *
 * 표에는 더 이상 이 이름을 찍지 않는다(2026-08-14 「수술 분류」로 교체). 지금 쓰는 곳은
 * 셀 툴팁·분류 도움말·템플릿 안내처럼 **정확한 시술명이 필요한 자리**뿐이다.
 *
 * short  좁은 자리용 짧은 이름(백내장(다초점) → 다초점).
 * full   툴팁용 정식 이름. 채널별 분석 화면과 같은 표기를 쓴다.
 */
export const OP_TYPE_META: Record<string, { short: string; full: string; className: string }> = {
  smilePro:  { short: '스마일프로',   full: '스마일프로',       className: 'bg-blue-50 text-blue-700' },
  smile:     { short: '스마일',       full: '스마일',           className: 'bg-blue-50 text-blue-700' },
  lasek:     { short: '라섹',         full: '라섹',             className: 'bg-blue-50 text-blue-700' },
  lasik:     { short: '라식',         full: '라식',             className: 'bg-blue-50 text-blue-700' },
  presbyond: { short: '프레스비욘드', full: '프레스비욘드',     className: 'bg-blue-50 text-blue-700' },
  tIcl:      { short: 'T-ICL',        full: 'T-ICL',            className: 'bg-amber-50 text-amber-700' },
  icl:       { short: 'ICL',          full: 'ICL',              className: 'bg-amber-50 text-amber-700' },
  tKpl:      { short: 'T-KPL',        full: 'T-KPL',            className: 'bg-amber-50 text-amber-700' },
  kpl:       { short: 'KPL',          full: 'KPL',              className: 'bg-amber-50 text-amber-700' },
  viva:      { short: 'VIVA',         full: 'VIVA',             className: 'bg-amber-50 text-amber-700' },
  catMulti:  { short: '다초점',       full: '백내장(다초점)',   className: 'bg-violet-50 text-violet-700' },
  catEdof:   { short: '연속초점',     full: '백내장(연속초점)', className: 'bg-violet-50 text-violet-700' },
  catMono:   { short: '단초점',       full: '백내장(단초점)',   className: 'bg-violet-50 text-violet-700' },
  reopLens:  { short: '렌즈',         full: '재수술(렌즈)',     className: 'bg-fuchsia-50 text-fuchsia-700' },
  reopLaser: { short: '레이저',       full: '재수술(레이저)',   className: 'bg-fuchsia-50 text-fuchsia-700' },
  other:     { short: '기타',         full: '기타',             className: 'bg-gray-100 text-gray-600' },
}

/**
 * 발송 분류 배지 — 이 화면이 사람을 가르는 단위다.
 *
 * 분류 = **같은 문구가 같은 시점에 나가는 묶음**이고, 코드는 서버의 SurgeryGroup 과 같다
 * (SMILE·LASIK·LASEK·ICL·ETC). 수술 종류 15종으로 나누면 스마일프로/스마일라식처럼
 * 똑같은 문구를 받는 사람이 갈라져 필터가 길어지기만 한다. 정확한 시술명은
 * 셀 툴팁과 우/좌안 컬럼에 그대로 남는다.
 *
 * label 은 템플릿 화면과 같은 말로 적는다(서버 라벨 '스마일수술' → 표에서는 '스마일').
 */
export const GROUP_META: Record<string, { label: string; className: string }> = {
  SMILE: { label: '스마일',   className: 'bg-blue-50 text-blue-700' },
  LASIK: { label: '라식',     className: 'bg-indigo-50 text-indigo-700' },
  LASEK: { label: '라섹',     className: 'bg-teal-50 text-teal-700' },
  ICL:   { label: '렌즈삽입', className: 'bg-amber-50 text-amber-700' },
  ETC:   { label: '기타',     className: 'bg-gray-100 text-gray-600' },
}
const UNKNOWN_GROUP = { label: '기타', className: 'bg-gray-100 text-gray-600' }

/**
 * 이 대상에게 적용되는 그룹 슬롯을 찾는다.
 *
 * 수술마다 회복 속도가 달라 **1차 시점과 문구가 다르다**(스마일 D+1 · 렌즈삽입 D+3 · 라섹 D+5).
 * 그룹 판정은 서버가 내려준 opTypes 목록으로만 한다 — 화면이 수술명을 다시 해석하면
 * 서버와 규칙이 두 벌이 되어 언젠가 어긋난다.
 * 어디에도 없으면 ETC(opTypes 가 빈 그룹)로 떨어진다.
 */
export const groupSlotOf = (tier: SmsTemplate, opType: string): SmsTemplateGroup | undefined =>
  tier.groups.find((g) => g.opTypes.includes(opType))
  ?? tier.groups.find((g) => g.groupCode === 'ETC')

/**
 * 이 행의 발송 분류. 매핑 정본은 서버가 내려준 templates[].groups[].opTypes 다
 * (화면에 또 적어 두면 서버가 그룹을 바꿨을 때 표만 옛 상태로 남는다).
 *
 * 템플릿을 아직 못 받았으면 null — 표는 그때 '—' 를 찍는다. 전부 '기타'로 단정하면
 * 설정이 안 읽힌 상태와 진짜 기타(백내장·재수술)가 구분되지 않는다.
 */
export const groupOf = (templates: SmsTemplate[], opType: string) => {
  const tier = templates[0]
  if (!tier) return null
  const code = groupSlotOf(tier, opType)?.groupCode ?? 'ETC'
  return { code, ...(GROUP_META[code] ?? UNKNOWN_GROUP) }
}

/** 조회 결과에 실제로 있는 분류만, 서버가 준 순서(스마일→라식→라섹→렌즈삽입→기타)로. */
export const groupOptionsOf = (templates: SmsTemplate[], targets: SmsTarget[]) => {
  const present = new Set(targets.map((t) => groupOf(templates, t.opType)?.code))
  return (templates[0]?.groups ?? [])
    .filter((g) => present.has(g.groupCode))
    .map((g) => ({ code: g.groupCode, ...(GROUP_META[g.groupCode] ?? { label: g.groupLabel, className: UNKNOWN_GROUP.className }) }))
}

/** 분류 도움말 — 어떤 시술이 어느 분류로 들어가는지. 배지를 고치면 설명이 함께 따라온다. */
export const groupHelpOf = (templates: SmsTemplate[]) =>
  (templates[0]?.groups ?? []).map((g) => ({
    code: g.groupCode,
    ...(GROUP_META[g.groupCode] ?? { label: g.groupLabel, className: UNKNOWN_GROUP.className }),
    // opTypes 가 빈 그룹(ETC)은 "그 외 전부"라 나열할 목록이 없다.
    items: g.opTypes.map((t) => OP_TYPE_META[t]?.short ?? t),
  }))

/** 이 대상의 그 차수 오프셋(일). 슬롯을 못 찾으면 0 — 예정일이 기준일과 같아져 눈에 띈다. */
export const offsetOf = (tier: SmsTemplate, opType: string): number =>
  groupSlotOf(tier, opType)?.offsetDays ?? 0

export const isHeld = (t: SmsTarget) => t.status !== 'SENDABLE'

/**
 * 대상 상태 — 사람 한 줄에 **지금 볼 것 하나**만 찍는다.
 *
 * 1~3차가 있어서 '발송'·'발송 대기' 두 마디로는 **몇 차가 문제인지**를 못 읽는다.
 * 그래서 표시 문구에 차수를 붙이되, **볼 것이 있을 때만** 붙인다 —
 * 기본 조회가 D-1 이라 대부분이 '1차 대기'라 그것까지 적으면 컬럼이 같은 글자로 도배되고,
 * 그러면 숫자가 신호로 안 읽힌다. 즉 **숫자가 보이면 확인할 것이 있다**는 뜻이다.
 *
 * 우선순위(급한 순) — 발송 불가 · 홀딩 · 실패 · 미발송 · 미도달 · 대기 · 완료.
 *
 * 차수 판정은 tierCellOf 를 그대로 쓴다. 규칙을 따로 쓰면 상태 칸과 차수 칸이 언젠가 어긋나
 * "상태는 완료인데 3차가 빨강"인 표가 된다.
 *
 * ⚠️ bucket 은 **필터가 쓰는 옛 4분류**다. 필터까지 차수로 쪼개면 탭이 여덟 개가 되어
 * 고르기가 더 어려워진다 — 세분은 표시에서만 하고, 필터에는 상태를 가로지르는
 * `점검 필요`(needsCheck) 하나만 더 둔다.
 */
export const STATE_UNSENDABLE = '발송 불가'

export type StatusBucket = '발송 대기' | '발송' | '발송 홀딩' | '수신거부' | typeof STATE_UNSENDABLE

export type TargetState = {
  /** 표에 찍는 문구. 예 '대기' · '2차 대기' · '1차 실패' · '완료' */
  label: string
  /** 상태 필터가 세는 묶음 — 전과 같은 4분류. */
  bucket: StatusBucket
  /**
   * 사람이 손봐야 하는 행(실패·미발송·미도달) — 표에서 빨강·오렌지로 찍히는 것들.
   * 이 셋은 서로 다른 묶음에 흩어져 있어 bucket 으로는 한 번에 못 모은다.
   * (발송 불가는 자기 탭이 따로 있어 여기 넣지 않는다 — 두 탭에 겹쳐 나오면 헷갈린다.)
   */
  needsCheck: boolean
  className: string
  /** 사람이 되돌릴 수 없는 상태(번호 문제) — 홀딩 토글 대상이 아니다. */
  locked: boolean
  title: string
}

const STATE_STYLE = {
  optOut:     'bg-slate-200 text-slate-700',
  unsendable: 'bg-red-50 text-red-600',
  hold:       'bg-amber-50 text-amber-700 hover:bg-amber-100',
  alert:      'bg-red-50 text-red-600 hover:bg-red-100',
  undelivered:'bg-orange-50 text-orange-600 hover:bg-orange-100',
  done:       'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  running:    'bg-blue-50 text-blue-700 hover:bg-blue-100',
  idle:       'bg-gray-100 text-gray-600 hover:bg-gray-200',
} as const

export const targetStateOf = (
  t: SmsTarget, tiers: SmsTemplate[] = [], today = '',
  graceFrom = stampMinutesAgo(DELIVERY_GRACE_MINUTES),
): TargetState => {
  // 수신거부는 홀딩보다 앞이다 — 홀딩은 이 건 하나지만 거부는 사람 단위라 풀 수 있는 값이 아니다.
  // (해제는 수신거부 목록에서 빼야 한다. 상태 알약을 눌러 되돌리는 값이 아니라 잠가 둔다.)
  if (t.optedOut) {
    return {
      label: '수신거부', bucket: '수신거부', needsCheck: false, className: STATE_STYLE.optOut, locked: true,
      title: '수신거부한 번호입니다. 다음 수술에도 발송되지 않습니다 — 해제는 수신거부 목록에서 합니다.',
    }
  }
  if (!t.phoneValid) {
    return {
      label: STATE_UNSENDABLE, bucket: STATE_UNSENDABLE, needsCheck: false, className: STATE_STYLE.unsendable, locked: true,
      title: '유효한 휴대폰 번호가 없어 보낼 수 없습니다. CRM 에서 번호를 고친 뒤 다시 [조회]하세요.',
    }
  }
  if (isHeld(t)) {
    return {
      label: '홀딩', bucket: '발송 홀딩', needsCheck: false, className: STATE_STYLE.hold, locked: false,
      title: '보내지 않기로 한 대상입니다. 클릭하면 홀딩을 풉니다.',
    }
  }

  // 필터 묶음은 예전 규칙 그대로 — 한 번이라도 보냈으면 '발송', 아니면 '발송 대기'.
  const bucket: StatusBucket = t.logs.length > 0 ? '발송' : '발송 대기'
  const cells = tiers.map((tier) => ({
    no: tier.tier, cell: tierCellOf(t, offsetOf(tier, t.opType), tier.code, today, graceFrom),
  }))
  const at = (label: string) => cells.find((c) => c.cell.label === label)
  const state = (label: string, className: string, title: string, needsCheck = false): TargetState =>
    ({ label, bucket, needsCheck, className, locked: false, title })

  const failed = at('실패')
  if (failed) return state(`${failed.no}차 실패`, STATE_STYLE.alert, failed.cell.title, true)
  const overdue = at('미발송')
  if (overdue) return state(`${overdue.no}차 미발송`, STATE_STYLE.alert, overdue.cell.title, true)
  const undelivered = at('미도달')
  if (undelivered) return state(`${undelivered.no}차 미도달`, STATE_STYLE.undelivered, undelivered.cell.title, true)
  // 막 나간 건 — 결과를 기다리는 중이라 점검 대상이 아니다.
  const accepted = at('접수')
  if (accepted) return state(`${accepted.no}차 접수`, STATE_STYLE.running, accepted.cell.title)

  const next = at('예정')
  if (next) {
    // 1차 대기는 갓 등록된 정상 상태라 차수를 붙이지 않는다.
    return next.no <= 1
      ? state('대기', STATE_STYLE.idle, next.cell.title)
      : state(`${next.no}차 대기`, STATE_STYLE.running, `${next.no - 1}차까지 나갔고 ${next.cell.title.replace('발송 예정 ', '')} 에 ${next.no}차가 나갑니다`)
  }
  if (cells.length > 0 && cells.every((c) => c.cell.label === '도달')) {
    return state('완료', STATE_STYLE.done, `1~${cells.length}차 모두 도달했습니다`)
  }

  // 템플릿을 못 받았거나(차수를 모른다) 판정할 칸이 없을 때 — 옛 두 마디로 물러선다.
  return bucket === '발송'
    ? state('발송', STATE_STYLE.running, '발송 이력이 있습니다')
    : state('대기', STATE_STYLE.idle, '아직 발송하지 않았습니다')
}

/**
 * 상태 필터 — **묶음(bucket) 기준**이라 차수로 쪼개지 않는다.
 * 표시 문구('2차 미도달')는 세분돼도 필터는 '발송' 하나로 걸린다.
 *
 * `점검 필요` 만 예외로 묶음을 가로지른다. 이 화면에서 사람이 매일 하는 판단이
 * "오늘 손봐야 할 게 있나?" 하나인데, 실패·미발송·미도달이 '발송'과 '발송 대기'에
 * 흩어져 있어 기존 탭으로는 한 번에 못 모은다.
 *
 * `수신거부` 는 홀딩과 나눠 둔다 — 둘 다 "안 나간다"지만 성격이 다르다.
 * 홀딩은 우리가 이 건만 막은 것이고, 수신거부는 **환자가 거부한 것**이라 되돌릴 값이 아니다.
 * 섞어 두면 "홀딩 해제"를 누르다 거부한 사람까지 되살릴 위험이 있다.
 */
export const STATUS_FILTERS = ['전체', '점검 필요', '발송 대기', '발송', '발송 홀딩', '수신거부', STATE_UNSENDABLE] as const
export type StatusFilter = typeof STATUS_FILTERS[number]

/** 필터 판정은 여기 한 곳에서만 한다 — 화면이 따로 풀어 쓰면 탭과 결과가 어긋난다. */
export const matchesStatusFilter = (state: TargetState, filter: StatusFilter) => {
  if (filter === '전체') return true
  if (filter === '점검 필요') return state.needsCheck
  return state.bucket === filter
}

export const lastLogOf = (target: SmsTarget, templateCode: string) =>
  target.logs.find((log) => log.templateCode === templateCode)

/**
 * 차수 한 칸이 담는 것 — 날짜 하나와 색 하나로 "잘 갔나"를 읽게 한다.
 *   진한 검정  도달 완료(그 날짜가 실제 도달일)
 *   주황       발송은 됐는데 아직 도달 확인 안 됨
 *   빨강       실패, 또는 예정일이 지났는데 아직 안 나감(= 점검해야 할 칸)
 *   회색       아직 예정일 전 · 또는 홀딩·발송 불가라 보낼 대상이 아님
 * 정확한 시각과 채널은 툴팁에 둔다 — 표에 다 펼치면 컬럼이 12개가 되어 오히려 안 보인다.
 */
export type TierCell = {
  text: string
  label: string
  className: string
  title: string
  replaced: boolean
  /** 이 칸이 가리키는 날짜(ISO). 정렬 키로 쓴다. 없으면 빈 문자열 — 정렬에서 맨 뒤로 간다. */
  date: string
  /** 이 대상의 그 차수 오프셋(일). 칸 안에 +N 으로 찍는다. */
  offsetDays: number
}

/**
 * 접수 직후 유예 — 이 시간 안의 PENDING 은 **정상 처리 중**으로 본다.
 *
 * 도달 결과는 통신사 회신 뒤 수 분~수십 분이 지나야 확정된다. 그 사이를 곧바로 '미도달'로
 * 찍으면 발송 당일에는 잘 나간 건까지 전부 점검 대상으로 보여 신호가 죽는다.
 *
 * 120분은 **넉넉하게 잡은 시작값**이다(2026-08-14 결정). 짧게 잡아 정상 건이 점검 목록에
 * 올라오는 쪽이, 길게 잡아 늦게 아는 쪽보다 나쁘다 — 매일 보는 목록이 시끄러워지면
 * 진짜 사고를 못 본다. 실제 도달 회신 시간을 재고 나서 줄인다.
 */
export const DELIVERY_GRACE_MINUTES = 120

/** 'YYYY-MM-DD HH:mm' — 서버 sentAt 과 같은 모양이라 문자열 비교로 앞뒤를 가릴 수 있다. */
export const stampMinutesAgo = (minutes: number, from = new Date()) => {
  const d = new Date(from.getTime() - minutes * 60_000)
  return `${toIso(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export const tierCellOf = (
  t: SmsTarget, offsetDays: number, code: string, today: string,
  /** 유예 경계 시각. 이보다 나중에 나간 건은 아직 결과를 기다릴 때다. */
  graceFrom = stampMinutesAgo(DELIVERY_GRACE_MINUTES),
): TierCell => {
  // 예정일은 수술일이 아니라 **기준일**에서 센다 — 되살아난 행은 기준일이 오늘 쪽으로 밀려 있다.
  const base = t.scheduleBase || t.surgeryDate
  const scheduled = base ? addDays(base, offsetDays) : ''
  const log = lastLogOf(t, code)
  const replaced = Boolean(log?.replacement)

  if (log?.status === 'SUCCESS') {
    const delivered = log.deliveredAt || log.sentAt
    return {
      text: md(delivered), label: '도달', className: 'font-semibold text-gray-900', replaced,
      date: delivered.slice(0, 10), offsetDays,
      title: `도달 ${log.deliveredAt || '(시각 미상)'} · 발송 ${log.sentAt} · ${log.requestedChannel === 'ALIMTALK' ? '알림톡' : '문자'}${replaced ? ' → 문자 대체' : ''}`,
    }
  }
  if (log?.status === 'PENDING') {
    // 막 나간 건은 '접수'다 — 결과가 아직 안 올 시간이라 점검 대상이 아니다.
    const waiting = log.sentAt >= graceFrom
    return {
      text: md(log.sentAt), label: waiting ? '접수' : '미도달',
      className: waiting ? 'text-gray-500' : 'text-amber-600', replaced,
      date: log.sentAt.slice(0, 10), offsetDays,
      title: waiting
        ? `발송 ${log.sentAt} · 접수됨. 도달 결과는 보통 수 분~수십 분 뒤에 확정된다`
        : `발송 ${log.sentAt} · ${DELIVERY_GRACE_MINUTES}분이 지나도 도달이 확인되지 않았다`,
    }
  }
  if (log?.status === 'FAILED') {
    return {
      text: md(log.sentAt), label: '실패', className: 'font-semibold text-red-500', replaced,
      date: log.sentAt.slice(0, 10), offsetDays,
      title: log.failReason || '발송 실패',
    }
  }
  if (!scheduled) return { text: '—', label: '', className: 'text-gray-300', replaced: false, title: '', date: '', offsetDays }
  if (!t.phoneValid || isHeld(t) || t.optedOut) {
    return {
      text: md(scheduled), label: '제외', className: 'text-gray-300 line-through', replaced: false,
      date: scheduled, offsetDays,
      title: `예정 ${scheduled} · ${t.optedOut ? '수신거부' : '홀딩·발송 불가'}라 보내지 않는다`,
    }
  }
  if (scheduled < today) {
    return {
      text: md(scheduled), label: '미발송', className: 'font-semibold text-red-500', replaced: false,
      date: scheduled, offsetDays,
      title: `예정 ${scheduled} — 예정일이 지났는데 아직 발송되지 않았습니다`,
    }
  }
  return { text: md(scheduled), label: '예정', className: 'text-gray-400', replaced: false, title: `발송 예정 ${scheduled}`, date: scheduled, offsetDays }
}

/** 현재 페이지 주변만 번호로, 나머지는 '…' 으로 접는다(수술자 리스트와 같은 모양). */
export function buildPaginationItems(current: number, max: number): (number | string)[] {
  if (max <= 7) return Array.from({ length: max }, (_, i) => i + 1)
  const items: (number | string)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(max - 1, current + 1)
  if (start > 2) items.push('…left')
  for (let i = start; i <= end; i += 1) items.push(i)
  if (end < max - 1) items.push('…right')
  items.push(max)
  return items
}


/* ── 정렬 ── 수술자 리스트와 같은 규칙: 머리글을 누르면 오름차순, 다시 누르면 내림차순. */
export type SortDirection = 'asc' | 'desc'
export type SortState = { key: string; direction: SortDirection } | null

/**
 * 정렬 키로 쓸 값. 문자열은 그대로, 차수 칸은 날짜(ISO)를 쓴다.
 *
 * originalIndex 는 정렬이 안정적이도록 마지막 tiebreaker 로 쓴다 —
 * 같은 값끼리 순서가 매번 바뀌면 표가 흔들려 읽기 어렵다.
 */
export const getSortValue = (
  t: SmsTarget, key: string, originalIndex: number, tiers: SmsTemplate[], today: string,
): string | number => {
  switch (key) {
    case 'no': return originalIndex
    case 'surgeryDate': return t.surgeryDate
    case 'chartNo': return t.chartNo
    case 'name': return t.name
    case 'phone': return t.phone
    case 'surgeryType': return t.surgeryType
    case 'group': return groupOf(tiers, t.opType)?.label ?? ''
    case 'surgeryR': return t.surgeryR
    case 'surgeryL': return t.surgeryL
    case 'state': return targetStateOf(t, tiers, today).label
    default: {
      // 차수 칸(T1~T3) — 그 칸이 가리키는 날짜로 정렬한다.
      const tier = tiers.find((x) => x.code === key)
      if (!tier) return ''
      return tierCellOf(t, offsetOf(tier, t.opType), tier.code, today).date
    }
  }
}

/** 빈 값은 항상 뒤로 보낸다 — 정렬 방향과 무관하게 "값 없음"이 위로 올라오면 성가시다. */
export const compareSortValue = (a: string | number, b: string | number) => {
  const aEmpty = a === '' || a === null || a === undefined
  const bEmpty = b === '' || b === null || b === undefined
  if (aEmpty && bEmpty) return 0
  if (aEmpty) return 1
  if (bEmpty) return -1
  if (typeof a === 'number' && typeof b === 'number') return a - b
  return String(a).localeCompare(String(b), 'ko')
}
