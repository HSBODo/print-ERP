import type { LucideIcon } from 'lucide-react'
import {
  Home, CalendarCheck, Microscope, Stethoscope, Syringe,
  Hospital, Megaphone, Ban, BadgeDollarSign, MoreHorizontal, FileText, Wrench,
  Building2, MessageSquare, Landmark, Globe2, BookOpen,
} from 'lucide-react'

import { matchesDepartment, type AuthUser, type UserDepartment } from '@/stores/auth-session'
import { getStatsPageById, statsPages } from './statsPages'

export { getStatsPageById, statsPages, type StatsPageDefinition } from './statsPages'

const STATS_PAGE_ID_SET = new Set<string>(statsPages.map((page) => page.id))

export type MenuStatus = 'complete' | 'frontend-only' | 'backend-only' | 'pending'

/**
 * 사이드바 트리의 단일 노드. 재귀적으로 children 을 가질 수 있어 다단(3단) 표현이 가능하다.
 *   - kind === 'section': 최상위 섹션(비앤빛·마케팅·해외마케팅·회계·관리자). 자식이 없어도 사이드바에서 제거되지 않는다.
 *   - kind === 'group'  : 확장 가능한 그룹(Report·예약·검사 등). 자식이 모두 숨겨져 비어버리면 자동 제거.
 *   - kind 미지정       : 잎(단일 링크, 예: HOME).
 */
export interface MenuItem {
  id: string
  label: string
  href: string
  icon?: LucideIcon
  children?: MenuItem[]
  status?: MenuStatus
  /** true 이면 ADMIN 롤 사용자에게만 노출 (Sidebar 필터). */
  adminOnly?: boolean
  /**
   * true 이면 ADMIN·DIRECTOR (임원 이상) 만 노출 (Sidebar 필터). MANAGER·STAFF 차단.
   * 회계처럼 임원 열람이 필요한데 시스템 조작 권한과는 무관한 그룹에 쓴다.
   * `adminOnly` 와 배타적 — 둘 다 true 이면 좁은 쪽(adminOnly) 이 우선한다.
   */
  executiveOnly?: boolean
  /**
   * true 이면 "관리자" 배지 대상(개발 완료된 관리자 전용 도구, amber).
   * 미지정이면 "개발중" 배지(WIP, blue) — 완성 전이라 관리자만 검토용 노출 중.
   * admin-section 트리 안 항목은 rawMenuItems 정의 이후 자동 마킹된다.
   */
  adminReal?: boolean
  /**
   * true 이면 SPA 라우팅이 아니라 브라우저 새 탭으로 열림. 정적 HTML(가이드 등) 등
   * TanStack Router 로 처리할 수 없는 링크에 사용.
   */
  external?: boolean
  kind?: 'section' | 'group'
}

/** @deprecated MenuItem 로 통합됨. 하위호환 유지용 별칭. */
export type MenuLink = MenuItem

/**
 * 메뉴별 구현 상태 맵.
 *   complete     — 백엔드 API + 프론트 페이지 모두 연결 완료 (회색 기본)
 *   frontend-only — 프론트 UI만 구현, 목업 데이터로 운영 미리보기 가능 (파랑)
 *   backend-only — 백엔드 API만 완료, 프론트 페이지는 placeholder (주황)
 *   pending      — 백엔드·프론트 모두 미착수 (빨강)
 */
