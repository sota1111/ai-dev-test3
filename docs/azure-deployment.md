# Azure Container Apps デプロイガイド

このドキュメントは Azure Container Apps への state-machine-simulator デプロイ手順を説明します。

---

## 前提条件

- [Azure CLI](https://docs.microsoft.com/cli/azure/install-azure-cli) インストール済み
- Docker インストール済み（image build に必要）
- Azure サブスクリプション
- Azure OpenAI リソース（endpoint / deployment / API version / API key）
- リソース作成権限（Contributor 以上）

---

## 構成

```
Internet
  └── frontend Container App (external ingress, port 3000)
        └── /api/* → backend Container App (internal ingress, port 8000)
                └── SQLite (コンテナ内一時ストレージ)
Azure Container Registry (ACR)
  └── frontend image
  └── backend image
Managed Identity (frontend / backend それぞれ)
  └── AcrPull 権限
Container Apps Environment
  └── frontend Container App
  └── backend Container App
Secret
  └── azure-openai-api-key
```

---

## 環境変数一覧

Azure Container Apps に設定が必要な環境変数です。

| 変数名 | 用途 | ローカル .env | Azure CA 必須 | Secret化 | 未設定時の挙動 | 設定例 |
|--------|------|---------------|---------------|----------|---------------|--------|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI API の endpoint URL | ✓ | ✓ | No | parse API が失敗 | `https://xxx.openai.azure.com/openai/v1` |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI 認証キー | ✓ | ✓ | **Yes** | 401 エラー | (Secret から参照) |
| `AZURE_OPENAI_DEPLOYMENT` | モデル deployment 名 | ✓ | ✓ | No | parse API が失敗 | `gpt-4o-mini` |
| `AZURE_OPENAI_API_VERSION` | API バージョン | ✓ | ✓ | No | parse API が失敗 | `2024-10-21` |
| `DATABASE_URL` | SQLite DB パス | 任意 | ✓ | No | `/tmp/models.db` 使用 | `sqlite:////tmp/models.db` |
| `AZURE_AI_PROJECT_ENDPOINT` | AI Agent Service (将来拡張) | 任意 | No | No | 機能未使用のまま | - |
| `AZURE_AI_MODEL_DEPLOYMENT_NAME` | AI Agent Service モデル名 (将来拡張) | 任意 | No | No | 機能未使用のまま | - |
| `BACKEND_HOST` | frontend nginx の backend 接続先 | (docker-compose で設定) | ✓ (frontend) | No | `backend` (コンテナ名) | `<backend-fqdn>` |

> **重要**: `AZURE_OPENAI_API_KEY` は平文の環境変数として設定せず、Container Apps Secret を使用してください。

---

## Secret 管理

### ローカル開発

`.env` ファイルに API キーを設定します（リポジトリには含めない）:

```bash
# .env (gitignore済み)
AZURE_OPENAI_API_KEY=your_actual_key_here
```

### Azure Container Apps 本番環境

API キーは Container Apps **Secret** として管理し、環境変数から参照します:

```bash
# Secret の登録
az containerapp secret set \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --secrets "azure-openai-api-key=<実際のAPIキー>"

# Secret を env var から参照
az containerapp update \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --set-env-vars "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key"
```

API キーは以下の場所に記載しないでください:
- README / docs
- git 差分 / PR
- コマンド実行ログ（`set +x` を使う）

---

## Managed Identity と ACR pull 権限

ACR の admin user パスワードに依存せず、Managed Identity で image pull します。

### 手順

```bash
# 1. Managed Identity 作成
az identity create \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend-identity

az identity create \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-frontend-identity

# 2. Principal ID を取得
BACKEND_PRINCIPAL=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend-identity \
  --query principalId -o tsv)

FRONTEND_PRINCIPAL=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-frontend-identity \
  --query principalId -o tsv)

# 3. ACR に AcrPull 権限を付与
ACR_ID=$(az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP --query id -o tsv)

az role assignment create --assignee $BACKEND_PRINCIPAL --role AcrPull --scope $ACR_ID
az role assignment create --assignee $FRONTEND_PRINCIPAL --role AcrPull --scope $ACR_ID

# 4. Container App に identity をアタッチ
BACKEND_IDENTITY_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend-identity --query id -o tsv)

az containerapp update \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --user-assigned $BACKEND_IDENTITY_ID \
  --registry-server ${ACR_NAME}.azurecr.io \
  --registry-identity $BACKEND_IDENTITY_ID
```

権限設定の順序: Identity 作成 → AcrPull 付与 → Container App 作成/更新

---

## データ永続化方針

**本アプリケーションはデモ用途のため、案A (永続化しない) を採用します。**

### 案A: 永続化しない（採用）

| 項目 | 内容 |
|------|------|
| DATABASE_URL | `sqlite:////tmp/models.db` (コンテナ内一時ストレージ) |
| 再起動時 | データが消去される |
| 再デプロイ時 | データが消去される |
| スケールアウト時 | レプリカ間でデータが共有されない |

> **注意**: 保存したモデルはコンテナ再起動/再デプロイで消えます。
> 本格運用が必要な場合は Azure Database for PostgreSQL などのマネージド DB への移行を検討してください。

### 本格運用時の移行先候補

- Azure Database for PostgreSQL Flexible Server
- Azure SQL Database
- Azure Cosmos DB

---

## デプロイ手順

### 0. 準備

```bash
# 変数設定
export RESOURCE_GROUP="state-machine-rg"
export LOCATION="japaneast"
export ACR_NAME="statemachineacr$(date +%s)"  # グローバルに一意
export ENVIRONMENT_NAME="state-machine-env"
export AZURE_OPENAI_ENDPOINT="https://xxx.openai.azure.com/openai/v1"
export AZURE_OPENAI_DEPLOYMENT="gpt-4o-mini"
export AZURE_OPENAI_API_VERSION="2024-10-21"
# AZURE_OPENAI_API_KEY はコマンド履歴に残さないよう read で入力推奨
read -s -p "Azure OpenAI API Key: " AZURE_OPENAI_API_KEY
export AZURE_OPENAI_API_KEY

# Azure ログイン
az login
az account show
```

### 1. デプロイスクリプト実行

```bash
bash scripts/azure/deploy-container-apps.sh
```

または手動で各ステップを実行 (下記参照)。

### 2. リソース作成

```bash
az group create --name $RESOURCE_GROUP --location $LOCATION
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic --admin-enabled false
az acr login --name $ACR_NAME
```

### 3. Image build & push

```bash
docker build -t ${ACR_NAME}.azurecr.io/state-machine-frontend:latest ./frontend
docker build -t ${ACR_NAME}.azurecr.io/state-machine-backend:latest ./backend
docker push ${ACR_NAME}.azurecr.io/state-machine-frontend:latest
docker push ${ACR_NAME}.azurecr.io/state-machine-backend:latest
```

### 4. Container Apps Environment 作成

```bash
az containerapp env create \
  --resource-group $RESOURCE_GROUP \
  --name $ENVIRONMENT_NAME \
  --location $LOCATION
```

### 5. Managed Identity & AcrPull 権限

(「Managed Identity と ACR pull 権限」セクション参照)

### 6. Backend Container App 作成

```bash
BACKEND_IDENTITY_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend-identity --query id -o tsv)

az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --environment $ENVIRONMENT_NAME \
  --image ${ACR_NAME}.azurecr.io/state-machine-backend:latest \
  --user-assigned $BACKEND_IDENTITY_ID \
  --registry-server ${ACR_NAME}.azurecr.io \
  --registry-identity $BACKEND_IDENTITY_ID \
  --ingress internal \
  --target-port 8000 \
  --secrets "azure-openai-api-key=${AZURE_OPENAI_API_KEY}" \
  --env-vars \
    "AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}" \
    "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" \
    "AZURE_OPENAI_DEPLOYMENT=${AZURE_OPENAI_DEPLOYMENT}" \
    "AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION}" \
    "DATABASE_URL=sqlite:////tmp/models.db" \
  --min-replicas 1 --max-replicas 2 \
  --cpu 0.25 --memory 0.5Gi
```

### 7. Frontend Container App 作成

```bash
BACKEND_FQDN=$(az containerapp show \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --query "properties.configuration.ingress.fqdn" -o tsv)

FRONTEND_IDENTITY_ID=$(az identity show \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-frontend-identity --query id -o tsv)

az containerapp create \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-frontend \
  --environment $ENVIRONMENT_NAME \
  --image ${ACR_NAME}.azurecr.io/state-machine-frontend:latest \
  --user-assigned $FRONTEND_IDENTITY_ID \
  --registry-server ${ACR_NAME}.azurecr.io \
  --registry-identity $FRONTEND_IDENTITY_ID \
  --ingress external \
  --target-port 3000 \
  --env-vars "BACKEND_HOST=${BACKEND_FQDN}" \
  --min-replicas 1 --max-replicas 2 \
  --cpu 0.25 --memory 0.5Gi
```

### 8. 確認

```bash
bash scripts/azure/check-container-apps.sh
```

---

## 運用・確認

### ログ確認

```bash
az containerapp logs show --resource-group $RESOURCE_GROUP --name state-machine-frontend --tail 50
az containerapp logs show --resource-group $RESOURCE_GROUP --name state-machine-backend --tail 50
```

### 再デプロイ

```bash
# 新 image を push してからリビジョンを更新
az containerapp update \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --image ${ACR_NAME}.azurecr.io/state-machine-backend:latest
```

### Secret 更新

```bash
az containerapp secret set \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --secrets "azure-openai-api-key=<new_key>"

az containerapp revision restart \
  --resource-group $RESOURCE_GROUP \
  --name state-machine-backend \
  --revision <latest_revision>
```

### Health check

```bash
FRONTEND_URL=$(az containerapp show -g $RESOURCE_GROUP -n state-machine-frontend --query "properties.configuration.ingress.fqdn" -o tsv)
curl https://${FRONTEND_URL}/nginx-health  # frontend 自体の health
curl https://${FRONTEND_URL}/health         # backend health (via proxy)
```

---

## 削除手順

```bash
bash scripts/azure/delete-container-apps.sh
```

### 費用が発生するリソース一覧

| リソース | 課金 |
|---------|------|
| Azure Container Registry (Basic) | ~$0.17/日 + image storage |
| Container Apps (frontend/backend) | アクティブ時 vCPU/メモリ課金 |
| Container Apps Environment | ~$0.018/vCPU·時 |
| Managed Identity | 無料 |

> デモ終了後は必ずリソースを削除してください。

---

## ローカル Docker Compose との違い

| 項目 | ローカル (docker-compose) | Azure Container Apps |
|------|--------------------------|----------------------|
| backend 接続先 | `backend` (サービス名) | 内部 FQDN |
| BACKEND_HOST | `backend` | `<backend>.internal.<env>.azurecontainerapps.io` |
| データ保存 | Docker volume (永続) | `/tmp` (一時, 再起動で消える) |
| API キー | `.env` ファイル | Container Apps Secret |
| frontend 公開 | `localhost:3000` | external ingress URL |
| backend 公開 | `localhost:8000` | internal (非公開) |
