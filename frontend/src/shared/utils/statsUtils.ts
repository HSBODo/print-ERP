export function changeRate(base: number, next: number) {
  if (base === 0) return next === 0 ? 0 : 100
  return ((next - base) / base) * 100
}

export function changePoint(base: number, next: number) {
  return next - base
}

export function formatDelta(value: number, suffix: string) {
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`
}
