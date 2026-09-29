// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { EditableNumberCell } from './ReservationStatsCataractCells'

afterEach(cleanup)

type Props = ComponentProps<typeof EditableNumberCell>

const renderCell = (override: Partial<Props> = {}) => {
  const onSave = override.onSave ?? vi.fn()
  render(
    <table>
      <tbody>
        <tr>
          <EditableNumberCell value={17} edit={undefined} busy={false} cellClassName="cell" onSave={onSave} {...override} />
        </tr>
      </tbody>
    </table>,
  )
  return { onSave }
}

const startEditing = () => {
  fireEvent.click(screen.getByRole('cell'))
  return screen.getByRole('spinbutton')
}

describe('EditableNumberCell', () => {
  it('값을 표시하고 클릭하면 입력으로 전환된다', () => {
    renderCell()
    expect(screen.getByRole('cell')).toHaveTextContent('17')
    expect(startEditing()).toHaveValue(17)
  })

  it('새 값 입력 후 Enter면 onSave에 숫자를 넘긴다', () => {
    const { onSave } = renderCell()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).toHaveBeenCalledWith(30)
  })

  it('Esc면 저장하지 않고 편집을 취소한다', () => {
    const { onSave } = renderCell()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '30' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
  })

  it('값이 그대로면 저장하지 않는다', () => {
    const { onSave } = renderCell()
    const input = startEditing()
    fireEvent.change(input, { target: { value: '17' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('수기 보정 이력이 있으면 마커(●)와 툴팁을 표시한다', () => {
    renderCell({
      edit: { field: 'inboundCall', value: 17, editedBy: 'kim', editedAt: '2026-06-24T00:00:00' },
    })
    const cell = screen.getByRole('cell')
    expect(cell).toHaveTextContent('●')
    expect(cell.getAttribute('title')).toContain('수기 보정')
  })
})
