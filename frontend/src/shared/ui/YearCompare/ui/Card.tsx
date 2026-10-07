import type { ReactNode } from 'react'

import {
  Card as ShadcnCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#shared/ui/Card'
import { PanelShell } from '#shared/ui/PanelShell'

interface Props {
  isLoading: boolean
  isError: boolean
  title: ReactNode
  description: ReactNode
  /** 머리 오른쪽 — 보통 <YearCompare.Tabs> */
  tabs?: ReactNode
  /** 본문 — 세로로 쌓인다 (차트 · 표) */
  children: ReactNode
}

/** 연도 비교 카드 — 로딩/에러 · 제목·설명 · 탭 + 본문. 남은 높이를 채운다. */
export function Card({
  isLoading,
  isError,
  title,
  description,
  tabs,
  children,
}: Props) {
  return (
    <PanelShell
      isLoading={isLoading}
      isError={isError}
      variant="line"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ShadcnCard className="flex min-h-0 flex-1 flex-col border-border/70 shadow-sm">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          {tabs}
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-4">
          {children}
        </CardContent>
      </ShadcnCard>
    </PanelShell>
  )
}
