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
    expect(result).toContain('s2 --> s0 : 点灯')
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
})
