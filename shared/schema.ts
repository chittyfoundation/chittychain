import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - Updated for ChittyChain requirements
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  barNumber: text("bar_number"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("PARTY_RESPONDENT"),
  twoFactorSecret: text("two_factor_secret"),
  isActive: boolean("is_active").default(false),
  lastLogin: timestamp("last_login"),
  // Claude Code OAuth fields
  claudeUserId: text("claude_user_id").unique(),
  authProvider: text("auth_provider").default("traditional"),
  subscriptionTier: text("subscription_tier").default("free"),
  apiKeyHash: text("api_key_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Blockchain blocks
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  blockNumber: integer("block_number").notNull().unique(),
  hash: text("hash").notNull().unique(),
  previousHash: text("previous_hash").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  merkleRoot: text("merkle_root").notNull(),
  nonce: integer("nonce").notNull(),
  difficulty: integer("difficulty").notNull(),
  transactions: jsonb("transactions").notNull(),
  miner: text("miner"),
});

// Evidence records
export const evidence = pgTable("evidence", {
  id: serial("id").primaryKey(),
  caseId: text("case_id").notNull(),
  artifactId: text("artifact_id").notNull().unique(),
  evidenceType: text("evidence_type").notNull(),
  description: text("description"),
  hash: text("hash").notNull().unique(),
  ipfsHash: text("ipfs_hash").notNull(),
  submittedBy: text("submitted_by").notNull(),
  verifiedBy: text("verified_by"),
  blockNumber: integer("block_number"),
  blockchainTxHash: text("blockchain_tx_hash"),
  chainOfCustody: jsonb("chain_of_custody").notNull(),
  metadata: jsonb("metadata"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Legal cases
export const legal_cases = pgTable("legal_cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  caseType: text("case_type").notNull(),
  jurisdiction: text("jurisdiction").notNull(),
  status: text("status").notNull().default("PENDING"),
  filingDate: timestamp("filing_date").notNull(),
  caseHash: text("case_hash").notNull().unique(),
  petitioner: text("petitioner").notNull(),
  respondent: text("respondent"),
  judge: text("judge"),
  createdBy: text("created_by"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Property NFTs
export const propertyNFTs = pgTable("property_nfts", {
  id: serial("id").primaryKey(),
  tokenId: integer("token_id").notNull().unique(),
  contractAddress: text("contract_address").notNull(),
  propertyAddress: text("property_address").notNull(),
  owner: text("owner").notNull(),
  metadata: jsonb("metadata").notNull(),
  conditionScore: integer("condition_score"),
  lastInspection: timestamp("last_inspection"),
  ipfsMetadata: text("ipfs_metadata"),
  blockNumber: integer("block_number"),
  mintedAt: timestamp("minted_at").defaultNow().notNull(),
});

// Smart contracts
export const smartContracts = pgTable("smart_contracts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().unique(),
  abi: jsonb("abi").notNull(),
  bytecode: text("bytecode").notNull(),
  deployedBy: text("deployed_by").notNull(),
  status: text("status").notNull().default("active"),
  gasUsed: integer("gas_used"),
  blockNumber: integer("block_number"),
  deployedAt: timestamp("deployed_at").defaultNow().notNull(),
});

// Transactions
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  hash: text("hash").notNull().unique(),
  from: text("from").notNull(),
  to: text("to").notNull(),
  value: text("value").notNull(),
  gasPrice: text("gas_price").notNull(),
  gasUsed: integer("gas_used"),
  blockNumber: integer("block_number"),
  transactionIndex: integer("transaction_index"),
  status: text("status").notNull().default("pending"),
  type: text("type").notNull(),
  data: jsonb("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit logs
export const audit_logs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  blockNumber: integer("block_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  timestamp: true,
});

export const insertEvidenceSchema = createInsertSchema(evidence).omit({
  id: true,
  submittedAt: true,
  verifiedAt: true,
});

export const insertCaseSchema = createInsertSchema(legal_cases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(propertyNFTs).omit({
  id: true,
  mintedAt: true,
});

export const insertContractSchema = createInsertSchema(smartContracts).omit({
  id: true,
  deployedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertAuditSchema = createInsertSchema(audit_logs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

export type Evidence = typeof evidence.$inferSelect;
export type EvidenceRecord = typeof evidence.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;

export type LegalCase = typeof legal_cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type PropertyNFT = typeof propertyNFTs.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

// Additional exports for compatibility
export const evidenceRecords = evidence;
export const legalCases = legal_cases;
export const property_nfts = propertyNFTs;
export const auditLogs = audit_logs;

export type SmartContract = typeof smartContracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type AuditLog = typeof audit_logs.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
