import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useCreateUser, useUpdateUser } from '@/hooks/admin/useUsers'
import type { UserRow } from '@/api/admin/users'
import type { UserDepartment, UserRole } from '@/stores/auth-session'

/**
 * ADMIN·DIRECTOR ↔ ALL · MANAGER·STAFF ↔ MEDICAL/MARKETING 조합 강제
 * (백엔드 CHECK 제약과 동일 · docs/auth/permissions.md § 2-3).
 */
const isValidCombination = (role: UserRole, department: UserDepartment) => {
  if (role === 'ADMIN' || role === 'DIRECTOR') return department === 'ALL'
  return department === 'MEDICAL' || department === 'MARKETING'
}

const baseFields = {
  email: z.string().trim().email('이메일 형식이 올바르지 않습니다'),
  name: z.string().trim().min(1, '이름을 입력하세요').max(100),
  role: z.enum(['ADMIN', 'DIRECTOR', 'MANAGER', 'STAFF'] as const),
  department: z.enum(['ALL', 'MEDICAL', 'MARKETING'] as const),
}

const createSchema = z
  .object({
    ...baseFields,
    loginId: z
      .string()
      .trim()
      .toLowerCase()
      .min(2, '아이디는 2자 이상')
      .max(50)
      .regex(/^[a-z0-9._-]+$/i, '영문·숫자·. _ - 만 가능'),
    password: z.string().min(12, '비밀번호는 12자 이상'),
  })
  .refine((v) => isValidCombination(v.role, v.department), {
    message: '롤·부서 조합이 유효하지 않습니다 (ADMIN/DIRECTOR ↔ ALL · MANAGER/STAFF ↔ MEDICAL/MARKETING)',
    path: ['department'],
  })

const updateSchema = z
  .object({
    ...baseFields,
    password: z
      .string()
      .min(0)
      .refine((v) => v === '' || v.length >= 12, '비밀번호는 12자 이상 (빈 값이면 유지)'),
  })
  .refine((v) => isValidCombination(v.role, v.department), {
    message: '롤·부서 조합이 유효하지 않습니다',
    path: ['department'],
  })

type CreateForm = z.infer<typeof createSchema>
type UpdateForm = z.infer<typeof updateSchema>

interface Props {
  mode: 'create' | 'edit'
  user?: UserRow
  isSelf?: boolean
  onClose: () => void
}

export function UserFormDialog({ mode, user, isSelf, onClose }: Props) {
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const isPending = createMutation.isPending || updateMutation.isPending

  const form = useForm<CreateForm | UpdateForm>({
    resolver: zodResolver(mode === 'create' ? createSchema : updateSchema),
    defaultValues:
      mode === 'edit' && user
        ? { email: user.email, name: user.name, role: user.role, department: user.department, password: '' }
        : {
            loginId: '',
            email: '',
            name: '',
            role: 'STAFF' as UserRole,
            department: 'MEDICAL' as UserDepartment,
            password: '',
          },
  })

  const { register, handleSubmit, watch, setValue, formState } = form
  const currentRole = watch('role')

  // 롤 변경 시 부서 자동 정규화 (ADMIN/DIRECTOR → ALL, MANAGER/STAFF → MEDICAL 기본).
  useEffect(() => {
    if (currentRole === 'ADMIN' || currentRole === 'DIRECTOR') {
      setValue('department', 'ALL')
    } else {
      const currentDept = form.getValues('department')
      if (currentDept === 'ALL') setValue('department', 'MEDICAL')
    }
  }, [currentRole, setValue, form])

  const onSubmit = async (values: CreateForm | UpdateForm) => {
    try {
      if (mode === 'create') {
        const v = values as CreateForm
        await createMutation.mutateAsync({
          loginId: v.loginId,
          email: v.email,
          name: v.name,
          password: v.password,
          role: v.role,
          department: v.department,
        })
        toast.success(`${v.loginId} 계정 생성`)
      } else if (user) {
        const v = values as UpdateForm
        await updateMutation.mutateAsync({
          id: user.id,
          payload: {
            email: v.email,
            name: v.name,
            role: v.role,
            department: v.department,
            password: v.password && v.password.length > 0 ? v.password : null,
          },
        })
        toast.success(`${user.loginId} 편집 완료`)
      }
      onClose()
    } catch (e) {
      const message = e instanceof Error ? e.message : '요청 실패'
      toast.error(message)
    }
  }

  const roleFieldDisabled = mode === 'edit' && isSelf === true

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'create' ? '신규 계정' : `${user?.loginId} 편집`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            aria-label="닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4 text-sm">
          {mode === 'create' && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">아이디</label>
              <input
                type="text"
                autoComplete="off"
                {...register('loginId' as keyof CreateForm)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="영문 소문자·숫자"
              />
              {'loginId' in formState.errors && (
                <p className="text-red-500 text-xs mt-1">{formState.errors.loginId?.message as string}</p>
              )}
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-medium mb-1">이메일</label>
            <input
              type="email"
              autoComplete="off"
              {...register('email')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {formState.errors.email && (
              <p className="text-red-500 text-xs mt-1">{formState.errors.email.message as string}</p>
            )}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">이름</label>
            <input
              type="text"
              autoComplete="off"
              {...register('name')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {formState.errors.name && (
              <p className="text-red-500 text-xs mt-1">{formState.errors.name.message as string}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                롤
                {roleFieldDisabled && (
                  <span className="ml-1 text-xs text-gray-400 font-normal">(자기 자신 변경 불가)</span>
                )}
              </label>
              <select
                {...register('role')}
                disabled={roleFieldDisabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="ADMIN">ADMIN(관리자)</option>
                <option value="DIRECTOR">DIRECTOR (임원)</option>
                <option value="MANAGER">MANAGER (실장·팀장)</option>
                <option value="STAFF">STAFF (실무자)</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-1">부서</label>
              <select
                {...register('department')}
                disabled={roleFieldDisabled || currentRole === 'ADMIN' || currentRole === 'DIRECTOR'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:bg-gray-50 disabled:text-gray-500"
              >
                {(currentRole === 'ADMIN' || currentRole === 'DIRECTOR') ? (
                  <option value="ALL">ALL</option>
                ) : (
                  <>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="MARKETING">MARKETING</option>
                  </>
                )}
              </select>
              {formState.errors.department && (
                <p className="text-red-500 text-xs mt-1">{formState.errors.department.message as string}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              비밀번호
              {mode === 'edit' && (
                <span className="ml-1 text-xs text-gray-400 font-normal">(비워두면 기존 값 유지)</span>
              )}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              {...register('password')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="12자 이상"
            />
            {formState.errors.password && (
              <p className="text-red-500 text-xs mt-1">{formState.errors.password.message as string}</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '저장 중…' : mode === 'create' ? '생성' : '저장'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
