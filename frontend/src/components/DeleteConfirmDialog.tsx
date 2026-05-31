import styles from "./DeleteConfirmDialog.module.css"

interface Props {
  open: boolean
  modelName: string
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConfirmDialog({ open, modelName, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>モデルを削除</h2>
        <p className={styles.message}>
          <strong>{modelName}</strong> を削除しますか？この操作は取り消せません。
        </p>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.deleteBtn} onClick={onConfirm}>削除</button>
        </div>
      </div>
    </div>
  )
}
