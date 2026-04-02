#!/bin/bash
# Deploy the oref proxy to GCP Cloud Run (me-west1 - Tel Aviv)
# Requires: gcloud CLI authenticated, billing enabled
#
# Usage: cd alert-dashboard/proxy && bash deploy.sh

set -euo pipefail

PROJECT_ID="${GCP_PROJECT:-}"
REGION="me-west1"  # Tel Aviv
SERVICE="oref-proxy"
IMAGE="gcr.io/${PROJECT_ID}/${SERVICE}:latest"

if [[ -z "$PROJECT_ID" ]]; then
  echo "Set your GCP project ID:"
  echo "  export GCP_PROJECT=your-project-id"
  echo ""
  echo "Or create a new one:"
  echo "  gcloud projects create YOUR_ID --name=\"oref-proxy\""
  exit 1
fi

echo "==> Deploying to GCP Cloud Run (${REGION})..."
echo "    Project: ${PROJECT_ID}"
echo "    Service: ${SERVICE}"

gcloud config set project "$PROJECT_ID"

# Build and deploy from Dockerfile
gcloud run deploy "$SERVICE" \
  --source . \
  --region "$REGION" \
  --allow-unauthenticated \
  --memory 128Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 1 \
  --port 8080 \
  --set-env-vars "FRONTEND_ORIGIN=https://pelegguy.github.io"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format="value(status.url)")

echo ""
echo "==> Deployed!"
echo "    URL: ${URL}"
echo ""
echo "    Now update alert-dashboard/src/hooks/useAlerts.js:"
echo "    Replace PROXY_URL with: ${URL}"
