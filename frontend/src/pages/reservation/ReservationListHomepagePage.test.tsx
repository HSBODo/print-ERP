// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import type { ReservationListHomepageItem } from '@/api/reservation/reservationListHomepage'

/**
 * 예약자 리스트_홈페이지 화면 계약.
 *
 * 레거시 화면(counsel/online_list.php) 재현에서 값이 조용히 어긋나기 쉬운 지점을 고정한다:
 *  - No 는 총건수에서 1씩 감소하는 표시용 번호다(1부터 증가가 아니다).
 *  - 코드→라벨 매핑이 레거시 PHP 하드코딩과 같아야 한다.
 *  - 조회 기간이 스냅샷을 넘으면 경고가 떠야 한다(안 뜨면 '조용히 적은 건수'가 된다).
 *  - 조회 전용이라 삭제·엑셀·체크박스가 없어야 한다.
 *
 * 픽스처는 합성 데이터다 — 실데이터는 환자 개인정보라 테스트에 넣지 않는다.
 */

const mockHook = vi.fn()
vi.mock('@/hooks/reservation/useReservationListHomepage', () => ({
  useReservationListHomepage: (from: string, to: string, enabled: boolean) =>
    mockHook(from, to, enabled),
}))

const row = (over: Partial<ReservationListHomepageItem> = {}): ReservationListHomepageItem => ({
  legacyNo: '606840',
  deviceType: 'M',
  name: '홍길동',
  phone: '010-0000-0001',
  reserveDate: '2026-07-09',
  reserveTime: '11:00',
  utmSource: 'naver-bs',
  utmMedium: 'sa',
  utmCampaign: 'mo_naver-bs_conv_2504',
  referralCode: '',
  examType: '5',
  surgeryTf: 'Y',
  isReserve: 'Y',
  regDate: '2026-06-30 23:48:13',
  ...over,
})

const setRows = (
  rows: ReservationListHomepageItem[],
  snapshot = '2026-07-10 16:15:55',
  live = false,
) => {
  mockHook.mockReturnValue({
    rows,
    lastRegDate: snapshot,
    live,
    isLoading: false,
    isFetching: false,
    isError: false,
  })
}

const searchWith = async (from?: string, to?: string) => {
  const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
  render(<ReservationListHomepagePage />)
  if (from) fireEvent.change(screen.getByLabelText('등록 시작일'), { target: { value: from } })
  if (to) fireEvent.change(screen.getByLabelText('등록 종료일'), { target: { value: to } })
  fireEvent.click(screen.getByRole('button', { name: '조회' }))
}

beforeEach(() => {
  mockHook.mockReset()
  setRows([])
})
afterEach(cleanup)

describe('CSV 출력', () => {
  it('No 는 화면과 동일하게 총건수에서 1씩 감소한다', async () => {
    const { csvColumnsOf } = await import('./reservationListHomepageColumns')
    const { columnsToCsv } = await import('@/utils/csv')
    const rows = [row({ legacyNo: '3' }), row({ legacyNo: '2' }), row({ legacyNo: '1' })]

    const lines = columnsToCsv(csvColumnsOf(rows.length), rows).split('\r\n')

    expect(lines[0].startsWith('No,구분,이름,휴대폰번호')).toBe(true)
    expect(lines[1].startsWith('3,')).toBe(true)
    expect(lines[2].startsWith('2,')).toBe(true)
    expect(lines[3].startsWith('1,')).toBe(true)
  })

  it('코드가 아니라 화면 라벨로 나가고, 휴대폰번호는 엑셀 텍스트로 강제한다', async () => {
    const { csvColumnsOf } = await import('./reservationListHomepageColumns')
    const { columnsToCsv } = await import('@/utils/csv')

    const csv = columnsToCsv(csvColumnsOf(1), [row()])

    expect(csv).toContain('Mobile')                 // deviceType M
    expect(csv).toContain('시력교정수술 전 검사')     // examType 5
    expect(csv).toContain('당일수술')                // surgeryTf Y
    expect(csv).toContain('예약')                    // isReserve Y
    expect(csv).toContain('naver-bs / sa / mo_naver-bs_conv_2504') // UTM 3종 한 셀
    // 앞자리 0 손실·지수표기 방지 — ="값" 수식으로 감싼 뒤 CSV 따옴표 이스케이프.
    // 마스킹된 값이라도 ="..." 은 유지돼야 한다.
    expect(csv).toContain('"=""010-****-0001"""')
  })

  it('개인정보는 CSV 로 나갈 때만 마스킹된다', async () => {
    const { csvColumnsOf } = await import('./reservationListHomepageColumns')
    const { columnsToCsv } = await import('@/utils/csv')

    const csv = columnsToCsv(csvColumnsOf(1), [row()])

    // 파일은 PC 에 남고 메신저로 전달된다 — 원문이 나가면 안 된다.
    expect(csv).toContain('홍*동')
    expect(csv).not.toContain('홍길동')
    expect(csv).toContain('010-****-0001')
    expect(csv).not.toContain('010-0000-0001')
  })

  it('화면에는 원문이 그대로 보인다 (레거시 화면과 동일)', async () => {
    setRows([row()])
    await searchWith('2026-06-01', '2026-06-30')

    // 직원이 환자 식별·연락에 쓰는 화면이라 마스킹하지 않는다 — CSV 만 가린다.
    const dataRow = within(screen.getAllByRole('row')[1])
    expect(dataRow.getByText('홍길동')).toBeInTheDocument()
    expect(dataRow.getByText('010-0000-0001')).toBeInTheDocument()
  })
})

