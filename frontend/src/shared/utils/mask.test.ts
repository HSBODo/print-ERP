import { describe, expect, it } from 'vitest'

import { maskAddress, maskJumin, maskName, maskPhone } from '#shared/utils/mask'

/**
 * 개인정보 마스킹 계약. CSV 로 나가는 값이라 조용히 덜 가려지면 그대로 유출된다.
 * 픽스처는 전부 합성 데이터다.
 */
describe('maskName', () => {
  it('처음과 끝만 남기고 가운데를 가린다', () => {
    expect(maskName('홍길동')).toBe('홍*동')
    expect(maskName('남궁길동')).toBe('남**동')
  })

  it('두 글자는 뒤를 가린다', () => {
    expect(maskName('홍길')).toBe('홍*')
  })

  it('한 글자는 그대로 둔다 — 가릴 가운데가 없다', () => {
    // 통째로 가리면 전 행이 '*' 가 되어 대조가 불가능해진다.
    expect(maskName('홍')).toBe('홍')
  })

  it('영문명에도 같은 규칙이 적용된다', () => {
    expect(maskName('John Smith')).toBe('J********h')
  })

  it('빈 값은 그대로 — 빈 칸을 별표로 채우면 값이 있는 것으로 오해된다', () => {
    expect(maskName('')).toBe('')
    expect(maskName('   ')).toBe('   ')
  })
})

describe('maskPhone', () => {
  it('가운데 국번을 가리고 뒤 4자리는 남긴다', () => {
    expect(maskPhone('010-1234-5678')).toBe('010-****-5678')
  })

  it('지역번호 자릿수가 달라도 가운데만 가린다', () => {
    expect(maskPhone('02-123-4567')).toBe('02-***-4567')
  })

  it('하이픈이 없어도 앞3·뒤4 만 남긴다', () => {
    expect(maskPhone('01012345678')).toBe('010-****-5678')
  })

  it('형식을 모르면 뒤 4자리만 남기고 더 가린다', () => {
    expect(maskPhone('12345678')).toBe('****5678')
  })

  it('너무 짧으면 통째로 가린다', () => {
    expect(maskPhone('1234')).toBe('****')
  })

  it('빈 값은 그대로', () => {
    expect(maskPhone('')).toBe('')
  })
})

describe('maskJumin', () => {
  it('뒷자리는 성별 1자리만 남긴다', () => {
    expect(maskJumin('900101-1234567')).toBe('900101-1******')
  })

  it('하이픈이 없어도 같은 결과다', () => {
    expect(maskJumin('9001011234567')).toBe('900101-1******')
  })

  it('이미 마스킹된 값을 다시 넣어도 더 노출되지 않는다', () => {
    expect(maskJumin('900101-1******')).toBe('900101-1')
  })

  it('형식을 모르면 통째로 가린다', () => {
    expect(maskJumin('abc')).toBe('***')
  })

  it('빈 값은 그대로', () => {
    expect(maskJumin('')).toBe('')
  })
})

describe('maskAddress', () => {
  it('시/도·시군구만 남기고 상세주소를 가린다', () => {
    expect(
      maskAddress('경기 성남시 분당구 분당로 190 (분당동) 101동 1101호'),
    ).toBe('경기 성남시 ***')
    expect(
      maskAddress(
        '서울시 노원구 동일로207길 186 학여울 청구아파트 110동 503호',
      ),
    ).toBe('서울시 노원구 ***')
  })

  it('동·호수가 남지 않는다(집을 특정할 수 있는 부분)', () => {
    const masked = maskAddress('서울 마포구 서교동 476-49 201호')
    expect(masked).not.toContain('201호')
    expect(masked).not.toContain('476-49')
  })

  it('토큰이 2개 이하면 상세주소가 아니므로 그대로 둔다', () => {
    expect(maskAddress('본원 재고구매')).toBe('본원 재고구매')
    expect(maskAddress('대여렌즈')).toBe('대여렌즈')
  })

  it('빈 값은 그대로', () => {
    expect(maskAddress('')).toBe('')
  })
})
