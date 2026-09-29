import { create } from 'zustand'
import {
  clearStoredAuthSession,
  normalizeAuthUser,
  persistAuthSession,
  readStoredAuthSession,
  type AuthUser,
} from './session'

const initialSession = readStoredAuthSession()

interface AuthState {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: initialSession.user,
  token: initialSession.token,
  isAuthenticated: initialSession.isAuthenticated,

  login: (token, user) => {
    const normalizedUser = normalizeAuthUser(user)
    persistAuthSession(token, normalizedUser)
    set({ token, user: normalizedUser, isAuthenticated: true })
  },

  logout: () => {
    clearStoredAuthSession()
    set({ token: null, user: null, isAuthenticated: false })
  },
}))