describe('ReservationListHomepagePage', () => {
  it('월별을 고르면 월 선택기로 바뀌고, 그 달 전체를 조회한다', async () => {
    setRows([row()])
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    render(<ReservationListHomepagePage />)

    // 일별 모드: 시작일·종료일 두 칸
    expect(screen.getByLabelText('등록 시작일')).toBeInTheDocument()
    expect(screen.queryByLabelText('등록 기준 월')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('기간 단위'), { target: { value: 'monthly' } })

    // 월별 모드: 월 한 칸으로 대체
    expect(screen.getByLabelText('등록 기준 월')).toBeInTheDocument()
    expect(screen.queryByLabelText('등록 시작일')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('등록 종료일')).not.toBeInTheDocument()

    // 지난 달을 고르면 1일~말일 전체가 조회 구간이 된다.
    fireEvent.change(screen.getByLabelText('등록 기준 월'), { target: { value: '2026-05' } })
    fireEvent.click(screen.getByRole('button', { name: '조회' }))
    expect(mockHook).toHaveBeenLastCalledWith('2026-05-01', '2026-05-31', true)
  })

  it('진행 중인 달은 말일이 아니라 오늘까지만 조회한다 (미래 구간 요청 방지)', async () => {
    setRows([row()])
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    const { todayIso, monthStartOf } = await import('./reservationListHomepageUtils')
    render(<ReservationListHomepagePage />)

    fireEvent.change(screen.getByLabelText('기간 단위'), { target: { value: 'monthly' } })
    fireEvent.change(screen.getByLabelText('등록 기준 월'), {
      target: { value: todayIso().slice(0, 7) },
    })
    fireEvent.click(screen.getByRole('button', { name: '조회' }))

    expect(mockHook).toHaveBeenLastCalledWith(monthStartOf(todayIso()), todayIso(), true)
  })

  it('조회 전에는 안내문을 보여주고 서버를 호출하지 않는다', async () => {
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    render(<ReservationListHomepagePage />)

    expect(screen.getByText(/조회 조건을 선택한 뒤/)).toBeInTheDocument()
    // 3번째 인자(enabled)가 false — 첫 진입에 대용량 조회가 나가면 안 된다.
    expect(mockHook).toHaveBeenCalledWith(expect.any(String), expect.any(String), false)
  })

  it('No 는 총건수에서 1씩 감소한다 (레거시 표시용 행번호)', async () => {
    setRows([row({ legacyNo: '3' }), row({ legacyNo: '2' }), row({ legacyNo: '1' })])
    await searchWith('2026-06-01', '2026-06-30')

    const bodyRows = screen.getAllByRole('row').slice(1) // 헤더 제외
    expect(within(bodyRows[0]).getAllByRole('cell')[0]).toHaveTextContent('3')
    expect(within(bodyRows[1]).getAllByRole('cell')[0]).toHaveTextContent('2')
    expect(within(bodyRows[2]).getAllByRole('cell')[0]).toHaveTextContent('1')
  })

  it('코드를 레거시와 동일한 라벨로 그린다', async () => {
    setRows([row()])
    await searchWith('2026-06-01', '2026-06-30')

    // 'Mobile'·'예약' 은 필터(구분 버튼·예약구분 select)에도 있으므로 반드시 표 안으로 범위를 좁힌다.
    const dataRow = within(screen.getAllByRole('row')[1])
    expect(dataRow.getByText('Mobile')).toBeInTheDocument()               // M
    expect(dataRow.getByText('시력교정수술 전 검사')).toBeInTheDocument()   // 5
    expect(dataRow.getByText('당일수술')).toBeInTheDocument()              // SURGERY_TF=Y
    expect(dataRow.getByText('예약')).toBeInTheDocument()                  // ISRESERVE=Y
    expect(dataRow.getByText('naver-bs')).toBeInTheDocument()              // UTM 3줄
    expect(dataRow.getByText('mo_naver-bs_conv_2504')).toBeInTheDocument()
  })

  it("진료구분 코드 '1'은 레거시처럼 라벨 없이 빈칸이다", async () => {
    setRows([row({ examType: '1' })])
    await searchWith('2026-06-01', '2026-06-30')

    expect(screen.queryByText('시력교정수술 전 검사')).not.toBeInTheDocument()
  })

  it('조회 기간이 스냅샷 안이면 경고가 없다', async () => {
    setRows([row()])
    await searchWith('2026-06-01', '2026-06-30')

    expect(screen.queryByText(/집계되지 않았습니다/)).not.toBeInTheDocument()
  })

  it('조회 기간이 스냅샷을 넘으면 경고를 띄운다 (조용한 미집계 방지)', async () => {
    setRows([row()])
    await searchWith('2026-07-01', '2026-07-15')

    expect(screen.getByText(/집계되지 않았습니다/)).toBeInTheDocument()
    expect(screen.getByText('2026-07-10 16:15:55')).toBeInTheDocument()
  })

  it('실시간 소스면 같은 조건에도 경고 대신 신선도를 보여준다', async () => {
    // 스냅샷이면 경고가 뜨는 바로 그 조건(종료일 > 마지막 등록일). 실시간엔 천장이 없어 거짓 경고다.
    setRows([row()], '2026-07-15 15:22:57', true)
    await searchWith('2026-07-01', '2026-07-31')

    expect(screen.queryByText(/집계되지 않았습니다/)).not.toBeInTheDocument()
    expect(screen.getByText(/레거시 홈페이지 운영 DB 를 직접 조회/)).toBeInTheDocument()
    expect(screen.getByText('2026-07-15 15:22:57')).toBeInTheDocument()
  })

  // 구분·예약구분·검색은 이미 받아온 행을 거르는 클라이언트 필터다 → 조회 버튼 없이 즉시 반영돼야 한다.
  // (조회를 기다리게 하면 버튼을 눌러도 아무 일이 없는 것처럼 보인다)
  it('구분 필터는 조회 버튼 없이 즉시 반영된다', async () => {
    setRows([row({ legacyNo: '1', deviceType: 'M' }), row({ legacyNo: '2', deviceType: 'P' })])
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    render(<ReservationListHomepagePage />)

    fireEvent.click(screen.getByRole('button', { name: '조회' }))
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('2건')

    // 'PC' 는 완전일치라 'AI PC' 버튼과 겹치지 않는다. 클릭만으로 걸려야 한다.
    fireEvent.click(screen.getByRole('button', { name: 'PC' }))
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('1건')

    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('2건')
  })

  it('예약구분 필터는 조회 버튼 없이 즉시 반영된다', async () => {
    setRows([row({ legacyNo: '1', isReserve: 'Y' }), row({ legacyNo: '2', isReserve: 'N' })])
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    render(<ReservationListHomepagePage />)

    fireEvent.click(screen.getByRole('button', { name: '조회' }))
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('2건')

    fireEvent.change(screen.getByLabelText('예약구분'), { target: { value: 'N' } })
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('1건')
  })

  it('이름·휴대폰번호를 한 입력으로 즉시 검색한다 (하이픈 무관)', async () => {
    setRows([
      row({ legacyNo: '1', name: '홍길동', phone: '010-1111-2222' }),
      row({ legacyNo: '2', name: '김철수', phone: '010-3333-4444' }),
    ])
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    render(<ReservationListHomepagePage />)
    fireEvent.click(screen.getByRole('button', { name: '조회' }))

    const keyword = screen.getByPlaceholderText('이름 · 휴대폰번호')
    fireEvent.change(keyword, { target: { value: '김철수' } })
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('1건')

    // 원문이 '010-1111-2222' 여도 하이픈 없는 입력으로 찾힌다.
    fireEvent.change(keyword, { target: { value: '01011112222' } })
    expect(screen.getByText('조회건수').parentElement).toHaveTextContent('1건')
    expect(within(screen.getAllByRole('row')[1]).getByText('홍길동')).toBeInTheDocument()
  })

  it('조회 전용 — 삭제·선택 체크박스가 없다 (쓰기 액션은 이관 대상 아님)', async () => {
    setRows([row()])
    await searchWith('2026-06-01', '2026-06-30')

    expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('CSV 는 조회 결과가 있을 때만 눌린다', async () => {
    const { ReservationListHomepagePage } = await import('./ReservationListHomepagePage')
    render(<ReservationListHomepagePage />)
    expect(screen.getByRole('button', { name: 'CSV' })).toBeDisabled()

    cleanup()
    setRows([row()])
    await searchWith('2026-06-01', '2026-06-30')
    expect(screen.getByRole('button', { name: 'CSV' })).toBeEnabled()
  })
})
