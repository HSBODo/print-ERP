interface LabelProps {
  x?: number | string
  y?: number | string
  value?: unknown
  index?: number
}

/**
 * 최신 연도 값 레이블 — 다른 연도 선과 겹쳐도 읽히게
 *  ① 이웃 달보다 높으면(정점) 점 위, 낮으면(골) 점 아래 → 레이블이 선 바깥쪽으로 간다
 *  ② 흰 테두리(stroke + paint-order)로 선 위에 겹쳐도 숫자가 또렷하다
 */
export function latestLabel(
  values: (number | null)[],
  color: string,
  format: (value: number) => string,
) {
  return function LatestLabel({ x, y, value, index }: LabelProps) {
    const cx = Number(x)
    const cy = Number(y)
    if (
      typeof value !== 'number' ||
      typeof index !== 'number' ||
      !Number.isFinite(cx) ||
      !Number.isFinite(cy)
    ) {
      return <g />
    }
    const neighbors = [values[index - 1], values[index + 1]].filter(
      (v): v is number => typeof v === 'number',
    )
    const average = neighbors.length
      ? neighbors.reduce((a, b) => a + b, 0) / neighbors.length
      : value
    const above = value >= average

    return (
      <text
        x={cx}
        y={cy + (above ? -12 : 20)}
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
