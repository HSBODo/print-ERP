import { describe, expect, it } from 'vitest'

import { columnsToCsv, toCsv, type CsvColumn } from '#shared/utils/csv'

describe('toCsv', () => {
  it('헤더 + 행을 CRLF로 잇는다', () => {
    expect(
      toCsv(
        ['a', 'b'],
        [
          [1, 2],
          [3, 4],
        ],
      ),
    ).toBe('a,b\r\n1,2\r\n3,4')
  })

  it('쉼표·따옴표·개행은 따옴표로 감싸고 내부 따옴표는 중복', () => {
    expect(toCsv(['x'], [['a,b'], ['he said "hi"'], ['line\nbreak']])).toBe(
      'x\r\n"a,b"\r\n"he said ""hi"""\r\n"line\nbreak"',
    )
  })

  it('null·undefined는 빈 칸', () => {
    expect(toCsv(['x', 'y'], [[null, undefined]])).toBe('x,y\r\n,')
  })
})

describe('columnsToCsv', () => {
  interface Row {
    name: string
    state: string
    birth: string
  }
  const rows: Row[] = [
    { name: '홍길동', state: 'Y', birth: '1990-01-01' },
    { name: '김철수', state: 'C', birth: '1985-05-05' },
  ]
  const STATE: Record<string, string> = { Y: '예약', C: '취소' }
  const columns: CsvColumn<Row>[] = [
    { key: 'rowNo', label: 'No', csv: (_r, n) => n },
    { key: 'name', label: '고객명' },
    { key: 'state', label: '상태', csv: (r) => STATE[r.state] ?? r.state },
  ]

  it('csv() 없으면 key 원값, 있으면 변환값 + 행번호', () => {
    expect(columnsToCsv(columns, rows)).toBe(
      'No,고객명,상태\r\n1,홍길동,예약\r\n2,김철수,취소',
    )
  })

  it('행이 없으면 헤더만', () => {
    expect(columnsToCsv(columns, [])).toBe('No,고객명,상태')
  })

  it('text 칼럼은 Excel 텍스트(="값")로 감싸 지수표기·앞자리0 손실 방지', () => {
    interface IdRow {
      chartNo: string
    }
    const cols: CsvColumn<IdRow>[] = [
      { key: 'chartNo', label: '차트번호', text: true },
    ]
    const csv = columnsToCsv(cols, [{ chartNo: '8888888888888' }])
    // ="8888888888888" 를 CSV 이스케이프하면 "=""8888888888888"""
    expect(csv).toBe('차트번호\r\n"=""8888888888888"""')
  })

  it('text 칼럼이라도 빈 값은 감싸지 않는다', () => {
    interface IdRow {
      chartNo: string
    }
    const cols: CsvColumn<IdRow>[] = [
      { key: 'chartNo', label: '차트번호', text: true },
    ]
    expect(columnsToCsv(cols, [{ chartNo: '' }])).toBe('차트번호\r\n')
  })
})