const MENU_STATUS: Record<string, MenuStatus> = {
  'weekly-report': 'complete',
  'monthly-report': 'complete',
  'overall-exam': 'complete',
  'overall-exam-weekly': 'complete',
  'reservation': 'complete',
  'reservation-overall': 'complete',
  'reservation-stats-system': 'complete',
  'reservation-stats-cataract': 'complete',
  'reservation-list': 'complete',
  'reservation-channel': 'complete',
  'channel-profit': 'complete',
  // 조회가 없는 정적 분석 문서다. 수치가 본문에 박혀 있어 API 없이도 완결이라 'complete'.
  'channel-analysis': 'complete',
  'sms': 'complete',
  // 소스(legacy.datasource.url) 미설정 환경에서는 503 — 다른 통계 페이지가 데이터소스 부재 시
  // 503 을 주는 것과 동일한 패턴이라 'complete' 가 맞다(상태는 구현 완료 여부를 뜻한다).
  'reservation-list-homepage': 'complete',
  'reservation-change': 'complete',
  'exam-list': 'complete',
  'cataract-exam-list': 'complete',
  'all-exam-list': 'complete',
  'eoeis-checkup': 'complete',
  'examination': 'complete',
  'procedure-exam': 'complete',
  'consultation-rate': 'complete',
  'cataract-reservation-rate': 'complete',
  'stop-rate': 'complete',
  'stop-reason': 'complete',
  'surgery-list': 'complete',
  'surgery': 'complete',
  'surgery-ratio': 'complete',
  'surgery-composition': 'complete',
  'accumulated-eyes': 'complete',
  'outpatient-list': 'complete',
  'outpatient-count': 'complete',
  'overseas-marketing-receptions': 'complete',
  'overseas-marketing-statistics': 'complete',
  'overseas-reservation-stats': 'complete',
  'marketing': 'pending',
  'cancel-rate': 'pending',
  'no-show-rate': 'pending',
  'unit-price': 'pending',
  'accounting-medical': 'complete',
  'accounting-vision': 'complete',
  'accounting-vision-summary': 'complete',
  'accounting-vision-chart': 'complete',
  'accounting-medical-chart': 'complete',
  'dreamlens-revenue': 'complete',
  'b2b-revenue': 'complete',
  'staff-point': 'pending',
  'prp-rate': 'pending',
  'reoperation-rate': 'pending',
  'same-day-op': 'pending',
  'designated-doctor': 'pending',
  'visit-reason': 'pending',
  'daily-reception': 'pending',
  'batch-management': 'complete',
  'account-management': 'complete',
}

/** 메뉴 구현 상태 조회 (router의 운영 빌드 pending 라우트 차단 등에 사용). */
export const getMenuStatus = (id: string): MenuStatus => MENU_STATUS[id] ?? 'pending'
export const hasExplicitMenuStatus = (id: string): boolean =>
  Object.prototype.hasOwnProperty.call(MENU_STATUS, id)
export const getMenuStatusIds = (): string[] => Object.keys(MENU_STATUS)

/**
 * ADMIN 롤 전용 페이지. 사이드바 숨김 + 직접 URL 접근도 placeholder 로 차단(pageRegistry.isRouteBlocked).
 * admin-group 아래의 페이지들 및 그 밖의 관리자 전용 통계와 항상 동기화.
 *
 * SMS 는 § SMS 5-2 완화 이후 STAFF 개방됐다 — 부서 gate 로만 판정 (MARKETING 전용).
 */
const ADMIN_ONLY_PAGE_IDS = new Set<string>([
  'batch-management',
  'account-management',
  'overall-exam',
  'overall-exam-weekly',
  'consultation-rate',
  'exam-list',
  'cataract-exam-list',
  'eoeis-checkup',
  'surgery',
])
export const isAdminOnlyPage = (id: string): boolean => ADMIN_ONLY_PAGE_IDS.has(id)

/**
 * 임원 이상 (ADMIN·DIRECTOR) 전용 페이지.
 * MANAGER·STAFF 에게는 사이드바 숨김 + 직접 URL 접근도 placeholder 차단.
 *
 * 2026-09-17: 회계 5종을 여기로 이동. 백엔드 SecurityConfig `/api/accounting/**` 매처도
 * `hasAnyRole("ADMIN","DIRECTOR")` 로 함께 개방 (대칭 유지).
 */
const EXECUTIVE_ONLY_PAGE_IDS = new Set<string>([
  // 회계 5종 — 마트(list_medical_receipt·list_vision_receipt) + /api/accounting 연동 완료(2026-09-15).
  'accounting-medical',
  'accounting-vision',
  'accounting-vision-summary',
  'accounting-vision-chart',
  'accounting-medical-chart',
])
export const isExecutiveOnlyPage = (id: string): boolean => EXECUTIVE_ONLY_PAGE_IDS.has(id)

