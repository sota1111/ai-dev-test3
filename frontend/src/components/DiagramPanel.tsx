import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { StateMachine, Transition, DisplayMode } from '../types/stateMachine'
import styles from './DiagramPanel.module.css'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

interface Props {
  stateMachine: StateMachine | null
  currentState: string
  currentParentState: string | null
  displayMode: DisplayMode
  onDisplayModeChange: (mode: DisplayMode) => void
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

export function filterStateMachine(
  sm: StateMachine,
  mode: DisplayMode,
  currentState: string,
  currentParent: string | null
): StateMachine {
  if (mode === 'all') return sm

  const parentStates = sm.parentStates ?? []

  if (mode === 'current-parent') {
    if (!currentParent) {
      const relevant = new Set([currentState])
      sm.transitions
        .filter(t => t.from === currentState || t.to === currentState)
        .forEach(t => {
          relevant.add(t.from)
          if (t.to !== '$PREVIOUS') relevant.add(t.to)
        })
      return {
        ...sm,
        states: sm.states.filter(s => relevant.has(s)),
        parentStates: [],
        transitions: sm.transitions.filter(
          t => relevant.has(t.from) && (relevant.has(t.to) || t.to === '$PREVIOUS')
        ),
      }
    }
    const parentDef = parentStates.find(p => p.name === currentParent)
    if (!parentDef) return sm

    const parentChildSet = new Set(parentDef.children)
    const relatedTransitions = sm.transitions.filter(t => {
      const fromInParent = parentChildSet.has(t.from) || t.from === currentParent
      const toInParent = parentChildSet.has(t.to) || t.to === currentParent || t.to === '$PREVIOUS'
      return fromInParent || toInParent
    })
    const relevantStates = new Set()
    relatedTransitions.forEach(t => {
      if (!parentChildSet.has(t.from) && t.from !== currentParent) relevantStates.add(t.from)
      if (t.to !== '$PREVIOUS' && !parentChildSet.has(t.to) && t.to !== currentParent) relevantStates.add(t.to)
    })
    parentDef.children.forEach(c => relevantStates.add(c))

    const initChild = parentDef.initialChild ?? parentDef.children[0] ?? sm.initialState
    return {
      ...sm,
      states: sm.states.filter(s => relevantStates.has(s) || parentChildSet.has(s)),
      parentStates: [parentDef],
      transitions: relatedTransitions,
      initialState: parentChildSet.has(sm.initialState) ? sm.initialState : initChild,
    }
  }

  if (mode === 'main-process') {
    const interruptParentNames = new Set(parentStates.filter(p => p.isInterrupt).map(p => p.name))
    const interruptChildNames = new Set(parentStates.filter(p => p.isInterrupt).flatMap(p => p.children))

    const filteredTransitions = sm.transitions.filter(t => {
      if (interruptParentNames.has(t.from) || interruptParentNames.has(t.to)) return false
      if (interruptChildNames.has(t.from) || interruptChildNames.has(t.to)) return false
      if (t.to === '$PREVIOUS') return false
      return true
    })
    return {
      ...sm,
      states: sm.states.filter(s => !interruptChildNames.has(s)),
      parentStates: parentStates.filter(p => !p.isInterrupt),
      transitions: filteredTransitions,
    }
  }

  if (mode === 'exception' || mode === 'maintenance') {
    let targetParents = parentStates.filter(p => p.isInterrupt)
    const hasCategory = targetParents.some(p => p.stateCategory)

    if (hasCategory) {
      if (mode === 'maintenance') {
        targetParents = targetParents.filter(p => p.stateCategory === 'maintenance')
      } else {
        targetParents = targetParents.filter(p => p.stateCategory !== 'maintenance')
      }
    }

    const targetParentNames = new Set(targetParents.map(p => p.name))
    const targetChildNames = new Set(targetParents.flatMap(p => p.children))

    const relatedTransitions = sm.transitions.filter(t => {
      const toTarget = targetParentNames.has(t.to) || targetChildNames.has(t.to)
      const fromTarget = targetChildNames.has(t.from) || targetParentNames.has(t.from)
      const isReturn = t.to === '$PREVIOUS' && targetChildNames.has(t.from)
      return toTarget || fromTarget || isReturn
    })

    const relevantStates = new Set()
    relatedTransitions.forEach(t => {
      if (!targetParentNames.has(t.from)) relevantStates.add(t.from)
      if (t.to !== '$PREVIOUS' && !targetParentNames.has(t.to)) relevantStates.add(t.to)
    })
    targetParents.forEach(p => p.children.forEach(c => relevantStates.add(c)))

    const initState = relevantStates.has(sm.initialState) ? sm.initialState : (Array.from(relevantStates)[0] ?? sm.initialState)
    return {
      ...sm,
      states: sm.states.filter(s => relevantStates.has(s)),
      parentStates: targetParents,
      transitions: relatedTransitions,
      initialState: initState,
    }
  }

  return sm
}

export function buildMermaid(sm: StateMachine, current: string, currentParent: string | null = null): string {
  const stateIndexMap = new Map()
  sm.states.forEach((state, index) => {
    stateIndexMap.set(state, index)
  })

  const idMap = new Map()
  sm.states.forEach((state, index) => {
    idMap.set(state, 's' + index)
  })
  const allStateNames = new Set([
    sm.initialState,
    ...sm.transitions.flatMap(t => [t.from, t.to]),
    ...(current ? [current] : [])
  ])
  let nextId = sm.states.length
  for (const name of allStateNames) {
    if (!idMap.has(name)) {
      idMap.set(name, 's' + nextId++)
      stateIndexMap.set(name, nextId)
    }
  }

  const parentStates = sm.parentStates ?? []
  const childStateNames = new Set(parentStates.flatMap(p => p.children))
  const lines = ['stateDiagram-v2']

  parentStates.forEach((parent, pi) => {
    const parentId = 'p' + pi
    lines.push('  state "' + parent.name + '" as ' + parentId + ' {')
    const initialChild = parent.initialChild ?? parent.children[0]
    if (initialChild && idMap.has(initialChild)) {
      lines.push('    [*] --> ' + idMap.get(initialChild))
    }
    for (const child of parent.children) {
      const id = idMap.get(child)
      if (id) {
        lines.push('    state "' + child + '" as ' + id)
      }
    }
    lines.push('  }')
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
      lines.push('  ' + fromId + ' --> ' + toId + ' : ' + label)
    }
  }

  if (currentParent) {
    const parentIndex = (sm.parentStates ?? []).findIndex(p => p.name === currentParent)
    if (parentIndex >= 0) {
      lines.push('  classDef currentParent fill:#ffe0b2,stroke:#e65100,stroke-width:3px')
      lines.push('  class p' + parentIndex + ' currentParent')
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

const MODE_LABELS: any = {
  'all': '全体',
  'current-parent': '現在の親状態',
  'main-process': '主工程',
  'exception': '例外・割り込み',
  'maintenance': '保守',
}

const ALL_MODES: DisplayMode[] = ['all', 'current-parent', 'main-process', 'exception', 'maintenance']

let diagramId = 0

export function DiagramPanel({ stateMachine, currentState, currentParentState, displayMode, onDisplayModeChange }: Props) {
  const containerRef = useRef(null)

  const filteredSm = stateMachine
    ? filterStateMachine(stateMachine, displayMode, currentState, currentParentState)
    : null

  useEffect(() => {
    if (!filteredSm || !containerRef.current) return
    const id = 'mermaid-diagram-' + (++diagramId)
    const definition = buildMermaid(filteredSm, currentState, currentParentState)
    mermaid.render(id, definition).then(({ svg }) => {
      const el = containerRef.current as any
      if (el) el.innerHTML = svg
    }).catch(() => {
      const el = containerRef.current as any
      if (el) el.innerHTML = 'Error'
    })
  }, [filteredSm, currentState, currentParentState])

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>状態遷移図</h2>
      {stateMachine ? (
        <>
          <div className={styles.modeBar}>
            {ALL_MODES.map(mode => (
              <button
                key={mode}
                className={styles.modeBtn + (displayMode === mode ? ' ' + styles.modeBtnActive : '')}
                onClick={() => onDisplayModeChange(mode)}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>
          {displayMode !== 'all' && (
            <div className={styles.partialIndicator}>
              ⚠ 一部の状態・遷移のみ表示しています。全体を確認する場合は「全体」を選択してください。
            </div>
          )}
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
