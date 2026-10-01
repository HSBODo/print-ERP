import { Pencil, Plus, Search, Trash2, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { UserDepartment, UserRole } from '#domain/support/session/session'
import { useAuthStore } from '#domain/support/session/store'
import { usePagination } from '#shared/hooks/usePagination'
import { Button } from '#shared/ui/Button'
import { Card } from '#shared/ui/Card'
import { TablePagination } from '#shared/ui/TablePagination'

import { useDeleteUser, useUsers } from '../../hooks/useUsers'
import type { UserRow } from '../../type/api'
import { DeleteConfirmDialog } from './DeleteConfirmDialog'
import { UserFormDialog } from './UserFormDialog'

/**
 * 계정 관리 페이지 — ADMIN 전용 (SecurityConfig + pageRegistry 이중 방어).
 *
 * <p>기능:
 * <ul>
 *   <li>목록 조회 · [신규 추가] · [편집] · [삭제]</li>
 *   <li>자기 자신은 권한·부서 변경 불가 (백엔드에서 400) · 삭제 불가 (버튼 자체 비활성)</li>
 *   <li>비밀번호는 편집 폼에 포함 · 빈 값이면 기존 유지</li>
 *   <li>삭제는 확인 모달 한 번 더</li>
 *   <li>아이디·이름·이메일 부분일치 검색 + 권한·부서 필터 + 페이지네이션</li>
 * </ul>
 */
/** 예전 기본 20행에 가장 가까운 공통 선택지. */
const INITIAL_PAGE_SIZE = 25
const ROLE_OPTIONS: UserRole[] = ['ADMIN', 'DIRECTOR', 'MANAGER', 'STAFF']
const DEPARTMENT_OPTIONS: UserDepartment[] = ['ALL', 'MEDICAL', 'MARKETING']

/** 권한별 배지 색 — 위계에 따라 warm→cool 로 자연스럽게 내려간다 (ADMIN 이 가장 눈에 띄게). */
const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: 'bg-red-50 text-red-700 border-red-200',
  DIRECTOR: 'bg-purple-50 text-purple-700 border-purple-200',
  MANAGER: 'bg-blue-50 text-blue-700 border-blue-200',
  STAFF: 'bg-gray-50 text-gray-700 border-gray-200',
}

/** 부서 배지 색 — ALL 은 중립, MEDICAL/MARKETING 은 대비되는 색으로. */
const DEPT_BADGE: Record<UserDepartment, string> = {
  ALL: 'bg-slate-50 text-slate-700 border-slate-200',
  MEDICAL: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  MARKETING: 'bg-amber-50 text-amber-700 border-amber-200',
  // 해외마케팅 — MARKETING 계열이지만 좁은 스코프라 다른 톤(rose) 로 구분 (Topbar 배지와 통일).
  OVERSEAS_MARKETING: 'bg-rose-50 text-rose-700 border-rose-200',
}

