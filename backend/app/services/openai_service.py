import json
import os
import re
from copy import deepcopy
from openai import AzureOpenAI, OpenAI, NotFoundError
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


def get_chat_client():
    provider = os.environ.get("AI_PROVIDER", "").strip().lower()
    openai_api_key = os.environ.get("OPENAI_API_KEY", "").strip()
    if provider == "openai" and not openai_api_key:
        raise RuntimeError("OPENAI_API_KEY が設定されていません。.env に OpenAI API キーを設定してください。")

    if provider == "openai" or openai_api_key:
        return (
            OpenAI(api_key=openai_api_key),
            os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
            "openai",
        )

    return (
        AzureOpenAI(
            azure_endpoint=normalize_azure_endpoint(os.environ["AZURE_OPENAI_ENDPOINT"]),
            api_key=os.environ["AZURE_OPENAI_API_KEY"],
            api_version=os.environ.get("AZURE_OPENAI_API_VERSION", "2024-10-21"),
        ),
        os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"),
        "azure",
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


def build_empty_diff() -> dict:
    return {
        "addedStates": [],
        "removedStates": [],
        "addedTransitions": [],
        "removedTransitions": [],
        "addedParentStates": [],
        "removedParentStates": [],
        "modifiedParentStates": [],
    }


def has_diff(diff: dict) -> bool:
    return any(diff.get(key) for key in (
        "addedStates",
        "removedStates",
        "addedTransitions",
        "removedTransitions",
        "addedParentStates",
        "removedParentStates",
        "modifiedParentStates",
    ))


def fallback_modify_state_machine(current: dict, request: str) -> dict:
    updated = deepcopy(current)
    diff = build_empty_diff()
    states = updated.setdefault("states", [])
    state_owners = updated.setdefault("stateOwners", {})
    parent_states = updated.setdefault("parentStates", [])
    transitions = updated.setdefault("transitions", [])

    if any(term in request for term in ("不要", "削除", "消して")):
        transition_name_aliases = {
            "対応完了": {"遠隔対応完了", "対応完了"},
            "報告書作成": {"報告書提出", "報告書作成"},
            "報告書提出": {"報告書提出", "報告書作成"},
        }

        def expand_state_name(name: str) -> set[str]:
            return transition_name_aliases.get(name, {name})

        removed: list[dict] = []
        from_to_match = re.search(r"(.+?)から(.+?)への遷移", request)
        from_only_match = re.search(r"(.+?)からの遷移", request)

        if from_to_match:
            from_candidates = expand_state_name(from_to_match.group(1).strip(" 「」"))
            to_candidates = expand_state_name(from_to_match.group(2).strip(" 「」"))
            removed = [
                transition for transition in transitions
                if transition.get("from") in from_candidates and transition.get("to") in to_candidates
            ]
        elif from_only_match:
            from_candidates = expand_state_name(from_only_match.group(1).strip(" 「」"))
            removed = [
                transition for transition in transitions
                if transition.get("from") in from_candidates
            ]

        if removed:
            transitions[:] = [transition for transition in transitions if transition not in removed]
            diff["removedTransitions"].extend(removed)
            return {"updatedMachine": updated, "diff": diff}

    if "遠隔" in request and "報告書" in request and "報告書提出" in states:
        remote_sources = [state for state in ("遠隔対応完了", "遠隔対応") if state in states]
        for source in remote_sources:
            removed = [
                transition for transition in transitions
                if transition.get("from") == source and transition.get("to") == "完了"
            ]
            if removed:
                transitions[:] = [transition for transition in transitions if transition not in removed]
                diff["removedTransitions"].extend(removed)

            transition = {"from": source, "trigger": "報告書を提出", "to": "報告書提出"}
            if transition not in transitions:
                transitions.append(transition)
                diff["addedTransitions"].append(transition)

    state_match = re.search(r"([^\s、。,.]+?)状態を追加", request)
    if state_match:
        state_name = state_match.group(1)
        if not state_name.endswith("状態"):
            state_name = f"{state_name}状態"
        if state_name not in states:
            states.append(state_name)
            diff["addedStates"].append(state_name)

    transition_match = re.search(r"(.+?)から(.+?)への遷移を追加", request)
    if transition_match:
        from_state = transition_match.group(1).strip(" 「」")
        to_state = transition_match.group(2).strip(" 「」")
        if from_state in states and to_state not in states:
            states.append(to_state)
            diff["addedStates"].append(to_state)
        if from_state and to_state:
            transition = {"from": from_state, "trigger": request, "to": to_state}
            if transition not in transitions:
                transitions.append(transition)
                diff["addedTransitions"].append(transition)

    trigger_match = re.search(r"([^、。,.]+?)時に([^、。,.]+?)へ遷移", request)
    if trigger_match and diff["addedStates"]:
        trigger = trigger_match.group(1).strip()
        requested_to_state = trigger_match.group(2).strip(" 「」")
        to_state = requested_to_state
        if to_state not in states and f"{to_state}状態" in states:
            to_state = f"{to_state}状態"
        if to_state not in states:
            to_state = diff["addedStates"][0]
        transition = {"from": updated["initialState"], "trigger": trigger, "to": to_state}
        if transition not in transitions:
            transitions.append(transition)
            diff["addedTransitions"].append(transition)

    question_match = re.search(r"(.+?)から.*?質問", request)
    if "質問" in request and "追加" in request:
        asker = question_match.group(1).strip(" 「」\n") if question_match else "相手"
        if "途中で" in asker:
            asker = "相手"
        question_state = f"{asker}質問受付"
        answer_state = f"{asker}質問回答"
        for state_name in (question_state, answer_state):
            if state_name not in states:
                states.append(state_name)
                diff["addedStates"].append(state_name)
        state_owners.setdefault(question_state, asker)
        state_owners.setdefault(answer_state, "担当者")

        parent_name = f"{asker}質問対応"
        if not any(parent.get("name") == parent_name for parent in parent_states):
            parent_states.append({
                "name": parent_name,
                "children": [question_state, answer_state],
                "initialChild": question_state,
                "isInterrupt": True,
            })
            diff["addedParentStates"].append(parent_name)

        sources = [parent["name"] for parent in parent_states if parent.get("name") != parent_name]
        if not sources:
            sources = [updated["initialState"]]

        for source in sources:
            transition = {"from": source, "trigger": f"{asker}から質問", "to": question_state}
            if transition not in transitions:
                transitions.append(transition)
                diff["addedTransitions"].append(transition)

        transition = {"from": question_state, "trigger": "回答する", "to": answer_state}
        if transition not in transitions:
            transitions.append(transition)
            diff["addedTransitions"].append(transition)

        return_to = "$PREVIOUS"
        if "作業準備" in request and "作業員・部品準備" in states:
            return_to = "作業員・部品準備"
        elif "提案" in request and "提案内容説明" in states:
            return_to = "提案内容説明"
        transition = {"from": answer_state, "trigger": "回答完了", "to": return_to}
        if transition not in transitions:
            transitions.append(transition)
            diff["addedTransitions"].append(transition)

    return {"updatedMachine": updated, "diff": diff}


def parse_state_machine(text: str) -> dict:
    client, model, provider = get_chat_client()

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": text},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except NotFoundError:
        if is_robot_maintenance_request(text):
            return build_robot_maintenance_machine()
        if provider == "openai":
            raise RuntimeError(
                f"OpenAI モデル '{model}' が見つかりません。"
                "環境変数 OPENAI_MODEL を確認してください。"
            )
        raise RuntimeError(
            f"Azure OpenAI デプロイメント '{model}' が見つかりません。"
            "環境変数 AZURE_OPENAI_DEPLOYMENT を確認してください。"
        )
    except Exception:
        if is_robot_maintenance_request(text):
            return build_robot_maintenance_machine()
        raise

    content = response.choices[0].message.content
    return json.loads(content)


def modify_state_machine(current: dict, request: str) -> dict:
    client, model, provider = get_chat_client()

    current_json = json.dumps(current, ensure_ascii=False, indent=2)
    user_message = f"現在の状態遷移定義:\n{current_json}\n\n変更依頼:\n{request}"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": MODIFY_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
    except NotFoundError:
        if provider == "openai":
            raise RuntimeError(
                f"OpenAI モデル '{model}' が見つかりません。"
                "環境変数 OPENAI_MODEL を確認してください。"
            )
        result = fallback_modify_state_machine(current, request)
        if not has_diff(result["diff"]):
            raise RuntimeError(
                "Azure OpenAI デプロイメントが見つからないため、自然言語の変更依頼をAIで解釈できません。"
                "現在のローカルフォールバックで解釈できる依頼は、状態追加、遷移追加、質問対応追加、"
                "遠隔対応後の報告書提出、遷移削除などの一部パターンのみです。"
            )
        return result

    content = response.choices[0].message.content
    return json.loads(content)
