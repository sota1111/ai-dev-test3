# 状態遷移シミュレーター

Azure OpenAIを使って自然言語から状態遷移を生成し、GUIでシミュレーションできるWebアプリです。

## 機能

- **自然言語によるモデル生成**: 自然言語（日本語/英語）で状態遷移の仕様を入力し、Azure OpenAI (gpt-4o-mini) で状態・トリガー・遷移を自動抽出。
- **階層状態（親状態/子状態）のサポート**: 親状態/子状態を持つ階層構造を生成・表示。
- **Mermaid.js による可視化**: 状態遷移図を動的に描画。現在の子状態を黄色背景、親状態をオレンジ枠で強調表示。
- **GUI シミュレーション**: トリガーボタンにより状態遷移を実行。親状態共通トリガーと子状態専用トリガーの両方を実行可能。
- **割り込みと復帰**: 割り込み状態（isInterrupt）への遷移と、`$PREVIOUS` による元の状態への復帰をサポート。
- **担当者表示**: 状態ごとの担当者（会社/部署/役割）をバッジ形式で表示。
- **自然言語による既存モデルの変更**: 生成済みまたは読み込み済みのモデルに対して、自然言語で変更を依頼。
- **変更差分と履歴**: モデル変更時の差分（追加/削除された状態・遷移）を視覚的に表示し、変更履歴を記録。
- **モデルの永続化**: 状態遷移モデルを名前を付けて保存、読み込み、上書き、複製、削除が可能（SQLite を使用）。
- **シミュレーション履歴**: 実行した遷移をステップごとに記録し、いつでもリセット可能。
- **入力支援**: ロボット保守、半導体製造装置などのサンプル入力および変更依頼サンプルを完備。

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

`.env.example` をコピーして `.env` を作成し、必要な情報を設定してください。

```bash
cp .env.example .env
```

**.env 設定例:**
```env
AI_PROVIDER=openai
OPENAI_API_KEY=<your-openai-api-key>
OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` が設定されている場合は OpenAI API を優先して使用します。
Azure OpenAI を使う場合は `AZURE_OPENAI_*` を設定してください。

### 3. Docker Compose で起動

```bash
docker-compose up --build
```

起動後、以下の URL でアクセス可能です。
- **フロントエンド**: [http://localhost:3000](http://localhost:3000)
- **バックエンド ヘルスチェック**: [http://localhost:8001/health](http://localhost:8001/health) (Docker Compose 利用時)

### 4. 停止

```bash
docker-compose down
```

## 環境変数

| 変数名 | 説明 | デフォルト / 備考 |
|--------|------|-------------------|
| `AI_PROVIDER` | 利用する AI プロバイダ | `openai` または未設定時はキー有無で自動判定 |
| `OPENAI_API_KEY` | OpenAI API キー | 設定時は OpenAI API を優先 |
| `OPENAI_MODEL` | OpenAI API モデル名 | `gpt-4o-mini` |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI エンドポイント URL | Azure OpenAI 利用時に必須 |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API キー | Azure OpenAI 利用時に必須 |
| `AZURE_OPENAI_DEPLOYMENT` | デプロイ名 | `gpt-4o-mini` |
| `AZURE_OPENAI_API_VERSION` | API バージョン | `2024-10-21` |
| `DATABASE_URL` | モデル保存用データベース接続文字列 | `sqlite:////data/models.db` |
| `BACKEND_HOST` | nginx からのプロキシ先ホスト名 | `backend` (Docker Compose 用) |
| `VITE_BACKEND_URL` | Vite 開発サーバーのプロキシ先 | `http://localhost:8000` |
| `AZURE_AI_PROJECT_ENDPOINT` | Microsoft Foundry エンドポイント | 現行コードでは未使用 |
| `AZURE_AI_MODEL_DEPLOYMENT_NAME` | Microsoft Foundry モデルデプロイ名 | 現行コードでは未使用 |

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| `GET` | `/health` | バックエンド ヘルスチェック |
| `POST` | `/api/parse` | 自然言語から状態遷移モデルを生成 |
| `POST` | `/api/modify` | 既存モデルに変更依頼を適用し差分を返す |
| `GET` | `/api/models` | 保存済みモデル一覧の取得 |
| `POST` | `/api/models` | モデルの新規保存 |
| `GET` | `/api/models/{id}` | モデルの詳細取得 |
| `PUT` | `/api/models/{id}` | モデルの上書き更新 |
| `POST` | `/api/models/{id}/duplicate` | モデルの複製 |
| `DELETE` | `/api/models/{id}` | モデルの削除 |
| `GET` | `/nginx-health` | フロントエンド nginx ヘルスチェック |

## 保存済みモデル

- **モデルの保存**: 現在のモデルに名前を付けて保存できます。
- **一覧管理**: 保存されたモデルの一覧から、過去のモデルを読み込んだり、複製・削除したりできます。
- **データの永続化**: Docker Compose 環境では `model-data` ボリュームを使用して SQLite データベースに保存されます。
- **Azure 環境**: Azure デプロイ時は一時領域（`/tmp`）に保存されるため、再デプロイや再起動でデータが消去されることに注意してください。詳細は [docs/azure-deployment.md](docs/azure-deployment.md) を参照してください。

## 開発・テスト

### バックエンド (Python)

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt
pytest
```

### フロントエンド (React)

```bash
cd frontend
npm install
npm run typecheck  # 型チェック
npm run test       # ユニットテスト
npm run e2e        # Playwright による E2E テスト
```

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| 言語 | Python 3.11, TypeScript |
| バックエンド | FastAPI, Pydantic v2, SQLAlchemy 2.0 |
| フロントエンド | React 18, Vite, Axios |
| AI | Azure OpenAI (gpt-4o-mini) |
| データベース | SQLite |
| 状態遷移図 | Mermaid.js |
| テスト | pytest, Vitest, Testing Library, Playwright |
| インフラ | Docker, nginx |

## Azure へのデプロイ

詳細な手順やチェックリストについては、`docs/` ディレクトリのドキュメントを参照してください。

- [Azure デプロイ手順書](docs/azure-deployment.md)
- [デプロイ前チェックリスト](docs/azure-deploy-checklist.md)
- [Azure ヘルスチェック仕様](docs/azure-health-checks.md)

## 状態遷移図の見方

### 状態の強調表示

- **オレンジ色の枠**: 現在の親状態
- **黄色の背景**: 現在の子状態

### 遷移ラベルのプレフィックス

- (なし): 通常遷移
- `↩`: 戻り遷移
- `↗`: 親状態またぎ遷移
- `⚡`: 割り込み遷移
- `↺`: 復帰遷移（`$PREVIOUS` による復帰）

### 表示モード切り替え

| モード | 表示内容 |
|--------|----------|
| 全体 | すべての状態・遷移を表示 |
| 現在の親状態 | 現在の親状態とその子状態、関連する遷移を表示 |
| 主工程 | `isInterrupt` な親状態や復帰遷移を除外して表示 |
| 例外・割り込み | `isInterrupt` な親状態に関連する遷移を表示 |
| 保守 | `isInterrupt` かつ `stateCategory` が `maintenance` の親状態に関わる遷移を表示 |
