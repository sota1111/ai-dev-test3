# Azure Container Apps デプロイ後 検証チェックリスト

デプロイ完了後、このチェックリストに従って動作確認を行ってください。

---

## 1. Azure リソース確認

```bash
az group show --name $RESOURCE_GROUP
az acr show --name $ACR_NAME --resource-group $RESOURCE_GROUP
az containerapp env show --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP
```

- [ ] Resource Group が存在する
- [ ] Azure Container Registry が存在する
- [ ] Container Apps Environment が作成されている
- [ ] `state-machine-frontend` Container App が Running
- [ ] `state-machine-backend` Container App が Running
- [ ] `state-machine-frontend-identity` Managed Identity が存在する
- [ ] `state-machine-backend-identity` Managed Identity が存在する
- [ ] AcrPull 権限が両 identity に付与されている

```bash
az containerapp list -g $RESOURCE_GROUP --query "[].{name:name,status:properties.runningStatus}" -o table
```

---

## 2. 疎通確認

```bash
FRONTEND_URL=$(az containerapp show -g $RESOURCE_GROUP -n state-machine-frontend --query "properties.configuration.ingress.fqdn" -o tsv)
```

- [ ] `https://$FRONTEND_URL` にブラウザでアクセスできる
- [ ] `curl https://$FRONTEND_URL/nginx-health` が HTTP 200 を返す
- [ ] `curl https://$FRONTEND_URL/health` が HTTP 200 を返す (`{"status":"ok"}`)
- [ ] frontend から `/api/` 経由で backend にアクセスできる
- [ ] backend (`state-machine-backend`) の ingress が `internal` になっている

```bash
# backend が external 公開されていないことを確認
az containerapp show -g $RESOURCE_GROUP -n state-machine-backend   --query "properties.configuration.ingress.external" -o tsv
# → false が正解
```

---

## 3. アプリ機能確認

- [ ] `https://$FRONTEND_URL` でアプリの入力画面が表示される
- [ ] テキストエリアに状態遷移の説明を入力して「状態遷移を生成」ボタンを押すと Mermaid 図が表示される
- [ ] 状態遷移図の遷移ボタンをクリックすると状態が遷移する
- [ ] エラー発生時に画面が白くならず、エラー表示になる
- [ ] ページリロード後もアプリが正常に表示される

---

## 4. セキュリティ確認

- [ ] `AZURE_OPENAI_API_KEY` がブラウザ画面に表示されない
- [ ] Container Apps ログに API キーが出力されていない
  ```bash
  az containerapp logs show -g $RESOURCE_GROUP -n state-machine-backend --tail 100 | grep -i "api.key" | head -5
  ```
- [ ] README や PR 差分に API キーが含まれていない
- [ ] `state-machine-backend` の external ingress が false である

---

## 5. データ永続化確認（案A: 永続化しない）

本アプリはデモ用途のため、データは永続化しません。

- [ ] `docs/azure-deployment.md` に永続化しない旨が明記されている
- [ ] DATABASE_URL が `sqlite:////tmp/models.db`（一時ストレージ）に設定されている
- [ ] コンテナ再起動後にデータが消えることを確認済み（または README に記載）
- [ ] 本格運用時の移行先候補が `docs/azure-deployment.md` に記載されている

---

## 6. CI 確認

- [ ] `https://github.com/sota1111/ai-dev-test3/actions` で CI が実行されている
- [ ] frontend ジョブ (typecheck / test / build) が成功している
- [ ] backend ジョブ (pytest) が成功している
- [ ] Docker build ジョブが成功している

---

## 7. 証跡（PR に添付）

PR を作成する際、以下の証跡を添付してください。

- [ ] Azure 上の frontend 画面スクリーンショット
- [ ] 状態遷移生成後の画面スクリーンショット（Mermaid 図が表示されている）
- [ ] GUI トリガー操作後の画面スクリーンショット（状態が変化している）
- [ ] Container Apps の稼働状態スクリーンショット（Running 表示）
- [ ] `curl /nginx-health` と `curl /health` の成功結果
- [ ] CI 成功スクリーンショット（GitHub Actions 画面）
- [ ] backend が internal になっていることの確認結果

---

## health check 確認コマンドまとめ

```bash
FRONTEND_URL=$(az containerapp show -g $RESOURCE_GROUP -n state-machine-frontend --query "properties.configuration.ingress.fqdn" -o tsv)

echo "=== Frontend nginx health ==="
curl -sv https://${FRONTEND_URL}/nginx-health

echo "=== Backend health (via proxy) ==="
curl -sv https://${FRONTEND_URL}/health
```
