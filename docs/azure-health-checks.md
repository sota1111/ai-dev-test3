# Azure Container Apps — Health Check Probe Configuration

## Backend Probes

The backend exposes `/health` returning `{"status": "ok"}` with HTTP 200.

### Azure CLI example

```bash
az containerapp update \
  --name <BACKEND_APP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --set-env-vars DATABASE_URL=sqlite:////tmp/models.db \
  --health-check-type liveness \
  --health-check-path /health \
  --health-check-port 8000 \
  --health-check-initial-delay 10 \
  --health-check-interval 30 \
  --health-check-timeout 5 \
  --health-check-threshold 3
```

### Readiness probe (wait for startup before accepting traffic)

```bash
az containerapp update \
  --name <BACKEND_APP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --health-check-type readiness \
  --health-check-path /health \
  --health-check-port 8000 \
  --health-check-initial-delay 5 \
  --health-check-interval 10
```

## Frontend Probes

The frontend nginx exposes `/nginx-health` returning HTTP 200 "OK" directly (no backend dependency).

### Azure CLI example

```bash
az containerapp update \
  --name <FRONTEND_APP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --health-check-type liveness \
  --health-check-path /nginx-health \
  --health-check-port 3000 \
  --health-check-initial-delay 5 \
  --health-check-interval 30 \
  --health-check-timeout 5

az containerapp update \
  --name <FRONTEND_APP_NAME> \
  --resource-group <RESOURCE_GROUP> \
  --health-check-type readiness \
  --health-check-path /nginx-health \
  --health-check-port 3000 \
  --health-check-initial-delay 3 \
  --health-check-interval 10
```

## Verification

After deploying, verify health check endpoints:

```bash
# Backend health (from a machine with access or via Container Apps logs)
curl https://<BACKEND_FQDN>/health

# Frontend health
curl https://<FRONTEND_URL>/nginx-health

# Backend health via frontend proxy
curl https://<FRONTEND_URL>/health
```

## Notes

- Use `/nginx-health` for frontend Container App probes (independent of backend)
- Use `/health` for backend Container App probes
- The frontend also proxies `/health` to the backend (useful for smoke tests)
- If the backend is down, `/nginx-health` still returns 200 (frontend stays running)
