import type { LucideIcon } from 'lucide-react'
import {
  Home, CalendarCheck, Microscope, Stethoscope, Syringe,
  Hospital, Megaphone, Ban, BadgeDollarSign, MoreHorizontal, FileText, Wrench,
  Building2,
} from 'lucide-react'

import { getStatsPageById } from './statsPages'

export { getStatsPageById, statsPages, type StatsPageDefinition } from './statsPages'

export type MenuStatus = 'complete' | 'frontend-only' | 'backend-only' | 'pending'

/**
 * 사이드바 트리의 단일 노드. 재귀적으로 children 을 가질 수 있어 다단(3단) 표현이 가능하다.
 *   - kind === 'section': 최상위 섹션(비앤빛·마케팅·관리자). 자식이 없어도 사이드바에서 제거되지 않는다.
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
  'intake-conversion': 'pending',
  'reservation': 'complete',
  'reservation-overall': 'complete',
  'reservation-stats-system': 'complete',
  'reservation-stats-cataract': 'complete',
  'reservation-list': 'complete',
  'reservation-channel': 'complete',
  // 소스(legacy.datasource.url) 미설정 환경에서는 503 — 다른 통계 페이지가 데이터소스 부재 시
  // 503 을 주는 것과 동일한 패턴이라 'complete' 가 맞다(상태는 구현 완료 여부를 뜻한다).
  'reservation-list-homepage': 'complete',
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
  'outpatient-list': 'complete',
  'outpatient-count': 'complete',
  'overseas': 'pending',
  'marketing': 'pending',
  'cancel-rate': 'pending',
  'no-show-rate': 'pending',
  'unit-price': 'pending',
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
}

/** 메뉴 구현 상태 조회 (router의 운영 빌드 pending 라우트 차단 등에 사용). */
export const getMenuStatus = (id: string): MenuStatus => MENU_STATUS[id] ?? 'pending'
export const hasExplicitMenuStatus = (id: string): boolean =>
  Object.prototype.hasOwnProperty.call(MENU_STATUS, id)
export const getMenuStatusIds = (): string[] => Object.keys(MENU_STATUS)

/**
 * ADMIN 롤 전용 페이지. 사이드바 숨김 + 직접 URL 접근도 placeholder 로 차단(pageRegistry.isRouteBlocked).
 * admin-group 아래의 페이지들 및 그 밖의 관리자 전용 통계와 항상 동기화.
 */
const ADMIN_ONLY_PAGE_IDS = new Set<string>([
  'batch-management',
  'overall-exam',
  'overall-exam-weekly',
  'consultation-rate',
  'exam-list',
  'cataract-exam-list',
  'surgery',
])
export const isAdminOnlyPage = (id: string): boolean => ADMIN_ONLY_PAGE_IDS.has(id)

/**
 * 사이드바에서 숨기는 메뉴(페이지·라우트는 유지 — 직접 URL 접근은 가능). 여기만 수정하면
 * 빈 그룹·숨김 단일 메뉴는 menuItems에서 자동 제거된다(kids() + 아래 filter).
 *   - 예약: 유입(검사예약)·예약 건수 숨김(예약자 리스트 → 예약 종합만 노출)
 *   - Report: 월간 레포트·주차 레포트 모두 노출
 *   - 외래 아래: 마케팅·취소&부도·객단가 전체 숨김
 *   - 기타: 드림렌즈 매출만 노출, 나머지는 숨김
 */
const HIDDEN_MENU_IDS = new Set<string>([
  'intake-conversion', 'reservation',
  'overseas', 'marketing',
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
  return item
}

/** 그룹 자식 링크 생성 — 숨김(HIDDEN_MENU_IDS) 대상은 제외. */
const kids = (...ids: string[]): MenuItem[] => ids.filter((id) => !isMenuHidden(id)).map(link)

/**
 * 사이드바 3단 구조.
 *   Lv1: HOME(잎) + 섹션 3종(비앤빛·마케팅·관리자)
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
        // 유입(intake-conversion)·예약 건수(reservation)는 숨김. 예약자 리스트 → 예약자 리스트_홈페이지 → 예약 종합 → 예약통계_시력교정 → 예약통계_백내장 순.
        children: kids(
          'reservation-list', 'reservation-channel', 'reservation-list-homepage', 'reservation-overall',
          'reservation-stats-system', 'reservation-stats-cataract',
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
    // 아직 페이지 없음. 섹션은 자식이 비어도 유지된다.
    children: [],
  },
  {
    id: 'admin-section',
    label: '관리자',
    href: '#',
    icon: Wrench,
    kind: 'section',
    adminOnly: true,
    children: kids('batch-management'),
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

export const menuItems: MenuItem[] = pruneItems(rawMenuItems)
