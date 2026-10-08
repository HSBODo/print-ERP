import { Card, CardContent, CardHeader } from '#shared/ui/Card'

/** 월간 레포트 로딩 스켈레톤 — 차트 카드(제목·범례·차트영역·표) 모양을 펄스로 표시 */
export function ReportChartSkeleton() {
  return (
    <Card className="report-chart flex break-inside-avoid flex-col border-border/70 shadow-sm">
      <CardHeader className="items-center gap-2 pb-2">
        <div className="h-5 w-44 animate-pulse rounded bg-muted" />
        <div className="flex gap-5 pt-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-12 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex h-[480px] flex-col justify-between py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-px w-full animate-pulse rounded bg-muted"
            />
          ))}
        </div>
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-4 w-full animate-pulse rounded bg-muted"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
