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
import { db } from './db.js';
import { eq, and } from 'drizzle-orm';
import type { IStorage } from './storage.js';

export class NeonStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const result = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return result[0];
  }

  // Block operations
  async getBlock(id: number): Promise<Block | undefined> {
    const result = await db.select().from(blocks).where(eq(blocks.id, id)).limit(1);
    return result[0];
  }

  async getBlockByNumber(blockNumber: number): Promise<Block | undefined> {
    const result = await db.select().from(blocks).where(eq(blocks.blockNumber, blockNumber)).limit(1);
    return result[0];
  }

  async createBlock(block: InsertBlock): Promise<Block> {
    const result = await db.insert(blocks).values(block).returning();
    return result[0];
  }

  async getAllBlocks(): Promise<Block[]> {
    return await db.select().from(blocks).orderBy(blocks.blockNumber);
  }

  // Evidence operations
  async getEvidence(id: string): Promise<EvidenceRecord | undefined> {
    const result = await db.select().from(evidenceRecords).where(eq(evidenceRecords.id, id)).limit(1);
    return result[0];
  }

  async getEvidenceByCase(caseId: string): Promise<EvidenceRecord[]> {
    return await db.select().from(evidenceRecords).where(eq(evidenceRecords.caseId, caseId));
  }

  async createEvidence(evidence: InsertEvidence): Promise<EvidenceRecord> {
    const result = await db.insert(evidenceRecords).values(evidence).returning();
    return result[0];
  }

  async updateEvidence(id: string, updates: Partial<EvidenceRecord>): Promise<EvidenceRecord> {
    const result = await db.update(evidenceRecords).set(updates).where(eq(evidenceRecords.id, id)).returning();
    return result[0];
  }

  async getAllEvidence(): Promise<EvidenceRecord[]> {
    return await db.select().from(evidenceRecords).orderBy(evidenceRecords.submittedAt);
  }

  // Case operations
  async getCase(caseNumber: string): Promise<LegalCase | undefined> {
    const result = await db.select().from(legalCases).where(eq(legalCases.caseNumber, caseNumber)).limit(1);
    return result[0];
  }

  async createCase(legalCase: InsertCase): Promise<LegalCase> {
    const result = await db.insert(legalCases).values(legalCase).returning();
    return result[0];
  }

  async updateCase(caseNumber: string, updates: Partial<LegalCase>): Promise<LegalCase> {
    const result = await db.update(legalCases).set(updates).where(eq(legalCases.caseNumber, caseNumber)).returning();
    return result[0];
  }

  async getAllCases(): Promise<LegalCase[]> {
    return await db.select().from(legalCases).orderBy(legalCases.filedDate);
  }

  // Property operations
  async getProperty(tokenId: number): Promise<PropertyNFT | undefined> {
    const result = await db.select().from(propertyNFTs).where(eq(propertyNFTs.tokenId, tokenId)).limit(1);
    return result[0];
  }

  async getPropertiesByOwner(owner: string): Promise<PropertyNFT[]> {
    return await db.select().from(propertyNFTs).where(eq(propertyNFTs.currentOwner, owner));
  }

  async createProperty(property: InsertProperty): Promise<PropertyNFT> {
    const result = await db.insert(propertyNFTs).values(property).returning();
    return result[0];
  }

  async updateProperty(tokenId: number, updates: Partial<PropertyNFT>): Promise<PropertyNFT> {
    const result = await db.update(propertyNFTs).set(updates).where(eq(propertyNFTs.tokenId, tokenId)).returning();
    return result[0];
  }

  async getAllProperties(): Promise<PropertyNFT[]> {
    return await db.select().from(propertyNFTs).orderBy(propertyNFTs.mintedAt);
  }

  // Smart contract operations
  async getContract(address: string): Promise<SmartContract | undefined> {
    const result = await db.select().from(smartContracts).where(eq(smartContracts.address, address)).limit(1);
    return result[0];
  }

  async createContract(contract: InsertContract): Promise<SmartContract> {
    const result = await db.insert(smartContracts).values(contract).returning();
    return result[0];
  }

  async getAllContracts(): Promise<SmartContract[]> {
    return await db.select().from(smartContracts).orderBy(smartContracts.deployedAt);
  }

  // Transaction operations
  async getTransaction(hash: string): Promise<Transaction | undefined> {
    const result = await db.select().from(transactions).where(eq(transactions.hash, hash)).limit(1);
    return result[0];
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db.insert(transactions).values(transaction).returning();
    return result[0];
  }

  async getTransactionsByBlock(blockNumber: number): Promise<Transaction[]> {
    return await db.select().from(transactions).where(eq(transactions.blockNumber, blockNumber));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(transactions.timestamp);
  }

  // Audit operations
  async createAuditLog(audit: InsertAudit): Promise<AuditLog> {
    const result = await db.insert(auditLogs).values(audit).returning();
    return result[0];
  }

  async getAllAuditLogs(): Promise<AuditLog[]> {
    return await db.select().from(auditLogs).orderBy(auditLogs.timestamp);
  }
}

// Create and export the Neon storage instance
export const neonStorage = new NeonStorage();