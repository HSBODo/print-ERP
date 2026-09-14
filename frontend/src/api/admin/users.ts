import { z } from 'zod'
import { api } from '@/api/client'
import { apiResponseOf } from '@/api/_shared'
import type { UserDepartment, UserRole } from '@/stores/auth-session'

const userRowSchema = z.object({
  id: z.number(),
  loginId: z.string(),
  email: z.string(),
  name: z.string(),
  role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'STAFF'] as const),
  department: z.enum(['ALL', 'MEDICAL', 'MARKETING', 'OVERSEAS_MARKETING'] as const),
})
export type UserRow = z.infer<typeof userRowSchema>

const listResponseSchema = apiResponseOf(z.array(userRowSchema))
const singleResponseSchema = apiResponseOf(userRowSchema)

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

const BASE = '/admin/users'

export const usersApi = {
  list: async (): Promise<UserRow[]> => {
    const res = await api.get<unknown>(BASE)
    return listResponseSchema.parse(res).data
  },
  get: async (id: number): Promise<UserRow> => {
    const res = await api.get<unknown>(`${BASE}/${id}`)
    return singleResponseSchema.parse(res).data
  },
  create: async (payload: UserCreatePayload): Promise<UserRow> => {
    const res = await api.post<unknown>(BASE, payload)
    return singleResponseSchema.parse(res).data
  },
  update: async (id: number, payload: UserUpdatePayload): Promise<UserRow> => {
    const res = await api.put<unknown>(`${BASE}/${id}`, payload)
    return singleResponseSchema.parse(res).data
  },
  remove: async (id: number): Promise<void> => {
    // 성공 응답은 { success: true } (backend ApiResponse.ok(null) 이 @JsonInclude(NON_NULL)
    // 로 data 필드 자체가 생략됨). 실패는 request() 가 예외로 던지므로 스키마 검증 없이 fire-and-forget.
    await api.delete<unknown>(`${BASE}/${id}`)
  },
}
