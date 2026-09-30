import axios, { type AxiosResponse } from 'axios'
import { api } from '#shared/api/client'
import { clearStoredAuthSession, readStoredAuthSession } from './session'

const WHITELIST = new Set(['/auth/login'])

const messageOf = ({ data, status, statusText }: AxiosResponse) => {
  if (typeof data === 'string' && data.trim()) {
    return data
  }

  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string' &&
    data.message.trim()
  ) {
    return data.message
  }

  return statusText || `HTTP ${status}`
}

/** API 클라이언트 interceptor 등록 — 세션 토큰 부착, 401 처리(세션 정리 → 로그인 이동), 에러 메시지. 앱 시작 시 한 번 호출. */
export const initApiClient = () => {
  api.interceptors.request.use((config) => {
    const { token } = readStoredAuthSession()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  api.interceptors.response.use(undefined, (error: unknown) => {
    if (!axios.isAxiosError(error) || !error.response) {
      return Promise.reject(error)
    }

    if (
      error.response.status === 401 &&
      !WHITELIST.has(error.config?.url ?? '')
    ) {
      clearStoredAuthSession()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(
        new Error('세션이 만료되었습니다. 다시 로그인해주세요.'),
      )
    }

    // 화면은 e.message 로 서버 메시지를 띄운다.
    error.message = messageOf(error.response)
    return Promise.reject(error)
  })
}
