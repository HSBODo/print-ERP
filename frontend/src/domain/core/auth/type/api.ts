import type { UserDepartment, UserRole } from '#domain/support/session/session'

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

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}
