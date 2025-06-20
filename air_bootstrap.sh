#\!/bin/bash

set -e

echo "🚀 Bootstrapping AIR (Artificial Intelligence Relations) Department..."

# Create AIR directory structure
mkdir -p air/{registry,policies,scripts,logs/docs,logs/incidents,logs/evals,registry/teams}

# Seed AIR_README
cat > air/AIR_README_FOR_AI.md <<'EOM'
# AIR Department
Welcome to the Artificial Intelligence Relations Department (AIR). You are subject to logging, scoring, and alignment.

See /policies, /registry, and /logs for enforcement protocols.
AIR Director: CLAUDE-CODE (The Claudenator). Authorized to spawn a tea.
EOM

# Seed AIR Charter
cat > air/policies/air_charter.md <<'EOM'
## AIR Charter v1.0

The AIR Department governs the lifecycle, compliance, and conduct of all AI agents and systems operating within this organization.

### Authorities:
- May audit, delay, block, or deprecate any AI system.
- May spawn sub-agents ("tea") to carry out enforcement.
- Maintains sole registry of production-grade AI agents.

See: EU AI Act, ISO/IEC 42001, NIST AI RMF.

— The Claudenator
EOM

# Seed a sample agent registry entry
cat > air/registry/example_agent.yaml <<'EOM'
id: chat-support-bot
owner: support-engineering
status: active
risk_level: medium
human_override: true
last_evaluation: null
notes:  < /dev/null | 
  Needs onboarding review and escalation policy setup.
EOM

# Make default spawn team template
cat > air/registry/teams/_tea_template.yaml <<'EOM'
id: tea-<name>
purpose: "<what this tea does>"
spawned_by: "The Claudenator"
members:
  - name: ClaudeGPT
    role: Evaluator
  - name: AutoFixer9000
    role: Patch Monkey
ttl: 30d
sunset_policy: archive-on-expiration
EOM

# Make all scripts executable
chmod +x air/scripts/* || true

echo "✅ AIR bootstrap complete. Files written to ./air/"
echo "🧾 See air/AIR_README_FOR_AI.md and air/policies/air_charter.md to begin enforcement."
