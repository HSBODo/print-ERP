import axios from 'axios'
import { apiClient } from '#shared/api/client'
import { clearStoredAuthSession, readStoredAuthSession } from './session'

const WHITELIST = new Set(['/auth/login'])

/** API 클라이언트에 저장된 세션 토큰과 401 처리(세션 정리 → 로그인 이동)를 연결한다. 앱 시작 시 한 번 호출. */
export const connectApiClientAuth = () => {
  apiClient.interceptors.request.use((config) => {
    const { token } = readStoredAuthSession()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  apiClient.interceptors.response.use(undefined, (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && !WHITELIST.has(error.config?.url ?? '')) {
      clearStoredAuthSession()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      return Promise.reject(new Error('세션이 만료되었습니다. 다시 로그인해주세요.'))
    }
    return Promise.reject(error)
  })
}
