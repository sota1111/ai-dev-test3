import { useState } from "react"
import styles from "./ModifyPanel.module.css"

const SAMPLES = [
  {
    label: "質問への対応",
    text: \`途中で相手から質問された場合の流れも追加してください。
質問に答えたら、元の説明に戻るようにしてください。\`,
  },
  {
    label: "保守会社質問",
    text: \`保守会社から確認質問が来た場合の流れを追加してください。
回答できたら作業準備に戻してください。\`,
  },
  {
    label: "生産技術質問",
    text: \`生産技術の人から質問された場合の流れを追加してください。
設計担当が回答して、元の説明に戻る形にしてください。\`,
  },
  {
    label: "顧客質問",
    text: \`お客さんから料金やセキュリティについて質問された場合の流れを追加してください。
回答後、納得したら提案に戻してください。\`,
  },
  {
    label: "経営陣質問",
    text: \`経営陣から費用対効果について質問された場合の流れを追加してください。
追加確認が必要なら調査してから回答するようにしてください。\`,
  },
]

interface Props {
  onModify: (request: string) => void
  loading: boolean
}

export function ModifyPanel({ onModify, loading }: Props) {
  const [request, setRequest] = useState("")

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>状態遷移を変更</h2>
      <div className={styles.sampleButtons}>
        {SAMPLES.map((sample) => (
          <button
            key={sample.label}
            className={styles.sampleBtn}
            onClick={() => setRequest(sample.text)}
            type="button"
          >
            {sample.label}
          </button>
        ))}
      </div>
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
