import type {
  AdSpend,
  ChannelLensCost,
  ReservationChannelFunnelItem,
} from '../../type/api'

/**
 * 채널별 수익성 계산 — 화면에서 떼어 둔다(단위 변환과 귀속 규칙이 대부분이라 테스트가 필요하다).
 *
 * ★ 단위. 서버가 주는 값의 단위가 셋이라 여기서 한 번만 맞춘다.
 *     surgeryAmount   원   (COSTPRICE 수납액)
 *     lensCostManwon  만원 (사람이 입력한 렌즈 단가 × 안수)
 *     amountManwon    만원 (사람이 입력한 광고비)
 *   내부 계산은 전부 **만원**으로 통일하고, 억 표시는 표시 함수가 한다.
 *
 * ★ 공헌이익(렌즈만) = 수납액 − 렌즈 매입원가.
 *   이름에 범위를 박아 둔 이유 — 변동비 중 렌즈 하나만 뺀 값이라 회계상 공헌이익이 아니다.
 *   약품·수술재료·결제수수료·건별 인센티브는 원가 데이터가 없어 빠져 있고, 그만큼 실제보다 높다.
 *   빠진 비용은 대체로 수술 건수에 비례하므로 **채널 간 비교**는 유효하고 절대값은 믿으면 안 된다.
 *   나중에 원가 항목이 들어오면 라벨의 '(렌즈만)' 만 떼면 된다.
 *
 *   인건비·활동원가는 데이터가 생겨도 넣지 않는다 —
 *   순매출의 0.2% 규모라 채널 순위를 바꾸지 못하는데(예약 11,076건 × 4,200원 ≈ 4,650만원
 *   vs 순매출 215억), 소요시간 측정 데이터가 없어 가정을 숫자로 포장하게 된다.
 *
 * ★ 할인·환불은 빼지 않는다. CRM 에 기록되지 않는다 —
 *   2026-01~08 수술 6,521명·수납 15,590행 전수 확인 결과 PrcDicPrc·PrcRfdPrc 가 전부 0원이고
 *   정가합(215.7억) ≈ 실납부합(215.6억) 이다. 즉 수납액이 곧 순매출이다.
 */

/**
 * 코호트 성숙도 — 이 화면은 **예약 코호트**다.
 * "그 달에 예약한 사람이 (언제든) 수술까지 갔나" 를 세므로, 최근 달일수록 아직 수술 전인
 * 사람이 많아 전환율·수납액·ROAS 가 구조적으로 낮게 나온다. 그걸 실적 악화로 읽으면 오판이다.
 *
 * 관찰기간을 90일 같은 임의값으로 두지 않고 **실측 분포**로 정했다.
 * 2026-01~06 코호트 5,008건의 예약등록일 → 수술일 소요:
 *   평균 13.9일 · p50 7일 · p80 21일 · p90 33일 · p95 47일
 * 즉 월말로부터 47일이 지나면 그 달 코호트의 95% 가 이미 수술을 마쳤다.
 */
export const COHORT_DAYS = { p80: 21, p90: 33, p95: 47 } as const

export interface CohortMaturity {
  level: 'final' | 'near' | 'watching' | 'early'
  label: string
  note: string
}

/** 월말로부터 며칠 지났는지로 성숙도를 판정한다. today 를 인자로 받아 테스트 가능하게 둔다. */
export function cohortMaturity(ym: string, today: Date): CohortMaturity {
  const [y, m] = ym.split('-').map(Number)
  const monthEnd = new Date(y, m, 0)
  const days = Math.floor((today.getTime() - monthEnd.getTime()) / 86400000)
  if (days >= COHORT_DAYS.p95) {
    return {
      level: 'final',
      label: '성과 확정',
      note: `월말 +${days}일 — 이 달 코호트의 95% 이상이 수술을 마쳤습니다.`,
    }
  }
  if (days >= COHORT_DAYS.p90) {
    return {
      level: 'near',
      label: '거의 확정',
      note: `월말 +${days}일 — 약 90%가 수술을 마쳤습니다. 남은 건이 반영되면 수치가 조금 올라갑니다.`,
    }
  }
  if (days >= COHORT_DAYS.p80) {
    return {
      level: 'watching',
      label: '관찰 중',
      note: `월말 +${days}일 — 약 80%만 수술을 마쳤습니다. 전환율·ROAS 가 실제보다 낮게 보입니다.`,
    }
  }
  return {
    level: 'early',
    label: '미성숙 코호트',
    note:
      days < 0
        ? '진행 중인 달입니다. 예약한 사람의 상당수가 아직 수술 전이라 전환율·ROAS 를 다른 달과 비교하면 안 됩니다.'
        : `월말 +${days}일 — 아직 수술 전인 사람이 많습니다(중앙값 7일·95% 47일). 전환율·ROAS 를 다른 달과 비교하면 안 됩니다.`,
  }
}

