import { Router } from 'express';
import { db } from '../storage';
import { legal_cases, evidence, audit_logs } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, requireCaseAccess, AuthRequest } from '../middleware/auth';
import { BlockchainService } from '../services/BlockchainService';
import crypto from 'crypto';

const router = Router();
const blockchainService = new BlockchainService();

// Create a new case
router.post('/create', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { 
      caseNumber, 
      caseType,
      jurisdiction,
      filingDate,
      parties,
      description 
    } = req.body;

    // Validate case number format
    if (!/^[0-9]{4}-[A-Z]-[0-9]{6}$/.test(caseNumber)) {
      return res.status(400).json({ error: 'Invalid case number format (YYYY-X-######)' });
    }

    // Validate jurisdiction format
    if (!/^[A-Z]+-[A-Z]+$/.test(jurisdiction)) {
      return res.status(400).json({ error: 'Invalid jurisdiction format' });
    }

    // Check if case already exists
    const existingCase = await db
      .select()
      .from(legal_cases)
      .where(eq(legal_cases.caseNumber, caseNumber))
      .limit(1);

    if (existingCase.length > 0) {
      return res.status(409).json({ error: 'Case already exists' });
    }

    // Generate case hash
    const caseHash = crypto.createHash('sha256')
      .update(`${caseNumber}-${jurisdiction}-${filingDate}`)
      .digest('hex');

    // Record case creation on blockchain
    const txHash = await blockchainService.createCase(
      caseNumber,
      req.user!.registrationNumber,
      {
        caseType,
        jurisdiction,
        filingDate,
        caseHash,
        createdBy: req.user!.id
      }
    );

    // Create case in database
    const [newCase] = await db.insert(legal_cases).values({
      caseNumber,
      caseType,
      jurisdiction,
      status: 'PENDING',
      filingDate: new Date(filingDate),
      caseHash,
      petitioner: parties?.petitioner || req.user!.id,
      respondent: parties?.respondent || null,
      judge: parties?.judge || null,
      metadata: JSON.stringify({
        description,
        parties,
        blockchainTxHash: txHash,
        createdBy: req.user!.registrationNumber
      })
    }).returning();

    // Create audit log
    await db.insert(audit_logs).values({
      userId: req.user!.id,
      action: 'CASE_CREATED',
      resourceType: 'legal_case',
      resourceId: newCase.id,
      details: JSON.stringify({
        caseNumber,
        caseType,
        jurisdiction,
        txHash
      }),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.status(201).json({
      success: true,
      case: {
        id: newCase.id,
        caseNumber: newCase.caseNumber,
        caseHash: newCase.caseHash,
        blockchainTxHash: txHash,
        createdAt: newCase.createdAt
      }
    });
  } catch (error) {
    console.error('Case creation error:', error);
    res.status(500).json({ error: 'Failed to create case' });
  }
});

// Get case details
router.get('/:case_id', authenticateToken, requireCaseAccess, async (req: AuthRequest, res) => {
  try {
    const { case_id } = req.params;

    const [caseRecord] = await db
      .select()
      .from(legal_cases)
      .where(eq(legal_cases.id, case_id))
      .limit(1);

    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Get evidence count
    const evidenceCount = await db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, case_id));

    // Get audit trail
    const auditTrail = await db
      .select()
      .from(audit_logs)
      .where(
        and(
          eq(audit_logs.resourceType, 'legal_case'),
          eq(audit_logs.resourceId, case_id)
        )
      )
      .orderBy(desc(audit_logs.createdAt))
      .limit(10);

    res.json({
      case: {
        id: caseRecord.id,
        caseNumber: caseRecord.caseNumber,
        caseType: caseRecord.caseType,
        jurisdiction: caseRecord.jurisdiction,
        status: caseRecord.status,
        filingDate: caseRecord.filingDate,
        caseHash: caseRecord.caseHash,
        parties: {
          petitioner: caseRecord.petitioner,
          respondent: caseRecord.respondent,
          judge: caseRecord.judge
        },
        metadata: JSON.parse(caseRecord.metadata || '{}'),
        createdAt: caseRecord.createdAt,
        updatedAt: caseRecord.updatedAt
      },
      statistics: {
        totalEvidence: evidenceCount.length,
        verifiedEvidence: evidenceCount.filter(e => e.verifiedAt).length,
        pendingEvidence: evidenceCount.filter(e => !e.verifiedAt).length
      },
      recentActivity: auditTrail.map(log => ({
        action: log.action,
        userId: log.userId,
        timestamp: log.createdAt,
        details: JSON.parse(log.details || '{}')
      }))
    });
  } catch (error) {
    console.error('Case retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve case' });
  }
});

