import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'

export const Route = createFileRoute('/_auth/orders/')({
  component: OrderListPage,
  staticData: {
    page: {
      id: 'order-list',
      label: '수주 목록',
      section: '수주 관리',
      status: 'frontend-only',
      access: { department: 'TEAM_A' },
    },
  },
})

function OrderListPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>수주 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            수주 목록·필터·CSV Export 화면이 들어옵니다. (Step 3 에서 구현)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
