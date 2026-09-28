import { setAuthHandlers } from '#shared/api/client'
import { clearStoredAuthSession, readStoredAuthSession } from './session'

/** API 클라이언트에 저장된 세션 토큰과 401 처리(세션 정리 → 로그인 이동)를 연결한다. 앱 시작 시 한 번 호출. */
export const connectApiClientAuth = () => {
  setAuthHandlers({
    getToken: () => readStoredAuthSession().token,
    onUnauthorized: () => {
      clearStoredAuthSession()
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    },
  })
}