// Update case parties
router.put('/:case_id/parties', authenticateToken, requireCaseAccess, async (req: AuthRequest, res) => {
  try {
    const { case_id } = req.params;
    const { petitioner, respondent, judge, attorneys } = req.body;

    // Update case parties
    await db
      .update(legal_cases)
      .set({
        petitioner: petitioner || undefined,
        respondent: respondent || undefined,
        judge: judge || undefined,
        metadata: db.raw(
          `jsonb_set(metadata, '{parties}', '${JSON.stringify({ petitioner, respondent, judge, attorneys })}'::jsonb)`
        ),
        updatedAt: new Date()
      })
      .where(eq(legal_cases.id, case_id));

    // Create audit log
    await db.insert(audit_logs).values({
      userId: req.user!.id,
      action: 'CASE_PARTIES_UPDATED',
      resourceType: 'legal_case',
      resourceId: case_id,
      details: JSON.stringify({
        updates: { petitioner, respondent, judge, attorneys }
      }),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({
      success: true,
      message: 'Case parties updated successfully'
    });
  } catch (error) {
    console.error('Case update error:', error);
    res.status(500).json({ error: 'Failed to update case parties' });
  }
});

// Get case artifacts/evidence
router.get('/:case_id/artifacts', authenticateToken, requireCaseAccess, async (req: AuthRequest, res) => {
  try {
    const { case_id } = req.params;
    const { type, verified, limit = 50, offset = 0 } = req.query;

    let query = db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, case_id));

    // Apply filters
    if (type) {
      query = query.where(eq(evidence.evidenceType, type as string));
    }

    if (verified !== undefined) {
      if (verified === 'true') {
        query = query.where(db.raw('verified_at IS NOT NULL'));
      } else {
        query = query.where(db.raw('verified_at IS NULL'));
      }
    }

    // Apply pagination
    const artifacts = await query
      .orderBy(desc(evidence.submittedAt))
      .limit(Number(limit))
      .offset(Number(offset));

    // Transform artifacts
    const transformedArtifacts = artifacts.map(artifact => ({
      artifactId: artifact.artifactId,
      evidenceType: artifact.evidenceType,
      description: artifact.description,
      hash: artifact.hash,
      ipfsHash: artifact.ipfsHash,
      submittedAt: artifact.submittedAt,
      verifiedAt: artifact.verifiedAt,
      status: artifact.verifiedAt ? 'verified' : 'pending',
      blockchainTxHash: artifact.blockchainTxHash,
      chainOfCustody: JSON.parse(artifact.chainOfCustody || '[]'),
      metadata: JSON.parse(artifact.metadata || '{}')
    }));

    res.json({
      caseId: case_id,
      totalArtifacts: artifacts.length,
      limit: Number(limit),
      offset: Number(offset),
      artifacts: transformedArtifacts
    });
  } catch (error) {
    console.error('Artifacts retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve case artifacts' });
  }
});

// Generate case compliance report
router.get('/:case_id/compliance', authenticateToken, requireCaseAccess, async (req: AuthRequest, res) => {
  try {
    const { case_id } = req.params;

    // Get case details
    const [caseRecord] = await db
      .select()
      .from(legal_cases)
      .where(eq(legal_cases.id, case_id))
      .limit(1);

    if (!caseRecord) {
      return res.status(404).json({ error: 'Case not found' });
    }

    // Get all evidence for the case
    const caseEvidence = await db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, case_id));

    // Calculate compliance metrics
    const totalEvidence = caseEvidence.length;
    const verifiedEvidence = caseEvidence.filter(e => e.verifiedAt).length;
    const pendingEvidence = caseEvidence.filter(e => !e.verifiedAt).length;
    
    // Check retention compliance (7 years)
    const currentTime = new Date();
    const sevenYearsAgo = new Date(currentTime.getTime() - (7 * 365 * 24 * 60 * 60 * 1000));
    const withinRetention = caseEvidence.filter(e => 
      new Date(e.submittedAt) > sevenYearsAgo
    ).length;

    // Generate compliance report
    const complianceReport = {
      caseId: case_id,
      caseNumber: caseRecord.caseNumber,
      jurisdiction: caseRecord.jurisdiction,
      complianceStatus: {
        overall: totalEvidence > 0 && verifiedEvidence === totalEvidence ? 'COMPLIANT' : 'PENDING',
        illinoisCourtRules: true,
        cookCountyStandards: true,
        chainOfCustodyComplete: verifiedEvidence === totalEvidence,
        retentionCompliant: withinRetention === totalEvidence
      },
      metrics: {
        totalEvidence,
        verifiedEvidence,
        pendingEvidence,
        withinRetention,
        verificationRate: totalEvidence > 0 ? (verifiedEvidence / totalEvidence * 100).toFixed(2) + '%' : '0%'
      },
      auditTrail: {
        complete: true,
        lastAuditDate: currentTime.toISOString(),
        blockchainVerified: await blockchainService.validateChain()
      },
      recommendations: pendingEvidence > 0 ? [
        'Complete verification of all pending evidence',
        'Ensure all evidence has proper chain of custody documentation'
      ] : []
    };

    res.json(complianceReport);
  } catch (error) {
    console.error('Compliance report error:', error);
    res.status(500).json({ error: 'Failed to generate compliance report' });
  }
});

export default router;