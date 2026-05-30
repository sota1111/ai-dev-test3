# 状態遷移シミュレーター

Azure OpenAIを使って自然言語から状態遷移を生成し、GUIでシミュレーションできるWebアプリです。

## 機能

- 自然言語（日本語/英語）で状態遷移の仕様を入力
- Azure OpenAI (gpt-4o-mini) で状態・トリガー・遷移を自動抽出
- Mermaid.js による状態遷移図の可視化（現在状態強調表示）
- GUIトリガーボタンによる状態遷移シミュレーション
- シミュレーション履歴の記録とリセット機能

## 必要なもの

- Docker / Docker Compose
- Azure OpenAI リソース（API キー・エンドポイント）

## ローカルで起動する

### 1. リポジトリをクローン

```bash
git clone https://github.com/sota1111/ai-dev-test3.git
cd ai-dev-test3
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` を開き、`AZURE_OPENAI_API_KEY` に実際の API キーを設定してください。

```
AZURE_OPENAI_API_KEY=your_actual_api_key_here
```

### 3. Docker Compose で起動

```bash
docker-compose up --build
```

起動後、ブラウザで http://localhost:3000 を開いてください。

### 4. 停止

```bash
docker-compose down
```

## 環境変数

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI エンドポイント URL | ✅ |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API キー | ✅ |
| `AZURE_OPENAI_DEPLOYMENT` | デプロイ名（例: `gpt-4o-mini`） | ✅ |
| `AZURE_OPENAI_API_VERSION` | API バージョン（例: `2024-10-21`） | ✅ |
| `AZURE_AI_PROJECT_ENDPOINT` | Microsoft Foundry プロジェクトエンドポイント | 将来拡張用 |
| `AZURE_AI_MODEL_DEPLOYMENT_NAME` | Microsoft Foundry モデルデプロイ名 | 将来拡張用 |

> **注意**: `.env` ファイルに API キーを入れたまま Git にコミットしないでください。`.gitignore` で除外されていますが、確認をお忘れなく。

## Microsoft Foundry / Azure AI Agent Service について

`AZURE_AI_PROJECT_ENDPOINT` と `AZURE_AI_MODEL_DEPLOYMENT_NAME` は、将来的に Azure AI Agent Service（Microsoft Foundry）を利用した高度なエージェント機能を追加する際に使用します。現在のバージョンでは使用していませんが、`.env.example` に記載してあります。

詳細: [Azure AI Agent Service ドキュメント](https://learn.microsoft.com/azure/ai-services/agents/)

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/health` | ヘルスチェック |
| `POST` | `/api/parse` | 自然言語 → 状態遷移 JSON 変換 |

### POST /api/parse リクエスト例

```json
{
  "text": "ユーザーは未ログイン状態から開始する。ログインボタンを押すと認証中になる。認証成功ならログイン済みになる。認証失敗ならエラー表示になる。"
}
```

## Azure へのデプロイ

### Azure Container Apps（推奨）

```bash
# リソースグループ作成
az group create --name rg-state-machine --location japaneast

# Container Registry 作成
az acr create --resource-group rg-state-machine --name statemachineacr --sku Basic

# イメージをビルドして push
az acr build --registry statemachineacr --image state-machine-backend:latest ./backend
az acr build --registry statemachineacr --image state-machine-frontend:latest ./frontend

# Container Apps 環境作成
az containerapp env create \
  --name state-machine-env \
  --resource-group rg-state-machine \
  --location japaneast

# バックエンドデプロイ
az containerapp create \
  --name state-machine-backend \
  --resource-group rg-state-machine \
  --environment state-machine-env \
  --image statemachineacr.azurecr.io/state-machine-backend:latest \
  --target-port 8000 \
  --ingress internal \
  --env-vars AZURE_OPENAI_ENDPOINT=<your-endpoint> AZURE_OPENAI_API_KEY=secretref:openai-key AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini AZURE_OPENAI_API_VERSION=2024-10-21

# フロントエンドデプロイ
az containerapp create \
  --name state-machine-frontend \
  --resource-group rg-state-machine \
  --environment state-machine-env \
  --image statemachineacr.azurecr.io/state-machine-frontend:latest \
  --target-port 3000 \
  --ingress external
```

> **注意**: 本番環境では `AZURE_OPENAI_API_KEY` を Azure Key Vault または Container Apps Secrets で管理してください。環境変数に平文で渡さないでください。

### Azure App Service（代替）

Dockerfile をそのまま使用して、Azure App Service (Linux コンテナー) にデプロイ可能です。

## 開発環境での起動（Docker なし）

### バックエンド

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env  # API キーを設定
uvicorn app.main:app --reload --port 8000
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev  # http://localhost:3000 で起動
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | Python 3.11 + FastAPI + uvicorn |
| AI | Azure OpenAI (gpt-4o-mini) |
| フロントエンド | React 18 + TypeScript + Vite |
| 状態遷移図 | Mermaid.js |
| コンテナ | Docker + Docker Compose |
| フロントエンドサーブ | nginx |

## 状態遷移図の見方

状態遷移図には以下の視覚的な表現が含まれます。

### 状態の強調表示

| 表示色 | 意味 |
|--------|------|
| 橙色 (オレンジ) の枠 | 現在の親状態 |
| 黄色の背景 | 現在の子状態 |

### 遷移ラベルのプレフィックス

| プレフィックス | 遷移種別 | 説明 |
|---------------|----------|------|
| (なし) | 通常遷移 | 主工程の前進遷移 |
| ↩ | 戻り遷移 | 前の状態に戻る再試行など |
| ↗ | 親状態またぎ遷移 | 異なる親状態をまたぐ遷移 |
| ⚡ | 割り込み遷移 | 一時停止・例外・保守への割り込み |
| ↺ | 復帰遷移 | 割り込みから前の状態へ戻る (PREVIOUS) |

### 親状態内の [*]

各親状態ブロック内の [*] -> は初期子状態を示します。
