import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'
import type { UserDepartment, UserRole } from '#domain/support/session/session'

const userRowSchema = z.object({
  id: z.number(),
  loginId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'STAFF'] as const),
  department: z.enum(['ALL', 'MEDICAL', 'MARKETING', 'OVERSEAS_MARKETING'] as const),
})
export type UserRow = z.infer<typeof userRowSchema>

export const listResponseSchema = apiResponseOf(z.array(userRowSchema))
export const singleResponseSchema = apiResponseOf(userRowSchema)

export interface UserCreatePayload {
  loginId: string
  email: string
  name: string
  password: string
  role: UserRole
  department: UserDepartment
}

export interface UserUpdatePayload {
  email: string
  name: string
  role: UserRole
  department: UserDepartment
  /** null 이면 기존 비밀번호 유지. 값이 있으면 최소 12자 (백엔드 검증). */
  password: string | null
}

