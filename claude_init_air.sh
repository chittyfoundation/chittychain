#!/bin/bash

echo "🧠 Bootstrapping AIR Department..."
mkdir -p air/{registry/{agents,teams},policies,scripts,logs/{incidents,evals},docs}

touch air/registry/agents/.keep
touch air/registry/teams/.keep
touch air/policies/README.md
touch air/scripts/sync_registry.py
touch air/logs/incidents/.keep
touch air/logs/evals/.keep
touch air/docs/AIR_AUDIT_PLAYBOOK.md

echo "✅ AIR directory structure created."
echo "🚨 Next: run spawn_tea.sh to instantiate a team."