/** 표본 임계 — 이 아래는 순위·색상 평가에서 뺀다. 렌즈 환자 몇 명이 객단가를 좌우한다. */
export const SAMPLE_LOW = 30
/** 표본 주의 — 30~99명. 값은 보여주되 신뢰도를 낮게 본다. */
export const SAMPLE_WARN = 100

/** 광고 상품 → 성과를 귀속시킬 채널. 귀속 근거가 없으면 null(= ROAS 산출 보류). */
export const AD_MEDIA_META: {
  media: string
  label: string
  sub: string
  channel: string | null
  /** 귀속 불가 사유. null 이면 예약경로·내원동기로 추정 가능하다는 뜻이다. */
  blockedReason: string | null
  /**
   * 귀속 수준. '광고 직접 귀속' 은 캠페인·클릭 ID·UTM·광고 전용 번호처럼
   * **유료 클릭을 증명하는 식별자**가 있을 때만 쓸 수 있다. 지금은 어느 매체도 없다.
   */
  attribution: string
  /** 그 추정이 무엇을 포함해 버리는지 — 화면 툴팁으로 그대로 내보낸다. */
  attributionNote: string
  badge: string
}[] = [
  {
    media: 'naver_reserve',
    label: '네이버 예약광고',
    sub: '네이버 · 예약 상품',
    channel: '네이버',
    blockedReason: null,
    // RESERVE_PATH='NAVER' 는 '네이버에서 예약했다' 이지 '예약광고를 클릭했다' 가 아니다.
    // 자연검색·지도·플레이스·재방문 환자도 네이버 예약을 쓴다.
    attribution: '예약경로 기반 추정',
    attributionNote:
      '네이버 예약 이용자를 광고 성과로 추정합니다. 자연검색·지도·재방문 유입이 섞여 있어 실제 광고 기여보다 크게 잡힐 수 있습니다.',
    badge: 'N',
  },
  {
    media: 'naver_search',
    label: '네이버 검색광고',
    sub: '네이버 · 검색 상품',
    channel: null,
    attribution: '귀속 불가',
    attributionNote:
      '유입이 여러 채널로 흩어져 매출을 붙일 수 없습니다. 비용만 기록합니다.',
    // 2026-01~08 실측: 포털 유입으로 보이는 내원동기 1,582건 중 네이버 채널에 잡힌 건 440건뿐이고
    // 나머지는 홈페이지·인콜·아웃콜로 흩어진다. 분모는 광고비 전액인데 분자는 일부라
    // ROAS 를 내면 네이버가 실제보다 나쁘게 나오고, 그 숫자로 예산을 줄이면 오판이다.
    blockedReason:
      '검색광고 유입이 홈페이지·인콜·네이버 예약으로 분산되어 매출 귀속이 불가능합니다.',
    badge: 'N',
  },
  {
    media: 'modoodoc',
    label: '모두닥 광고',
    sub: '모두닥 · 제휴 상품',
    channel: '모두닥',
    blockedReason: null,
    // 내원동기(중)='모두닥' 은 환자 자기신고다. 유료 리드인지 자연 노출인지 구분되지 않는다.
    attribution: '내원동기 기반 추정',
    attributionNote:
      '환자가 내원동기에 모두닥이라 적은 건을 광고 성과로 추정합니다. 유료 리드 여부는 구분되지 않습니다.',
    badge: 'M',
  },
]

export interface ChannelProfitRow {
  channel: string
  /** 실제 수술일이 있는 사람 */
  surgeryDone: number
  /** 수납액(만원) */
  revenueManwon: number
  /** 객단가(만원). 분모는 수납이 실제로 잡힌 사람 — 수술 전인 사람을 넣으면 낮게 나온다 */
  arpuManwon: number | null
  /** 예약 → 수술완료 전환율(%) */
  convRate: number | null
  /** 렌즈삽입률(%) — 렌즈 안수 ÷ 수술완료 인원. 양안이면 100%를 넘을 수 있다 */
  lensRate: number | null
  lensCostManwon: number
  /** 단가 미입력 안수. 0 보다 크면 렌즈원가·공헌이익이 미완성이다 */
  lensUnpricedEyes: number
  /** 공헌이익(만원). 렌즈원가가 미완성이면 null */
  contribManwon: number | null
  /** 공헌이익률(%) */
  contribRate: number | null
  reop: number
  /** 표본 등급 */
  grade: 'low' | 'warn' | 'ok'
}

const pct = (num: number, den: number): number | null =>
  den > 0 ? (num / den) * 100 : null

