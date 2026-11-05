import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'

export const Route = createFileRoute('/_auth/orders/$orderId')({
  component: OrderDetailPage,
  staticData: {
    page: {
      id: 'order-detail',
      label: '수주 상세',
      section: '수주 관리',
      status: 'frontend-only',
      access: { department: 'TEAM_A' },
    },
  },
})

function OrderDetailPage() {
  const { orderId } = Route.useParams()
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수주 상세 — {orderId}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            수주 상세·수정 화면이 들어옵니다. (Step 3 에서 구현)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
