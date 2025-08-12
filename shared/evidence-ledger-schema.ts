import { pgTable, text, timestamp, integer, serial, boolean, jsonb, numeric, varchar, real } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// USERS - Parties, counsel, experts, court officers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  registrationNumber: text("registration_number").notNull().unique(), // REG + 8-digit random
  userType: text("user_type").notNull(), // PARTY_PETITIONER, PARTY_RESPONDENT, ATTORNEY_PETITIONER, ATTORNEY_RESPONDENT, COURT_OFFICER, EXPERT_WITNESS
  fullName: text("full_name").notNull(),
  barNumber: text("bar_number"),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: text("phone"),
  verifiedStatus: boolean("verified_status").default(false),
  trustScore: integer("trust_score").default(50), // 0-100
  lastActivity: timestamp("last_activity").defaultNow(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// CASES - Matter-level container with roll-ups & deadlines
export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  caseId: text("case_id").notNull().unique(), // Jurisdiction-Year-CaseType-CaseNumber
  jurisdiction: text("jurisdiction").notNull(), // e.g., ILLINOIS-COOK
  caseNumber: text("case_number").notNull(),
  caseType: text("case_type").notNull(), // DIVORCE, CUSTODY, CIVIL, CRIMINAL, PROBATE
  filingDate: timestamp("filing_date"),
  judgeAssigned: text("judge_assigned"),
  caseStatus: text("case_status").default("Active"), // Active, Stayed, Closed, Appeal
  totalEvidenceItems: integer("total_evidence_items").default(0),
  mintedFactsCount: integer("minted_facts_count").default(0),
  keyDates: jsonb("key_dates"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// MASTER EVIDENCE - Canonical registry of every artifact
export const masterEvidence = pgTable("master_evidence", {
  id: serial("id").primaryKey(),
  artifactId: text("artifact_id").notNull().unique(), // ART- + id
  caseBinding: integer("case_binding").references(() => cases.id),
  userBinding: integer("user_binding").references(() => users.id),
  evidenceType: text("evidence_type").notNull(), // Document, Image, Communication, Financial Record, Legal Filing, Physical Evidence
  evidenceTier: text("evidence_tier").notNull(), // SELF_AUTHENTICATING, GOVERNMENT, FINANCIAL_INSTITUTION, INDEPENDENT_THIRD_PARTY, BUSINESS_RECORDS, FIRST_PARTY_ADVERSE, FIRST_PARTY_FRIENDLY, UNCORROBORATED_PERSON
  evidenceWeight: real("evidence_weight"), // 0.0-1.0
  contentHash: text("content_hash").notNull(), // SHA-256
  originalFilename: text("original_filename"),
  uploadDate: timestamp("upload_date").defaultNow(),
  sourceVerificationStatus: text("source_verification_status").default("Pending"), // Verified, Pending, Failed
  authenticationMethod: text("authentication_method"), // Seal, Stamp, Certification, Notarization, Digital Signature, Metadata, Witness, None
  supportingClaims: text("supporting_claims").array(),
  contradictingClaims: text("contradicting_claims").array(),
  mintingStatus: text("minting_status").default("Pending"), // Minted, Pending, Rejected, Requires Corroboration
  blockNumber: text("block_number"),
  auditNotes: text("audit_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ATOMIC FACTS - Line-item facts extracted from evidence
export const atomicFacts = pgTable("atomic_facts", {
  id: serial("id").primaryKey(),
  factId: text("fact_id").notNull().unique(), // FACT- + id
  parentDocument: integer("parent_document").references(() => masterEvidence.id),
  factText: text("fact_text").notNull(),
  factType: text("fact_type").notNull(), // DATE, AMOUNT, ADMISSION, IDENTITY, LOCATION, RELATIONSHIP, ACTION, STATUS
  locationInDocument: text("location_in_document"), // p./¶/l.
  classificationLevel: text("classification_level").notNull(), // FACT, SUPPORTED_CLAIM, ASSERTION, ALLEGATION, CONTRADICTION
  weight: real("weight"), // 0.0-1.0
  credibilityFactors: text("credibility_factors").array(), // Against Interest, Contemporaneous, Business Duty, Official Duty
  supportsCaseTheory: text("supports_case_theory").array(),
  contradictsCaseTheory: text("contradicts_case_theory").array(),
  chittyChainStatus: text("chittychain_status").default("Pending"), // Minted, Pending, Rejected
  verificationDate: timestamp("verification_date"),
  verificationMethod: text("verification_method"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CHAIN OF CUSTODY LOG - Immutable hand-off entries
export const chainOfCustodyLog = pgTable("chain_of_custody_log", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").notNull().unique(),
  evidence: integer("evidence").references(() => masterEvidence.id),
  custodian: integer("custodian").references(() => users.id),
  dateReceived: timestamp("date_received"),
  dateTransferred: timestamp("date_transferred"),
  transferMethod: text("transfer_method"), // SEALED_ENVELOPE, CERTIFIED_MAIL, SECURE_DIGITAL, COURT_FILING, NOTARY_TRANSFER, DIRECT_HANDOFF
  integrityCheckMethod: text("integrity_check_method"), // HASH_VERIFICATION, SEAL_INTACT, WITNESS_CONFIRMATION, METADATA_MATCH
  integrityVerified: boolean("integrity_verified").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

// CONTRADICTION TRACKING - Conflicting-fact resolution engine
export const contradictionTracking = pgTable("contradiction_tracking", {
  id: serial("id").primaryKey(),
  contradictionId: text("contradiction_id").notNull().unique(), // CONFLICT- + id
  conflictType: text("conflict_type").notNull(), // DIRECT_CONTRADICTION, TEMPORAL_IMPOSSIBILITY, LOGICAL_INCONSISTENCY, PARTIAL_CONFLICT
  winningFact: integer("winning_fact").references(() => atomicFacts.id),
  resolutionMethod: text("resolution_method"), // HIERARCHY_RULE, TEMPORAL_PRIORITY, AUTHENTICATION_SUPERIORITY, ADVERSE_ADMISSION, CONTEMPORANEOUS_RECORD
  resolutionDate: timestamp("resolution_date"),
  impactOnCase: text("impact_on_case"),
  createdAt: timestamp("created_at").defaultNow(),
});

// AUDIT TRAIL - Every CRUD / read against the system
export const auditTrail = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  actionId: integer("action_id").notNull().unique(),
  timestamp: timestamp("timestamp").defaultNow(),
  user: integer("user").references(() => users.id),
  actionType: text("action_type").notNull(), // Upload, Verify, Mint, Reject, Query, Modify, Access
  targetArtifact: integer("target_artifact").references(() => masterEvidence.id),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
  successFailure: text("success_failure").default("Success"), // Success, Failure
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for atomic facts self-reference
export const atomicFactRelations = pgTable("atomic_fact_relations", {
  id: serial("id").primaryKey(),
  factId: integer("fact_id").references(() => atomicFacts.id),
  relatedFactId: integer("related_fact_id").references(() => atomicFacts.id),
  relationType: text("relation_type"), // supports, contradicts, clarifies, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for contradiction tracking to atomic facts
export const contradictionFacts = pgTable("contradiction_facts", {
  id: serial("id").primaryKey(),
  contradictionId: integer("contradiction_id").references(() => contradictionTracking.id),
  factId: integer("fact_id").references(() => atomicFacts.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Junction table for case parties
export const caseParties = pgTable("case_parties", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id),
  userId: integer("user_id").references(() => users.id),
  partyRole: text("party_role"), // petitioner, respondent, attorney_for_petitioner, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertCaseSchema = createInsertSchema(cases);
export const selectCaseSchema = createSelectSchema(cases);
export const insertMasterEvidenceSchema = createInsertSchema(masterEvidence);
export const selectMasterEvidenceSchema = createSelectSchema(masterEvidence);
export const insertAtomicFactSchema = createInsertSchema(atomicFacts);
export const selectAtomicFactSchema = createSelectSchema(atomicFacts);
export const insertChainOfCustodySchema = createInsertSchema(chainOfCustodyLog);
export const selectChainOfCustodySchema = createSelectSchema(chainOfCustodyLog);
export const insertContradictionSchema = createInsertSchema(contradictionTracking);
export const selectContradictionSchema = createSelectSchema(contradictionTracking);
export const insertAuditTrailSchema = createInsertSchema(auditTrail);
export const selectAuditTrailSchema = createSelectSchema(auditTrail);

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;
export type MasterEvidence = typeof masterEvidence.$inferSelect;
export type InsertMasterEvidence = typeof masterEvidence.$inferInsert;
export type AtomicFact = typeof atomicFacts.$inferSelect;
export type InsertAtomicFact = typeof atomicFacts.$inferInsert;
export type ChainOfCustody = typeof chainOfCustodyLog.$inferSelect;
export type InsertChainOfCustody = typeof chainOfCustodyLog.$inferInsert;
export type ContradictionTracking = typeof contradictionTracking.$inferSelect;
export type InsertContradictionTracking = typeof contradictionTracking.$inferInsert;
export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = typeof auditTrail.$inferInsert;