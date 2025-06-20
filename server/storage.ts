import { 
  users, 
  blocks,
  evidenceRecords,
  legalCases,
  propertyNFTs,
  smartContracts,
  transactions,
  auditLogs,
  type User, 
  type InsertUser,
  type Block,
  type InsertBlock,
  type EvidenceRecord,
  type InsertEvidence,
  type LegalCase,
  type InsertCase,
  type PropertyNFT,
  type InsertProperty,
  type SmartContract,
  type InsertContract,
  type Transaction,
  type InsertTransaction,
  type AuditLog,
  type InsertAudit
} from "@shared/schema.js";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;

  // Block operations
  getBlock(id: number): Promise<Block | undefined>;
  getBlockByNumber(blockNumber: number): Promise<Block | undefined>;
  createBlock(block: InsertBlock): Promise<Block>;
  getAllBlocks(): Promise<Block[]>;

  // Evidence operations
  getEvidence(id: string): Promise<EvidenceRecord | undefined>;
  getEvidenceByCase(caseId: string): Promise<EvidenceRecord[]>;
  createEvidence(evidence: InsertEvidence): Promise<EvidenceRecord>;
  updateEvidence(id: string, updates: Partial<EvidenceRecord>): Promise<EvidenceRecord>;
  getAllEvidence(): Promise<EvidenceRecord[]>;

  // Case operations
  getCase(caseNumber: string): Promise<LegalCase | undefined>;
  createCase(legalCase: InsertCase): Promise<LegalCase>;
  updateCase(caseNumber: string, updates: Partial<LegalCase>): Promise<LegalCase>;
  getAllCases(): Promise<LegalCase[]>;

  // Property operations
  getProperty(tokenId: number): Promise<PropertyNFT | undefined>;
  getPropertiesByOwner(owner: string): Promise<PropertyNFT[]>;
  createProperty(property: InsertProperty): Promise<PropertyNFT>;
  updateProperty(tokenId: number, updates: Partial<PropertyNFT>): Promise<PropertyNFT>;
  getAllProperties(): Promise<PropertyNFT[]>;

  // Smart contract operations
  getContract(address: string): Promise<SmartContract | undefined>;
  createContract(contract: InsertContract): Promise<SmartContract>;
  getAllContracts(): Promise<SmartContract[]>;

  // Transaction operations
  getTransaction(hash: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByBlock(blockNumber: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;

  // Audit operations
  createAuditLog(audit: InsertAudit): Promise<AuditLog>;
  getAllAuditLogs(): Promise<AuditLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User> = new Map();
  private blocks: Map<number, Block> = new Map();
  private evidence: Map<string, EvidenceRecord> = new Map();
  private cases: Map<string, LegalCase> = new Map();
  private properties: Map<number, PropertyNFT> = new Map();
  private contracts: Map<string, SmartContract> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private auditLogs: Map<number, AuditLog> = new Map();
  
  private currentUserId: number = 1;
  private currentBlockId: number = 1;
  private currentAuditId: number = 1;

  constructor() {
    // Initialize with some default smart contracts
    this.initializeDefaultContracts();
  }

  private initializeDefaultContracts(): void {
    const defaultContracts = [
      {
        name: "ChittyChainCore",
        address: "0x742d35Cc6634C0532925a3b6a1c7b6f6c2f8932a",
        abi: [],
        bytecode: "0x608060405234801561001057600080fd5b50...",
        deployedBy: "system",
        status: "active",
        gasUsed: 2500000,
        blockNumber: 0,
      },
      {
        name: "DomainVerification",
        address: "0x8f9a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a",
        abi: [],
        bytecode: "0x608060405234801561001057600080fd5b50...",
        deployedBy: "system",
        status: "active",
        gasUsed: 1800000,
        blockNumber: 0,
      },
      {
        name: "PropertyNFT",
        address: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
        abi: [],
        bytecode: "0x608060405234801561001057600080fd5b50...",
        deployedBy: "system",
        status: "active",
        gasUsed: 3200000,
        blockNumber: 0,
      },
      {
        name: "EvidenceChain",
        address: "0x9e8d7c6b5a4938271605f4c3b2a1908f7e6d5c4b",
        abi: [],
        bytecode: "0x608060405234801561001057600080fd5b50...",
        deployedBy: "system",
        status: "deploying",
        gasUsed: 2800000,
        blockNumber: 0,
      },
    ];

    defaultContracts.forEach(contract => {
      const id = this.currentUserId++;
      const fullContract: SmartContract = {
        id,
        ...contract,
        deployedAt: new Date(),
      };
      this.contracts.set(contract.address, fullContract);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser,
      barNumber: insertUser.barNumber || null,
      role: insertUser.role || 'PARTY_RESPONDENT',
      twoFactorSecret: insertUser.twoFactorSecret || null,
      isActive: insertUser.isActive || false,
      apiKeyHash: insertUser.apiKeyHash || null,
      claudeUserId: insertUser.claudeUserId || null,
      authProvider: insertUser.authProvider || null,
      id,
      createdAt: new Date(),
      lastLogin: null,
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const existing = this.users.get(id);
    if (!existing) {
      throw new Error(`User with id ${id} not found`);
    }
    
    const updated: User = { ...existing, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  // Block operations
  async getBlock(id: number): Promise<Block | undefined> {
    return this.blocks.get(id);
  }

  async getBlockByNumber(blockNumber: number): Promise<Block | undefined> {
    return Array.from(this.blocks.values()).find(
      block => block.blockNumber === blockNumber
    );
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const id = this.currentBlockId++;
    const fullBlock: Block = {
      ...block,
      id,
      timestamp: new Date(),
      miner: block.miner || null,
      transactions: block.transactions || [],
    };
    this.blocks.set(id, fullBlock);
    return fullBlock;
  }

  async getAllBlocks(): Promise<Block[]> {
    return Array.from(this.blocks.values()).sort((a, b) => a.blockNumber - b.blockNumber);
  }

  // Evidence operations
  async getEvidence(id: string): Promise<EvidenceRecord | undefined> {
    return this.evidence.get(id);
  }

  async getEvidenceByCase(caseId: string): Promise<EvidenceRecord[]> {
    return Array.from(this.evidence.values()).filter(
      evidence => evidence.caseId === caseId
    );
  }

  async createEvidence(evidence: InsertEvidence): Promise<EvidenceRecord> {
    const id = crypto.randomUUID();
    const fullEvidence: EvidenceRecord = {
      ...evidence,
      id,
      submittedAt: new Date(),
    };
    this.evidence.set(id, fullEvidence);
    return fullEvidence;
  }

  async updateEvidence(id: string, updates: Partial<EvidenceRecord>): Promise<EvidenceRecord> {
    const existing = this.evidence.get(id);
    if (!existing) {
      throw new Error('Evidence not found');
    }
    const updated: EvidenceRecord = { ...existing, ...updates };
    this.evidence.set(id, updated);
    return updated;
  }

  async getAllEvidence(): Promise<EvidenceRecord[]> {
    return Array.from(this.evidence.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Case operations
  async getCase(caseNumber: string): Promise<LegalCase | undefined> {
    return this.cases.get(caseNumber);
  }

  async createCase(legalCase: InsertCase): Promise<LegalCase> {
    const id = crypto.randomUUID();
    const fullCase: LegalCase = {
      ...legalCase,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.cases.set(legalCase.caseNumber, fullCase);
    return fullCase;
  }

  async updateCase(caseNumber: string, updates: Partial<LegalCase>): Promise<LegalCase> {
    const existing = this.cases.get(caseNumber);
    if (!existing) {
      throw new Error('Case not found');
    }
    const updated: LegalCase = { 
      ...existing, 
      ...updates,
      updatedAt: new Date(),
    };
    this.cases.set(caseNumber, updated);
    return updated;
  }

  async getAllCases(): Promise<LegalCase[]> {
    return Array.from(this.cases.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Property operations
  async getProperty(tokenId: number): Promise<PropertyNFT | undefined> {
    return this.properties.get(tokenId);
  }

  async getPropertiesByOwner(owner: string): Promise<PropertyNFT[]> {
    return Array.from(this.properties.values()).filter(
      property => property.owner === owner
    );
  }

  async createProperty(property: InsertProperty): Promise<PropertyNFT> {
    const id = this.currentUserId++;
    const fullProperty: PropertyNFT = {
      ...property,
      id,
      mintedAt: new Date(),
    };
    this.properties.set(property.tokenId, fullProperty);
    return fullProperty;
  }

  async updateProperty(tokenId: number, updates: Partial<PropertyNFT>): Promise<PropertyNFT> {
    const existing = this.properties.get(tokenId);
    if (!existing) {
      throw new Error('Property not found');
    }
    const updated: PropertyNFT = { ...existing, ...updates };
    this.properties.set(tokenId, updated);
    return updated;
  }

  async getAllProperties(): Promise<PropertyNFT[]> {
    return Array.from(this.properties.values()).sort((a, b) => 
      b.mintedAt.getTime() - a.mintedAt.getTime()
    );
  }

  // Smart contract operations
  async getContract(address: string): Promise<SmartContract | undefined> {
    return this.contracts.get(address);
  }

  async createContract(contract: InsertContract): Promise<SmartContract> {
    const id = this.currentUserId++;
    const fullContract: SmartContract = {
      ...contract,
      id,
      deployedAt: new Date(),
    };
    this.contracts.set(contract.address, fullContract);
    return fullContract;
  }

  async getAllContracts(): Promise<SmartContract[]> {
    return Array.from(this.contracts.values()).sort((a, b) => 
      b.deployedAt.getTime() - a.deployedAt.getTime()
    );
  }

  // Transaction operations
  async getTransaction(hash: string): Promise<Transaction | undefined> {
    return this.transactions.get(hash);
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentUserId++;
    const fullTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: new Date(),
    };
    this.transactions.set(transaction.hash, fullTransaction);
    return fullTransaction;
  }

  async getTransactionsByBlock(blockNumber: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).filter(
      tx => tx.blockNumber === blockNumber
    );
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Audit operations
  async createAuditLog(audit: InsertAudit): Promise<AuditLog> {
    const id = this.currentAuditId++;
    const fullAudit: AuditLog = {
      ...audit,
      id,
      timestamp: new Date(),
    };
    this.auditLogs.set(id, fullAudit);
    return fullAudit;
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return Array.from(this.auditLogs.values()).sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );
  }
}

export const storage = new MemStorage();
export const db = storage;
