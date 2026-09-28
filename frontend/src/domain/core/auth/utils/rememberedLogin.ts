/**
 * 로그인 아이디·비밀번호 저장(기억) — "아이디·비밀번호 저장" 체크 시 localStorage에 보관해
 * 다음 방문 때 로그인 폼을 자동으로 채운다. 체크 해제 후 로그인하면 삭제된다.
 *
 * ⚠️ 비밀번호를 평문으로 브라우저 localStorage에 저장한다. 사내 대시보드 편의 기능으로,
 * 공용 PC에서는 사용하지 않도록 안내가 필요하다.
 */
export interface RememberedLogin {
  loginId: string
  password: string
}

const STORAGE_KEY = 'remembered-login'

const getStorage = (): Storage | null => (typeof localStorage === 'undefined' ? null : localStorage)

export const readRememberedLogin = (): RememberedLogin | null => {
  const storage = getStorage()
  if (!storage) return null

  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<RememberedLogin>
    if (typeof parsed?.loginId === 'string' && parsed.loginId && typeof parsed?.password === 'string') {
      return { loginId: parsed.loginId, password: parsed.password }
    }
  } catch {
    // 손상된 값은 무시하고 정리한다.
  }

  storage.removeItem(STORAGE_KEY)
  return null
}

export const saveRememberedLogin = (credentials: RememberedLogin): void => {
  getStorage()?.setItem(STORAGE_KEY, JSON.stringify(credentials))
}

export const clearRememberedLogin = (): void => {
  getStorage()?.removeItem(STORAGE_KEY)
}
