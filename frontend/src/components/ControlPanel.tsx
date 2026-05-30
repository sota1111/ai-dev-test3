import type { StateMachine, Transition } from "../types/stateMachine"
import styles from "./ControlPanel.module.css"

interface Props {
  stateMachine: StateMachine | null
  currentState: string
  onTrigger: (transition: Transition) => void
}

export function ControlPanel({ stateMachine, currentState, onTrigger }: Props) {
  if (!stateMachine) {
    return (
      <div className={styles.panel}>
        <div className={styles.empty}>状態遷移を生成してください</div>
      </div>
    )
  }

  const availableTransitions = stateMachine.transitions.filter(
    t => t.from === currentState
  )

  const parentStates = stateMachine.parentStates ?? []
  const childStateNames = new Set(parentStates.flatMap(p => p.children))
  const flatStates = stateMachine.states.filter(s => !childStateNames.has(s))

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h2 className={styles.title}>現在状態</h2>
        <div className={styles.currentState}>{currentState}</div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.title}>状態一覧</h2>
        <ul className={styles.list}>
          {parentStates.map(parent => (
            <li key={parent.name} className={styles.stateItem}>
              <span className={styles.parentLabel}>{parent.name}</span>
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
        {availableTransitions.length === 0 ? (
          <p className={styles.noTrigger}>実行可能なトリガーはありません（終端状態）</p>
        ) : (
          <div className={styles.triggers}>
            {availableTransitions.map((t, i) => (
              <button
                key={i}
                className={styles.triggerBtn}
                onClick={() => onTrigger(t)}
              >
                {t.trigger}
                <span className={styles.arrow}> → {t.to}</span>
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
