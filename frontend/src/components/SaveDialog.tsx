import { useState, useEffect } from "react"
import styles from "./SaveDialog.module.css"

interface Props {
  open: boolean
  initialName?: string
  onSave: (name: string) => void
  onCancel: () => void
}

export function SaveDialog({ open, initialName = "", onSave, onCancel }: Props) {
  const [name, setName] = useState(initialName)

  useEffect(() => {
    if (open) setName(initialName)
  }, [open, initialName])

  if (!open) return null

  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>モデルを保存</h2>
        <label className={styles.label}>
          モデル名
          <input
            className={styles.input}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === "Enter" && name.trim()) onSave(name.trim())
              if (e.key === "Escape") onCancel()
            }}
          />
        </label>
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onCancel}>キャンセル</button>
          <button className={styles.saveBtn} onClick={() => onSave(name.trim())} disabled={!name.trim()}>
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
