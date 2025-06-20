#!/bin/bash

TEAM_NAME=$1
REGISTRY_PATH="air/registry/teams/${TEAM_NAME}.yaml"

if [ -z "$TEAM_NAME" ]; then
  echo "Usage: ./spawn_tea.sh <team-name>"
  exit 1
fi

cp tea_manifest.yaml "$REGISTRY_PATH"
sed -i "s/team_name: .*/team_name: $TEAM_NAME/" "$REGISTRY_PATH"
sed -i "s/registry_path: .*/registry_path: $REGISTRY_PATH/" "$REGISTRY_PATH"
sed -i "s/created_at: .*/created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)/" "$REGISTRY_PATH"

echo "✅ Tea '$TEAM_NAME' spawned and registered at $REGISTRY_PATH"