import { z } from 'zod'
import { apiResponseOf } from '#shared/api/utils'

export interface LoginRequest {
  loginId: string
  password: string
}

const loginUserSchema = z.object({
  id: z.number(),
  loginId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'STAFF'] as const),
  /** ADMIN·DIRECTOR 는 'ALL' (docs/auth/permissions.md § 2-3). */
  department: z.enum([
    'ALL',
    'MEDICAL',
    'MARKETING',
    'OVERSEAS_MARKETING',
  ] as const),
})

export type LoginUser = z.infer<typeof loginUserSchema>

const loginDataSchema = z.object({
  token: z.string(),
  user: loginUserSchema,
})

export type LoginData = z.infer<typeof loginDataSchema>

export const loginResponseSchema = apiResponseOf(loginDataSchema)
