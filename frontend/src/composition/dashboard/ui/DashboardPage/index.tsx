import { LayoutDashboard } from 'lucide-react'

import { useAuthStore } from '#domain/support/session/store'
import { APP_NAME } from '#shared/constants/app'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'

/**
 * 메인 대시보드(HOME) — 템플릿 기본 화면.
 * 여러 도메인 데이터를 모아 보여줄 화면이라 composition 레이어에 둔다.
 */
export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          <CardTitle>{APP_NAME}</CardTitle>
          <CardDescription>
            {user ? `${user.name}님, 환영합니다.` : '환영합니다.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            이 화면은 템플릿 기본 홈입니다. 프로젝트에 맞는 대시보드로
            교체하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
