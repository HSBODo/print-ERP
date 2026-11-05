import { createFileRoute } from '@tanstack/react-router'

import { Card, CardContent, CardHeader, CardTitle } from '#shared/ui/Card'

export const Route = createFileRoute('/_auth/workorders/')({
  component: WorkOrderQueuePage,
  staticData: {
    page: {
      id: 'workorder-queue',
      label: '공정 큐',
      section: '공정 작업',
      status: 'frontend-only',
      access: { department: 'TEAM_A' },
    },
  },
})

function WorkOrderQueuePage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>공정 큐</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            공정 탭(인쇄·합지·드라이·슬리터·기타) + 인라인 실적 입력이
            들어옵니다. (Step 3 에서 구현)
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
