export interface StatsPageDefinition {
  id: string
  label: string
  path: string
  sectionId: string
  sectionLabel: string
  description: string
  /**
   * 플레이스홀더 화면(StatsPlaceholderPage)에 "API 초안"으로 표시되는 대표 엔드포인트.
   * 실제 클라이언트 호출 경로는 api/<domain>에 따로 있고, 한 페이지가 여러 엔드포인트를
   * 호출할 수 있어 1:1 대응이 아니다. 라우팅·fetch에 쓰이지 않는 표시 전용 값이므로
   * "지도"로 신뢰하지 말 것.
   */
  apiDraftPath: string
}

const statsPage = (
  id: string,
  label: string,
  path: string,
  sectionId: string,
  sectionLabel: string,
  description: string,
  apiDraftPath: string
): StatsPageDefinition => ({
  id,
  label,
  path,
  sectionId,
  sectionLabel,
  description,
  apiDraftPath,
})

export const getStatsPageById = (id: string): StatsPageDefinition => {
  const page = statsPages.find((item) => item.id === id)

  if (!page) {
    throw new Error(`Unknown stats page: ${id}`)
  }

  return page
}

export const statsPages: StatsPageDefinition[] = [
  statsPage(
    'weekly-report',
    '주차 레포트',
    '/report/weekly',
    'report-group',
    'Report',
    '🚧 개발예정 · 임시 프로토타입 — 지표 정의·집계 방식이 확정되기 전 참고용 화면입니다. 월간 레포트와 같은 도표를 주차(월~일) 단위로 본 리포트로, 전체 주차 또는 특정 월에 걸친 주차(월 경계 주차 포함)를 선택할 수 있습니다.',
    '/api/report/weekly'
  ),
  statsPage(
    'monthly-report',
    '월간 레포트',
    '/report/monthly',
    'report-group',
    'Report',
    '한 달간의 핵심 KPI(예약·검사·수술·전환율 등)를 당해연도·전년도·전전년도 3개년으로 비교한 월간 리포트입니다.',
    '/api/report/monthly'
  ),
  statsPage(
    'overall-exam',
    '월별 검사자 종합지표',
    '/stats/overall-exam',
    'exam-group',
    '검사',
    '총검사자와 소개유형·직업 구성을 월별로 정리한 종합표입니다. 2024·2025년 확정값(마트 시드), 2026년부터는 운영 DB 배치 적재 마트를 조회합니다.',
    '/api/stats/overall-exam'
  ),
  statsPage(
    'overall-exam-weekly',
    '주간 검사자 종합지표',
    '/stats/overall-exam-weekly',
    'exam-group',
    '검사',
    '월별 종합표와 동일한 35칼럼을 주(월~일, 월 경계 클립) 단위로 운영 DB에서 라이브 집계한 종합표입니다.',
    '/api/stats/overall-exam/weekly'
  ),
  statsPage(
    'intake-conversion',
    '유입(검사예약)',
    '/stats/intake-conversion',
    'reservation-group',
    '예약',
    '인콜·아웃콜·카카오톡·네이버·홈페이지 채널별 검사예약 전환을 확인하는 화면입니다.',
    '/api/stats/intake-conversion'
  ),
  statsPage(
    'reservation',
    '예약 건수',
    '/stats/reservation',
    'reservation-group',
    '예약',
    '예약 유입 규모와 일자별 변화 추이를 확인하는 화면입니다.',
    '/api/stats/reservation'
  ),
  statsPage(
    'reservation-overall',
    '예약 종합',
    '/stats/reservation-overall',
    'reservation-group',
    '예약',
    '콜·온라인 채널을 합산한 검사예약 종합 건수를 월별·연도별로 비교하는 화면입니다.',
    '/api/stats/reservation-overall'
  ),
  statsPage(
    'reservation-stats-system',
    '예약통계_시력교정',
    '/stats/reservation-stats-system',
    'reservation-group',
    '예약',
    '시력교정 검사예약을 콜(검사 인입콜·TM)·온라인(홈페이지·네이버)·채팅(카카오톡)·취소 채널로 주차별 분해한 월간 예약 종합표입니다.',
    '/api/stats/reservation-stats-system'
  ),
  statsPage(
    'reservation-stats-cataract',
    '예약통계_백내장',
    '/stats/reservation-stats-cataract',
    'reservation-group',
    '예약',
    '백내장(노안 포함) 검사예약을 인바운드(컨택센터)·아웃바운드(TM)·채팅·온라인·취소 채널로 주차별 분해한 월간 예약 종합표입니다.',
    '/api/stats/reservation-stats-cataract'
  ),
  statsPage(
    'reservation-list',
    '예약자 리스트',
    '/stats/reservation-list',
    'reservation-group',
    '예약',
    '예약 종합(콜·온라인) 건수를 구성하는 검사예약 인원 명단입니다. 등록일 기준 월 단위로 조회합니다.',
    '/api/reservation-list'
  ),
  statsPage(
    'reservation-channel',
    '예약 퍼널',
    '/stats/reservation-channel',
    'marketing-section',
    '마케팅',
    '예약자 리스트를 유입 채널로 묶어 예약 → 취소제외 → 접수 → 검사 → 수술 단계로 좁혀 보는 퍼널입니다. 합계는 예약자 리스트와 같습니다.',
    '/api/stats/reservation-channel'
  ),
  statsPage(
    'channel-profit',
    '채널별 수익성',
    '/stats/channel-profit',
    'marketing-section',
    '마케팅',
    '유입채널이 얼마를 남겼는지(수납액·객단가·공헌이익(렌즈만))와 광고매체가 얼마를 회수했는지(CPA·ROAS)를 나눠서 봅니다. 예약통계_채널별과 같은 뷰를 읽어 인원이 일치합니다.',
    '/api/stats/channel-profit'
  ),
  statsPage(
    'channel-analysis',
    '채널별 분석',
    '/stats/channel-analysis',
    'marketing-section',
    '마케팅',
    '유입 채널별로 고객이 누구이고 객단가가 왜 그런지 정리한 분석 문서 모음입니다. 좌측에서 채널을 고르면 해당 문서가 열립니다. 실측 기준이며 화면은 조회를 하지 않습니다(수치는 본문에 고정).',
    '(없음 — 정적 문서)'
  ),
  statsPage(
    'reservation-list-homepage',
    '예약자 리스트_홈페이지',
    '/stats/reservation-list-homepage',
    'reservation-group',
    '예약',
    '홈페이지 온라인 예약 신청 명단입니다. 레거시 관리자 화면(counsel/online_list.php)과 동일한 조회 조건·컬럼 구성이며, 등록일 기준 조회입니다.',
    '/api/reservation-list-homepage'
  ),
  statsPage(
    'exam-list',
    '검사자 리스트',
    '/stats/exam-list',
    'exam-group',
    '검사',
    '검사일자별 검사자 상세 목록(고객·상담·수술·검안 정보)을 표 형태로 확인하는 화면입니다.',
    '/api/exam-list'
  ),
  statsPage(
    'cataract-exam-list',
    '백내장 검사자 리스트',
    '/stats/cataract-exam-list',
    'exam-group',
    '검사',
    '백내장 검사일자별 검사자 상세 목록(IOL·수술·상담 정보)을 표 형태로 확인하는 화면입니다.',
    '/api/cataract-exam-list'
  ),
  statsPage(
    'all-exam-list',
    '전체 검사자 리스트',
    '/stats/all-exam-list',
    'exam-group',
    '검사',
    '시력교정+백내장 검사자를 통합한 명단입니다. 검사구분·내원동기·직업 토글 조회건수가 월별 검사자 종합지표(검사유입·검사수)와 정합합니다.',
    '/api/all-exam-list'
  ),
  statsPage(
    'eoeis-checkup',
    '아이리더 검사통계',
    '/stats/eoeis-checkup',
    'exam-group',
    '검사',
    '아이리더 검사기록을 검사자×장비 또는 검사자×기간으로 피벗해 건수와 장비 가중 점수를 확인하는 화면입니다.',
    '/api/eoeis-checkup'
  ),
  statsPage(
    'examination',
    '시술별',
    '/stats/examination',
    'exam-group',
    '검사',
    '시력교정·드림렌즈·백내장 등 시술별 검사 건수를 탭으로 나눠 확인하는 화면입니다.',
    '/api/stats/examination'
  ),
  statsPage(
    'procedure-exam',
    '검사건수',
    '/stats/procedure-exam',
    'exam-group',
    '검사',
    '시력교정·드림렌즈·백내장 검사를 합산한 전체 검사수를 월별로 비교하는 화면입니다.',
    '/api/stats/procedure-exam'
  ),
  statsPage(
    'consultation-rate',
    '전환율',
    '/stats/consultation-rate',
    'consultation',
    '전환&성공률',
    '시력교정 상담 전환율, 시력교정 수술 전환율, 백내장 수술 전환율을 함께 확인하는 화면입니다.',
    '/api/stats/consultation-rate'
  ),
  statsPage(
    'cataract-reservation-rate',
    '예약률',
    '/stats/cataract-reservation-rate',
    'consultation',
    '전환&성공률',
    '시력교정 검사자 대비 수술예약률과, 백내장 진단자 대비 수술예약률을 탭으로 나눠 월별로 확인하는 화면입니다.',
    '/api/stats/cataract-reservation-rate'
  ),
  statsPage(
    'stop-rate',
    '중단률',
    '/stats/stop-rate',
    'consultation',
    '전환&성공률',
    '시력교정 검사자 대비 검사 중단(STOP_YN) 건 비율을 월별·연도별로 비교하는 화면입니다. 중단율 = 중단수 / 시력교정 검사자.',
    '/api/stats/overall-exam/weekly'
  ),
  statsPage(
    'stop-reason',
    '중단 사유',
    '/stats/stop-reason',
    'consultation',
    '전환&성공률',
    '검사 중단(STOP_YN) 건을 사유별로 분류해 연·월별로 확인하는 화면입니다. 검사메모의 공백·약어·표기 차이를 보정한 키워드 자동분류 기준.',
    '/api/stats/stop-reason'
  ),
  statsPage(
    'surgery-list',
    '수술자 리스트',
    '/stats/surgery-list',
    'surgery',
    '수술 건수',
    '수술일자 기준 수술자 상세 목록과 보조 검사일자를 표 형태로 확인하는 화면입니다.',
    '/api/surgery-list'
  ),
  statsPage(
    'surgery',
    '수술 건수',
    '/stats/surgery',
    'surgery',
    '수술 건수',
    '수술 건수 총량과 기간별 비교를 제공하는 화면입니다.',
    '/api/stats/surgery'
  ),
  statsPage(
    'surgery-ratio',
    '주요 수술별 비중',
    '/stats/surgery-ratio',
    'surgery-ratio',
    '주요 수술별 비중',
    '기준 연도와 월(연간 전체 가능)을 선택해 주요 수술 유형별 KPI·점유율과 상위 수술의 월별 추이를 함께 보는 화면입니다.',
    '/api/stats/surgery-ratio'
  ),
  statsPage(
    'surgery-composition',
    '수술별 비중',
    '/stats/surgery-composition',
    'surgery',
    '수술',
    '시술별(라섹·라식·스마일·ICL·백내장 등) 수술 건수와 그룹 내 비중을 월별/주차(ISO)/주별/일별/전체 단위로 골라 보는 표 화면입니다.',
    '/api/stats/surgery-ratio'
  ),
  statsPage(
    'outpatient-list',
    '외래수 리스트',
    '/stats/outpatient-list',
    'outpatient',
    '외래',
    'RESERVATION(외래 F + 내원/퇴원 I,H) 기준 외래수 상세 명단입니다. 리스트 합계가 월별 외래수 지표와 정합합니다.',
    '/api/outpatient-list'
  ),
  statsPage(
    'outpatient-count',
    '외래수',
    '/stats/outpatient-count',
    'outpatient',
    '외래',
    '월별 외래수 추이를 연도별로 비교하는 화면입니다.',
    '/api/stats/outpatient-count'
  ),
  statsPage(
    'overseas',
    '해외 환자 관련 지표',
    '/stats/overseas',
    'overseas',
    '해외 환자 관련 지표',
    '해외 환자 유입, 상담, 수술 관련 핵심 지표를 모아보는 화면입니다.',
    '/api/stats/overseas'
  ),
  statsPage(
    'marketing',
    '마케팅 유입 및 효율 지표',
    '/stats/marketing',
    'marketing',
    '마케팅 유입 및 효율 지표',
    '채널별 유입과 효율을 비교하는 마케팅 통합 화면입니다.',
    '/api/stats/marketing'
  ),
  statsPage(
    'cancel-rate',
    '예약취소율',
    '/stats/cancel-rate',
    'cancel-noshow',
    '취소&부도',
    '예약 취소 비율과 취소 패턴을 확인하는 화면입니다.',
    '/api/stats/cancel-rate'
  ),
  statsPage(
    'no-show-rate',
    '부도율',
    '/stats/no-show-rate',
    'cancel-noshow',
    '취소&부도',
    '노쇼 발생 비율과 구간별 패턴을 추적하는 화면입니다.',
    '/api/stats/no-show-rate'
  ),
  statsPage(
    'unit-price',
    '객단가',
    '/stats/unit-price',
    'unit-price',
    '객단가',
    '환자당 평균 매출과 기간별 객단가 흐름을 정리하는 화면입니다.',
    '/api/stats/unit-price'
  ),
  statsPage(
    'dreamlens-revenue',
    '드림렌즈 장부',
    '/stats/dreamlens-revenue',
    'etc',
    '기타',
    'D/L 장부를 직접 입력·수정하는 화면입니다.',
    '/api/dreamlens-ledger'
  ),
  statsPage(
    'b2b-revenue',
    'B2B 매출',
    '/stats/b2b-revenue',
    'etc',
    '기타',
    'B2B 채널 매출과 거래처별 실적을 확인하는 화면입니다.',
    '/api/stats/b2b-revenue'
  ),
  statsPage(
    'staff-point',
    '직원 포인트',
    '/stats/staff-point',
    'etc',
    '기타',
    '직원별 포인트 현황과 추이를 확인하는 화면입니다.',
    '/api/stats/staff-point'
  ),
  statsPage(
    'prp-rate',
    'PRP 시술율',
    '/stats/prp-rate',
    'etc',
    '기타',
    'PRP 시술 비율과 기간별 변화를 확인하는 화면입니다.',
    '/api/stats/prp-rate'
  ),
  statsPage(
    'reoperation-rate',
    '재수술율',
    '/stats/reoperation-rate',
    'etc',
    '기타',
    '재수술 발생 비율과 수술 유형별 패턴을 확인하는 화면입니다.',
    '/api/stats/reoperation-rate'
  ),
  statsPage(
    'same-day-op',
    '당일OP 비율',
    '/stats/same-day-op',
    'etc',
    '기타',
    '당일 수술 비율과 기간별 변화를 확인하는 화면입니다.',
    '/api/stats/same-day-op'
  ),
  statsPage(
    'designated-doctor',
    '지정의 수술 비율',
    '/stats/designated-doctor',
    'etc',
    '기타',
    '지정의 수술 비율과 의사별 현황을 확인하는 화면입니다.',
    '/api/stats/designated-doctor'
  ),
  statsPage(
    'visit-reason',
    '내원동기별 비중',
    '/stats/visit-reason',
    'etc',
    '기타',
    '내원동기(소개, 광고, 검색 등)별 비중과 추이를 확인하는 화면입니다.',
    '/api/stats/visit-reason'
  ),
  statsPage(
    'daily-reception',
    '일일 접수/응대 건수',
    '/stats/daily-reception',
    'etc',
    '기타',
    '일일 접수 및 응대 건수와 시간대별 분포를 확인하는 화면입니다.',
    '/api/stats/daily-reception'
  ),
  statsPage(
    'batch-management',
    '데이터 배치 관리',
    '/admin/batch',
    'admin',
    '관리자',
    '마트 재적재 배치를 수동 실행하고 실행 이력을 확인합니다. ADMIN 롤 전용.',
    '/api/admin/batch/rerun'
  ),
]