/** 채널 행 조립. 퍼널 API + 렌즈원가 API 를 채널명으로 잇는다. */
export function buildChannelRows(
  funnel: ReservationChannelFunnelItem[],
  lens: ChannelLensCost[],
): ChannelProfitRow[] {
  const lensBy = new Map(lens.map((l) => [l.channel, l]))

  return funnel.map((f) => {
    const l = lensBy.get(f.channel)
    const revenueManwon = Math.round(f.surgeryAmount / 10000)
    const lensCostManwon = l?.lensCostManwon ?? 0
    const unpriced = l?.lensEyesUnpriced ?? 0
    // 단가가 하나라도 비어 있으면 공헌이익을 내지 않는다.
    // 0 을 원가로 쓰면 공헌이익이 실제보다 커 보이고, 그게 광고 예산 결정으로 이어진다.
    const contribManwon = unpriced > 0 ? null : revenueManwon - lensCostManwon

    return {
      channel: f.channel,
      surgeryDone: f.surgeryDonePersons,
      revenueManwon,
      arpuManwon:
        f.surgeryPaidPersons > 0
          ? Math.round(revenueManwon / f.surgeryPaidPersons)
          : null,
      convRate: pct(f.surgeryDonePersons, f.reservedPersons),
      lensRate: pct(l?.lensEyes ?? 0, f.surgeryDonePersons),
      lensCostManwon,
      lensUnpricedEyes: unpriced,
      contribManwon,
      contribRate:
        contribManwon === null ? null : pct(contribManwon, revenueManwon),
      reop: f.reopPersons,
      grade:
        f.surgeryDonePersons < SAMPLE_LOW
          ? 'low'
          : f.surgeryDonePersons < SAMPLE_WARN
            ? 'warn'
            : 'ok',
    }
  })
}

export interface AdEfficiencyRow {
  media: string
  label: string
  sub: string
  badge: string
  channel: string | null
  blockedReason: string | null
  attribution: string
  attributionNote: string
  adManwon: number
  /** 귀속 채널의 예약·수술완료·수납액·공헌이익. 귀속 불가면 전부 null */
  reserved: number | null
  surgeryDone: number | null
  convRate: number | null
  /** 예약 CPA(만원) = 광고비 ÷ 귀속 예약 */
  cpaReserved: number | null
  /** 수술 CPA(만원) = 광고비 ÷ 귀속 수술완료 */
  cpaSurgery: number | null
  revenueRoas: number | null
  contribRoas: number | null
}

/** 광고 상품 행 조립. 귀속 채널이 없거나 광고비가 0이면 효율 지표는 null 이다. */
export function buildAdRows(
  funnel: ReservationChannelFunnelItem[],
  rows: ChannelProfitRow[],
  adSpend: AdSpend[],
): AdEfficiencyRow[] {
  const spendBy = new Map(adSpend.map((a) => [a.media, a.amountManwon]))
  const funnelBy = new Map(funnel.map((f) => [f.channel, f]))
  const rowBy = new Map(rows.map((r) => [r.channel, r]))

  return AD_MEDIA_META.map((m) => {
    const adManwon = spendBy.get(m.media) ?? 0
    const f = m.channel ? funnelBy.get(m.channel) : undefined
    const r = m.channel ? rowBy.get(m.channel) : undefined
    const ratio = (v: number | null | undefined) =>
      adManwon > 0 && typeof v === 'number' ? v / adManwon : null

    return {
      media: m.media,
      label: m.label,
      sub: m.sub,
      badge: m.badge,
      channel: m.channel,
      blockedReason: m.blockedReason,
      attribution: m.attribution,
      attributionNote: m.attributionNote,
      adManwon,
      reserved: f?.reservedPersons ?? null,
      surgeryDone: f?.surgeryDonePersons ?? null,
      convRate: f ? pct(f.surgeryDonePersons, f.reservedPersons) : null,
      cpaReserved:
        f && adManwon > 0 && f.reservedPersons > 0
          ? adManwon / f.reservedPersons
          : null,
      cpaSurgery:
        f && adManwon > 0 && f.surgeryDonePersons > 0
          ? adManwon / f.surgeryDonePersons
          : null,
      revenueRoas: ratio(r?.revenueManwon),
      contribRoas: ratio(r?.contribManwon),
    }
  })
}

/* ── 표시 헬퍼 ── */

export const fmtInt = (n: number) => n.toLocaleString('ko-KR')

/** 만원 → 억 표기. 1억 미만은 소수 둘째자리까지 남겨 0.4억이 0억이 되지 않게 한다. */
export const fmtEok = (manwon: number | null | undefined): string => {
  if (typeof manwon !== 'number') return '—'
  const eok = manwon / 10000
  return eok < 1 ? eok.toFixed(2) : eok.toFixed(1)
}

export const fmtPct = (v: number | null | undefined, digits = 1): string =>
  typeof v === 'number' ? `${v.toFixed(digits)}%` : '—'

export const fmtRatio = (v: number | null | undefined): string =>
  typeof v === 'number' ? `${v.toFixed(1)}배` : '—'
