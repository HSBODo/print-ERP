import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useAuthStore } from '#domain/support/session/store'

import { authApi } from '../../api'

const loginSchema = z.object({
  loginId: z.string().trim().min(1, '아이디를 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { loginId: '', password: '' },
  })

  const onSubmit = async (data: LoginForm) => {
    setSubmitError(null)

    try {
      const res = await authApi.login(data)
      login(res.token, res.user)
      navigate({ to: '/' })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : '로그인에 실패했습니다.'
      setSubmitError(message)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-blue-800 to-cyan-700 flex-col justify-between p-12 text-white relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center font-bold text-sm">
            B
          </div>
          <span className="text-xl font-semibold">B&VIIT Analytics</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold leading-tight mb-6">
            데이터로 보는
            <br />
            <span className="text-cyan-300">병원 경영 인사이트</span>
          </h2>
          <p className="text-blue-200 text-lg leading-relaxed">
            수술 실적, 매출, 예약 트렌드를 한눈에 파악하고 데이터 기반의
            의사결정을 지원합니다.
          </p>
        </div>
        <div className="relative z-10 text-blue-300 text-sm">
          &copy; 2026 B&VIIT Group. All rights reserved.
        </div>
      </div>

      {/* Right */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white mb-4 font-bold text-xl">
              B
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              B&VIIT Analytics
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">로그인</h2>
            <p className="text-gray-500 mt-2">통계 대시보드에 접속합니다.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                아이디
              </label>
              <input
                type="text"
                autoComplete="username"
                {...register('loginId')}
                placeholder="아이디 입력"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {errors.loginId && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.loginId.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                비밀번호
              </label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('password')}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {errors.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSubmitting ? '로그인 중...' : '로그인'}
            </button>
            {submitError && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {submitError}
              </p>
            )}
          </form>

          <div className="mt-8 text-center text-sm text-gray-400">
            B&VIIT Analytics v1.0
          </div>
        </div>
      </div>
    </div>
  )
}
