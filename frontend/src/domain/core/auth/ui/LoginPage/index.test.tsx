// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const loginMock = vi.fn()
const navigateMock = vi.fn()

// 외부 의존성(라우터·스토어·API)은 목으로 대체해 LoginPage 자체 동작만 검증한다.
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => navigateMock }))
vi.mock('#domain/support/session/store', () => ({
  useAuthStore: (selector: (state: { login: typeof loginMock }) => unknown) => selector({ login: loginMock }),
}))
vi.mock('../../api', () => ({ authApi: { login: vi.fn() } }))

import { LoginPage } from '.'
import { authApi } from '../../api'

const loginApi = vi.mocked(authApi.login)

beforeEach(() => {
  loginMock.mockReset()
  navigateMock.mockReset()
  loginApi.mockReset()
  localStorage.clear()
})
afterEach(cleanup)

const fillForm = (id: string, pw: string) => {
  fireEvent.change(screen.getByPlaceholderText('아이디 입력'), { target: { value: id } })
  fireEvent.change(screen.getByPlaceholderText('비밀번호 입력'), { target: { value: pw } })
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
    expect(await screen.findByText('비밀번호를 입력해주세요')).toBeInTheDocument()
    expect(loginApi).not.toHaveBeenCalled()
  })

  it('로그인 성공 시 세션을 저장하고 홈으로 이동한다', async () => {
    const user = { id: 1, loginId: 'admin', email: 'admin@bviit.com', name: '관리자', role: 'ADMIN' as const, department: 'ALL' as const }
    loginApi.mockResolvedValue({ token: 'jwt-token', user })

    render(<LoginPage />)
    fillForm('admin', 'pw1234')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith('jwt-token', user))
    expect(navigateMock).toHaveBeenCalledWith({ to: '/' })
  })

  it('로그인 실패 시 에러 메시지를 보여주고 이동하지 않는다', async () => {
    loginApi.mockRejectedValue(new Error('아이디 또는 비밀번호가 올바르지 않습니다.'))

    render(<LoginPage />)
    fillForm('admin', 'wrong')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
    expect(loginMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('저장 체크 후 로그인 성공하면 아이디·비밀번호를 저장한다', async () => {
    const user = { id: 1, loginId: 'admin', email: 'admin@bviit.com', name: '관리자', role: 'ADMIN' as const, department: 'ALL' as const }
    loginApi.mockResolvedValue({ token: 'jwt-token', user })

    render(<LoginPage />)
    fireEvent.click(screen.getByLabelText('아이디·비밀번호 저장'))
    fillForm('admin', 'pw1234')
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(loginMock).toHaveBeenCalled())
    expect(JSON.parse(localStorage.getItem('remembered-login') ?? 'null')).toEqual({
      loginId: 'admin',
      password: 'pw1234',
    })
  })

  it('저장된 자격증명이 있으면 필드를 채우고 체크박스를 켠다', () => {
    localStorage.setItem('remembered-login', JSON.stringify({ loginId: 'saved', password: 'savedpw' }))

    render(<LoginPage />)

    expect(screen.getByPlaceholderText('아이디 입력')).toHaveValue('saved')
    expect(screen.getByPlaceholderText('비밀번호 입력')).toHaveValue('savedpw')
    expect(screen.getByLabelText('아이디·비밀번호 저장')).toBeChecked()
  })

  it('저장 해제 후 로그인 성공하면 기존 저장값을 삭제한다', async () => {
    localStorage.setItem('remembered-login', JSON.stringify({ loginId: 'saved', password: 'savedpw' }))
    const user = { id: 1, loginId: 'admin', email: 'admin@bviit.com', name: '관리자', role: 'ADMIN' as const, department: 'ALL' as const }
    loginApi.mockResolvedValue({ token: 'jwt-token', user })

    render(<LoginPage />)
    fireEvent.click(screen.getByLabelText('아이디·비밀번호 저장')) // 체크 해제
    fireEvent.click(screen.getByRole('button', { name: '로그인' }))

    await waitFor(() => expect(loginMock).toHaveBeenCalled())
    expect(localStorage.getItem('remembered-login')).toBeNull()
  })
})