/**
 * 마케팅 부서 전용 페이지 (docs/auth/permissions.md § 4-1).
 * MANAGER·STAFF 가 department='MARKETING' 인 사용자만 접근. ADMIN·DIRECTOR (department='ALL') 는 항상 접근.
 * MEDICAL 부서 사용자에게는 사이드바에서 숨김 + 직접 URL 접근도 차단.
 *
 * 문서에 명시된 채널 페이지(channel-profit·marketing) 및 마케팅 섹션에서 함께 다루는 파생 페이지
 * (reservation-channel·channel-analysis·accumulated-eyes·sms) 를 포함한다.
 * SMS 는 § 5-2 완화 이후 MARKETING 부서만 접근한다 (사용자 결정 2026-09-03).
 * 편집·[지금 실행]·[실패 재실행] 은 ADMIN 만 (프론트 canSystemOp + 백엔드 hasRole('ADMIN')).
 *
 * <b>주의</b> — 해외마케팅 3종은 별도 SET(OVERSEAS_MARKETING_ACCESSIBLE_PAGE_IDS) 로 관리.
 * MARKETING 도 접근하지만 OVERSEAS_MARKETING 전담 부서도 접근하기 때문 (2026-09-11).
 */
const MARKETING_ONLY_PAGE_IDS = new Set<string>([
  'reservation-channel',
  'channel-profit',
  'channel-analysis',
  'accumulated-eyes',
  'marketing',
  'sms',
])
export const isMarketingOnlyPage = (id: string): boolean => MARKETING_ONLY_PAGE_IDS.has(id)

/**
 * 해외마케팅 3종 페이지 (2026-09-11 신설) — MARKETING·OVERSEAS_MARKETING 두 부서 개방.
 * MARKETING 은 넓은 스코프의 상위 부서, OVERSEAS_MARKETING 은 이 3종만 전담하는 좁은 스코프.
 * 사이드바 노출·URL 접근 판정에서 두 부서 모두 통과시킨다.
 */
const OVERSEAS_MARKETING_ACCESSIBLE_PAGE_IDS = new Set<string>([
  'overseas-marketing-receptions',
  'overseas-marketing-statistics',
  'overseas-reservation-stats',
])
export const isOverseasMarketingPage = (id: string): boolean =>
  OVERSEAS_MARKETING_ACCESSIBLE_PAGE_IDS.has(id)

/**
 * 페이지의 부서 스코프 (docs/auth/permissions.md § 3, § 4-1).
 *
 * 반환값이 undefined 이면 스코프 없음(홈 · 통계 페이지 밖) — matchesDepartment 가 모두 통과시킨다.
 * 그 외에는 해당 부서만 접근.
 *
 * 홈(`/`) 은 statsPages 정의에 없어 여기서 undefined 로 판정된다. 잊지 말 것 — 홈을 default MEDICAL 로
 * 판정하면 MARKETING STAFF 사이드바에서 홈이 사라지는 버그가 생긴다 (2026-09-03 F1 원인).
 */
export const getPageDepartments = (id: string): UserDepartment[] | undefined => {
  if (!STATS_PAGE_ID_SET.has(id)) return undefined
  if (isOverseasMarketingPage(id)) return ['MARKETING', 'OVERSEAS_MARKETING']
  if (isMarketingOnlyPage(id)) return ['MARKETING']
  return ['MEDICAL']
}

/**
 * 사이드바에서 숨기는 메뉴(페이지·라우트는 유지 — 직접 URL 접근은 가능). 여기만 수정하면
 * 빈 그룹·숨김 단일 메뉴는 menuItems에서 자동 제거된다(kids() + 아래 filter).
 *   - 예약: 유입(검사예약)·예약 건수 숨김(예약자 리스트 → 예약 종합만 노출)
 *   - Report: 월간 레포트·주차 레포트 모두 노출
 *   - 외래 아래: 마케팅·취소&부도·객단가 전체 숨김
 *   - 기타: 드림렌즈 매출만 노출, 나머지는 숨김
 */
