import type { StateMachineDiff, ModifyHistoryEntry } from "../types/stateMachine"
import styles from "./DiffPanel.module.css"

interface Props {
  latestDiff: StateMachineDiff | null
  history: ModifyHistoryEntry[]
}

function TransitionLabel({ t }: { t: { from: string; trigger: string; to: string } }) {
  return <span>{t.from} --{t.trigger}-→ {t.to}</span>
}

function DiffSection({ diff }: { diff: StateMachineDiff }) {
  const hasChanges =
    diff.addedStates.length > 0 ||
    diff.removedStates.length > 0 ||
    diff.addedTransitions.length > 0 ||
    diff.removedTransitions.length > 0 ||
    diff.addedParentStates.length > 0 ||
    diff.removedParentStates.length > 0 ||
    diff.modifiedParentStates.length > 0

  if (!hasChanges) {
    return <p className={styles.noChange}>変更はありませんでした。</p>
  }

  return (
    <div className={styles.diffContent}>
      {diff.addedStates.length > 0 && (
        <div>
          <span className={styles.addedLabel}>+ 追加された状態:</span>
          <ul className={styles.list}>
            {diff.addedStates.map(s => <li key={s} className={styles.added}>{s}</li>)}
          </ul>
        </div>
      )}
      {diff.removedStates.length > 0 && (
        <div>
          <span className={styles.removedLabel}>− 削除された状態:</span>
          <ul className={styles.list}>
            {diff.removedStates.map(s => <li key={s} className={styles.removed}>{s}</li>)}
          </ul>
        </div>
      )}
      {diff.addedTransitions.length > 0 && (
        <div>
          <span className={styles.addedLabel}>+ 追加された遷移:</span>
          <ul className={styles.list}>
            {diff.addedTransitions.map((t, i) => (
              <li key={i} className={styles.added}><TransitionLabel t={t} /></li>
            ))}
          </ul>
        </div>
      )}
      {diff.removedTransitions.length > 0 && (
        <div>
          <span className={styles.removedLabel}>− 削除された遷移:</span>
          <ul className={styles.list}>
            {diff.removedTransitions.map((t, i) => (
              <li key={i} className={styles.removed}><TransitionLabel t={t} /></li>
            ))}
          </ul>
        </div>
      )}
      {diff.addedParentStates.length > 0 && (
        <div>
          <span className={styles.addedLabel}>+ 追加された親状態:</span>
          <ul className={styles.list}>
            {diff.addedParentStates.map(s => <li key={s} className={styles.added}>{s}</li>)}
          </ul>
        </div>
      )}
      {diff.removedParentStates.length > 0 && (
        <div>
          <span className={styles.removedLabel}>− 削除された親状態:</span>
          <ul className={styles.list}>
            {diff.removedParentStates.map(s => <li key={s} className={styles.removed}>{s}</li>)}
          </ul>
        </div>
      )}
      {diff.modifiedParentStates.map(p => (
        <div key={p.name}>
          <span className={styles.modifiedLabel}>△ 変更された親状態: {p.name}</span>
          {p.addedChildren.length > 0 && (
            <ul className={styles.list}>
              {p.addedChildren.map(c => <li key={c} className={styles.added}>+ {c}</li>)}
            </ul>
          )}
          {p.removedChildren.length > 0 && (
            <ul className={styles.list}>
              {p.removedChildren.map(c => <li key={c} className={styles.removed}>− {c}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

export function DiffPanel({ latestDiff, history }: Props) {
  if (history.length === 0 && !latestDiff) return null

  return (
    <div className={styles.panel}>
      {latestDiff && (
        <div className={styles.latestDiff}>
          <h3 className={styles.sectionTitle}>最新の変更内容</h3>
          <DiffSection diff={latestDiff} />
        </div>
      )}
      {history.length > 0 && (
        <div className={styles.historySection}>
          <h3 className={styles.sectionTitle}>変更履歴</h3>
          <ol className={styles.historyList}>
            {history.map(entry => (
              <li key={entry.step} className={styles.historyItem}>
                <div className={styles.historyHeader}>
                  <span className={styles.historyStep}>{entry.step}.</span>
                  <span className={styles.historyRequest}>{entry.request}</span>
                  <span className={styles.historyTime}>{entry.timestamp}</span>
                </div>
                <DiffSection diff={entry.diff} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
