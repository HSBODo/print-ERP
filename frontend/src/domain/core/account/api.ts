import { api } from '#shared/api/client'

import {
  type UserRow,
  listResponseSchema,
  singleResponseSchema,
  type UserCreatePayload,
  type UserUpdatePayload,
} from './type/api'

const BASE = '/admin/users'

export const accountApi = {
  list: async (signal?: AbortSignal): Promise<UserRow[]> => {
    const { data } = await api.get(BASE, { signal })
    return listResponseSchema.parse(data).data
  },
  get: async (id: number): Promise<UserRow> => {
    const { data } = await api.get(`${BASE}/${id}`)
    return singleResponseSchema.parse(data).data
  },
  create: async (payload: UserCreatePayload): Promise<UserRow> => {
    const { data } = await api.post(BASE, payload)
    return singleResponseSchema.parse(data).data
  },
  update: async (id: number, payload: UserUpdatePayload): Promise<UserRow> => {
    const { data } = await api.put(`${BASE}/${id}`, payload)
    return singleResponseSchema.parse(data).data
  },
  remove: async (id: number): Promise<void> => {
    // 성공 응답은 { success: true } (backend ApiResponse.ok(null) 이 @JsonInclude(NON_NULL)
    // 로 data 필드 자체가 생략됨). 실패는 request() 가 예외로 던지므로 스키마 검증 없이 fire-and-forget.
    await api.delete(`${BASE}/${id}`)
  },
}
