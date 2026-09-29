import { z } from 'zod'

export function apiResponseOf<T extends z.ZodTypeAny>(itemSchema: T): z.ZodObject<{
  success: z.ZodBoolean
  data: T
  message: z.ZodOptional<z.ZodString>
  meta: z.ZodOptional<z.ZodUnknown>
}>
export function apiResponseOf<T extends z.ZodTypeAny, M extends z.ZodTypeAny>(
  itemSchema: T,
  metaSchema: M,
): z.ZodObject<{
  success: z.ZodBoolean
  data: T
  message: z.ZodOptional<z.ZodString>
  meta: z.ZodOptional<M>
}>
export function apiResponseOf<T extends z.ZodTypeAny, M extends z.ZodTypeAny>(itemSchema: T, metaSchema?: M) {
  return z.object({
    success: z.boolean(),
    data: itemSchema,
    message: z.string().optional(),
    meta: (metaSchema ?? z.unknown()).optional(),
  })
}
