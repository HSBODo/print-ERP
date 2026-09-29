import { api } from '#shared/api/client'

import type { ApiResponse, LoginData, LoginRequest } from './type/api'

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginData> => {
    const res = await api.post<ApiResponse<LoginData>>('/auth/login', data)
    return res.data.data
  },
}
