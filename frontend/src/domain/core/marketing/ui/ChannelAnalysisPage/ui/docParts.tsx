import type { ReactNode } from 'react'

/**
 * 채널 분석 문서의 공용 조각.
 *
 * 채널마다 문서를 따로 쓰되 생김새는 같아야 한다 — 채널을 갈아 끼우며 볼 때
 * 표 모양이 달라지면 비교가 안 된다. 그래서 Section·Table·Callout 을 여기 모아 둔다.
 */

export function Section({
  no,
  title,
  children,
}: {
  no: string
  title: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white px-7 py-6 shadow-sm">
      <div className="mb-4 flex items-baseline gap-2.5">
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-md bg-slate-900 text-[12px] font-bold text-white">
          {no}
        </span>
        <h2 className="text-[16px] font-bold tracking-tight text-slate-900">
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

/** 표 — 첫 열은 라벨(왼쪽), 나머지는 숫자(오른쪽 정렬). */
export function Table({
  head,
  rows,
}: {
  head: string[]
  rows: (string | ReactNode)[][]
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200">
            {head.map((h, i) => (
              <th
                key={h}
                className={`whitespace-nowrap py-2 text-[11.5px] font-semibold text-slate-400 ${i === 0 ? 'text-left' : 'text-right'}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-slate-50">
              {r.map((cell, ci) => (
                <td
                  key={ci}
                  className={`py-[7px] tabular-nums ${ci === 0 ? 'text-left font-medium text-slate-700' : 'text-right text-slate-900'}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const Hi = ({ children }: { children: ReactNode }) => (
  <b className="font-bold text-slate-900">{children}</b>
)

/** 결론 박스 — 색으로 성격을 구분한다. good=검증됨 / bad=철회됨 / warn=미확인 */
export function Callout({
  tone,
  title,
  children,
}: {
  tone: 'good' | 'bad' | 'warn'
  title: string
  children: ReactNode
}) {
  const s = {
    good: {
      bg: 'bg-emerald-50/70',
      bd: 'border-emerald-200',
      tx: 'text-emerald-800',
    },
    bad: { bg: 'bg-red-50/70', bd: 'border-red-200', tx: 'text-red-800' },
    warn: {
      bg: 'bg-amber-50/70',
      bd: 'border-amber-200',
      tx: 'text-amber-800',
    },
  }[tone]
  return (
    <div className={`rounded-xl border ${s.bd} ${s.bg} px-4 py-3`}>
      <p className={`mb-1 text-[13px] font-bold ${s.tx}`}>{title}</p>
      <div className="text-[13px] leading-relaxed text-slate-600">
        {children}
      </div>
    </div>
  )
}

/** 문서 머리말 — 채널명 + 기간·표본 배지. */
export function DocHeader({
  title,
  badges,
}: {
  title: string
  badges: string[]
}) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      {badges.map((b) => (
        <span
          key={b}
          className="rounded-md bg-slate-200/70 px-2 py-[3px] text-[11px] font-semibold text-slate-600"
        >
          {b}
        </span>
      ))}
    </div>
  )
}

/** 한 줄 요약 — 검은 배경. 문서마다 맨 위에 하나씩. */
export function Summary({
  headline,
  children,
}: {
  headline: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-slate-900 bg-slate-900 px-7 py-5 shadow-sm">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">
        한 줄 요약
      </p>
      <p className="mt-1.5 text-[17px] font-bold leading-relaxed text-white">
        {headline}
      </p>
      <div className="mt-2 text-[13px] leading-relaxed text-slate-300">
        {children}
      </div>
    </div>
  )
}

/** 출처와 한계 — 문서 맨 아래. 없으면 숫자를 검증할 방법이 사라진다. */
export function Sources({ items }: { items: ReactNode[] }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 px-7 py-5">
      <p className="mb-2 text-[12px] font-bold text-slate-500">출처와 한계</p>
      <ul className="ml-4 list-disc space-y-1 text-[12.5px] leading-relaxed text-slate-500">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  )
}
