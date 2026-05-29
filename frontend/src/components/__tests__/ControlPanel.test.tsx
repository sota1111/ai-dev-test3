import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ControlPanel } from '../ControlPanel'
import type { StateMachine } from '../../types/stateMachine'

describe('ControlPanel', () => {
  const mockStateMachine: StateMachine = {
    initialState: '赤',
    states: ['赤', '青', '黄'],
    transitions: [
      { from: '赤', trigger: '点灯', to: '青' },
      { from: '青', trigger: '点灯', to: '黄' },
      { from: '黄', trigger: '点灯', to: '赤' },
    ],
  }

  it('renders empty state when no stateMachine', () => {
    render(<ControlPanel stateMachine={null} currentState="" onTrigger={() => {}} />)
    expect(screen.getByText('状態遷移を生成してください')).toBeInTheDocument()
  })

  it('shows available trigger buttons for current state', () => {
    render(
      <ControlPanel
        stateMachine={mockStateMachine}
        currentState="赤"
        onTrigger={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /点灯/ })).toBeInTheDocument()
    expect(screen.getByText('→ 青')).toBeInTheDocument()
  })

  it('does not show trigger buttons for other states', () => {
    // currentState="青" but transitions from "青" is "点灯" -> "黄"
    // The requirement says: currentState="青" but only "赤" has transitions, expect no trigger buttons
    // Actually mockStateMachine HAS transitions from "青".
    // Let's make a specific mock for this test case.
    const limitedSM: StateMachine = {
      initialState: '赤',
      states: ['赤', '青'],
      transitions: [{ from: '赤', trigger: '点灯', to: '青' }]
    }
    render(
      <ControlPanel
        stateMachine={limitedSM}
        currentState="青"
        onTrigger={() => {}}
      />
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('実行可能なトリガーはありません（終端状態）')).toBeInTheDocument()
  })

  it('calls onTrigger when button clicked', () => {
    const onTrigger = vi.fn()
    render(
      <ControlPanel
        stateMachine={mockStateMachine}
        currentState="赤"
        onTrigger={onTrigger}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /点灯/ }))
    expect(onTrigger).toHaveBeenCalledWith(mockStateMachine.transitions[0])
  })
})
