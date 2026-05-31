#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# delete-container-apps.sh
# Delete Azure Container Apps resources
# ============================================================

: "${RESOURCE_GROUP:?RESOURCE_GROUP is required}"
: "${ACR_NAME:?ACR_NAME is required}"
: "${ENVIRONMENT_NAME:?ENVIRONMENT_NAME is required}"

FRONTEND_APP="state-machine-frontend"
BACKEND_APP="state-machine-backend"

echo "==> Deleting frontend Container App: $FRONTEND_APP"
az containerapp delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --yes 2>/dev/null || echo "(already deleted or not found)"

echo "==> Deleting backend Container App: $BACKEND_APP"
az containerapp delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --yes 2>/dev/null || echo "(already deleted or not found)"

echo "==> Deleting Container Apps Environment: $ENVIRONMENT_NAME"
az containerapp env delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ENVIRONMENT_NAME" \
  --yes 2>/dev/null || echo "(already deleted or not found)"

echo "==> Deleting ACR: $ACR_NAME"
az acr delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "$ACR_NAME" \
  --yes 2>/dev/null || echo "(already deleted or not found)"

echo "==> Deleting managed identities"
az identity delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "${BACKEND_APP}-identity" 2>/dev/null || echo "(already deleted)"
az identity delete \
  --resource-group "$RESOURCE_GROUP" \
  --name "${FRONTEND_APP}-identity" 2>/dev/null || echo "(already deleted)"

echo ""
echo "WARNING: Resource group  has NOT been deleted."
echo "To delete the resource group (WARNING: deletes ALL resources in it):"
echo ""
read -p "  Delete resource group ? [y/N] " confirm
if [[ "${confirm:-N}" =~ ^[Yy]$ ]]; then
  az group delete --name "$RESOURCE_GROUP" --yes
  echo "Resource group deleted."
else
  echo "Resource group kept. Delete manually if no longer needed."
fi
