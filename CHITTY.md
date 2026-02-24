---
uri: chittycanon://docs/ops/architecture/chitty-chain
namespace: chittycanon://docs/ops
type: architecture
version: 1.0.0
status: DRAFT
registered_with: chittycanon://core/services/canon
title: "ChittyChain"
certifier: chittycanon://core/services/chittycertify
visibility: PUBLIC
---

# ChittyChain

> `chittycanon://core/services/chitty-chain` | Tier 0 (Trust Anchors) | chain.chitty.cc

## What It Does

On-chain anchor layer for the ChittyOS ecosystem. Provides immutable finality for governance decisions, attribution traces, and evidence records. ChittyLedger is the fast off-chain database; ChittyChain is the permanent on-chain truth. Referenced in the Foundation Charter (Section 2) as a core scope service.

## Architecture

Full-stack application with Express backend, React frontend, Drizzle ORM, and Solidity smart contracts. Supports Docker/k8s deployment and Cloudflare Workers edge.

### Stack
- **Backend**: Node.js/Express + TypeScript
- **Frontend**: React + Vite + Tailwind
- **Database**: Neon PostgreSQL (Drizzle ORM)
- **Blockchain**: Solidity smart contracts (OpenZeppelin)
- **Deployment**: Docker, Kubernetes, Cloudflare Workers

### Key Components
- `server/` — Express API backend
- `client/` — React frontend
- `shared/` — Shared types and utilities
- `ChittyChain/` — Blockchain-specific logic
- `PropertyNFT_*.sol` — Property NFT smart contracts
- `k8s/` — Kubernetes deployment configs

### Dual Immutability
```
Soft-Mint (ChittyLedger)     Hard-Mint (ChittyChain)
├── Fast, queryable           ├── Permanent, on-chain
├── Off-chain DB              ├── On-chain finality
└── Frozen                    └── Immutable forever
```

## Three Aspects (TY VY RY)

Source: `chittycanon://gov/governance#three-aspects`

| Aspect | Abbrev | Answer |
|--------|--------|--------|
| **Identity** | TY | On-chain anchor layer — immutable finality for governance, attribution, evidence |
| **Connectivity** | VY | Receives Soft-Mint from ChittyLedger; smart contracts for property NFTs; API + WebSocket real-time |
| **Authority** | RY | Tier 0 — final immutable record; once anchored, cannot be modified |

## ChittyOS Ecosystem

### Certification
- **Badge**: ChittyOS Compatible
- **Certifier**: ChittyCertify (`chittycanon://core/services/chittycertify`)
- **Last Certified**: --

### ChittyDNA
- **ChittyID**: --
- **DNA Hash**: --
- **Lineage**: root (on-chain trust anchor)

### Dependencies
| Service | Purpose |
|---------|---------|
| ChittyLedger | Receives Soft-Mint entries for Hard-Mint |
| ChittyDNA | Attribution traces to anchor |
| ChittyGov | Governance decisions to anchor |
| ChittyCanon | Canonical governance alignment |
| ChittyEvidence | Anchored evidence for disputes |
| ChittyVerify | On-chain verification |

### Endpoints
| Path | Method | Auth | Purpose |
|------|--------|------|---------|
| `/health` | GET | No | Health check |
| `/api/v1/anchor` | POST | Yes | Anchor record on-chain |
| `/api/v1/verify/:hash` | GET | No | Verify on-chain record |
| `/api/v1/contracts` | GET | Yes | List deployed smart contracts |
| `/api/v1/transactions` | GET | Yes | Query transaction history |

## Document Triad

This badge is part of a synchronized documentation triad. Changes to shared fields must propagate.

| Field | Canonical Source | Also In |
|-------|-----------------|---------|
| Canonical URI | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Tier | CHARTER.md (Classification) | CHITTY.md (blockquote) |
| Domain | CHARTER.md (Classification) | CHITTY.md (blockquote), CLAUDE.md (header) |
| Endpoints | CHARTER.md (API Contract) | CHITTY.md (Endpoints table), CLAUDE.md (API section) |
| Dependencies | CHARTER.md (Dependencies) | CHITTY.md (Dependencies table), CLAUDE.md (Architecture) |
| Certification badge | CHITTY.md (Certification) | CHARTER.md frontmatter `status` |

**Related docs**: [CHARTER.md](CHARTER.md) (charter/policy) | [CLAUDE.md](CLAUDE.md) (developer guide)
