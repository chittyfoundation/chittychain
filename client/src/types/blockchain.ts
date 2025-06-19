export interface Block {
  id: number;
  blockNumber: number;
  hash: string;
  previousHash: string;
  timestamp: Date;
  merkleRoot: string;
  nonce: number;
  difficulty: number;
  transactions: Transaction[];
  miner?: string;
}

export interface Transaction {
  id: number;
  hash: string;
  from: string;
  to: string;
  value: string;
  gasPrice: string;
  gasUsed?: number;
  blockNumber?: number;
  transactionIndex?: number;
  status: 'pending' | 'confirmed' | 'failed';
  type: 'evidence' | 'property' | 'case' | 'contract' | 'audit';
  data: any;
  createdAt: Date;
}

export interface EvidenceRecord {
  id: string;
  hash: string;
  caseId: string;
  documentType: string;
  ipfsHash: string;
  submittedBy: string;
  verifiedBy?: string;
  blockNumber?: number;
  chainOfCustody: CustodyRecord[];
  metadata: any;
  createdAt: Date;
  verifiedAt?: Date;
}

export interface CustodyRecord {
  timestamp: Date;
  action: string;
  performedBy: string;
  location?: string;
  notes?: string;
  blockHash?: string;
}

export interface LegalCase {
  id: string;
  caseNumber: string;
  jurisdiction: string;
  status: 'active' | 'closed' | 'pending' | 'appealed';
  title: string;
  description?: string;
  plaintiffs: any[];
  defendants: any[];
  attorneys: any[];
  evidenceIds: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PropertyNFT {
  id: number;
  tokenId: number;
  contractAddress: string;
  propertyAddress: string;
  owner: string;
  metadata: any;
  conditionScore?: number;
  lastInspection?: Date;
  ipfsMetadata: string;
  blockNumber?: number;
  mintedAt: Date;
}

export interface SmartContract {
  id: number;
  name: string;
  address: string;
  abi: any[];
  bytecode: string;
  deployedBy: string;
  status: 'active' | 'deploying' | 'error' | 'paused';
  gasUsed?: number;
  blockNumber?: number;
  deployedAt: Date;
}

export interface AuditLog {
  id: number;
  action: string;
  resource: string;
  resourceId: string;
  userId: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  blockNumber?: number;
  timestamp: Date;
}

export interface BlockchainStats {
  totalBlocks: number;
  latestBlockNumber: number;
  totalTransactions: number;
  evidenceRecords: number;
  pendingTransactions: number;
  difficulty: number;
  isValid: boolean;
}

export interface ChainHealth {
  isValid: boolean;
  totalBlocks: number;
  totalTransactions: number;
  averageBlockTime: number;
  lastBlockTime: number;
}

export interface SystemStats {
  blockchain: BlockchainStats;
  cases: {
    totalCases: number;
    activeCases: number;
    closedCases: number;
    cookCountyCases: number;
    complianceRate: number;
    averageCaseAge: number;
  };
  properties: {
    totalProperties: number;
    averageConditionScore: number;
    totalChittyCashEarned: number;
    propertiesImproved: number;
    averageImprovement: number;
  };
  timestamp: string;
}

export interface WebSocketMessage {
  type: 'connection' | 'new_block' | 'new_transaction' | 'block_mined' | 'system_stats';
  data: any;
  timestamp?: string;
}
