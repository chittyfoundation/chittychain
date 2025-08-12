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

// MASTER EVIDENCE - Canonical registry of every artifact
export const masterEvidence = pgTable("master_evidence", {
  id: serial("id").primaryKey(),
  artifactId: text("artifact_id").notNull().unique(),
  caseBinding: integer("case_binding").references(() => legal_cases.id),
  userBinding: integer("user_binding").references(() => users.id),
  evidenceType: text("evidence_type").notNull(),
  evidenceTier: text("evidence_tier").notNull(),
  evidenceWeight: integer("evidence_weight"), // 0-100 scale
  contentHash: text("content_hash").notNull(),
  originalFilename: text("original_filename"),
  uploadDate: timestamp("upload_date").defaultNow(),
  sourceVerificationStatus: text("source_verification_status").default("Pending"),
  authenticationMethod: text("authentication_method"),
  supportingClaims: text("supporting_claims").array(),
  contradictingClaims: text("contradicting_claims").array(),
  mintingStatus: text("minting_status").default("Pending"),
  blockNumber: text("block_number"),
  auditNotes: text("audit_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ATOMIC FACTS - Line-item facts extracted from evidence
export const atomicFacts = pgTable("atomic_facts", {
  id: serial("id").primaryKey(),
  factId: text("fact_id").notNull().unique(),
  parentDocument: integer("parent_document").references(() => masterEvidence.id),
  factText: text("fact_text").notNull(),
  factType: text("fact_type").notNull(),
  locationInDocument: text("location_in_document"),
  classificationLevel: text("classification_level").notNull(),
  weight: integer("weight"), // 0-100 scale
  credibilityFactors: text("credibility_factors").array(),
  supportsCaseTheory: text("supports_case_theory").array(),
  contradictsCaseTheory: text("contradicts_case_theory").array(),
  chittyChainStatus: text("chittychain_status").default("Pending"),
  verificationDate: timestamp("verification_date"),
  verificationMethod: text("verification_method"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CHAIN OF CUSTODY LOG - Immutable hand-off entries
export const chainOfCustodyLog = pgTable("chain_of_custody_log", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").notNull().unique(),
  evidence: integer("evidence").references(() => masterEvidence.id),
  custodian: integer("custodian").references(() => users.id),
  dateReceived: timestamp("date_received"),
  dateTransferred: timestamp("date_transferred"),
  transferMethod: text("transfer_method"),
  integrityCheckMethod: text("integrity_check_method"),
  integrityVerified: boolean("integrity_verified").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// CONTRADICTION TRACKING - Conflicting-fact resolution engine
export const contradictionTracking = pgTable("contradiction_tracking", {
  id: serial("id").primaryKey(),
  contradictionId: text("contradiction_id").notNull().unique(),
  conflictType: text("conflict_type").notNull(),
  winningFact: integer("winning_fact").references(() => atomicFacts.id),
  resolutionMethod: text("resolution_method"),
  resolutionDate: timestamp("resolution_date"),
  impactOnCase: text("impact_on_case"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AUDIT TRAIL - Every CRUD / read against the system
export const auditTrail = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  user: integer("user").references(() => users.id),
  actionType: text("action_type").notNull(),
  targetArtifact: integer("target_artifact").references(() => masterEvidence.id),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
  successFailure: text("success_failure").default("Success"),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy audit logs for compatibility
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

// Evidence Ledger schemas
export const insertMasterEvidenceSchema = createInsertSchema(masterEvidence).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAtomicFactSchema = createInsertSchema(atomicFacts).omit({
  id: true,
  createdAt: true,
});

export const insertChainOfCustodySchema = createInsertSchema(chainOfCustodyLog).omit({
  id: true,
  createdAt: true,
});

export const insertContradictionSchema = createInsertSchema(contradictionTracking).omit({
  id: true,
  createdAt: true,
});

export const insertAuditTrailSchema = createInsertSchema(auditTrail).omit({
  id: true,
  createdAt: true,
  timestamp: true,
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

// Evidence Ledger types
export type MasterEvidence = typeof masterEvidence.$inferSelect;
export type InsertMasterEvidence = z.infer<typeof insertMasterEvidenceSchema>;

export type AtomicFact = typeof atomicFacts.$inferSelect;
export type InsertAtomicFact = z.infer<typeof insertAtomicFactSchema>;

export type ChainOfCustody = typeof chainOfCustodyLog.$inferSelect;
export type InsertChainOfCustody = z.infer<typeof insertChainOfCustodySchema>;

export type ContradictionTracking = typeof contradictionTracking.$inferSelect;
export type InsertContradictionTracking = z.infer<typeof insertContradictionSchema>;

export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = z.infer<typeof insertAuditTrailSchema>;

// Approval requests tables
export const approvalRequests = pgTable("approval_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(),
  caseId: integer("case_id").references(() => legal_cases.id),
  title: text("title").notNull(),
  requestType: text("request_type").notNull(),
  requestDate: text("request_date").notNull(),
  requestTime: text("request_time").notNull(),
  location: text("location"),
  description: text("description"),
  photoUrl: text("photo_url"),
  status: text("status").notNull().default("pending"),
  createdBy: integer("created_by").references(() => users.id),
  blockHash: text("block_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const requestRecipients = pgTable("request_recipients", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => approvalRequests.id).notNull(),
  recipient: text("recipient").notNull(),
  recipientType: text("recipient_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const requestResponses = pgTable("request_responses", {
  id: serial("id").primaryKey(),
  requestId: integer("request_id").references(() => approvalRequests.id).notNull(),
  recipient: text("recipient").notNull(),
  response: text("response").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  signature: text("signature"),
  respondedAt: timestamp("responded_at").defaultNow().notNull(),
});

// Approval types
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type RequestRecipient = typeof requestRecipients.$inferSelect;
export type RequestResponse = typeof requestResponses.$inferSelect;

export const insertApprovalSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApproval = z.infer<typeof insertApprovalSchema>;
