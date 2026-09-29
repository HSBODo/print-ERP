import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { apiResponseOf } from '#shared/api/utils'

describe('apiResponseOf', () => {
  it('응답 메타데이터를 선택적으로 파싱한다', () => {
    const schema = apiResponseOf(
      z.array(z.object({ count: z.number() })),
      z.object({ source: z.enum(['SNAPSHOT', 'LIVE']) }),
    )

    expect(schema.parse({ success: true, data: [{ count: 1 }], meta: { source: 'SNAPSHOT' } })).toEqual({
      success: true,
      data: [{ count: 1 }],
      meta: { source: 'SNAPSHOT' },
    })
  })
})
