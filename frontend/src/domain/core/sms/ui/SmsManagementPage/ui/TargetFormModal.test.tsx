// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
  SmsLookup,
  SmsTargetRequest,
  SmsTemplate,
} from '../../../type/api'
import { TargetFormModal } from './TargetFormModal'

/**
 * 대상 추가 팝업의 계약 — 여기서 어긋나면 **다른 환자 정보가 저장된다**.
 *
 *  - 차트번호를 바꾸면 이전 조회 결과와 자동 입력값은 즉시 버려야 한다.
 *  - 조회 전에는 차트번호 외에 아무것도 입력할 수 없다.
 *  - 수정 모드는 연락처만 연다(나머지는 CRM 원천값이라 잠근다).
 */

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), warning: vi.fn(), success: vi.fn() },
}))

const EMPTY: SmsTargetRequest = {
  chartNo: '',
  name: '',
  phone: '',
  surgeryDate: '',
  surgeryType: '',
  opType: '',
  surgeryR: '',
  surgeryL: '',
}

const lookupResult = (over: Partial<SmsLookup> = {}): SmsLookup => ({
  found: true,
  alreadyRegistered: false,
  chartNo: '2234451',
  name: '홍길동',
  phone: '01080690814',
  surgeryDate: '2026-08-06',
  surgeryType: '시력교정',
  opType: 'smilePro',
  surgeryR: 'SMILE PRO',
  surgeryL: 'SMILE PRO',
  ...over,
})

/** 수술 분류 선택지의 출처 — 서버가 내려주는 그룹 정의를 그대로 쓴다. */
const TEMPLATES: SmsTemplate[] = [
  {
    code: 'T1',
    label: '수술 후 안내 1차',
    tier: 1,
    groups: [
      {
        groupCode: 'SMILE',
        groupLabel: '스마일수술',
        opTypes: ['smilePro', 'smile'],
        offsetDays: 1,
        alimtalkReady: true,
        smsReady: true,
      },
      {
        groupCode: 'LASEK',
        groupLabel: '라섹',
        opTypes: ['lasek'],
        offsetDays: 5,
        alimtalkReady: true,
        smsReady: true,
      },
      {
        groupCode: 'ETC',
        groupLabel: '기타',
        opTypes: [],
        offsetDays: 1,
        alimtalkReady: false,
        smsReady: false,
      },
    ],
  },
]

const renderModal = (
  over: Partial<Parameters<typeof TargetFormModal>[0]> = {},
) => {
  const onSubmit = vi.fn()
  const onLookup = vi.fn(async () => lookupResult())
  render(
    <TargetFormModal
      title="발송 대상 추가"
      initial={EMPTY}
      mode="create"
      templates={TEMPLATES}
      pending={false}
      lookupPending={false}
      onLookup={onLookup}
      onSubmit={onSubmit}
      onClose={vi.fn()}
      {...over}
    />,
  )
  return { onSubmit, onLookup }
}

const field = (label: string) =>
  screen.getByLabelText(label) as HTMLInputElement
const clickButton = (text: string) => {
  const button = screen.getByText(text, { selector: 'button' })
  fireEvent.click(button)
}
/** 조회 버튼은 아이콘 + 텍스트라 텍스트 노드로 찾은 뒤 버튼을 누른다. */
const clickLookup = () => {
  const label = screen.getByText('조회')
  fireEvent.click(label.closest('button') as HTMLButtonElement)
}

afterEach(cleanup)

describe('대상 추가 팝업', () => {
  it('조회 전에는 차트번호 외 항목이 잠겨 있다', () => {
    renderModal()
    expect(field('차트번호')).toBeEnabled()
    expect(field('연락처')).toBeDisabled()
    expect(field('이름')).toBeDisabled()
  })

  it('조회하면 환자 정보가 채워진다', async () => {
    renderModal()
    fireEvent.change(field('차트번호'), { target: { value: '2234451' } })
    clickLookup()

    await waitFor(() => expect(field('이름')).toHaveValue('홍길동'))
    expect(field('연락처')).toHaveValue('01080690814')
    expect(field('수술일')).toHaveValue('2026-08-06')
  })

  it('차트번호를 바꾸면 이전 조회 결과가 즉시 사라진다', async () => {
    // 이게 안 되면 A 를 조회해 채운 정보가 B 차트번호로 저장된다.
    renderModal()
    fireEvent.change(field('차트번호'), { target: { value: '2234451' } })
    clickLookup()
    await waitFor(() => expect(field('이름')).toHaveValue('홍길동'))

    fireEvent.change(field('차트번호'), { target: { value: '9999999' } })

    expect(field('이름')).toHaveValue('')
    expect(field('연락처')).toHaveValue('')
    expect(screen.getByText(/차트번호를 조회하면/)).toBeInTheDocument()
  })

  it('조회하지 않고는 저장할 수 없다', () => {
    const { onSubmit } = renderModal()
    fireEvent.change(field('차트번호'), { target: { value: '2234451' } })
    clickButton('저장')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('조회로 받은 수술 종류까지 저장 요청에 담는다', async () => {
    // opType 이 빠지면 수동 추가 행의 수술 종류가 영영 빈칸으로 남는다.
    const { onSubmit } = renderModal()
    fireEvent.change(field('차트번호'), { target: { value: '2234451' } })
    clickLookup()
    await waitFor(() => expect(field('이름')).toHaveValue('홍길동'))

    clickButton('저장')
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        chartNo: '2234451',
        opType: 'smilePro',
        phone: '01080690814',
      }),
    )
  })

  it('마트에 없는 사람은 수술 분류를 골라야 저장된다', async () => {
    // 분류가 비면 ETC 로 떨어지고, ETC 문구가 없어 영영 발송되지 않는 행이 된다.
    const { onSubmit, onLookup } = renderModal()
    onLookup.mockResolvedValueOnce(
      lookupResult({ found: false, name: '', phone: '', opType: '' }),
    )
    fireEvent.change(field('차트번호'), { target: { value: '9999999' } })
    clickLookup()
    await waitFor(() =>
      expect(screen.getByLabelText('수술 분류')).toBeInTheDocument(),
    )

    fireEvent.change(field('연락처'), { target: { value: '01080690814' } })
    clickButton('저장')
    expect(onSubmit).not.toHaveBeenCalled() // 분류를 안 골랐다

    fireEvent.change(screen.getByLabelText('수술 분류'), {
      target: { value: 'lasek' },
    })
    clickButton('저장')
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ chartNo: '9999999', opType: 'lasek' }),
    )
  })

  it('조회로 분류가 채워졌으면 분류 선택을 묻지 않는다', async () => {
    renderModal()
    fireEvent.change(field('차트번호'), { target: { value: '2234451' } })
    clickLookup()
    await waitFor(() => expect(field('이름')).toHaveValue('홍길동'))
    expect(screen.queryByLabelText('수술 분류')).not.toBeInTheDocument()
  })

  it('수정 모드는 연락처만 열고 차트번호는 잠근다', () => {
    renderModal({
      mode: 'edit',
      title: '발송대상 수정',
      initial: {
        ...EMPTY,
        chartNo: '2234451',
        name: '홍길동',
        phone: '01080690814',
      },
    })
    expect(field('차트번호')).toBeDisabled()
    expect(field('연락처')).toBeEnabled()
    expect(field('이름')).toBeDisabled()
    // 조회 버튼이 없어야 한다 — 수정은 다시 조회할 일이 없다.
    expect(screen.queryByText('조회')).not.toBeInTheDocument()
  })
})
