import { useEffect, useRef } from 'react'
import mermaid from 'mermaid'
import type { StateMachine } from '../types/stateMachine'
import styles from './DiagramPanel.module.css'

mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

interface Props {
  stateMachine: StateMachine | null
  currentState: string
}

function buildMermaid(sm: StateMachine, current: string): string {
  const lines: string[] = ['stateDiagram-v2']
  lines.push('  [*] --> ' + sm.initialState)
  for (const t of sm.transitions) {
    const label = t.trigger.replace(/"/g, "'")
    lines.push('  ' + t.from + ' --> ' + t.to + ' : ' + label)
  }
  if (current) {
    lines.push('  classDef current fill:#ff9,stroke:#f90,stroke-width:3px,color:#000')
    lines.push('  class ' + current + ' current')
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
        <div ref={containerRef} className={styles.diagram} />
      ) : (
        <div className={styles.empty}>
          左側の入力欄に状態遷移の仕様を入力し、「状態遷移を生成」ボタンを押してください。
        </div>
      )}
    </div>
  )
}
