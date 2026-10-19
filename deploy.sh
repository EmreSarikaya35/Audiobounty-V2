#!/bin/bash
# Uploads the project to your server and rebuilds the containers.
#
# Usage: ./deploy.sh
#
# Put your server details in .deploy.env (git-ignored):
#   DEPLOY_HOST=root@203.0.113.10
#   DEPLOY_DIR=/opt/kick-sound-alerts   # optional, this is the default
set -e

cd "$(dirname "$0")"
[ -f .deploy.env ] && source .deploy.env

: "${DEPLOY_HOST:?Set DEPLOY_HOST (e.g. root@203.0.113.10) in .deploy.env}"
DEPLOY_DIR="${DEPLOY_DIR:-/opt/kick-sound-alerts}"

echo "→ Uploading files to $DEPLOY_HOST:$DEPLOY_DIR…"
rsync -av \
  --exclude data --exclude sounds --exclude .env --exclude .deploy.env \
  --exclude .git --exclude node_modules --exclude .DS_Store \
  ./ "$DEPLOY_HOST:$DEPLOY_DIR/"

echo "→ Rebuilding and restarting…"
ssh "$DEPLOY_HOST" "cd $DEPLOY_DIR && docker compose up -d --build && docker compose ps"

echo "✓ Deployed"
