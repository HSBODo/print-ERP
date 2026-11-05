import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'

export const Route = createFileRoute('/_auth/orders/new')({
  component: OrderCreatePage,
  staticData: {
    page: {
      id: 'order-create',
      label: '신규 수주',
      section: '수주 관리',
      status: 'frontend-only',
      access: { department: 'TEAM_A' },
    },
  },
})

function OrderCreatePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>신규 수주</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            수주 등록 폼(기본정보·고객제품·공정경로·비고)이 들어옵니다. (Step
            3 에서 구현)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
