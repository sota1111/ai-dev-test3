import { describe, it, expect } from 'vitest'
import { buildMermaid } from '../DiagramPanel'
import type { StateMachine } from '../../types/stateMachine'

describe('buildMermaid', () => {
  const trafficLight: StateMachine = {
    initialState: '赤',
    states: ['赤', '青', '黄'],
    transitions: [
      { from: '赤', trigger: '点灯', to: '青' },
      { from: '青', trigger: '点灯', to: '黄' },
      { from: '黄', trigger: '点灯', to: '赤' },
    ],
  }

  it('generates ASCII IDs for Japanese state names', () => {
    const result = buildMermaid(trafficLight, '赤')
    // Should not contain raw Japanese in positions that would be identifiers
    // state definitions use "name" as id syntax
    expect(result).toContain('state "赤" as s0')
    expect(result).toContain('state "青" as s1')
    expect(result).toContain('state "黄" as s2')
  })

  it('uses ASCII ID for initial state', () => {
    const result = buildMermaid(trafficLight, '赤')
    expect(result).toContain('[*] --> s0')
  })

  it('uses ASCII IDs in transitions', () => {
    const result = buildMermaid(trafficLight, '赤')
    expect(result).toContain('s0 --> s1 : 点灯')
    expect(result).toContain('s1 --> s2 : 点灯')
    expect(result).toContain('s2 --> s0 : ↩ 点灯')
  })

  it('highlights current state with ASCII ID', () => {
    const result = buildMermaid(trafficLight, '青')
    expect(result).toContain('class s1 current')
  })

  it('omits classDef when currentState is empty', () => {
    const result = buildMermaid(trafficLight, '')
    expect(result).not.toContain('classDef')
    expect(result).not.toContain('class s')
  })

  it('starts with stateDiagram-v2', () => {
    const result = buildMermaid(trafficLight, '赤')
    expect(result.startsWith('stateDiagram-v2')).toBe(true)
  })

  it('renders parent state as subgraph', () => {
    const hierarchical: StateMachine = {
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
    const result = buildMermaid(hierarchical, '受付中')
    expect(result).toContain('state "問い合わせ対応" as p0 {')
    expect(result).toContain('state "受付中" as s0')
    expect(result).toContain('state "担当者確認中" as s1')
    expect(result).toContain('}')
  })

  it('flat states not in any parent are defined outside subgraph', () => {
    const hierarchical: StateMachine = {
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
    const result = buildMermaid(hierarchical, '受付中')
    // 回答済み is not in any parent, so it should be defined at top level
    expect(result).toContain('state "回答済み" as s2')
  })
})
