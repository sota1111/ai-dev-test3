import type { ModelSummary } from "../types/stateMachine"
import styles from "./ModelListPanel.module.css"

interface Props {
  models: ModelSummary[]
  currentModelId: string | null
  onLoad: (id: string) => void
  onDuplicate: (id: string) => void
  onDelete: (id: string, name: string) => void
  onRefresh: () => void
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ModelListPanel({ models, currentModelId, onLoad, onDuplicate, onDelete, onRefresh }: Props) {
  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>保存済みモデル</h2>
        <button className={styles.refreshBtn} onClick={onRefresh} title="更新">
          ↻
        </button>
      </div>
      {models.length === 0 ? (
        <p className={styles.empty}>保存済みモデルはありません</p>
      ) : (
        <ul className={styles.list}>
          {models.map((m) => (
            <li
              key={m.id}
              className={styles.item + (m.id === currentModelId ? " " + styles.active : "")}
            >
              <div className={styles.itemInfo}>
                <span className={styles.name}>{m.name}</span>
                <span className={styles.meta}>
                  {m.state_count}状態 / {m.transition_count}遷移
                </span>
                <span className={styles.date}>更新: {formatDate(m.updated_at)}</span>
              </div>
              <div className={styles.itemActions}>
                <button
                  className={styles.loadBtn}
                  onClick={() => onLoad(m.id)}
                  disabled={m.id === currentModelId}
                >
                  {m.id === currentModelId ? "開中" : "開く"}
                </button>
                <button
                  className={styles.dupBtn}
                  onClick={() => onDuplicate(m.id)}
                  title="複製"
                >
                  複製
                </button>
                <button
                  className={styles.delBtn}
                  onClick={() => onDelete(m.id, m.name)}
                  title="削除"
                >
                  削除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
