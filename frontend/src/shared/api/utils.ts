import { z } from 'zod'

/** 공통 응답 래퍼: { success, data } */
export function apiResponseOf<T extends z.ZodTypeAny>(itemSchema: T): z.ZodObject<{
  success: z.ZodBoolean
  data: T
  meta: z.ZodOptional<z.ZodUnknown>
}>
export function apiResponseOf<T extends z.ZodTypeAny, M extends z.ZodTypeAny>(
  itemSchema: T,
  metaSchema: M,
): z.ZodObject<{
  success: z.ZodBoolean
  data: T
  meta: z.ZodOptional<M>
}>
export function apiResponseOf<T extends z.ZodTypeAny, M extends z.ZodTypeAny>(itemSchema: T, metaSchema?: M) {
  return z.object({
    success: z.boolean(),
    data: itemSchema,
    meta: (metaSchema ?? z.unknown()).optional(),
  })
}
