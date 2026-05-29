import { useState } from "react"
import styles from "./InputPanel.module.css"

const EXAMPLE = `ユーザーは未ログイン状態から開始する。
ログインボタンを押すと認証中になる。
認証成功ならログイン済みになる。
認証失敗ならエラー表示になる。
エラー表示で再試行すると認証中に戻る。
ログアウトすると未ログインに戻る。` 

interface Props {
  onGenerate: (text: string) => void
  loading: boolean
}

export function InputPanel({ onGenerate, loading }: Props) {
  const [text, setText] = useState("")

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>自然言語入力</h2>
      <textarea
        className={styles.textarea}
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={EXAMPLE}
        rows={12}
      />
      <button
        className={styles.generateBtn}
        onClick={() => onGenerate(text)}
        disabled={loading || !text.trim()}
      >
        {loading ? "生成中..." : "状態遷移を生成"}
      </button>
    </div>
  )
}
