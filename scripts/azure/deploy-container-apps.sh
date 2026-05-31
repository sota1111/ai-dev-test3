#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# deploy-container-apps.sh
# Deploy frontend and backend to Azure Container Apps
# ============================================================

# --- Required variables (set these before running) ---
: "${RESOURCE_GROUP:?RESOURCE_GROUP is required}"
: "${LOCATION:?LOCATION is required (e.g. japaneast)}"
: "${ACR_NAME:?ACR_NAME is required (globally unique)}"
: "${ENVIRONMENT_NAME:?ENVIRONMENT_NAME is required}"
: "${AZURE_OPENAI_ENDPOINT:?AZURE_OPENAI_ENDPOINT is required}"
: "${AZURE_OPENAI_DEPLOYMENT:?AZURE_OPENAI_DEPLOYMENT is required}"
: "${AZURE_OPENAI_API_VERSION:?AZURE_OPENAI_API_VERSION is required}"
: "${AZURE_OPENAI_API_KEY:?AZURE_OPENAI_API_KEY is required}"

FRONTEND_APP="state-machine-frontend"
BACKEND_APP="state-machine-backend"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "==> Checking Azure CLI login..."
az account show > /dev/null

echo "==> Creating resource group: $RESOURCE_GROUP in $LOCATION"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output none

echo "==> Creating Azure Container Registry: $ACR_NAME"
az acr create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --sku Basic \
  --admin-enabled false \
  --output none

echo "==> Logging into ACR"
az acr login --name "$ACR_NAME"

FRONTEND_IMAGE="${ACR_NAME}.azurecr.io/${FRONTEND_APP}:latest"
BACKEND_IMAGE="${ACR_NAME}.azurecr.io/${BACKEND_APP}:latest"

echo "==> Building and pushing frontend image"
docker build -t "$FRONTEND_IMAGE" "$REPO_ROOT/frontend"
docker push "$FRONTEND_IMAGE"

echo "==> Building and pushing backend image"
docker build -t "$BACKEND_IMAGE" "$REPO_ROOT/backend"
docker push "$BACKEND_IMAGE"

echo "==> Creating Container Apps Environment: $ENVIRONMENT_NAME"
az containerapp env create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ENVIRONMENT_NAME" \
  --location "$LOCATION" \
  --output none

echo "==> Creating managed identity for backend"
BACKEND_IDENTITY_ID=$(az identity create \
  --resource-group "$RESOURCE_GROUP" \
  --name "${BACKEND_APP}-identity" \
  --query id -o tsv)

echo "==> Creating managed identity for frontend"
FRONTEND_IDENTITY_ID=$(az identity create \
  --resource-group "$RESOURCE_GROUP" \
  --name "${FRONTEND_APP}-identity" \
  --query id -o tsv)

echo "==> Assigning AcrPull role to managed identities"
ACR_ID=$(az acr show --name "$ACR_NAME" --resource-group "$RESOURCE_GROUP" --query id -o tsv)
BACKEND_PRINCIPAL=$(az identity show --ids "$BACKEND_IDENTITY_ID" --query principalId -o tsv)
FRONTEND_PRINCIPAL=$(az identity show --ids "$FRONTEND_IDENTITY_ID" --query principalId -o tsv)

az role assignment create \
  --assignee "$BACKEND_PRINCIPAL" \
  --role AcrPull \
  --scope "$ACR_ID" \
  --output none

az role assignment create \
  --assignee "$FRONTEND_PRINCIPAL" \
  --role AcrPull \
  --scope "$ACR_ID" \
  --output none

echo "==> Registering Secret: azure-openai-api-key"
SECRET_VALUE="$AZURE_OPENAI_API_KEY"

echo "==> Creating backend Container App"
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "$BACKEND_IMAGE" \
  --user-assigned "$BACKEND_IDENTITY_ID" \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-identity "$BACKEND_IDENTITY_ID" \
  --ingress internal \
  --target-port 8000 \
  --secrets "azure-openai-api-key=${SECRET_VALUE}" \
  --env-vars \
    "AZURE_OPENAI_ENDPOINT=${AZURE_OPENAI_ENDPOINT}" \
    "AZURE_OPENAI_API_KEY=secretref:azure-openai-api-key" \
    "AZURE_OPENAI_DEPLOYMENT=${AZURE_OPENAI_DEPLOYMENT}" \
    "AZURE_OPENAI_API_VERSION=${AZURE_OPENAI_API_VERSION}" \
    "DATABASE_URL=sqlite:////tmp/models.db" \
  --min-replicas 1 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --output none

BACKEND_FQDN=$(az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo "==> Creating frontend Container App"
az containerapp create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --environment "$ENVIRONMENT_NAME" \
  --image "$FRONTEND_IMAGE" \
  --user-assigned "$FRONTEND_IDENTITY_ID" \
  --registry-server "${ACR_NAME}.azurecr.io" \
  --registry-identity "$FRONTEND_IDENTITY_ID" \
  --ingress external \
  --target-port 3000 \
  --env-vars "BACKEND_HOST=${BACKEND_FQDN}" \
  --min-replicas 1 \
  --max-replicas 2 \
  --cpu 0.25 \
  --memory 0.5Gi \
  --output none

FRONTEND_URL=$(az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)

echo ""
echo "==================================================="
echo "Deployment complete!"
echo "Frontend URL: https://${FRONTEND_URL}"
echo "==================================================="
