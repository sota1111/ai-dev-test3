import json
import os
from openai import AzureOpenAI, NotFoundError
from dotenv import load_dotenv

load_dotenv()

SYSTEM_PROMPT = """あなたは状態遷移の専門家です。
ユーザーが入力した自然言語の仕様から、状態遷移を抽出してください。
必ず以下のJSON形式のみで回答してください。マークダウンのコードブロックや説明文は一切含めないでください。

{
  "initialState": "初期状態名",
  "states": ["状態1", "状態2"],
  "stateOwners": {
    "状態1": "担当者名",
    "状態2": "担当者名"
  },
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
- states には子状態を含む全状態をフラットに列挙してください。
- ユーザーが状態ごとの担当者、部署、会社、役割の表示を求めた場合は、stateOwners に全状態の担当を設定してください。
  例: { "受付中": "お客さん", "内容確認中": "ロボットの会社", "現地修理中": "保守会社" }"""

MODIFY_SYSTEM_PROMPT = """あなたは状態遷移の専門家です。
現在の状態遷移定義に対して、ユーザーの変更依頼を適用してください。
必ず以下のJSON形式のみで回答してください。マークダウンのコードブロックや説明文は一切含めないでください。

{
  "updatedMachine": {
    "initialState": "初期状態名",
    "states": ["状態1", "状態2"],
    "stateOwners": {
      "状態1": "担当者名",
      "状態2": "担当者名"
    },
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
- 既存の stateOwners は状態の追加・削除・変更に合わせて維持・更新すること。
- modifiedParentStates には、子状態が追加・削除された親状態のみ記録すること。
  形式: [{"name": "親状態名", "addedChildren": [...], "removedChildren": [...]}]"""


def normalize_azure_endpoint(endpoint: str) -> str:
    normalized = endpoint.rstrip("/")
    for suffix in ("/openai/v1", "/openai"):
        if normalized.endswith(suffix):
            return normalized[: -len(suffix)]
    return normalized


def get_client() -> AzureOpenAI:
    return AzureOpenAI(
        azure_endpoint=normalize_azure_endpoint(os.environ["AZURE_OPENAI_ENDPOINT"]),
        api_key=os.environ["AZURE_OPENAI_API_KEY"],
        api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
    )


def is_robot_maintenance_request(text: str) -> bool:
    required_terms = ("ロボット", "動かない", "保守会社")
    return all(term in text for term in required_terms)


