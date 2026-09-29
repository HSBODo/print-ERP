import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

type StatsHeaderColumn = {
  key: PropertyKey
  label: string
}

export type StatsHeaderNode<TColumn extends StatsHeaderColumn> =
  | {
      kind: 'group'
      label: string
      className: string
      children: readonly StatsHeaderNode<TColumn>[]
    }
  | {
      kind: 'leaf'
      column: TColumn
      className: string
    }

export type StatsHeaderStandaloneCell = {
  key: string
  content: ReactNode
  className: string
}

export type StatsHeaderModel<TColumn extends StatsHeaderColumn> = {
  corner: {
    content: ReactNode
    className: string
  }
  leadingCells?: readonly StatsHeaderStandaloneCell[]
  nodes: readonly StatsHeaderNode<TColumn>[]
}

export type StatsTableHeaderClasses = {
  groupHead: string
  headH: string
  headBottom: string
  stickyCorner: string
  stickyRows: readonly string[]
  leftDivider: string
}

type HeaderCell = {
  key: string
  content: ReactNode
  colSpan?: number
  rowSpan?: number
  className: string
}

const leafCount = <TColumn extends StatsHeaderColumn>(node: StatsHeaderNode<TColumn>): number => {
  if (node.kind === 'leaf') return 1
  return node.children.reduce((total, child) => total + leafCount(child), 0)
}

const headerDepth = <TColumn extends StatsHeaderColumn>(node: StatsHeaderNode<TColumn>): number => {
  if (node.kind === 'leaf') return 1
  return 1 + Math.max(...node.children.map(headerDepth))
}

function buildHeaderRows<TColumn extends StatsHeaderColumn>(
  nodes: readonly StatsHeaderNode<TColumn>[],
  maxDepth: number,
  classes: StatsTableHeaderClasses,
  renderLabel: (label: string) => ReactNode,
): HeaderCell[][] {
  const rows: HeaderCell[][] = Array.from({ length: maxDepth }, () => [])

  const visit = (node: StatsHeaderNode<TColumn>, depth: number, path: string) => {
    if (node.kind === 'group') {
      rows[depth].push({
        key: `${path}:${node.label}`,
        content: node.label,
        colSpan: leafCount(node),
        className: `${classes.groupHead} ${classes.stickyRows[depth]} ${classes.headH} ${node.className}`,
      })
      node.children.forEach((child, index) => visit(child, depth + 1, `${path}.${index}`))
      return
    }

    rows[depth].push({
      key: `${path}:${String(node.column.key)}`,
      content: renderLabel(node.column.label),
      rowSpan: maxDepth - depth,
      className: `${classes.groupHead} ${classes.stickyRows[depth]} ${classes.headBottom} ${node.className}`,
    })
  }

  nodes.forEach((node, index) => visit(node, 0, `${index}`))

  return rows
}

export function ReservationStatsTableHeader<TColumn extends StatsHeaderColumn>({
  model,
  classes,
  renderLabel,
}: {
  model: StatsHeaderModel<TColumn>
  classes: StatsTableHeaderClasses
  renderLabel: (label: string) => ReactNode
}) {
  const maxDepth = Math.max(...model.nodes.map(headerDepth))
  const rows = buildHeaderRows(model.nodes, maxDepth, classes, renderLabel)

  // 고정 헤더 각 행의 top 오프셋을 실제 렌더 높이로 측정해 적용한다.
  // (classes.stickyRows의 top-0/8/16은 32px 행 전제라, 라벨이 여러 줄로 줄바꿈돼 행이 높아지면
  //  2·3번째 고정 행이 어긋나 스크롤 시 밀리고 경계선이 깜빡인다. 인라인 top이 클래스보다 우선.)
  const theadRef = useRef<HTMLTableSectionElement>(null)
  const [rowTops, setRowTops] = useState<number[]>([])

  useLayoutEffect(() => {
    const thead = theadRef.current
    if (!thead) return
    const measure = () => {
      let acc = 0
      const offsets: number[] = []
      for (const tr of Array.from(thead.rows)) {
        offsets.push(acc)
        acc += tr.getBoundingClientRect().height
      }
      setRowTops((prev) =>
        prev.length === offsets.length && prev.every((value, i) => value === offsets[i]) ? prev : offsets,
      )
    }
    measure()
    const observer = new ResizeObserver(measure)
    Array.from(thead.rows).forEach((tr) => observer.observe(tr))
    return () => observer.disconnect()
  }, [maxDepth, rows.length])

  const topStyle = (rowIndex: number) =>
    rowTops[rowIndex] === undefined ? undefined : { top: `${rowTops[rowIndex]}px` }

  return (
    <thead ref={theadRef}>
      {rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {rowIndex === 0 ? (
            <>
              <th
                rowSpan={maxDepth}
                style={topStyle(0)}
                className={`${classes.groupHead} ${classes.leftDivider} ${classes.headBottom} ${classes.stickyCorner} ${model.corner.className}`}
              >
                {model.corner.content}
              </th>
              {model.leadingCells?.map((cell) => (
                <th
                  key={cell.key}
                  rowSpan={maxDepth}
                  style={topStyle(0)}
                  className={`${classes.groupHead} ${classes.stickyRows[0]} ${classes.headBottom} ${cell.className}`}
                >
                  {cell.content}
                </th>
              ))}
            </>
          ) : null}
          {row.map((cell) => (
            <th
              key={cell.key}
              colSpan={cell.colSpan}
              rowSpan={cell.rowSpan}
              style={topStyle(rowIndex)}
              className={cell.className}
            >
              {cell.content}
            </th>
          ))}
        </tr>
      ))}
    </thead>
  )
}
