import { Flag } from 'lucide-react'

const DOT_RADIUS = 3
const FLAG_SIZE = 16
const FLAG_STROKE_WIDTH = 2
/** 깃대(아이콘 왼쪽 끝에서 약 3px)가 점 바로 위에 오도록 왼쪽으로 당기는 거리 */
const FLAG_POLE_OFFSET = 3
/** 점과 깃발 아래 끝 사이 간격 */
const FLAG_GAP = 8

/** 이벤트 마커 — 점에 작은 원 + 그 위에 깃발 */
export function EventMarker({
  cx = 0,
  cy = 0,
  color,
}: {
  cx?: number
  cy?: number
  color: string
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={DOT_RADIUS} fill={color} />
      <Flag
        x={cx - FLAG_POLE_OFFSET}
        y={cy - FLAG_SIZE - FLAG_GAP}
        width={FLAG_SIZE}
        height={FLAG_SIZE}
        color={color}
        fill={color}
        strokeWidth={FLAG_STROKE_WIDTH}
      />
    </g>
  )
}
