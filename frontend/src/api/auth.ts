import { api } from './client'
import type { UserDepartment, UserRole } from '@/stores/auth-session'

export interface LoginRequest {
  loginId: string
  password: string
}

export interface LoginUser {
  id: number
  loginId: string
  email: string
  name: string
  role: UserRole
  /** ADMIN·DIRECTOR 는 'ALL' (docs/auth/permissions.md § 2-3). */
  department: UserDepartment
}

export interface LoginData {
  token: string
  user: LoginUser
}

interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginData> => {
    const res = await api.post<ApiResponse<LoginData>>('/auth/login', data)
    return res.data
  },
}
