import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { useDeleteUser, useUsers } from '@/hooks/admin/useUsers'
import type { UserRow } from '@/api/admin/users'
import { UserFormDialog } from './UserFormDialog'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'

/**
 * 계정 관리 페이지 — ADMIN 전용 (SecurityConfig + pageRegistry 이중 방어).
 *
 * <p>기능:
 * <ul>
 *   <li>목록 조회 · [신규 추가] · [편집] · [삭제]</li>
 *   <li>자기 자신은 롤·부서 변경 불가 (백엔드에서 400) · 삭제 불가 (버튼 자체 비활성)</li>
 *   <li>비밀번호는 편집 폼에 포함 · 빈 값이면 기존 유지</li>
 *   <li>삭제는 확인 모달 한 번 더</li>
 * </ul>
 */
export function AccountManagementPage() {
  const currentLoginId = useAuthStore((s) => s.user?.loginId)
  const { data: users, isLoading, isError, error } = useUsers()
  const deleteMutation = useDeleteUser()

  const [formTarget, setFormTarget] = useState<{ mode: 'create' } | { mode: 'edit'; user: UserRow } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast.success(`${deleteTarget.loginId} 삭제 완료`)
      setDeleteTarget(null)
    } catch (e) {
      const message = e instanceof Error ? e.message : '삭제 실패'
      toast.error(message)
    }
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">계정 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            사용자 계정을 신규 추가·편집·삭제합니다. 자기 자신의 롤·부서는 변경할 수 없고, 자기 자신은 삭제할 수 없습니다.
          </p>
        </div>
        <Button onClick={() => setFormTarget({ mode: 'create' })}>
          <Plus className="h-4 w-4 mr-1.5" />
          신규 추가
        </Button>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
              <th className="px-4 py-3 font-medium">아이디</th>
              <th className="px-4 py-3 font-medium">이름</th>
              <th className="px-4 py-3 font-medium">이메일</th>
              <th className="px-4 py-3 font-medium">롤</th>
              <th className="px-4 py-3 font-medium">부서</th>
              <th className="px-4 py-3 font-medium w-32 text-right">액션</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  불러오는 중…
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-red-500">
                  {error instanceof Error ? error.message : '조회 실패'}
                </td>
              </tr>
            )}
            {users?.map((u) => {
              const isSelf = currentLoginId != null && u.loginId.toLowerCase() === currentLoginId.toLowerCase()
              return (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-gray-900">
                    {u.loginId}
                    {isSelf && (
                      <span className="ml-2 text-[10px] rounded bg-blue-50 text-blue-700 px-1.5 py-0.5 border border-blue-200 font-sans">
                        나
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-700">
                      {u.department}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormTarget({ mode: 'edit', user: u })}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="ml-1">편집</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isSelf}
                        title={isSelf ? '자기 자신은 삭제할 수 없습니다' : undefined}
                        onClick={() => setDeleteTarget(u)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:text-gray-300"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="ml-1">삭제</span>
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {users && users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  등록된 사용자가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {formTarget && (
        <UserFormDialog
          mode={formTarget.mode}
          user={formTarget.mode === 'edit' ? formTarget.user : undefined}
          isSelf={
            formTarget.mode === 'edit' &&
            currentLoginId != null &&
            formTarget.user.loginId.toLowerCase() === currentLoginId.toLowerCase()
          }
          onClose={() => setFormTarget(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmDialog
          user={deleteTarget}
          isSubmitting={deleteMutation.isPending}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