const HIDDEN_MENU_IDS = new Set<string>([
  'reservation',
  'marketing',
  'cancel-rate', 'no-show-rate',
  'unit-price',
  'b2b-revenue', 'staff-point', 'prp-rate',
  'reoperation-rate', 'same-day-op', 'designated-doctor', 'visit-reason', 'daily-reception',
])
export const isMenuHidden = (id: string): boolean => HIDDEN_MENU_IDS.has(id)

const findPage = (id: string) => getStatsPageById(id)

const link = (id: string): MenuItem => {
  const page = findPage(id)
  const item: MenuItem = { id, label: page.label, href: page.path, status: getMenuStatus(id) }
  if (isAdminOnlyPage(id)) item.adminOnly = true
  if (isExecutiveOnlyPage(id)) item.executiveOnly = true
  return item
}

/** 그룹 자식 링크 생성 — 숨김(HIDDEN_MENU_IDS) 대상은 제외. */
const kids = (...ids: string[]): MenuItem[] => ids.filter((id) => !isMenuHidden(id)).map(link)

/**
 * 사이드바 3단 구조.
 *   Lv1: HOME(잎) + 섹션 5종(비앤빛·마케팅·해외마케팅·회계·관리자)
 *   Lv2: 섹션 하위 그룹(Report·예약·검사 …) 또는 직접 잎(관리자→배치관리)
 *   Lv3: 그룹 하위 개별 페이지 링크
 */
