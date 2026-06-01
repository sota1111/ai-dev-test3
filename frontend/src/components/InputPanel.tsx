import styles from "./InputPanel.module.css"

const EXAMPLE = "ユーザーは未ログイン状態から開始する。\n" +
"ログインボタンを押すと認証中になる。\n" +
"認証成功ならログイン済みになる。\n" +
"認証失敗ならエラー表示になる。\n" +
"エラー表示で再試行すると認証中に戻る。\n" +
"ログアウトすると未ログインに戻る。"

interface Props {
  value: string
  onChange: (text: string) => void
  onGenerate: (text: string) => void
  loading: boolean
}

export function InputPanel({ value, onChange, onGenerate, loading }: Props) {
  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>初期条件入力</h2>
      <textarea
        className={styles.textarea}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={EXAMPLE}
        rows={12}
      />
      <button
        className={styles.generateBtn}
        onClick={() => onGenerate(value)}
        disabled={loading || !value.trim()}
      >
        {loading ? "生成中..." : "状態遷移を生成"}
      </button>
    </div>
  )
}
