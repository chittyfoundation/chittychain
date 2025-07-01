# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ChittyChain/ChittyStacks is a blockchain-based legal evidence management platform designed for neurodivergent entrepreneurs. It provides cryptographically secure case management, evidence binding, and audit trails with Cook County legal compliance.

## Tech Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend**: Express.js + TypeScript with Helmet security
- **Database**: PostgreSQL with Drizzle ORM
- **Blockchain**: Custom ChittyChain with Proof-of-Audit consensus
- **Storage**: IPFS + AWS S3 (memory storage for development)
- **Runtime**: Node.js 20 on Replit

## Development Commands

```bash
# Core development
npm run dev          # Start development server (port 5000)
npm run build        # Build client and server
npm run start        # Run production build

# Database
npm run db:push      # Push database schema changes

# Testing
npm run test         # Run tests with Vitest (watch mode)
npm run test:run     # Run tests once
npm run test:security # Run security tests
npm run test:integration # Run integration tests
npm run test:coverage # Run tests with coverage report
```

## Architecture

### Directory Structure
- `client/` - React frontend application
- `server/` - Express backend with blockchain implementation
  - `blockchain/` - ChittyChain implementation
  - `routes/` - API route handlers
  - `middleware/` - Express middleware
  - `config/` - Configuration and environment validation
- `shared/` - Shared types and database schemas
- `attached_assets/` - Documentation and specifications

### Path Aliases
- `@/` - client/src
- `@shared/` - shared
- `@assets/` - attached_assets

### Key Configuration Files
- `server/config/environment.ts` - Environment validation with Zod
- `shared/schema.ts` - Drizzle ORM database schemas
- `vitest.config.ts` - Test configuration
- `docker-compose.yml` - Full stack with monitoring

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
- Multi-factor authentication with speakeasy TOTP
- AES-256 encryption at rest
- TLS 1.3 for transit
- Helmet.js security headers
- Rate limiting on all endpoints
- Environment validation prevents default secrets in production

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

Key tables in `shared/schema.ts`:
- `users` - User management with registration numbers and MFA
- `blocks` - Blockchain data with Proof-of-Audit fields
- `evidence` - Case artifacts with IPFS hashes
- `legal_cases` - Case management with jurisdiction
- `property_nfts` - NFT property records
- `smart_contracts` - Deployed contract tracking
- `transactions` - Blockchain transactions
- `audit_logs` - Comprehensive audit trail

## Blockchain Implementation

The blockchain code in `server/blockchain/` includes:
- Custom ChittyChain with Proof-of-Audit consensus
- Smart contract support with Solidity integration
- Transaction verification and validation
- Block mining with difficulty adjustment
- Merkle tree implementation for evidence chains
- Chain verification endpoints

## Development Notes

### Environment Setup
- Environment variables validated by Zod schemas
- Required vars: DATABASE_URL, JWT_SECRET, NODE_ENV
- Optional: IPFS_API_URL, S3_BUCKET, REDIS_URL

### Memory Storage
- Development uses MemStorage implementation
- Production requires proper IPFS/S3 configuration
- Storage interface allows easy swapping

### Authentication Flow
- JWT tokens with refresh token support
- Passport.js strategies for OAuth
- 2FA using speakeasy TOTP
- Session management with Redis

### Testing Approach
- Vitest for unit and integration tests
- Test database separate from development
- Security test suite for vulnerability checks
- Coverage reports with v8

## Performance Requirements
- Throughput: 10,000 artifacts/hour
- API latency: <100ms
- Storage: 100TB expandable
- Uptime: 99.99% SLA

## Implementation Priority
1. Complete authentication system with MFA
2. Implement remaining case management endpoints
3. Create artifact binding with cryptographic verification
4. Build evidence submission pipeline
5. Integrate blockchain for immutable audit trail
6. Add WebSocket support for real-time updates
7. Implement proper file storage (IPFS/S3)
8. Add monitoring and alerting