import { useState } from 'react'
import { X } from 'lucide-react'
import { Card, CardContent, CardHeader } from '#shared/ui/Card'

type SkeletonVariant = 'kpi' | 'bar' | 'line' | 'donut' | 'area'

interface PanelShellProps {
  isLoading: boolean
  isError: boolean
  children: React.ReactNode
  variant?: SkeletonVariant
  className?: string
}

function Bone({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`animate-pulse rounded bg-muted ${className ?? ''}`}
      style={style}
    />
  )
}

function KpiSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-1 pb-0">
        <Bone className="h-4 w-24" />
      </CardHeader>
      <CardContent className="space-y-3 pt-2">
        <Bone className="h-8 w-20" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-3/4" />
      </CardContent>
    </Card>
  )
}

function BarSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-1">
        <Bone className="h-5 w-28" />
        <Bone className="h-3 w-40" />
      </CardHeader>
      <CardContent>
        <div className="flex h-72 items-end gap-3 px-4 pb-6">
          {[60, 85, 45, 70, 55, 90, 40, 75].map((h, i) => (
            <Bone key={i} className="flex-1" style={{ height: `${h}%` }} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LineSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-1">
        <Bone className="h-5 w-28" />
        <Bone className="h-3 w-52" />
      </CardHeader>
      <CardContent>
        <div className="flex h-72 flex-col justify-between py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Bone key={i} className="h-px w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function DonutSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-1">
        <Bone className="h-5 w-20" />
        <Bone className="h-3 w-36" />
      </CardHeader>
      <CardContent>
        <div className="flex h-72 items-center justify-center gap-8">
          <Bone className="h-36 w-36 rounded-full" />
          <Bone className="h-36 w-36 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}

function AreaSkeleton() {
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="gap-1">
        <Bone className="h-5 w-20" />
        <Bone className="h-3 w-48" />
      </CardHeader>
      <CardContent>
        <div className="relative h-72 overflow-hidden">
          <Bone className="absolute bottom-0 h-3/5 w-full rounded-t-xl opacity-40" />
          <Bone className="absolute bottom-0 h-2/5 w-full rounded-t-xl opacity-30" />
          <Bone className="absolute bottom-0 h-1/5 w-full rounded-t-xl opacity-20" />
        </div>
      </CardContent>
    </Card>
  )
}

const SKELETON_MAP: Record<SkeletonVariant, () => React.ReactNode> = {
  kpi: KpiSkeleton,
  bar: BarSkeleton,
  line: LineSkeleton,
  donut: DonutSkeleton,
  area: AreaSkeleton,
}

export function PanelShell({
  isLoading,
  isError,
  children,
  variant = 'bar',
  className,
}: PanelShellProps) {
  const [dismissed, setDismissed] = useState(false)

  if (isLoading) {
    const Skeleton = SKELETON_MAP[variant]
    return <Skeleton />
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      {children}
      {isError && !dismissed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-gray-900/40 backdrop-blur-[2px]">
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute right-2 top-2 rounded-full bg-white/80 p-1 text-gray-500 transition-colors hover:bg-white hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
          <span className="rounded-md bg-white/90 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm">
            데이터 로드 실패
          </span>
        </div>
      )}
    </div>
  )
}
