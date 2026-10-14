import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { accountApi } from '../api'
import type { UserCreatePayload, UserUpdatePayload } from '../type/api'

const USERS_KEY = ['admin', 'users'] as const

export const useUsers = () =>
  useQuery({
    queryKey: USERS_KEY,
    queryFn: ({ signal }) => accountApi.list(signal),
  })

export const useCreateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserCreatePayload) => accountApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export const useUpdateUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UserUpdatePayload }) =>
      accountApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}

export const useDeleteUser = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => accountApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: USERS_KEY }),
  })
}
