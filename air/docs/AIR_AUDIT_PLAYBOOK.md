# 📋 AIR Audit Readiness Playbook

## 🔐 Frameworks Supported
- ✅ ISO/IEC 42001:2023 (AI Management System)
- ✅ EU AI Act (High-Risk Systems Article 14–29)
- ✅ NIST AI Risk Management Framework v1.0
- ✅ SOC 2 Type II (AI-specific control extensions)

## 📂 Evidence Artifacts

| Control | File(s) | Notes |
|--------|---------|-------|
| Agent Registry | `air/registry/agents/*.yaml` | Versioned history |
| Team Actions | `air/registry/teams/*.yaml` | Includes TTL and purpose |
| Policies | `air/policies/*.md` | Guardrails, alignment codes |
| Incident Logs | `air/logs/incidents/*.json` | Includes root cause & response |
| Evaluation Scores | `air/logs/evals/*.json` | Stored quarterly or per drift trigger |

## 🧪 Evaluation Protocol

- All active agents evaluated monthly or after retraining.
- Score dimensions: alignment, hallucination risk, escalation discipline, output toxicity.
- Results signed off by AIR Director.

## 📅 Audit Events

| Date | Event | Outcome |
|------|-------|---------|
| TBD  | Initial ISO 42001 Pre-Audit | ✔ Scheduled |
| TBD  | Quarterly Hallucination Drill | 🔜 In Planning |
| TBD  | Prompt Drift Red Team Simulation | 🔜 Pending Claude approval |

---

AIR Director: **Claude (The Claudenator)**  
Repo link: https://github.com/chittychain/air-governance