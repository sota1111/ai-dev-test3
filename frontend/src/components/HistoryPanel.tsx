import type { HistoryEntry } from "../types/stateMachine"
import styles from "./HistoryPanel.module.css"

interface Props {
  history: HistoryEntry[]
  onReset: () => void
  hasStateMachine: boolean
}

export function HistoryPanel({ history, onReset, hasStateMachine }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>シミュレーション履歴</h2>
        {hasStateMachine && (
          <button className={styles.resetBtn} onClick={onReset}>
            リセット
          </button>
        )}
      </div>
      {history.length === 0 ? (
        <p className={styles.empty}>
          {hasStateMachine ? "まだ状態遷移が実行されていません。右側のトリガーボタンを押してください。" : "状態遷移を生成してください。"}
        </p>
      ) : (
        <ol className={styles.list}>
          {history.map(entry => (
            <li key={entry.step} className={styles.entry}>
              <span className={styles.step}>{entry.step}.</span>
              <span className={styles.from}>{entry.from}</span>
              <span className={styles.arrow}>--{entry.trigger}--&gt;</span>
              <span className={styles.to}>{entry.to}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
