import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { StateMachine } from '../types/stateMachine'
import styles from './DiagramPanel.module.css'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

interface Props {
  stateMachine: StateMachine | null
  currentState: string
}

export function buildMermaid(sm: StateMachine, current: string): string {
  // Build ASCII ID mapping for each state name
  const idMap = new Map<string, string>()
  sm.states.forEach((state, index) => {
    idMap.set(state, `s${index}`)
  })
  // Also ensure initialState and transition states are covered
  // (in case states array differs from actual usage)
  const allStateNames = new Set([
    sm.initialState,
    ...sm.transitions.flatMap(t => [t.from, t.to]),
    ...(current ? [current] : [])
  ])
  let nextId = sm.states.length
  for (const name of allStateNames) {
    if (!idMap.has(name)) {
      idMap.set(name, `s${nextId++}`)
    }
  }

  const lines: string[] = ['stateDiagram-v2']
  // Define all states with display names
  for (const [name, id] of idMap.entries()) {
    lines.push(`  state "${name}" as ${id}`)
  }
  // Initial state
  lines.push('  [*] --> ' + idMap.get(sm.initialState))
  // Transitions
  for (const t of sm.transitions) {
    const label = t.trigger.replace(/"/g, "'")
    lines.push(`  ${idMap.get(t.from)} --> ${idMap.get(t.to)} : ${label}`)
  }
  // Current state highlight
  if (current && idMap.has(current)) {
    lines.push('  classDef current fill:#ff9,stroke:#f90,stroke-width:3px,color:#000')
    lines.push('  class ' + idMap.get(current) + ' current')
  }
  return lines.join('\n')
}

let diagramId = 0

export function DiagramPanel({ stateMachine, currentState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!stateMachine || !containerRef.current) return
    const id = 'mermaid-diagram-' + (++diagramId)
    const definition = buildMermaid(stateMachine, currentState)
    mermaid.render(id, definition).then(({ svg }) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = svg
      }
    }).catch(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '<p style="color:red">図の描画に失敗しました</p>'
      }
    })
  }, [stateMachine, currentState])

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>状態遷移図</h2>
      {stateMachine ? (
        <div ref={containerRef} className={styles.diagram} data-testid="diagram-container" />
      ) : (
        <div className={styles.empty}>
          左側の入力欄に状態遷移の仕様を入力し、「状態遷移を生成」ボタンを押してください。
        </div>
      )}
    </div>
  )
}
