# CLAUDE.md

## Project Overview

ChittyChain is the on-chain anchor layer for the ChittyOS ecosystem. It provides immutable finality for governance decisions, attribution traces, and evidence records. While ChittyLedger is the fast off-chain database layer, ChittyChain is the permanent on-chain record of truth. Full-stack application with Express backend, React frontend, and Solidity smart contracts.

**Repo:** `CHITTYFOUNDATION/chittychain`
**Deploy:** Docker/Kubernetes, Cloudflare Workers (edge)
**Stack:** Express + TypeScript (backend), React + Vite + Tailwind (frontend), Drizzle ORM, Neon PostgreSQL, Solidity/OpenZeppelin, ethers.js, Socket.IO
**Canonical URI:** `chittycanon://core/services/chitty-chain` | Tier 0

## Common Commands

```bash
npm run dev              # Start Express dev server (tsx, NODE_ENV=development)
npm run build            # Build frontend (Vite) + bundle server (esbuild)
npm start                # Start production server (node dist/index.js)
npm run check            # TypeScript type-check
npm run db:push          # Push Drizzle schema to database
npm test                 # Run vitest test suite
npm run test:run         # Run tests once
npm run test:security    # Run security tests only
npm run test:integration # Run integration tests only
npm run test:coverage    # Run tests with coverage
```

Environment variables (use `.env` or inject via container):
```bash
DATABASE_URL=            # Neon PostgreSQL connection string (required)
SESSION_SECRET=          # Express session secret
PORT=5000                # Server port (default: 5000)
NODE_ENV=                # Environment (development/production)
```

## Architecture

Full-stack application with Express API backend, React SPA frontend (Vite + Tailwind), and Solidity smart contract layer.

### Backend (`server/`)

Express server with:
- `server/index.ts` -- Entry point, middleware setup (CORS, Helmet, sessions)
- `server/routes.ts` -- Route definitions
- `server/simple-routes.ts` -- Simplified route registration
- `server/blockchain/` -- Blockchain integration layer
- `server/compliance/` -- Compliance checking
- `server/security/` -- Security middleware and utilities
- `server/integrations/` -- External service integrations
- `server/middleware/` -- Express middleware
- `server/services/` -- Business logic services
- `server/observability/` -- Monitoring and metrics (prom-client)
- `server/websocket/` -- WebSocket/Socket.IO handlers
- `server/air/` -- AIR (Autonomous Intelligence Runtime) subsystem
- `server/db.ts` -- Database connection (Neon)
- `server/storage.ts` -- Storage abstraction
- `server/neon-storage.ts` -- Neon-specific storage implementation

### Frontend (`client/`)

React SPA built with Vite, Tailwind CSS, and Radix UI components. Uses wouter for routing, TanStack Query for data fetching, and Recharts for visualizations.

### Blockchain

- `PropertyNFT_*.sol` -- Solidity smart contracts for property NFTs (OpenZeppelin)
- `ChittyChain/` -- Blockchain-specific logic
- `ethers` -- Ethereum interaction library

### Database

Neon PostgreSQL via Drizzle ORM. Schema defined in `shared/schema.ts`, migrations in `migrations/`. Configuration in `drizzle.config.ts`.

### Dual Immutability Model

```
Soft-Mint (ChittyLedger)          Hard-Mint (ChittyChain)
+-- Fast, queryable                +-- Permanent, on-chain
+-- Off-chain DB                   +-- On-chain finality
+-- Committed to Ledger            +-- Anchored to Chain
+-- Frozen, immutable in DB        +-- Final, immutable on-chain
```

### Deployment

- `Dockerfile` -- Docker container build
- `docker-compose.yml` -- Multi-container orchestration
- `k8s/` -- Kubernetes deployment manifests
- `air_bootstrap.sh` / `claude_init_air.sh` -- AIR subsystem bootstrap scripts
- `tea_manifest.yaml` / `spawn_tea.sh` -- TEA (Trusted Execution Agent) configuration

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Health check |
| `/api/v1/anchor` | POST | Anchor record on-chain (Hard-Mint) |
| `/api/v1/verify/:hash` | GET | Verify on-chain record |
| `/api/v1/contracts` | GET | List deployed smart contracts |
| `/api/v1/transactions` | GET | Query transaction history |

## Key Files

- `server/index.ts` -- Express entry point
- `server/routes.ts` -- API route definitions
- `server/blockchain/` -- Blockchain integration
- `client/` -- React frontend application
- `shared/schema.ts` -- Drizzle ORM schema (shared between server/client)
- `PropertyNFT_*.sol` -- Solidity smart contracts
- `drizzle.config.ts` -- Drizzle Kit configuration
- `vite.config.ts` -- Vite build configuration
- `Dockerfile` -- Container build
- `k8s/` -- Kubernetes manifests
- `tests/` -- Test suites (security, integration)

## Related Services

- **ChittyLedger** -- Sends Soft-Mint entries for Hard-Mint anchoring (upstream)
- **ChittyDNA** -- Attribution traces to anchor (upstream)
- **ChittyGov** -- Governance decisions to anchor (upstream)
- **ChittyCanon** -- Canonical governance alignment (peer)
- **ChittyEvidence** -- Anchored evidence for dispute resolution (downstream)
- **ChittyVerify** -- On-chain verification of anchored records (downstream)
