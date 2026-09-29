import { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import { PanelShell } from '#shared/ui/PanelShell'
import {
  SURGERY_TYPES,
  type MonthlyData,
} from './surgeryRatioUtils'

interface KpiCardsPanelProps {
  selectedData: MonthlyData
  baseLabel: string
  isLoading: boolean
  isError: boolean
}

export function KpiCardsPanel({
  selectedData,
  baseLabel,
  isLoading,
  isError,
}: KpiCardsPanelProps) {
  const totalCases = useMemo(
    () => Object.values(selectedData).reduce((sum, value) => sum + value, 0),
    [selectedData],
  )

  const shareData = useMemo(
    () =>
      SURGERY_TYPES.map((type) => ({
        key: type.key,
        name: type.label,
        value: selectedData[type.key],
        share: totalCases ? Number(((selectedData[type.key] / totalCases) * 100).toFixed(1)) : 0,
      }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value),
    [selectedData, totalCases],
  )

  const topSurgery = shareData[0]
  const premiumShare = shareData
    .filter((item) => ['smile', 'smilePro', 'icl', 'tIcl', 'viva'].includes(item.key))
    .reduce((sum, item) => sum + item.share, 0)
  const cataractTotal = shareData
    .filter((item) => item.key.startsWith('cat'))
    .reduce((sum, item) => sum + item.value, 0)
  const premiumCataractShare = cataractTotal
    ? Number((((selectedData.catMulti + selectedData.catEdof) / cataractTotal) * 100).toFixed(1))
    : 0

  const renderCards = () => (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="gap-2 border-border/70 shadow-sm">
        <CardHeader className="gap-0.5 pb-0">
          <CardTitle className="text-base font-semibold text-gray-900">전체 수술 볼륨</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-semibold tracking-tight text-gray-900">{totalCases.toLocaleString()}건</p>
          <p className="text-sm text-muted-foreground">{baseLabel} 기준</p>
        </CardContent>
      </Card>

      <Card className="gap-2 border-border/70 shadow-sm">
        <CardHeader className="gap-0.5 pb-0">
          <CardTitle className="text-base font-semibold text-gray-900">최대 비중 수술</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-semibold tracking-tight text-gray-900">{topSurgery?.name ?? '-'}</p>
          <p className="text-sm text-muted-foreground">{topSurgery?.share.toFixed(1) ?? '0.0'}% 비중</p>
        </CardContent>
      </Card>

      <Card className="gap-2 border-border/70 shadow-sm">
        <CardHeader className="gap-0.5 pb-0">
          <CardTitle className="text-base font-semibold text-gray-900">프리미엄 수술 비중</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-semibold tracking-tight text-gray-900">{premiumShare.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">스마일/스마일프로/ICL/VIVA 합산</p>
        </CardContent>
      </Card>

      <Card className="gap-2 border-border/70 shadow-sm">
        <CardHeader className="gap-0.5 pb-0">
          <CardTitle className="text-base font-semibold text-gray-900">백내장 프리미엄 렌즈 비중</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-3xl font-semibold tracking-tight text-gray-900">{premiumCataractShare.toFixed(1)}%</p>
          <p className="text-sm text-muted-foreground">다초점·연속초점 렌즈 기준</p>
        </CardContent>
      </Card>
    </section>
  )

  return <PanelShell isLoading={isLoading} isError={isError} variant="kpi">{renderCards()}</PanelShell>
}
