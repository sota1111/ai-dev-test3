import json
import os
from openai import AzureOpenAI
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """あなたは状態遷移の専門家です。
ユーザーが入力した自然言語の仕様から、状態遷移を抽出してください。
必ず以下のJSON形式のみで回答してください。マークダウンのコードブロックや説明文は一切含めないでください。

{
  "initialState": "初期状態名",
  "states": ["状態1", "状態2"],
  "parentStates": [
    {
      "name": "親状態名",
      "children": ["状態1", "状態2"],
      "initialChild": "状態1",
      "isInterrupt": false
    }
  ],
  "transitions": [
    { "from": "遷移元", "trigger": "トリガー名", "to": "遷移先" }
  ]
}

ルール:
- parentStates には、複数の状態をまとめる「グループ（親状態）」が存在する場合のみ値を入れてください。
  階層がない場合は空配列 [] を返してください。
- isInterrupt: 割込み状態（例: 一時停止中、異常復旧中）には "isInterrupt": true を設定してください。
  割込み状態とは、別の親状態から中断してその状態に入り、完了後に元の状態へ戻るような状態です。
- $PREVIOUS: 「停止前の状態に戻る」「異常前の状態に戻る」といった動的な戻り遷移には、
  "to": "$PREVIOUS" を使用してください。
  例: { "from": "再開確認中", "trigger": "再開許可", "to": "$PREVIOUS" }
       { "from": "復旧確認中", "trigger": "復旧OK", "to": "$PREVIOUS" }
- initialChild: 親状態に入ったとき最初に遷移する子状態名を必ず指定してください。
- 親状態配下のどの子状態からも共通して使えるトリガーは、from に「親状態名」を使ってください。
  例: { "from": "注文処理中", "trigger": "キャンセル", "to": "キャンセル済み" }
- 子状態から親状態の外に出る遷移は、from に「子状態名」を使ってください。
  例: { "from": "発送準備", "trigger": "発送完了", "to": "発送済み" }
- states には子状態を含む全状態をフラットに列挙してください。"""

MODIFY_SYSTEM_PROMPT = """あなたは状態遷移の専門家です。
現在の状態遷移定義に対して、ユーザーの変更依頼を適用してください。
必ず以下のJSON形式のみで回答してください。マークダウンのコードブロックや説明文は一切含めないでください。

{
  "updatedMachine": {
    "initialState": "初期状態名",
    "states": ["状態1", "状態2"],
    "parentStates": [
      {
        "name": "親状態名",
        "children": ["状態1", "状態2"],
      "initialChild": "状態1",
      "isInterrupt": false
      }
    ],
    "transitions": [
      { "from": "遷移元", "trigger": "トリガー名", "to": "遷移先" }
    ]
  },
  "diff": {
    "addedStates": [],
    "removedStates": [],
    "addedTransitions": [],
    "removedTransitions": [],
    "addedParentStates": [],
    "removedParentStates": [],
    "modifiedParentStates": []
  }
}

ルール:
- 変更依頼に関係しない状態・遷移・親状態はそのまま維持すること。勝手に削除・変更しないこと。
- ユーザーが依頼した内容のみを反映すること。
- diff には変更内容のみを記録すること（変更のない項目は空配列）。
- parentStates には、複数の状態をまとめる「グループ（親状態）」が存在する場合のみ値を入れること。階層がない場合は空配列 [] を返すこと。
- isInterrupt: 割込み状態（例: 一時停止中、異常復旧中）には "isInterrupt": true を設定してください。
  割込み状態とは、別の親状態から中断してその状態に入り、完了後に元の状態へ戻るような状態です。
- $PREVIOUS: 「停止前の状態に戻る」「異常前の状態に戻る」といった動的な戻り遷移には、
  "to": "$PREVIOUS" を使用してください。
  例: { "from": "再開確認中", "trigger": "再開許可", "to": "$PREVIOUS" }
       { "from": "復旧確認中", "trigger": "復旧OK", "to": "$PREVIOUS" }
- initialChild: 親状態に入ったとき最初に遷移する子状態名を必ず指定すること。
- 親状態配下のどの子状態からも共通して使えるトリガーは、from に「親状態名」を使うこと。
- modifiedParentStates には、子状態が追加・削除された親状態のみ記録すること。
  形式: [{"name": "親状態名", "addedChildren": [...], "removedChildren": [...]}]"""


def get_client() -> AzureOpenAI:
    return AzureOpenAI(
        azure_endpoint=os.environ["AZURE_OPENAI_ENDPOINT"],
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
    )


def parse_state_machine(text: str) -> dict:
    client = get_client()
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    return json.loads(content)


def modify_state_machine(current: dict, request: str) -> dict:
    client = get_client()
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    current_json = json.dumps(current, ensure_ascii=False, indent=2)
    user_message = f"現在の状態遷移定義:\n{current_json}\n\n変更依頼:\n{request}"

    response = client.chat.completions.create(
        model=deployment,
        messages=[
            {"role": "system", "content": MODIFY_SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    content = response.choices[0].message.content
    return json.loads(content)
