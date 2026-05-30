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
    { "name": "親状態名", "children": ["状態1", "状態2"] }
  ],
  "transitions": [
    { "from": "遷移元", "trigger": "トリガー名", "to": "遷移先" }
  ]
}

parentStates には、複数の状態をまとめる「グループ（親状態）」が存在する場合のみ値を入れてください。
階層がない場合は空配列 [] を返してください。
states には子状態を含む全状態をフラットに列挙してください。"""


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
