import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  walletAddress: text("wallet_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
export const evidenceRecords = pgTable("evidence_records", {
  id: serial("id").primaryKey(),
  hash: text("hash").notNull().unique(),
  caseId: text("case_id").notNull(),
  documentType: text("document_type").notNull(),
  ipfsHash: text("ipfs_hash").notNull(),
  submittedBy: text("submitted_by").notNull(),
  verifiedBy: text("verified_by"),
  blockNumber: integer("block_number"),
  chainOfCustody: jsonb("chain_of_custody").notNull(),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  verifiedAt: timestamp("verified_at"),
});

// Legal cases
export const legalCases = pgTable("legal_cases", {
  id: serial("id").primaryKey(),
  caseNumber: text("case_number").notNull().unique(),
  jurisdiction: text("jurisdiction").notNull().default("cook_county"),
  status: text("status").notNull().default("active"),
  title: text("title").notNull(),
  description: text("description"),
  plaintiffs: jsonb("plaintiffs").notNull(),
  defendants: jsonb("defendants"),
  attorneys: jsonb("attorneys"),
  evidenceIds: jsonb("evidence_ids"),
  createdBy: text("created_by").notNull(),
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
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  resourceId: text("resource_id").notNull(),
  userId: text("user_id").notNull(),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  blockNumber: integer("block_number"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  role: true,
  walletAddress: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  timestamp: true,
});

export const insertEvidenceSchema = createInsertSchema(evidenceRecords).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
});

export const insertCaseSchema = createInsertSchema(legalCases).omit({
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

export const insertAuditSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;

export type EvidenceRecord = typeof evidenceRecords.$inferSelect;
export type InsertEvidence = z.infer<typeof insertEvidenceSchema>;

export type LegalCase = typeof legalCases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;

export type PropertyNFT = typeof propertyNFTs.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

export type SmartContract = typeof smartContracts.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAudit = z.infer<typeof insertAuditSchema>;
