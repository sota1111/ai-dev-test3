import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { StateMachine, Transition } from '../types/stateMachine'
import styles from './DiagramPanel.module.css'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

interface Props {
  stateMachine: StateMachine | null
  currentState: string
  currentParentState: string | null
}

type TransitionKind = 'normal' | 'back' | 'cross-parent' | 'interrupt' | 'return'

function classifyTransition(
  t: Transition,
  sm: StateMachine,
  stateIndexMap: Map<string, number>
): TransitionKind {
  if (t.to === '$PREVIOUS') return 'return'

  const parentStates = sm.parentStates ?? []

  const toParentDef = parentStates.find(p => p.name === t.to)
  if (toParentDef?.isInterrupt) return 'interrupt'

  const fromParentName =
    parentStates.find(p => p.children.includes(t.from))?.name ??
    parentStates.find(p => p.name === t.from)?.name
  const toParentName =
    parentStates.find(p => p.children.includes(t.to))?.name ??
    parentStates.find(p => p.name === t.to)?.name

  if (fromParentName && toParentName && fromParentName !== toParentName) {
    return 'cross-parent'
  }

  const fromIdx = stateIndexMap.get(t.from) ?? 0
  const toIdx = stateIndexMap.get(t.to) ?? 0
  if (toIdx < fromIdx) return 'back'

  return 'normal'
}

const kindPrefix: Record<TransitionKind, string> = {
  normal: '',
  back: '↩ ',
  'cross-parent': '↗ ',
  interrupt: '⚡ ',
  return: '↺ ',
}

export function buildMermaid(sm: StateMachine, current: string, currentParent: string | null = null): string {
  const stateIndexMap = new Map<string, number>()
  sm.states.forEach((state, index) => {
    stateIndexMap.set(state, index)
  })

  const idMap = new Map<string, string>()
  sm.states.forEach((state, index) => {
    idMap.set(state, "s" + index)
  })
  const allStateNames = new Set([
    sm.initialState,
    ...sm.transitions.flatMap(t => [t.from, t.to]),
    ...(current ? [current] : [])
  ])
  let nextId = sm.states.length
  for (const name of allStateNames) {
    if (!idMap.has(name)) {
      idMap.set(name, "s" + nextId++)
      stateIndexMap.set(name, nextId)
    }
  }

  const parentStates = sm.parentStates ?? []
  const childStateNames = new Set(parentStates.flatMap(p => p.children))

  const lines: string[] = ['stateDiagram-v2']

  parentStates.forEach((parent, pi) => {
    const parentId = "p" + pi
    lines.push('  state "' + parent.name + '" as ' + parentId + ' {')

    const initialChild = parent.initialChild ?? parent.children[0]
    if (initialChild && idMap.has(initialChild)) {
      lines.push("    [*] --> " + idMap.get(initialChild))
    }

    for (const child of parent.children) {
      const id = idMap.get(child)
      if (id) {
        lines.push('    state "' + child + '" as ' + id)
      }
    }
    lines.push("  }")
  })

  for (const [name, id] of idMap.entries()) {
    if (!childStateNames.has(name)) {
      lines.push('  state "' + name + '" as ' + id)
    }
  }

  lines.push('  [*] --> ' + idMap.get(sm.initialState))

  for (const t of sm.transitions) {
    const kind = classifyTransition(t, sm, stateIndexMap)
    const prefix = kindPrefix[kind]
    const rawLabel = t.trigger.replace(/"/g, "'")
    const label = prefix + rawLabel

    const fromId = idMap.get(t.from)
    const toId = t.to === '$PREVIOUS' ? '[*]' : idMap.get(t.to)
    if (fromId && toId) {
      lines.push("  " + fromId + " --> " + toId + " : " + label)
    }
  }

  if (currentParent) {
    const parentIndex = (sm.parentStates ?? []).findIndex(p => p.name === currentParent)
    if (parentIndex >= 0) {
      lines.push('  classDef currentParent fill:#ffe0b2,stroke:#e65100,stroke-width:3px')
      lines.push("  class p" + parentIndex + " currentParent")
    }
  }

  if (current && idMap.has(current)) {
    lines.push('  classDef current fill:#ff9,stroke:#f90,stroke-width:3px,color:#000')
    lines.push('  class ' + idMap.get(current) + ' current')
  }

  return lines.join('\n')
}

function DiagramLegend() {
  return (
    <div className={styles.legend}>
      <h3 className={styles.legendTitle}>凡例</h3>
      <div className={styles.legendGrid}>
        <div className={styles.legendItem}>
          <span className={styles.legendColorBox} style={{ background: '#ffe0b2', border: '2px solid #e65100' }} />
          <span>現在の親状態</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendColorBox} style={{ background: '#ff9', border: '2px solid #f90' }} />
          <span>現在の子状態</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendSymbol}>→</span>
          <span>通常遷移</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendSymbol}>↩</span>
          <span>戻り遷移</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendSymbol}>↗</span>
          <span>親状態またぎ遷移</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendSymbol}>⚡</span>
          <span>割り込み遷移</span>
        </div>
        <div className={styles.legendItem}>
          <span className={styles.legendSymbol}>↺</span>
          <span>復帰遷移（前の状態へ）</span>
        </div>
      </div>
    </div>
  )
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
        <>
          <div ref={containerRef} className={styles.diagram} data-testid="diagram-container" />
          <DiagramLegend />
        </>
      ) : (
        <div className={styles.empty}>
          左側の入力欄に状態遷移の仕様を入力し、「状態遷移を生成」ボタンを押してください。
        </div>
      )}
    </div>
  )
}
