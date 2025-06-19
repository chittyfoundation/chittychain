import { db } from '../storage.js';
import { legal_cases, evidence } from '@shared/schema.js';
import { eq, count, desc } from 'drizzle-orm';

export class CaseService {
  async getCaseStats() {
    try {
      // Get total cases
      const totalCases = await db
        .select({ count: count() })
        .from(legal_cases);

      // Get cases by status
      const pendingCases = await db
        .select({ count: count() })
        .from(legal_cases)
        .where(eq(legal_cases.status, 'PENDING'));

      const activeCases = await db
        .select({ count: count() })
        .from(legal_cases)
        .where(eq(legal_cases.status, 'ACTIVE'));

      const closedCases = await db
        .select({ count: count() })
        .from(legal_cases)
        .where(eq(legal_cases.status, 'CLOSED'));

      // Get recent cases
      const recentCases = await db
        .select()
        .from(legal_cases)
        .orderBy(desc(legal_cases.createdAt))
        .limit(5);

      return {
        total: totalCases[0]?.count || 0,
        pending: pendingCases[0]?.count || 0,
        active: activeCases[0]?.count || 0,
        closed: closedCases[0]?.count || 0,
        recentCases: recentCases.map(c => ({
          id: c.id,
          caseNumber: c.caseNumber,
          caseType: c.caseType,
          status: c.status,
          createdAt: c.createdAt
        }))
      };
    } catch (error) {
      throw new Error(`Failed to get case stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async validateCaseAccess(userId, caseId) {
    try {
      // Check if user is a party in the case
      const [caseRecord] = await db
        .select()
        .from(legal_cases)
        .where(eq(legal_cases.id, caseId))
        .limit(1);

      if (!caseRecord) {
        return false;
      }

      // Check if user is petitioner, respondent, or judge
      return (
        caseRecord.petitioner === userId ||
        caseRecord.respondent === userId ||
        caseRecord.judge === userId
      );
    } catch (error) {
      throw new Error(`Failed to validate case access: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getCaseEvidence(caseId) {
    try {
      const evidenceList = await db
        .select()
        .from(evidence)
        .where(eq(evidence.caseId, caseId))
        .orderBy(desc(evidence.submittedAt));

      return evidenceList;
    } catch (error) {
      throw new Error(`Failed to get case evidence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateCaseStatus(caseId, status) {
    try {
      await db
        .update(legal_cases)
        .set({ status, updatedAt: new Date() })
        .where(eq(legal_cases.id, caseId));

      return true;
    } catch (error) {
      throw new Error(`Failed to update case status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateCaseIdentifier(caseNumber, jurisdiction) {
    return `CASE-${caseNumber}-${jurisdiction}`;
  }

  async validateCaseIsolation(sourceCase, targetCase) {
    // Ensure no cross-contamination between cases
    if (sourceCase === targetCase) {
      return true;
    }
    
    // In production, implement more sophisticated isolation checks
    return false;
  }
}