# ChittyChain - Blockchain Legal Evidence Management Platform

## Overview

ChittyChain is the flagship component of a comprehensive blockchain-based legal technology ecosystem designed specifically for neurodivergent entrepreneurs. The platform provides cryptographically secure case management, evidence binding, and property verification through a custom blockchain implementation with Proof-of-Audit consensus mechanism.

## Ecosystem Components

ChittyChain operates as part of a larger legal technology suite:
- **ChittyChain** (this project) - Main blockchain platform with AI-powered evidence analysis
- **ChittyChainLedger** - Core ledger and blockchain infrastructure
- **ChittyTrust** - Trust mechanisms and reputation system
- **ChittyVerify** - Verification and validation services
- **ChittyResolution** - Dispute resolution and mediation platform

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for type safety and modern development
- **Vite** as the build tool for fast development and optimized production builds
- **Tailwind CSS** for utility-first styling with custom ChittyChain theming
- **Shadcn/ui** component library for consistent, accessible UI components
- **TanStack Query** for efficient API state management and caching
- **WebSocket integration** for real-time blockchain updates

### Backend Architecture
- **Express.js** with TypeScript for the REST API server
- **Custom ChittyChain blockchain** with Proof-of-Audit consensus
- **Service-oriented architecture** with separate services for blockchain, evidence, cases, and property management
- **WebSocket server** for real-time data streaming
- **Session-based authentication** with JWT tokens and 2FA support

### Database Architecture
- **PostgreSQL** as the primary database
- **Drizzle ORM** for type-safe database operations and migrations
- **Shared schema** between client and server for consistency

## Key Components

### Blockchain Core
- **ChittyChain**: Custom blockchain implementation with legal compliance focus
- **Proof-of-Audit consensus**: 95% compliance requirement for block validation
- **Smart contracts**: Evidence chain, property NFTs, and domain verification contracts
- **Transaction types**: Evidence, property, case, contract, and audit transactions

### Evidence Management
- **Cryptographic evidence binding** with SHA-256 hashing
- **IPFS integration** for decentralized file storage (mock implementation for MVP)
- **Chain of custody tracking** with immutable audit trails
- **7-year retention compliance** for Cook County jurisdiction
- **AI-powered evidence analysis** with content classification and authenticity verification
- **Pattern detection** across evidence collections for case insights
- **Multi-modal analysis** supporting text, image, video, and audio evidence

### Case Management
- **Legal case lifecycle management** with multi-party support
- **Attorney and party role management** with proper authentication
- **Court date and document tracking**
- **Compliance status monitoring**

### Property NFTs
- **ERC-721 compliant property tokenization**
- **Condition scoring and inspection history**
- **Market and assessed value tracking**
- **Property improvement reward system**

## Data Flow

1. **User Authentication**: JWT-based authentication with 2FA support
2. **Evidence Submission**: Files are hashed (SHA-256), stored in IPFS, and recorded on blockchain
3. **Case Creation**: Legal cases are created with proper jurisdiction validation
4. **Blockchain Recording**: All transactions are validated through Proof-of-Audit consensus
5. **Real-time Updates**: WebSocket connections provide live updates to connected clients
6. **Audit Trail**: All actions are logged with cryptographic verification

## External Dependencies

### Production Dependencies
- **Database**: PostgreSQL 16 with Drizzle ORM
- **File Storage**: IPFS (currently mocked for development)
- **Authentication**: bcrypt for password hashing, speakeasy for 2FA
- **Real-time**: WebSocket for live updates
- **Security**: helmet, cors, rate limiting middleware
- **AI Services**: Anthropic Claude and OpenAI GPT for evidence analysis
- **Pattern Detection**: Advanced ML algorithms for cross-evidence analysis
- **Legal Processing**: AI-powered legal document classification and compliance checking

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESBuild**: Fast production builds
- **Vite**: Development server with HMR
- **Replit integration**: Custom plugins for development environment

## Deployment Strategy

### Development Environment
- Runs on **Replit** with Node.js 20 runtime
- **PostgreSQL 16** database provisioned through Replit
- Development server on port 5000 with auto-reload
- WebSocket support for real-time features

### Production Deployment
- **Autoscale deployment** target on Replit
- Build process: `npm run build` (Vite + ESBuild)
- Production server: `npm run start`
- Environment variables for database and secrets management

### Build Process
1. Frontend build with Vite (client → dist/public)
2. Backend build with ESBuild (server → dist)
3. Shared types and schemas bundled appropriately
4. Static assets served from dist/public

## Ecosystem Integration

The current ChittyChain platform serves as the central hub with AI analysis capabilities, while connecting to other ecosystem components:
- **Data synchronization** with ChittyChainLedger for blockchain transactions
- **Trust scoring** integration with ChittyTrust for evidence authenticity
- **Verification services** from ChittyVerify for document validation
- **Resolution workflows** with ChittyResolution for dispute handling

## Changelog

```
Changelog:
- June 19, 2025. Initial setup
- June 20, 2025. Successfully deployed ChittyChain blockchain server with simplified middleware stack
- June 20, 2025. Resolved critical storage type mismatches and server startup issues
- June 20, 2025. Created minimal working server with basic API endpoints and blockchain functionality
- July 31, 2025. Integrated comprehensive AI-powered evidence analysis system with Anthropic Claude and OpenAI GPT models
- July 31, 2025. Added AI analysis API endpoints for evidence analysis, pattern detection, timeline generation, and cross-reference analysis
- July 31, 2025. Configured dual AI provider support for legal document processing and forensic evidence analysis
- August 5, 2025. Built complete frontend AI Analysis Dashboard with tabbed interface and real-time data visualization
- August 5, 2025. Created configurable Evidence Analysis Modal with legal context and focus area selection
- August 5, 2025. Integrated AI Analysis section into main dashboard navigation with comprehensive pattern detection
- August 5, 2025. Identified broader ChittyChain ecosystem with complementary platforms for trust, verification, and resolution
- August 6, 2025. Integrated ChittyID universal identifier system with complete dashboard and API endpoints
- August 6, 2025. Built comprehensive ecosystem overview with 6-platform integration including ChittyID core functionality
- August 6, 2025. Added cross-platform analysis capabilities with AI-powered insights across the complete ChittyChain ecosystem
- August 6, 2025. Integrated ChittyBeacon app tracking system from @chittycorp/app-beacon repository with full platform detection
- August 6, 2025. Built comprehensive app tracking dashboard with real-time beacon monitoring and platform distribution analytics
- August 6, 2025. Added complete ChittyBeacon service with startup/heartbeat/shutdown tracking across Replit, GitHub, Vercel, and other platforms
- August 12, 2025. Successfully migrated ChittyChain to use Neon PostgreSQL database instead of in-memory storage
- August 12, 2025. Configured external access (0.0.0.0 binding) for non-localhost deployment with Replit domains
- August 12, 2025. Implemented complete NeonStorage class with Drizzle ORM integration for all ChittyChain entities
- August 12, 2025. Connected ChittyChain to user's own Neon database at chain.chitty.cc (replacing Replit-provided PostgreSQL)
- August 12, 2025. Verified database connection and schema deployment to custom Neon instance with PostgreSQL 16.9
- August 12, 2025. Implemented comprehensive Evidence Ledger schema with 7 core data types (Master Evidence, Atomic Facts, Chain of Custody, Contradiction Tracking, Audit Trail, Users, Cases)
- August 12, 2025. Deployed complete blockchain-based legal evidence management system with Illinois Cook County compliance and cryptographic verification
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```