const rawMenuItems: MenuItem[] = [
  { id: 'home', label: 'HOME', href: '/', icon: Home },
  {
    id: 'bnviit-section',
    label: '비앤빛',
    href: '#',
    icon: Building2,
    kind: 'section',
    children: [
      {
        id: 'report-group',
        label: 'Report',
        href: '#',
        icon: FileText,
        kind: 'group',
        children: kids('monthly-report', 'weekly-report'),
      },
      {
        id: 'reservation-group',
        label: '예약',
        href: '#',
        icon: CalendarCheck,
        kind: 'group',
        // 예약 건수(reservation)는 숨김. 예약자 리스트 → 예약자 리스트_홈페이지 → 예약 종합 → 예약통계_시력교정 → 예약통계_백내장 → 예약 변경이력 순.
        children: kids(
          'reservation-list', 'reservation-list-homepage', 'reservation-overall',
          'reservation-stats-system', 'reservation-stats-cataract', 'reservation-change',
        ),
      },
      {
        id: 'exam-group',
        label: '검사',
        href: '#',
        icon: Microscope,
        kind: 'group',
        children: kids('overall-exam', 'overall-exam-weekly', 'exam-list', 'cataract-exam-list', 'all-exam-list', 'eoeis-checkup', 'examination', 'procedure-exam'),
      },
      {
        id: 'consultation',
        label: '전환&성공률',
        href: '#',
        icon: Stethoscope,
        kind: 'group',
        children: kids('consultation-rate', 'cataract-reservation-rate', 'stop-rate', 'stop-reason'),
      },
      {
        id: 'surgery-group',
        label: '수술',
        href: '#',
        icon: Syringe,
        kind: 'group',
        children: kids('surgery-list', 'surgery', 'surgery-ratio', 'surgery-composition'),
      },
      {
        id: 'outpatient',
        label: '외래',
        href: '#',
        icon: Hospital,
        kind: 'group',
        children: kids('outpatient-list', 'outpatient-count'),
      },
      {
        id: 'cancel-noshow',
        label: '취소&부도',
        href: '#',
        icon: Ban,
        kind: 'group',
        children: kids('cancel-rate', 'no-show-rate'),
      },
      {
        id: 'unit-price',
        label: '객단가',
        href: findPage('unit-price').path,
        icon: BadgeDollarSign,
        status: getMenuStatus('unit-price'),
      },
      {
        id: 'etc',
        label: '기타',
        href: '#',
        icon: MoreHorizontal,
        kind: 'group',
        children: kids(
          'dreamlens-revenue', 'b2b-revenue', 'staff-point',
          'prp-rate', 'reoperation-rate', 'same-day-op',
          'designated-doctor', 'visit-reason', 'daily-reception',
        ),
      },
    ],
  },
  {
    id: 'marketing-section',
    label: '마케팅',
    href: '#',
    icon: Megaphone,
    kind: 'section',
    // 예약 퍼널은 유입 채널 효율을 보는 화면이라 예약보다 마케팅에 가깝다(2026-08-06 이동).
    // 채널별 수익성은 그 짝이다 — 퍼널이 '얼마나 오나'(전환 축), 이쪽이 '얼마 버나'(가치 축).
    // 마케팅 효율(marketing)은 아직 pending 이라 HIDDEN 으로 빠져 있다.
    // 해외마케팅(접수리스트·통계·예약통계)은 아래 별도 최상위 섹션(overseas-marketing-section)이다.
    // 문자 발송 관리는 향후 하위 페이지(이력·템플릿 등) 확장을 대비해 그룹으로 감쌈.
    children: [
      ...kids('reservation-channel', 'channel-profit', 'channel-analysis', 'accumulated-eyes'),
      {
        // § SMS 5-2 완화 완료 (2026-09-03): STAFF 개방 · 편집·[지금 실행]·[실패 재실행] 만 ADMIN.
        // 부서 gate: MARKETING 전용 (MARKETING_ONLY_PAGE_IDS 에 'sms' 포함). MEDICAL STAFF 는 안 보임.
        // 백엔드 매처 분리:
        //   · PUT /api/sms-management/offsets · POST /send · POST /sync · POST /targets/import → hasRole('ADMIN')
        //   · 그 외 /api/sms-management/** → MARKETING 부서
        //   · /api/admin/batch/sms/queue/** → hasRole('ADMIN') (그대로 유지)
        id: 'sms-management',
        label: '문자 발송 관리',
        href: '#',
        icon: MessageSquare,
        kind: 'group',
        children: kids('sms'),
      },
    ],
  },
  {
    id: 'overseas-marketing-section',
    label: '해외마케팅',
    href: '#',
    icon: Globe2,
    kind: 'section',
    // 2026-09-09 2026-08-14 브랜치에서 이관. 접수리스트 → 통계 → 예약통계 순. 잎은 모두 MARKETING 부서 전용.
    children: kids('overseas-marketing-receptions', 'overseas-marketing-statistics', 'overseas-reservation-stats'),
  },
  {
    id: 'accounting-section',
    label: '회계',
    href: '#',
    icon: Landmark,
    kind: 'section',
    // 회계 — 마트·API 연동 완료(2026-09-15). 임원(DIRECTOR) 이상 개방(2026-09-17).
    // 백엔드 /api/accounting/** 매처가 hasAnyRole("ADMIN","DIRECTOR") 로 대칭 유지.
    executiveOnly: true,
    children: kids(
      'accounting-medical', 'accounting-vision',
      'accounting-vision-summary', 'accounting-vision-chart', 'accounting-medical-chart',
    ),
  },
  {
    id: 'admin-section',
    label: '관리자',
    href: '#',
    icon: Wrench,
    kind: 'section',
    adminOnly: true,
    children: [
      ...kids('batch-management', 'account-management'),
      // 정적 기획서(frontend/public/guide) — 새 탭에서 열린다.
      // adminOnly=true 를 명시해야 배지가 뜬다. adminReal 은 markAdminSectionSubtree 가 자동으로 붙여 준다.
      {
        id: 'guide',
        label: '가이드',
        href: '/guide/prd.html',
        icon: BookOpen,
        external: true,
        adminOnly: true,
      },
      // Swagger UI — backend static /docs/index.html. Vite dev 는 vite.config.ts 의 /docs 프록시 경유.
      {
        id: 'api-docs',
        label: 'API 문서',
        href: '/docs/',
        icon: FileText,
        external: true,
        adminOnly: true,
      },
    ],
  },
]