export function AccountManagementPage() {
  const currentLoginId = useAuthStore((s) => s.user?.loginId)
  const { data: users, isLoading, isError, error } = useUsers()
  const deleteMutation = useDeleteUser()

  const [formTarget, setFormTarget] = useState<
    { mode: 'create' } | { mode: 'edit'; user: UserRow } | null
  >(null)
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null)

  // 필터 미적용 센티널은 빈 문자열 — 부서값 'ALL' 과 충돌하지 않게.
  const [keyword, setKeyword] = useState('')
  const [roleFilter, setRoleFilter] = useState<'' | UserRole>('')
  const [deptFilter, setDeptFilter] = useState<'' | UserDepartment>('')

  const filtered = useMemo(() => {
    if (!users) return []
    const kw = keyword.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter && u.role !== roleFilter) return false
      if (deptFilter && u.department !== deptFilter) return false
      if (kw) {
        const hay = `${u.loginId} ${u.name} ${u.email}`.toLowerCase()
        if (!hay.includes(kw)) return false
      }
      return true
    })
  }, [users, keyword, roleFilter, deptFilter])

  const total = filtered.length
  const grandTotal = users?.length ?? 0
  const isFiltered =
    keyword.length > 0 || roleFilter !== '' || deptFilter !== ''
  const pagination = usePagination(filtered, {
    initialPageSize: INITIAL_PAGE_SIZE,
  })

  const resetFilters = () => {
    setKeyword('')
    setRoleFilter('')
    setDeptFilter('')
    pagination.resetPage()
  }

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
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">계정 관리</h1>
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-700">
              <Users className="h-3 w-3" />총{' '}
              {grandTotal.toLocaleString('ko-KR')}명
            </span>
            {isFiltered && (
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                필터 {total.toLocaleString('ko-KR')}명
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            사용자 계정을 신규 추가·편집·삭제합니다. 자기 자신의 권한·부서는
            변경할 수 없고, 자기 자신은 삭제할 수 없습니다.
          </p>
        </div>
        <Button onClick={() => setFormTarget({ mode: 'create' })}>
          <Plus className="h-4 w-4 mr-1.5" />
          신규 추가
        </Button>
      </div>

      <Card className="flex flex-row flex-wrap items-center justify-start gap-2 p-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value)
              pagination.resetPage()
            }}
            placeholder="아이디·이름·이메일 검색"
            className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-8 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => {
                setKeyword('')
                pagination.resetPage()
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="검색어 지우기"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as '' | UserRole)
              pagination.resetPage()
            }}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            aria-label="권한 필터"
          >
            <option value="">권한 전체</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value as '' | UserDepartment)
              pagination.resetPage()
            }}
            className="rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            aria-label="부서 필터"
          >
            <option value="">부서 전체</option>
            {DEPARTMENT_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          {isFiltered && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              초기화
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="max-h-[calc(100vh-320px)] min-h-[24rem] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.06)]">
              <tr className="text-left text-xs uppercase tracking-wider text-gray-500">
                <th className="w-12 px-4 py-3 text-right font-medium">#</th>
                <th className="px-4 py-3 font-medium">아이디</th>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">이메일</th>
                <th className="px-4 py-3 font-medium">권한</th>
                <th className="px-4 py-3 font-medium">부서</th>
                <th className="w-24 px-4 py-3 text-right font-medium">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    불러오는 중…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-red-500"
                  >
                    {error instanceof Error ? error.message : '조회 실패'}
                  </td>
                </tr>
              )}
              {pagination.pageRows.map((u, i) => {
                const isSelf =
                  currentLoginId != null &&
                  u.loginId.toLowerCase() === currentLoginId.toLowerCase()
                const seq = pagination.rangeStart + i
                return (
                  <tr
                    key={u.id}
                    className={
                      isSelf
                        ? 'bg-blue-50/40 transition-colors hover:bg-blue-50/70'
                        : 'transition-colors hover:bg-gray-50'
                    }
                  >
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-gray-400 tabular-nums">
                      {seq}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-900">
                      <span className="inline-flex items-center gap-1.5">
                        {u.loginId}
                        {isSelf && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 font-sans text-[10px] font-semibold text-blue-700">
                            나
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-900">{u.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{u.email}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${ROLE_BADGE[u.role]}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center rounded border px-1.5 py-0.5 text-xs font-medium ${DEPT_BADGE[u.department]}`}
                      >
                        {u.department}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            setFormTarget({ mode: 'edit', user: u })
                          }
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                          aria-label={`${u.loginId} 편집`}
                          title="편집"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(u)}
                          className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                          aria-label={`${u.loginId} 삭제`}
                          title={
                            isSelf ? '자기 자신은 삭제할 수 없습니다' : '삭제'
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {!isLoading && !isError && pagination.pageRows.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-gray-400"
                  >
                    {grandTotal === 0
                      ? '등록된 사용자가 없습니다.'
                      : '검색 조건에 맞는 사용자가 없습니다.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          pagination={pagination}
          unit="명"
          className="border-t border-gray-100 bg-gray-50/50 px-3 py-2"
        />
      </Card>

      {formTarget && (
        <UserFormDialog
          mode={formTarget.mode}
          user={formTarget.mode === 'edit' ? formTarget.user : undefined}
          isSelf={
            formTarget.mode === 'edit' &&
            currentLoginId != null &&
            formTarget.user.loginId.toLowerCase() ===
              currentLoginId.toLowerCase()
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
