import type { ReactNode } from 'react'

export interface Option<T> {
  value: T
  label: ReactNode
}

/** 값만 넘긴 옵션은 값을 그대로 라벨로 쓴다 */
export const toOption = <T extends string | number>(
  option: T | Option<T>,
): Option<T> =>
  typeof option === 'object' ? option : { value: option, label: String(option) }
