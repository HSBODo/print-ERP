// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const loginMock = vi.fn()
const navigateMock = vi.fn()

// 외부 의존성(라우터·스토어·API)은 목으로 대체해 LoginPage 자체 동작만 검증한다.
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('#domain/support/session/store', () => ({
  useAuthStore: (selector: (state: { login: typeof loginMock }) => unknown) =>
    selector({ login: loginMock }),
}))
vi.mock('../../api', () => ({ authApi: { login: vi.fn() } }))

import { authApi } from '../../api'
import { LoginPage } from '.'

const loginApi = vi.mocked(authApi.login)

beforeEach(() => {
  loginMock.mockReset()
  navigateMock.mockReset()
  loginApi.mockReset()
})
afterEach(cleanup)

const fillForm = (id: string, pw: string) => {
  fireEvent.change(screen.getByPlaceholderText('아이디 입력'), {
    target: { value: id },
  })
  fireEvent.change(screen.getByPlaceholderText('비밀번호 입력'), {
    target: { value: pw },
  })
}

describe('LoginPage', () => {
  it('아이디·비밀번호 입력 필드와 로그인 버튼을 렌더한다', () => {
    render(<LoginPage />)

    expect(screen.getByPlaceholderText('아이디 입력')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('비밀번호 입력')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
  })

  it('빈 값으로 제출하면 Zod 검증 메시지를 보여준다', async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('아이디를 입력해주세요')).toBeInTheDocument()
    expect(
      await screen.findByText('비밀번호를 입력해주세요'),
    ).toBeInTheDocument()
    expect(loginApi).not.toHaveBeenCalled()
  })

  it('로그인 성공 시 세션을 저장하고 홈으로 이동한다', async () => {
    const user = {
      id: 1,
      loginId: 'admin',
      email: 'admin@bviit.com',
      name: '관리자',
      role: 'ADMIN' as const,
      department: 'ALL' as const,
    }
    loginApi.mockResolvedValue({ token: 'jwt-token', user })

    render(<LoginPage />)
    fillForm('admin', 'pw1234')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() =>
      expect(loginMock).toHaveBeenCalledWith('jwt-token', user),
    )
    expect(navigateMock).toHaveBeenCalledWith({ to: '/' })
  })

  it('로그인 실패 시 에러 메시지를 보여주고 이동하지 않는다', async () => {
    loginApi.mockRejectedValue(
      new Error('아이디 또는 비밀번호가 올바르지 않습니다.'),
    )

    render(<LoginPage />)
    fillForm('admin', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(
      await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다.'),
    ).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