/**
 * 숨김 반영: 숨김 대상 단일 메뉴와, 자식이 모두 숨겨져 비어버린 그룹을 제거.
 * 섹션(kind === 'section')은 자식이 없어도 유지한다(예: 마케팅).
 */
const pruneItems = (items: MenuItem[]): MenuItem[] =>
  items
    .filter((item) => !isMenuHidden(item.id))
    .map((item) => (item.children ? { ...item, children: pruneItems(item.children) } : item))
    .filter(
      (item) =>
        item.kind === 'section' ||
        item.children === undefined ||
        item.children.length > 0,
    )

/**
 * admin-section 트리 안 항목에 adminReal=true 자동 부여.
 * 관리자 섹션은 "개발 완료된 관리자 전용 도구" 이므로 하위 잎도 "관리자" 배지 대상이다.
 * 여기서 자동 처리하면 admin-section 하위에 페이지를 추가해도 배지 마킹을 잊지 않는다.
 */
const markAdminSectionSubtree = (items: MenuItem[]): MenuItem[] => {
  const markReal = (nodes: MenuItem[]): MenuItem[] =>
    nodes.map((n) => ({
      ...n,
      adminReal: true,
      children: n.children ? markReal(n.children) : undefined,
    }))
  return items.map((item) => {
    if (item.id === 'admin-section' && item.children) {
      return { ...item, adminReal: true, children: markReal(item.children) }
    }
    return item.children
      ? { ...item, children: markAdminSectionSubtree(item.children) }
      : item
  })
}

export const menuItems: MenuItem[] = markAdminSectionSubtree(pruneItems(rawMenuItems))

/**
 * 부서 gate — 잎(link)의 pageId 로 판정. 그룹·섹션은 자식이 모두 필터링돼 비어버리면 함께 제거된다
 * (문서 § 2-2 대칭 원칙: MARKETING 사용자에게 비앤빛 섹션 자체도 안 보인다).
 *
 * ADMIN·DIRECTOR (department='ALL') 는 모든 페이지가 통과 → items 원본과 동등한 결과.
 * Sidebar 렌더 파이프라인 안에서 hideAdminForNonAdmin 다음 단계로 적용되지만,
 * 순수 함수라 유닛 테스트에서 격리 검증도 가능하다.
 */
export const pruneByDepartment = (
  items: MenuItem[],
  user: Pick<AuthUser, 'department'> | null,
): MenuItem[] =>
  items
    .filter((item) => {
      if (item.children !== undefined) return true
      return matchesDepartment(user, getPageDepartments(item.id))
    })
    .map((item) => (item.children ? { ...item, children: pruneByDepartment(item.children, user) } : item))
    .filter((item) => item.children === undefined || item.children.length > 0)

/**
 * 임원 gate — `executiveOnly` 항목은 ADMIN·DIRECTOR 에게만 보이고 나머지 롤에는 제거된다.
 * 섹션 자체도 `executiveOnly=true` 인 경우 마찬가지로 사라진다(회계 섹션).
 *
 * Sidebar 렌더 파이프라인에서 `pruneAdmin` 과 나란히 적용된다. 순수 함수라 유닛 테스트에서 격리 검증 가능.
 */
export const pruneExecutiveOnly = (
  items: MenuItem[],
  role: string | undefined,
): MenuItem[] => {
  const isExecutive = role === 'ADMIN' || role === 'DIRECTOR'
  if (isExecutive) return items
  return items
    .filter((item) => !item.executiveOnly)
    .map((item) => (item.children ? { ...item, children: pruneExecutiveOnly(item.children, role) } : item))
    .filter((item) => {
      if (item.children === undefined) return true
      if (item.kind === 'section') return true
      return item.children.length > 0
    })
}
