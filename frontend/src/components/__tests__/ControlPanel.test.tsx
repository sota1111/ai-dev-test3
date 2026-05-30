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

  it('shows parent state label and child states in hierarchy', () => {
    const hierarchicalSM: StateMachine = {
      initialState: '受付中',
      states: ['受付中', '担当者確認中', '回答済み'],
      parentStates: [
        { name: '問い合わせ対応', children: ['受付中', '担当者確認中'] }
      ],
      transitions: [
        { from: '受付中', trigger: '割り当て', to: '担当者確認中' },
        { from: '担当者確認中', trigger: '回答', to: '回答済み' },
      ],
    }
    render(
      <ControlPanel
        stateMachine={hierarchicalSM}
        currentState="受付中"
        onTrigger={() => {}}
      />
    )
    expect(screen.getByText('問い合わせ対応')).toBeInTheDocument()
    expect(screen.getAllByText('受付中').length).toBeGreaterThan(0)
    expect(screen.getAllByText('担当者確認中').length).toBeGreaterThan(0)
  })

  it('shows $PREVIOUS trigger as "再開" style button', () => {
    const interruptSM: StateMachine = {
      initialState: '停止保持中',
      states: ['停止保持中', '再開確認中'],
      parentStates: [
        { name: '一時停止中', children: ['停止保持中', '再開確認中'], initialChild: '停止保持中', isInterrupt: true }
      ],
      transitions: [
        { from: '停止保持中', trigger: '再開要求', to: '再開確認中' },
        { from: '再開確認中', trigger: '再開許可', to: '$PREVIOUS' },
      ],
    }
    render(
      <ControlPanel
        stateMachine={interruptSM}
        currentState="再開確認中"
        currentParentState="一時停止中"
        onTrigger={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /再開許可/ })).toBeInTheDocument()
  })

  it('shows $PREVIOUS destination as "前の状態へ戻る"', () => {
    const interruptSM: StateMachine = {
      initialState: '停止保持中',
      states: ['停止保持中', '再開確認中'],
      parentStates: [
        { name: '一時停止中', children: ['停止保持中', '再開確認中'], initialChild: '停止保持中', isInterrupt: true }
      ],
      transitions: [
        { from: '再開確認中', trigger: '再開許可', to: '$PREVIOUS' },
      ],
    }
    render(
      <ControlPanel
        stateMachine={interruptSM}
        currentState="再開確認中"
        currentParentState="一時停止中"
        onTrigger={() => {}}
      />
    )
    expect(screen.getByText(/前の状態へ戻る/)).toBeInTheDocument()
  })

  it('shows parent state destination as "親名 / 初期子状態"', () => {
    const sm: StateMachine = {
      initialState: '作業中',
      states: ['作業中', '停止保持中'],
      parentStates: [
        { name: '一時停止中', children: ['停止保持中'], initialChild: '停止保持中', isInterrupt: true }
      ],
      transitions: [
        { from: '作業中', trigger: '一時停止', to: '一時停止中' },
      ],
    }
    render(
      <ControlPanel
        stateMachine={sm}
        currentState="作業中"
        onTrigger={() => {}}
      />
    )
    expect(screen.getByText(/一時停止中 \/ 停止保持中/)).toBeInTheDocument()
  })

  it('shows section headers when both child and parent triggers exist', () => {
    const sm: StateMachine = {
      initialState: '作業中',
      states: ['作業中', '完了', '停止保持中'],
      parentStates: [
        { name: '処理中', children: ['作業中', '完了'] },
        { name: '一時停止中', children: ['停止保持中'], isInterrupt: true }
      ],
      transitions: [
        { from: '作業中', trigger: '完了', to: '完了' },
        { from: '処理中', trigger: '一時停止', to: '一時停止中' },
      ],
    }
    render(
      <ControlPanel
        stateMachine={sm}
        currentState="作業中"
        currentParentState="処理中"
        onTrigger={() => {}}
      />
    )
    expect(screen.getByText('現在状態専用トリガー')).toBeInTheDocument()
    expect(screen.getByText('親状態共通トリガー')).toBeInTheDocument()
  })
})
