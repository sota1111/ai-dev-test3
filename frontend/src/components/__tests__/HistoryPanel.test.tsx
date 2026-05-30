import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HistoryPanel } from '../HistoryPanel'

describe('HistoryPanel', () => {
  it('shows empty message when no history and no state machine', () => {
    render(<HistoryPanel history={[]} onReset={() => {}} hasStateMachine={false} />)
    expect(screen.getByText('状態遷移を生成してください。')).toBeInTheDocument()
  })

  it('shows empty simulation message when state machine exists but no history', () => {
    render(<HistoryPanel history={[]} onReset={() => {}} hasStateMachine={true} />)
    expect(screen.getByText(/まだ状態遷移が実行されていません/)).toBeInTheDocument()
  })

  it('renders history entries', () => {
    const history = [
      { step: 1, from: '赤', trigger: '点灯', to: '青' }
    ]
    render(<HistoryPanel history={history} onReset={() => {}} hasStateMachine={true} />)
    expect(screen.getByText('1.')).toBeInTheDocument()
    expect(screen.getByText('赤')).toBeInTheDocument()
    expect(screen.getByText('--点灯-->')).toBeInTheDocument()
    expect(screen.getByText('青')).toBeInTheDocument()
  })

  it('shows parent state context in history entries', () => {
    const history = [
      {
        step: 1,
        from: '注文受付',
        fromParent: '注文処理中',
        trigger: '注文確定',
        to: '在庫確認',
        toParent: '注文処理中',
      }
    ]
    render(<HistoryPanel history={history} onReset={() => {}} hasStateMachine={true} />)
    expect(screen.getByText('注文処理中 / 注文受付')).toBeInTheDocument()
    expect(screen.getByText('注文処理中 / 在庫確認')).toBeInTheDocument()
  })

  it('shows reset button when state machine exists', () => {
    render(<HistoryPanel history={[]} onReset={() => {}} hasStateMachine={true} />)
    expect(screen.getByText('リセット')).toBeInTheDocument()
  })

  it('calls onReset when reset button clicked', () => {
    const onReset = vi.fn()
    render(<HistoryPanel history={[]} onReset={onReset} hasStateMachine={true} />)
    fireEvent.click(screen.getByText('リセット'))
    expect(onReset).toHaveBeenCalledTimes(1)
  })
})
