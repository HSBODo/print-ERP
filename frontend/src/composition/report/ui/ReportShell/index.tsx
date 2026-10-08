import { Fragment, type ReactNode } from 'react'

import { ReportChartSkeleton } from './MonthlyReportCharts'

/**
 * 레포트 화면 골격 — 좌측 목차 + 정중앙 본문(인쇄 영역).
 * 월간 레포트·주차 레포트가 공유하고, 헤더 액션(툴바)과 도표 노드만 페이지가 채운다.
 */

export interface ShellReportItem {
  group: string
  id: string
  label: string
  /** 완료 도표(목차 링크 활성 + 본문 렌더). false 면 목차에 회색 표시만 */
  node?: ReactNode
  /** 목차 라벨 우측 뱃지 (예: 주차 레포트의 "월" 표시) */
  badge?: ReactNode
  /** 도표 위 안내 문구 */
  note?: ReactNode
}

export interface ReportShellProps {
  title: string
  subtitle: ReactNode
  /** 헤더 우측 버튼/셀렉트 영역 */
  actions?: ReactNode
  /** 본문 최상단 안내 배너 */
  banner?: ReactNode
  items: ShellReportItem[]
  isLoading?: boolean
  /** 본문 오른쪽 빈 칸에 고정하는 패널 (예: 이벤트 노트) — 빈 칸이 충분히 넓을 때만 보인다 */
  aside?: ReactNode
}

export function ReportShell({
  title,
  subtitle,
  actions,
  banner,
  items,
  isLoading,
  aside,
}: ReportShellProps) {
  const done = items.filter((it) => Boolean(it.node))

  return (
    <div className="flex justify-center gap-6">
      {/* 좌측 컬럼: 목차를 콘텐츠 왼쪽 끝에. 우측 spacer와 함께 본문을 정중앙 정렬 (화면 전용) */}
      <div className="hidden w-0 flex-1 justify-start min-[1520px]:flex">
        <nav className="report-no-print sticky top-3 h-[calc(100vh-6rem)] w-[210px] overflow-y-auto rounded-lg border border-border/70 bg-white p-3 shadow-sm">
          <p className="mb-1 px-1 text-xs font-bold text-foreground">
            전체 도표{' '}
            <span className="font-medium text-muted-foreground">
              ({done.length}/{items.length})
            </span>
          </p>
          <ul className="space-y-0.5 text-[13px]">
            {items.map((it, idx) => {
              const showGroup = idx === 0 || items[idx - 1].group !== it.group
              return (
                <Fragment key={it.id}>
                  {showGroup && (
                    <li className="px-1 pt-2 text-[11px] font-bold text-muted-foreground">
                      {it.group}
                    </li>
                  )}
                  <li>
                    {it.node ? (
                      <a
                        href={`#c-${it.id}`}
                        className="flex items-center gap-1.5 rounded px-1.5 py-1 text-gray-700 hover:bg-blue-50"
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                        <span className="truncate">{it.label}</span>
                        {it.badge}
                      </a>
                    ) : (
                      <span className="flex items-center gap-1.5 px-1.5 py-1 text-gray-400">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-gray-300" />
                        <span className="truncate">{it.label}</span>
                      </span>
                    )}
                  </li>
                </Fragment>
              )
            })}
          </ul>
        </nav>
      </div>

      {/* 본문(인쇄 영역) — 정중앙 */}
      <div id="report-print" className="shrink-0 space-y-6">
        {/* 헤더 + 액션 (인쇄 시 숨김) */}
        <div className="report-no-print flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>

        {isLoading ? (
          <div className="mx-auto w-[1040px] space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ReportChartSkeleton key={i} />
            ))}
          </div>
        ) : (
          // 고정폭(1040px): 화면·인쇄 차트 크기를 동일하게 → Recharts 재측정 없이 PDF에 전체 구간·정렬 유지.
          <div className="mx-auto w-[1040px] space-y-6">
            {banner}
            {done.map((it) => (
              <div key={it.id} id={`c-${it.id}`} className="scroll-mt-4">
                {it.note}
                {it.node}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 우측 spacer: 좌측 목차와 동일 폭으로 본문을 정중앙에 고정.
          aside 는 이 칸이 240px 이상(창 1840px 이상)일 때만 — 더 좁으면 내용을 읽을 수 없다 */}
      <div className="hidden w-0 flex-1 min-[1520px]:block">
        {aside && (
          <div className="report-no-print sticky top-3 hidden h-[calc(100vh-6rem)] min-[1840px]:flex">
            {aside}
          </div>
        )}
      </div>
    </div>
  )
}
