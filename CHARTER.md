---
uri: chittycanon://docs/ops/policy/chitty-chain-charter
namespace: chittycanon://docs/ops
type: policy
version: 1.0.0
status: DRAFT
registered_with: chittycanon://core/services/canon
title: "ChittyChain Charter"
certifier: chittycanon://core/services/chittycertify
visibility: PUBLIC
---

# ChittyChain Charter

## Classification
- **Canonical URI**: `chittycanon://core/services/chitty-chain`
- **Tier**: 0 (Trust Anchors)
- **Organization**: CHITTYFOUNDATION
- **Domain**: chain.chitty.cc

## Mission

ChittyChain is the **on-chain anchor layer** for the ChittyOS ecosystem. It provides immutable finality for governance decisions, attribution traces, and evidence records. While ChittyLedger is the fast off-chain database layer, ChittyChain is the permanent on-chain record of truth. Referenced in the Foundation Charter (Section 2) as a core scope service.

## Scope

### IS Responsible For
- On-chain anchoring of governance decisions, attribution traces, and evidence
- Hard-Mint operations (from Ledger's Soft-Mint to Chain's immutable record)
- Smart contract management (property NFTs, governance contracts)
- Blockchain infrastructure for the ecosystem
- Immutable finality for dispute resolution

### IS NOT Responsible For
- Off-chain ledger operations (ChittyLedger)
- Event logging (ChittyChronicle)
- Attribution computation (ChittyDNA)
- Governance standards definition (ChittyGov)

## Three Aspects (TY VY RY)

Source: `chittycanon://gov/governance#three-aspects`

| Aspect | Abbrev | Question | ChittyChain Answer |
|--------|--------|----------|--------------------|
| **Identity** | TY | What IS it? | On-chain anchor layer — immutable finality for governance, attribution, and evidence |
| **Connectivity** | VY | How does it ACT? | Receives Soft-Mint from ChittyLedger → Hard-Mint on-chain; smart contracts for property NFTs; API + WebSocket real-time |
| **Authority** | RY | Where does it SIT? | Tier 0 Trust Anchor — the final, immutable record; once anchored, cannot be modified; Foundation Charter scope service |

## Dependencies

| Type | Service | Purpose |
|------|---------|---------|
| Upstream | ChittyLedger | Receives Soft-Mint entries for Hard-Mint anchoring |
| Upstream | ChittyDNA | Attribution traces to anchor |
| Upstream | ChittyGov | Governance decisions to anchor |
| Peer | ChittyCanon | Canonical governance alignment |
| Downstream | ChittyEvidence | Anchored evidence for dispute resolution |
| Downstream | ChittyVerify | On-chain verification of anchored records |

## API Contract

**Base URL**: https://chain.chitty.cc

### Core Endpoints
| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | Health check |
| `/api/v1/anchor` | POST | Yes | Anchor record on-chain (Hard-Mint) |
| `/api/v1/verify/:hash` | GET | No | Verify on-chain record |
| `/api/v1/contracts` | GET | Yes | List deployed smart contracts |
| `/api/v1/transactions` | GET | Yes | Query transaction history |

## Dual Immutability

```
Soft-Mint (ChittyLedger)          Hard-Mint (ChittyChain)
├── Fast, queryable                ├── Permanent, on-chain
├── Off-chain                      ├── On-chain
├── Committed to Ledger            ├── Anchored to Chain
└── Frozen, immutable in DB        └── Final, immutable on-chain
```

## Ownership

| Role | Owner |
|------|-------|
| Service Owner | ChittyFoundation |
| Technical Lead | @chittyos-infrastructure |
| Contact | chain@chitty.cc |

## Compliance

- [ ] Service registered in ChittyRegistry
- [ ] Health endpoint operational at /health
- [ ] CLAUDE.md development guide present
- [ ] CHITTY.md badge/one-pager present
- [ ] On-chain anchoring operational

## Document Triad

This charter is part of a synchronized documentation triad. Changes to shared fields must propagate.

| Field | Canonical Source | Also In |
|-------|-----------------|---------|
| Canonical URI | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Tier | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Domain | CHARTER.md (Classification) | CHITTY.md (blockquote), CLAUDE.md (header) |
| Endpoints | CHARTER.md (API Contract) | CHITTY.md (Endpoints table), CLAUDE.md (API section) |
| Dependencies | CHARTER.md (Dependencies) | CHITTY.md (Dependencies table), CLAUDE.md (Architecture) |
| Certification badge | CHITTY.md (Certification) | CHARTER.md frontmatter `status` |

**Related docs**: [CHITTY.md](CHITTY.md) (badge/one-pager) | [CLAUDE.md](CLAUDE.md) (developer guide)

---
*Charter Version: 1.0.0 | Last Updated: 2026-02-23*
