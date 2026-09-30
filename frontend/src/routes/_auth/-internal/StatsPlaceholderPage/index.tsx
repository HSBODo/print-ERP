import { DatabaseZap, LayoutTemplate, Route, Workflow } from 'lucide-react'
import type { PageMeta } from '../pageAccess'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'

export function StatsPlaceholderPage({
  page,
  path,
}: {
  page: PageMeta
  path: string
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Route className="h-5 w-5" />
            </div>
            <CardTitle>라우트 고정</CardTitle>
            <CardDescription>
              메뉴와 실제 화면 경로가 연결된 상태입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700">
              {path}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <DatabaseZap className="h-5 w-5" />
            </div>
            <CardTitle>API 초안 고정</CardTitle>
            <CardDescription>
              DB 연결 전이라도 응답 규격은 먼저 고정합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm text-gray-700">
              {page.apiDraftPath ?? '-'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-sm">
          <CardHeader className="gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <LayoutTemplate className="h-5 w-5" />
            </div>
            <CardTitle>화면 우선 구현</CardTitle>
            <CardDescription>
              차트, 카드, 필터 UI를 먼저 완성하는 단계입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              현재는 placeholder 화면이며, 다음 단계에서 mock 데이터와 실제
              섹션이 붙습니다.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <Workflow className="h-5 w-5" />
          </div>
          <CardTitle>다음 구현 순서</CardTitle>
          <CardDescription>
            이 페이지는 같은 순서로 실제 화면으로 확장합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                1. 필터 UI 추가
              </p>
              <p className="mt-1 text-sm text-gray-600">
                기간, 채널, 수술 종류 같은 조회 조건을 페이지 상단에 배치합니다.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                2. mock 응답 연결
              </p>
              <p className="mt-1 text-sm text-gray-600">
                타입 정의를 먼저 연결해서 화면을 고정합니다.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                3. 카드/차트 배치
              </p>
              <p className="mt-1 text-sm text-gray-600">
                공통 카드와 차트 래퍼를 재사용해 화면을 실제 레이아웃으로
                만듭니다.
              </p>
            </div>
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-900">
                4. 실제 API 교체
              </p>
              <p className="mt-1 text-sm text-gray-600">
                나중에 DB가 붙으면 같은 DTO 계약으로 백엔드 응답만 교체합니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
