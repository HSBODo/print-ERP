import { Filter } from '#shared/ui/Filter'

export interface MedicalExtraFilters {
  insurance: string
  status: '전체' | '정상' | '취소'
  outstanding: '전체' | '미수있음'
  support: '전체' | '있음'
  breakdown: '전체' | '요청건'
}

/** 둘째 줄 — 받아온 수납 행을 바로 거르는 조건 묶음 */
export function MedicalReceiptFilters({
  value,
  insuranceOptions,
  onChange,
}: {
  value: MedicalExtraFilters
  insuranceOptions: string[]
  onChange: (value: MedicalExtraFilters) => void
}) {
  const group = <K extends keyof MedicalExtraFilters>(
    label: string,
    key: K,
    options: readonly MedicalExtraFilters[K][],
  ) => (
    <div className="flex items-center gap-1.5">
      <span className="whitespace-nowrap text-[11px] text-gray-500">
        {label}
      </span>
      <Filter.Segment
        value={value[key]}
        onChange={(next) => onChange({ ...value, [key]: next })}
        options={options}
        ariaLabel={label}
      />
    </div>
  )
  return (
    <Filter.Bar className="gap-2 border-gray-200 bg-gray-50/70 px-2.5 py-2">
      {group('보험유형', 'insurance', insuranceOptions)}
      <span className="h-6 w-px bg-gray-200" />
      {group('상태', 'status', ['전체', '정상', '취소'])}
      <span className="h-6 w-px bg-gray-200" />
      {group('미수', 'outstanding', ['전체', '미수있음'])}
      <span className="h-6 w-px bg-gray-200" />
      {group('지원금·건생비', 'support', ['전체', '있음'])}
      <span className="h-6 w-px bg-gray-200" />
      {group('합계', 'breakdown', ['전체', '요청건'])}
    </Filter.Bar>
  )
}
