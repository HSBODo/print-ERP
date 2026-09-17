const iso = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export const monthRange = (month: string) => {
  const [year, monthNo] = month.split('-').map(Number)
  return { from: `${month}-01`, to: iso(new Date(year, monthNo, 0)) }
}

/** 기본 조회 기간 — 이번 달 1일 ~ 말일 (마트는 D-1 까지 적재된다). */
export const currentMonthRange = (today = new Date()) => monthRange(iso(today).slice(0, 7))

export const weeksOfMonth = (month: string) => {
  const [year, monthNo] = month.split('-').map(Number)
  const first = new Date(year, monthNo - 1, 1)
  first.setDate(first.getDate() - ((first.getDay() + 6) % 7))
  const last = new Date(year, monthNo, 0)
  const weeks: Array<{ from: string; to: string; label: string }> = []
  for (const monday = first; monday <= last; monday.setDate(monday.getDate() + 7)) {
    const sunday = new Date(monday)
    sunday.setDate(sunday.getDate() + 6)
    weeks.push({ from: iso(monday), to: iso(sunday), label: `${iso(monday).slice(5)}~${iso(sunday).slice(5)}` })
  }
  return weeks
}
