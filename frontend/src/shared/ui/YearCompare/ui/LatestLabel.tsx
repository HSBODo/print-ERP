interface LabelProps {
  x?: number | string
  y?: number | string
  value?: unknown
}

/**
 * 최신 연도 값 레이블 — 항상 점 아래(점 위에는 이벤트 깃발이 붙는다).
 * 흰 테두리(stroke + paint-order)로 다른 연도 선과 겹쳐도 숫자가 또렷하다.
 */
export function latestLabel(color: string, format: (value: number) => string) {
  return function LatestLabel({ x, y, value }: LabelProps) {
    const cx = Number(x)
    const cy = Number(y)
    if (
      typeof value !== 'number' ||
      !Number.isFinite(cx) ||
      !Number.isFinite(cy)
    ) {
      return <g />
    }

    return (
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        fontSize={14}
        fontWeight={700}
        fill={color}
        stroke="#ffffff"
        strokeWidth={3.5}
        strokeLinejoin="round"
        style={{ paintOrder: 'stroke' }}
      >
        {format(value)}
      </text>
    )
  }
}
