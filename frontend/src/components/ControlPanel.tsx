import type { StateMachine, Transition, ParentState } from "../types/stateMachine"
import styles from "./ControlPanel.module.css"

interface Props {
  stateMachine: StateMachine | null
  currentState: string
  currentParentState?: string | null
  onTrigger: (transition: Transition) => void
}

function resolveDestination(to: string, parentStates: ParentState[]): string {
  if (to === "$PREVIOUS") return "前の状態へ戻る"
  const parent = parentStates.find(p => p.name === to)
  if (parent) {
    const child = parent.initialChild ?? parent.children[0]
    return child ? `${to} / ${child}` : to
  }
  const ownerParent = parentStates.find(p => p.children.includes(to))
  if (ownerParent) return `${ownerParent.name} / ${to}`
  return to
}

export function ControlPanel({ stateMachine, currentState, currentParentState = null, onTrigger }: Props) {
  if (!stateMachine) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>状態遷移を生成してください</div>
      </div>
    )
  }

  const parentStates = stateMachine.parentStates ?? []
  const childTransitions = stateMachine.transitions.filter(t => t.from === currentState)
  const parentTransitions = currentParentState
    ? stateMachine.transitions.filter(t => t.from === currentParentState)
    : []

  const childStateNames = new Set(parentStates.flatMap(p => p.children))
  const flatStates = stateMachine.states.filter(s => !childStateNames.has(s))

  const currentStateDisplay = currentParentState
    ? `${currentParentState} > ${currentState}`
    : currentState

  const showHeaders = childTransitions.length > 0 && parentTransitions.length > 0
  const allEmpty = childTransitions.length === 0 && parentTransitions.length === 0

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.title}>現在状態</h2>
        <div className={styles.currentState}>{currentStateDisplay}</div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>状態一覧</h2>
        <ul className={styles.list}>
          {parentStates.map(parent => (
            <li key={parent.name} className={styles.stateItem}>
              <span className={`${styles.parentLabel} ${currentParentState === parent.name ? styles.active : ""}`}>
                {parent.name}
              </span>
              <ul className={styles.list}>
                {parent.children.map(child => (
                  <li
                    key={child}
                    className={`${styles.stateItem} ${styles.childItem} ${child === currentState ? styles.active : ""}`}
                  >
                    {child}
                  </li>
                ))}
              </ul>
            </li>
          ))}
          {flatStates.map(s => (
            <li
              key={s}
              className={`${styles.stateItem} ${s === currentState ? styles.active : ""}`}
            >
              {s}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>実行可能なトリガー</h2>
        {allEmpty ? (
          <p className={styles.noTrigger}>実行可能なトリガーはありません（終端状態）</p>
        ) : (
          <div className={styles.triggers}>
            {showHeaders && <h3 className={styles.groupHeader}>現在状態専用トリガー</h3>}
            {childTransitions.map((t, i) => (
              <button
                key={`child-${i}`}
                className={styles.triggerBtn}
                onClick={() => onTrigger(t)}
              >
                {t.trigger}
                <span className={styles.arrow}> → {resolveDestination(t.to, parentStates)}</span>
              </button>
            ))}
            {showHeaders && <h3 className={styles.groupHeader}>親状態共通トリガー</h3>}
            {parentTransitions.map((t, i) => (
              <button
                key={`parent-${i}`}
                className={styles.triggerBtn}
                onClick={() => onTrigger(t)}
              >
                {t.trigger}
                <span className={styles.arrow}> → {resolveDestination(t.to, parentStates)}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>遷移一覧</h2>
        <ul className={styles.transitionList}>
          {stateMachine.transitions.map((t, i) => (
            <li key={i} className={styles.transitionItem}>
              <span className={styles.fromState}>{t.from}</span>
              <span className={styles.triggerLabel}>{t.trigger}</span>
              <span className={styles.toState}>{t.to}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
