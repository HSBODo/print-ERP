import { api } from '#shared/api/client'

import {
  type LoginData,
  type LoginRequest,
  loginResponseSchema,
} from './type/api'

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginData> => {
    const res = await api.post<unknown>('/auth/login', data)
    return loginResponseSchema.parse(res.data).data
  },
}
