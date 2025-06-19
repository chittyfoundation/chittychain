# Chitty Stacks Full System Inspection & Optimization

## Primary Directive
Execute comprehensive system analysis of the Chitty Stacks monorepo focusing on storage architecture, evidence chain integrity, and Cook County legal compliance optimization.

## Storage Analysis Framework

### 1. Database Layer Inspection
```bash
# Analyze Prisma schema and identify bottlenecks
- Examine `packages/database/prisma/schema.prisma`
- Identify missing indexes for legal evidence queries
- Analyze forensic audit trail efficiency
- Review data retention policies for Cook County compliance (7-year retention)
- Assess relationship cardinality impacts on evidence chain queries
```

### 2. Blockchain Storage Assessment  
```bash
# Smart contract storage optimization
- Analyze gas costs in evidence chain operations
- Review IPFS integration efficiency for 3D property scans
- Assess ChittyPropertyNFT storage patterns
- Evaluate evidence chain verification performance
- Examine ChittyCash token economics
```

### 3. File Storage Infrastructure
```bash
# Multi-tier storage analysis
- AWS S3 bucket configuration review
- IPFS node performance metrics
- Legal document retention compliance
- 3D scan data compression ratios
- Evidence metadata indexing efficiency
```

## AI Resource Team Implementation

### Storage Optimization Agent
**Role**: Database performance specialist
**Tasks**:
- Index recommendation engine for evidence queries
- Query optimization for legal case retrieval
- Data archival strategy for compliance
- Performance monitoring dashboard

### Legal Compliance Agent  
**Role**: Cook County standards validator
**Tasks**:
- Evidence chain audit verification
- Document retention policy enforcement
- Forensic metadata validation
- Chain of custody integrity checks

### Blockchain Efficiency Agent
**Role**: Smart contract optimizer
**Tasks**:
- Gas cost reduction strategies
- IPFS pinning optimization
- NFT metadata compression
- Cross-chain bridge analysis

### Infrastructure Agent
**Role**: DevOps optimization specialist  
**Tasks**:
- Container resource allocation
- Kubernetes scaling policies
- Load balancer configuration
- CDN optimization for legal portals

## Execution Parameters

### Phase 1: Discovery & Analysis (30 minutes)
```bash
# System reconnaissance
claude-code analyze --recursive ./chitty-stacks \
  --focus storage,performance,compliance \
  --output analysis-report.md \
  --include-metrics database,blockchain,files
```

### Phase 2: Resource Provisioning (15 minutes)
```bash
# Deploy optimization agents
claude-code spawn-agents \
  --agents storage,legal,blockchain,infrastructure \
  --parallelism 4 \
  --resource-allocation high
```

### Phase 3: Optimization Implementation (45 minutes)
```bash
# Execute recommendations
claude-code optimize --target-areas:
  - Database indexing strategy
  - Smart contract gas efficiency  
  - IPFS clustering configuration
  - Legal evidence retrieval performance
  - 3D scan storage compression
  - Cross-app authentication efficiency
```

## Specific Optimization Targets

### Critical Performance Metrics
- Evidence retrieval latency: <200ms
- Property NFT minting gas cost: <0.01 ETH
- Legal document search: <500ms
- 3D scan processing: <30 seconds
- Blockchain verification: <5 seconds

### Compliance Requirements
- Cook County evidence standards adherence
- Forensic audit trail completeness
- Data retention automation (7-year cycle)
- Chain of custody immutability
- Attorney-client privilege protection

### Infrastructure Scaling
- Horizontal scaling for legal portals
- Auto-scaling based on case load
- Geographic replication for disaster recovery
- Load balancing for property scanning apps
- CDN optimization for document delivery

## Output Specifications

Generate:
1. **Performance Benchmark Report**: Current vs optimized metrics
2. **Compliance Audit**: Cook County standards verification
3. **Cost Analysis**: Infrastructure and gas cost reductions
4. **Implementation Roadmap**: Prioritized optimization sequence
5. **Risk Assessment**: Legal and technical risk mitigation

## Constraints & Considerations

- Maintain zero downtime during optimization
- Preserve evidence chain immutability
- Ensure legal compliance throughout process
- Minimize gas costs for blockchain operations
- Maintain sub-second response times for critical operations

Execute with maximum technical depth and provide specific, actionable recommendations for each system component.