# ChittyChain - Blockchain Legal Evidence Management Platform

## Overview

ChittyChain is a blockchain-based legal evidence management platform designed specifically for neurodivergent entrepreneurs. The platform provides cryptographically secure case management, evidence binding, and property verification through a custom blockchain implementation with Proof-of-Audit consensus mechanism.

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

## Changelog

```
Changelog:
- June 19, 2025. Initial setup
- June 20, 2025. Successfully deployed ChittyChain blockchain server with simplified middleware stack
- June 20, 2025. Resolved critical storage type mismatches and server startup issues
- June 20, 2025. Created minimal working server with basic API endpoints and blockchain functionality
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```