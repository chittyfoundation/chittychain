# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyChain/ChittyStacks is a blockchain-based legal evidence management platform designed for neurodivergent entrepreneurs. It provides cryptographically secure case management, evidence binding, and audit trails with Cook County legal compliance.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Blockchain**: Custom ChittyChain with Proof-of-Audit consensus
- **Runtime**: Node.js 20 on Replit

## Development Commands

```bash
npm run dev          # Start development server (port 5000)
npm run build        # Build client and server
npm run start        # Run production build
npm run db:push      # Push database schema changes
```

## Architecture

### Directory Structure
- `client/` - React frontend application
- `server/` - Express backend with blockchain implementation
- `shared/` - Shared types and database schemas
- `attached_assets/` - Documentation and specifications

### Path Aliases
- `@/` - client/src
- `@shared/` - shared
- `@assets/` - attached_assets

## API Implementation Requirements

### Core Endpoints (Must Implement)

#### Case Management
- `POST /api/v1/cases/create`
- `GET /api/v1/cases/{case_id}`
- `PUT /api/v1/cases/{case_id}/parties`
- `GET /api/v1/cases/{case_id}/artifacts`

#### Artifact Binding
- `POST /api/v1/artifacts/bind`
- `GET /api/v1/artifacts/{artifact_id}`
- `POST /api/v1/artifacts/{artifact_id}/verify`
- `GET /api/v1/artifacts/{artifact_id}/chain`

#### Evidence Submission
- `POST /api/v1/evidence/submit`
- `POST /api/v1/evidence/batch`
- `GET /api/v1/evidence/{case_id}/timeline`
- `POST /api/v1/evidence/validate`

#### Authentication & Access Control
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/verify-party`
- `GET /api/v1/auth/permissions/{user_id}/{case_id}`
- `POST /api/v1/auth/audit-trail`

#### Chain Verification
- `GET /api/v1/chain/verify/{artifact_id}`
- `GET /api/v1/chain/block/{block_id}`
- `POST /api/v1/chain/validate-sequence`
- `GET /api/v1/chain/merkle-proof/{artifact_id}`

### WebSocket Endpoints
- `ws://chittychain.com/ws/case/{case_id}/updates`
- `ws://chittychain.com/ws/evidence/live`
- `ws://chittychain.com/ws/chain/blocks`

## Critical Implementation Rules

### Unique Identifier Architecture
Every artifact MUST be cryptographically bound to both case AND user:

```typescript
interface ArtifactIdentifier {
  artifact_id: string;      // Format: "ART-{hash[:12]}"
  case_binding: string;     // Format: "CASE-{number}-{jurisdiction}"
  user_binding: string;     // Format: "USER-{reg_number}-{bar_number}"
  timestamp: string;        // ISO format
  immutable_hash: string;   // SHA256 of all components
}
```

### Identifier Patterns
- Jurisdiction: `^[A-Z]+-[A-Z]+$` (e.g., "ILLINOIS-COOK")
- Case Number: `^[0-9]{4}-[A-Z]-[0-9]{6}$` (e.g., "2024-D-007847")
- User Registration: `^REG[0-9]{8}$` (e.g., "REG12345678")

### Security Requirements
- Multi-factor authentication required
- AES-256 encryption at rest
- TLS 1.3 for transit
- Audit all access and modifications
- Rate limiting on all endpoints

### File Storage Structure
```
/storage/
├── cases/
│   └── {jurisdiction}/
│       └── {case_id}/
│           ├── artifacts/
│           ├── timeline/
│           ├── communications/
│           └── chain_data/
├── temp/
└── archive/
```

## Database Schema

Key tables already defined in `shared/schema.ts`:
- users (with registration numbers)
- blocks (blockchain data)
- evidence (case artifacts)
- legal_cases
- property_nfts
- smart_contracts
- transactions
- audit_logs

## Blockchain Implementation

The blockchain code exists in `server/blockchain/` with:
- Proof-of-Audit consensus mechanism
- Smart contract support
- Transaction verification
- Block mining capabilities

## Performance Requirements
- Throughput: 10,000 artifacts/hour
- API latency: <100ms
- Storage: 100TB expandable
- Uptime: 99.99% SLA

## Implementation Priority
1. Set up authentication system with MFA
2. Implement case management endpoints
3. Create artifact binding with cryptographic verification
4. Build evidence submission pipeline
5. Integrate blockchain for immutable audit trail
6. Add WebSocket support for real-time updates