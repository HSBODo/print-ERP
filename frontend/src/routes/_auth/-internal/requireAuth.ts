import { redirect } from '@tanstack/react-router'
import { readStoredAuthSession } from '@/stores/auth-session'

/**
 * 인증 가드 — 저장된 토큰이 없으면 /login으로 리다이렉트한다.
 * _auth 레이아웃 라우트의 beforeLoad 에서 사용. 라우트 파일에서 분리해 단위 테스트가 가능하도록 둔다.
 */
export function requireAuth(): void {
  const { token } = readStoredAuthSession()
  if (!token) {
    throw redirect({ to: '/login' })
  }
}
