import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { StateMachine } from '../types/stateMachine'
import styles from './DiagramPanel.module.css'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

interface Props {
  stateMachine: StateMachine | null
  currentState: string
  currentParentState: string | null
}

export function buildMermaid(sm: StateMachine, current: string, currentParent: string | null): string {
  // Build ASCII ID mapping for each state name
  const idMap = new Map<string, string>()
  sm.states.forEach((state, index) => {
    idMap.set(state, `s${index}`)
  })
  // Also ensure initialState and transition states are covered
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

  const parentStates = sm.parentStates ?? []

  // Build a set of states that belong to a parent
  const childStateNames = new Set(parentStates.flatMap(p => p.children))

  const lines: string[] = ['stateDiagram-v2']

  // Define parent states as subgraphs
  parentStates.forEach((parent, pi) => {
    const parentId = `p${pi}`
    lines.push(`  state "${parent.name}" as ${parentId} {`)
    for (const child of parent.children) {
      const id = idMap.get(child)
      if (id) {
        lines.push(`    state "${child}" as ${id}`)
      }
    }
    lines.push(`  }`)
  })

  // Define states not belonging to any parent
  for (const [name, id] of idMap.entries()) {
    if (!childStateNames.has(name)) {
      lines.push(`  state "${name}" as ${id}`)
    }
  }

  // Initial state
  lines.push('  [*] --> ' + idMap.get(sm.initialState))

  // Transitions
  for (const t of sm.transitions) {
    const label = t.trigger.replace(/"/g, "'")
    lines.push(`  ${idMap.get(t.from)} --> ${idMap.get(t.to)} : ${label}`)
  }

  // Current parent state highlight
  if (currentParent) {
    const parentIndex = (sm.parentStates ?? []).findIndex(p => p.name === currentParent)
    if (parentIndex >= 0) {
      lines.push('  classDef currentParent fill:#ffe0b2,stroke:#e65100,stroke-width:3px')
      lines.push(`  class p${parentIndex} currentParent`)
    }
  }

  // Current state highlight
  if (current && idMap.has(current)) {
    lines.push('  classDef current fill:#ff9,stroke:#f90,stroke-width:3px,color:#000')
    lines.push('  class ' + idMap.get(current) + ' current')
  }

  return lines.join('\n')
}

let diagramId = 0

export function DiagramPanel({ stateMachine, currentState, currentParentState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!stateMachine || !containerRef.current) return
    const id = 'mermaid-diagram-' + (++diagramId)
    const definition = buildMermaid(stateMachine, currentState, currentParentState)
    mermaid.render(id, definition).then(({ svg }) => {
      if (containerRef.current) {
        containerRef.current.innerHTML = svg
      }
    }).catch(() => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '<p style="color:red">図の描画に失敗しました</p>'
      }
    })
  }, [stateMachine, currentState, currentParentState])

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
