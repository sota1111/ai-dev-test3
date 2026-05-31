#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# check-container-apps.sh
# Check status and health of deployed Container Apps
# ============================================================

: "${RESOURCE_GROUP:?RESOURCE_GROUP is required}"

FRONTEND_APP="state-machine-frontend"
BACKEND_APP="state-machine-backend"

echo "==> Container App status"
az containerapp list \
  --resource-group "$RESOURCE_GROUP" \
  --query "[].{name:name, status:properties.runningStatus, replicas:properties.template.scale.minReplicas}" \
  --output table

echo ""
echo "==> Frontend URL"
FRONTEND_URL=$(az containerapp show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --query "properties.configuration.ingress.fqdn" -o tsv)
echo "https://${FRONTEND_URL}"

echo ""
echo "==> Frontend health check"
curl -sf "https://${FRONTEND_URL}/nginx-health" && echo " [OK]" || echo " [FAILED]"

echo ""
echo "==> Backend health check (via frontend proxy)"
curl -sf "https://${FRONTEND_URL}/health" && echo " [OK]" || echo " [FAILED]"

echo ""
echo "==> Frontend logs (last 20 lines)"
az containerapp logs show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$FRONTEND_APP" \
  --tail 20 2>/dev/null || echo "(no logs available)"

echo ""
echo "==> Backend logs (last 20 lines)"
az containerapp logs show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$BACKEND_APP" \
  --tail 20 2>/dev/null || echo "(no logs available)"
