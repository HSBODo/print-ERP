type ColumnGroupSpec<Key extends string> = {
  key: Key
  span: number
}

type ColumnGroups<T, Specs extends readonly ColumnGroupSpec<string>[]> = {
  [Spec in Specs[number] as Spec['key']]: T[]
}

export function splitColumnGroups<T, const Specs extends readonly ColumnGroupSpec<string>[]>(
  columns: readonly T[],
  specs: Specs,
): ColumnGroups<T, Specs> {
  let offset = 0
  const groups: Record<string, T[]> = {}

  for (const spec of specs) {
    groups[spec.key] = columns.slice(offset, offset + spec.span)
    offset += spec.span
  }

  if (offset !== columns.length) {
    throw new Error(`Column group spans (${offset}) do not match column count (${columns.length}).`)
  }

  return groups as ColumnGroups<T, Specs>
}

export function columnSpan(...groups: readonly (readonly unknown[])[]): number {
  return groups.reduce((total, group) => total + group.length, 0)
}
