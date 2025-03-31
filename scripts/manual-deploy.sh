#!/bin/bash

# Manual deployment script for Deno Deploy
# Requires deployctl to be installed: deno install -A -r https://deno.land/x/deploy/deployctl.ts
# Requires DENO_DEPLOY_TOKEN environment variable to be set.

# --- Configuration ---
PROJECT_NAME="permit2-rpc-proxy" # Replace with your Deno Deploy project name
ENTRYPOINT="packages/permit2-rpc-server/src/deno-server.ts" # Updated entrypoint path
# --- End Configuration ---

# Check if DENO_DEPLOY_TOKEN is set
if [ -z "$DENO_DEPLOY_TOKEN" ]; then
  echo "Error: DENO_DEPLOY_TOKEN environment variable is not set."
  echo "Please set it before running this script."
  exit 1
fi

echo "Deploying project '$PROJECT_NAME' from entrypoint '$ENTRYPOINT'..."

# Execute deployctl
# Exclude directories not needed for the deployment runtime
# Note: deployctl usually runs from the root, so paths are relative to root
deployctl deploy --project="$PROJECT_NAME" "$ENTRYPOINT" \
  --exclude=node_modules \
  --exclude=lib \
  --exclude=.git \
  --exclude=.github \
  --exclude=scripts # Exclude the scripts dir itself

echo "Deployment command executed."
echo "Check the output above or the Deno Deploy dashboard for deployment status and URL."
