import { useState } from "react"
import styles from "./ModifyPanel.module.css"

interface Props {
  onModify: (request: string) => void
  loading: boolean
}

export function ModifyPanel({ onModify, loading }: Props) {
  const [request, setRequest] = useState("")

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>状態遷移を変更</h2>
      <textarea
        className={styles.textarea}
        value={request}
        onChange={e => setRequest(e.target.value)}
        placeholder="変更依頼を入力してください&#10;例: 「エラー状態を追加して、認証失敗時にエラーへ遷移するようにしてください」"
        rows={5}
      />
      <button
        className={styles.modifyBtn}
        onClick={() => {
          onModify(request)
          setRequest("")
        }}
        disabled={loading || !request.trim()}
      >
        {loading ? "変更中..." : "変更を適用"}
      </button>
    </div>
  )
}