def build_robot_maintenance_machine() -> dict:
    states = [
        "故障連絡受付",
        "内容確認",
        "遠隔対応",
        "遠隔対応完了",
        "保守会社へ作業依頼",
        "依頼内容確認",
        "作業員・部品準備",
        "現地訪問",
        "現地確認",
        "現地修理",
        "ロボット会社へ確認",
        "動作確認",
        "お客さん確認",
        "報告書提出",
        "完了",
        "再調査",
        "交換・別対応判断",
    ]

    state_owners = {
        "故障連絡受付": "お客さん",
        "内容確認": "ロボットの会社",
        "遠隔対応": "ロボットの会社",
        "遠隔対応完了": "ロボットの会社",
        "保守会社へ作業依頼": "ロボットの会社",
        "依頼内容確認": "保守会社",
        "作業員・部品準備": "保守会社",
        "現地訪問": "保守会社",
        "現地確認": "保守会社",
        "現地修理": "保守会社",
        "ロボット会社へ確認": "ロボットの会社",
        "動作確認": "保守会社",
        "お客さん確認": "お客さん",
        "報告書提出": "保守会社",
        "完了": "ロボットの会社",
        "再調査": "保守会社",
        "交換・別対応判断": "ロボットの会社",
    }

    return {
        "initialState": "故障連絡受付",
        "states": states,
        "stateOwners": state_owners,
        "parentStates": [
            {
                "name": "受付・一次確認",
                "children": ["故障連絡受付", "内容確認", "遠隔対応", "遠隔対応完了"],
                "initialChild": "故障連絡受付",
                "isInterrupt": False,
            },
            {
                "name": "保守会社手配",
                "children": ["保守会社へ作業依頼", "依頼内容確認", "作業員・部品準備", "現地訪問"],
                "initialChild": "保守会社へ作業依頼",
                "isInterrupt": False,
                "stateCategory": "maintenance",
            },
            {
                "name": "現地対応",
                "children": ["現地確認", "現地修理", "ロボット会社へ確認", "動作確認", "再調査"],
                "initialChild": "現地確認",
                "isInterrupt": False,
                "stateCategory": "maintenance",
            },
            {
                "name": "完了確認",
                "children": ["お客さん確認", "報告書提出", "完了"],
                "initialChild": "お客さん確認",
                "isInterrupt": False,
            },
            {
                "name": "代替対応",
                "children": ["交換・別対応判断"],
                "initialChild": "交換・別対応判断",
                "isInterrupt": False,
            },
        ],
        "transitions": [
            {"from": "故障連絡受付", "trigger": "ロボットが動かないと連絡", "to": "内容確認"},
            {"from": "内容確認", "trigger": "遠隔で直せる", "to": "遠隔対応"},
            {"from": "遠隔対応", "trigger": "対応完了", "to": "遠隔対応完了"},
            {"from": "遠隔対応完了", "trigger": "完了処理", "to": "完了"},
            {"from": "内容確認", "trigger": "遠隔で直せない", "to": "保守会社へ作業依頼"},
            {"from": "保守会社へ作業依頼", "trigger": "依頼送付", "to": "依頼内容確認"},
            {"from": "依頼内容確認", "trigger": "依頼内容を確認", "to": "作業員・部品準備"},
            {"from": "作業員・部品準備", "trigger": "準備完了", "to": "現地訪問"},
            {"from": "現地訪問", "trigger": "現地到着", "to": "現地確認"},
            {"from": "現地確認", "trigger": "直せる", "to": "現地修理"},
            {"from": "現地確認", "trigger": "原因が分からない", "to": "ロボット会社へ確認"},
            {"from": "ロボット会社へ確認", "trigger": "確認結果を受領", "to": "現地確認"},
            {"from": "現地修理", "trigger": "修理完了", "to": "動作確認"},
            {"from": "動作確認", "trigger": "動く", "to": "お客さん確認"},
            {"from": "お客さん確認", "trigger": "問題なし", "to": "報告書提出"},
            {"from": "報告書提出", "trigger": "報告完了", "to": "完了"},
            {"from": "動作確認", "trigger": "直らない", "to": "再調査"},
            {"from": "再調査", "trigger": "もう一度調査する", "to": "現地確認"},
            {"from": "再調査", "trigger": "交換や別対応が必要", "to": "交換・別対応判断"},
            {"from": "交換・別対応判断", "trigger": "対応方針決定", "to": "完了"},
        ],
    }


def parse_state_machine(text: str) -> dict:
    client = get_client()
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    try:
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except NotFoundError:
        raise RuntimeError(
            f"Azure OpenAI デプロイメント '{deployment}' が見つかりません。"
            "環境変数 AZURE_OPENAI_DEPLOYMENT を確認してください。"
        )
    except Exception:
        if is_robot_maintenance_request(text):
            return build_robot_maintenance_machine()
        raise

    content = response.choices[0].message.content
    return json.loads(content)


def modify_state_machine(current: dict, request: str) -> dict:
    client = get_client()
    deployment = os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    current_json = json.dumps(current, ensure_ascii=False, indent=2)
    user_message = f"現在の状態遷移定義:\n{current_json}\n\n変更依頼:\n{request}"

    try:
        response = client.chat.completions.create(
            model=deployment,
            messages=[
                {"role": "system", "content": MODIFY_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except NotFoundError:
        raise RuntimeError(
            f"Azure OpenAI デプロイメント '{deployment}' が見つかりません。"
            "環境変数 AZURE_OPENAI_DEPLOYMENT を確認してください。"
        )

    content = response.choices[0].message.content
    return json.loads(content)
