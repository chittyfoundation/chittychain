import { Router } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { db } from '../storage';
import { evidence, audit_logs } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authenticateToken, requireCaseAccess, AuthRequest } from '../middleware/auth';
import { BlockchainService } from '../services/BlockchainService';
import { EvidenceService } from '../services/EvidenceService';

const router = Router();
const blockchainService = new BlockchainService();
const evidenceService = new EvidenceService();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'application/octet-stream'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Submit evidence to a case
router.post('/submit', authenticateToken, requireCaseAccess, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { caseId, documentType, description, metadata } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Create evidence record with the evidence service
    const evidenceRecord = await evidenceService.submitEvidence(
      caseId,
      documentType,
      file.buffer,
      req.user!.registrationNumber,
      {
        ...metadata,
        description,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }
    );

    // Record on blockchain
    const txHash = await blockchainService.recordEvidence(
      caseId,
      evidenceRecord.hash,
      req.user!.registrationNumber,
      {
        evidenceId: evidenceRecord.id,
        documentType,
        ipfsHash: evidenceRecord.ipfsHash
      }
    );

    // Save to database
    const [dbEvidence] = await db.insert(evidence).values({
      caseId,
      artifactId: `ART-${evidenceRecord.hash.substring(0, 12)}`,
      evidenceType: documentType,
      description,
      hash: evidenceRecord.hash,
      ipfsHash: evidenceRecord.ipfsHash,
      submittedBy: req.user!.id,
      chainOfCustody: JSON.stringify(evidenceRecord.chainOfCustody),
      metadata: JSON.stringify(evidenceRecord.metadata),
      blockchainTxHash: txHash
    }).returning();

    // Create audit log
    await db.insert(audit_logs).values({
      userId: req.user!.id,
      action: 'EVIDENCE_SUBMITTED',
      resourceType: 'evidence',
      resourceId: dbEvidence.id,
      details: JSON.stringify({
        caseId,
        documentType,
        evidenceHash: evidenceRecord.hash,
        txHash
      }),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.status(201).json({
      success: true,
      evidence: {
        id: dbEvidence.id,
        artifactId: dbEvidence.artifactId,
        hash: evidenceRecord.hash,
        ipfsHash: evidenceRecord.ipfsHash,
        blockchainTxHash: txHash,
        submittedAt: dbEvidence.submittedAt
      }
    });
  } catch (error) {
    console.error('Evidence submission error:', error);
    res.status(500).json({ error: 'Failed to submit evidence' });
  }
});

// Batch evidence submission
router.post('/batch', authenticateToken, requireCaseAccess, upload.array('files', 10), async (req: AuthRequest, res) => {
  try {
    const { caseId, documentType, metadata } = req.body;
    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const results = [];

    for (const file of files) {
      try {
        const evidenceRecord = await evidenceService.submitEvidence(
          caseId,
          documentType,
          file.buffer,
          req.user!.registrationNumber,
          {
            ...metadata,
            originalFilename: file.originalname,
            batchUpload: true
          }
        );

        const txHash = await blockchainService.recordEvidence(
          caseId,
          evidenceRecord.hash,
          req.user!.registrationNumber,
          {
            evidenceId: evidenceRecord.id,
            documentType,
            ipfsHash: evidenceRecord.ipfsHash,
            batchId: req.body.batchId
          }
        );

        const [dbEvidence] = await db.insert(evidence).values({
          caseId,
          artifactId: `ART-${evidenceRecord.hash.substring(0, 12)}`,
          evidenceType: documentType,
          description: file.originalname,
          hash: evidenceRecord.hash,
          ipfsHash: evidenceRecord.ipfsHash,
          submittedBy: req.user!.id,
          chainOfCustody: JSON.stringify(evidenceRecord.chainOfCustody),
          metadata: JSON.stringify(evidenceRecord.metadata),
          blockchainTxHash: txHash
        }).returning();

        results.push({
          filename: file.originalname,
          evidenceId: dbEvidence.id,
          artifactId: dbEvidence.artifactId,
          hash: evidenceRecord.hash,
          txHash
        });
      } catch (fileError) {
        results.push({
          filename: file.originalname,
          error: fileError instanceof Error ? fileError.message : 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      totalFiles: files.length,
      successfulUploads: results.filter(r => !r.error).length,
      results
    });
  } catch (error) {
    console.error('Batch evidence submission error:', error);
    res.status(500).json({ error: 'Failed to submit batch evidence' });
  }
});

// Get evidence timeline for a case
router.get('/:case_id/timeline', authenticateToken, requireCaseAccess, async (req: AuthRequest, res) => {
  try {
    const { case_id } = req.params;

    const evidenceList = await db
      .select()
      .from(evidence)
      .where(eq(evidence.caseId, case_id))
      .orderBy(desc(evidence.submittedAt));

    const timeline = evidenceList.map(e => ({
      id: e.id,
      artifactId: e.artifactId,
      type: e.evidenceType,
      description: e.description,
      submittedAt: e.submittedAt,
      verifiedAt: e.verifiedAt,
      status: e.verifiedAt ? 'verified' : 'pending',
      blockchainTxHash: e.blockchainTxHash,
      events: JSON.parse(e.chainOfCustody || '[]')
    }));

    res.json({
      caseId: case_id,
      totalEvidence: timeline.length,
      timeline
    });
  } catch (error) {
    console.error('Timeline retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve evidence timeline' });
  }
});

// Validate evidence
router.post('/validate', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { evidenceId, validationNotes } = req.body;

    // Get evidence from database
    const [evidenceRecord] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, evidenceId))
      .limit(1);

    if (!evidenceRecord) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    // Verify on blockchain
    const isValidOnChain = await blockchainService.validateChain();

    // Update evidence as verified
    await db
      .update(evidence)
      .set({
        verifiedAt: new Date(),
        verifiedBy: req.user!.id,
        metadata: JSON.stringify({
          ...JSON.parse(evidenceRecord.metadata || '{}'),
          validationNotes,
          blockchainVerified: isValidOnChain
        })
      })
      .where(eq(evidence.id, evidenceId));

    // Update chain of custody
    const custodyUpdate = await evidenceService.updateChainOfCustody(
      evidenceId,
      'Evidence Validated',
      req.user!.registrationNumber,
      undefined,
      validationNotes
    );

    // Create audit log
    await db.insert(audit_logs).values({
      userId: req.user!.id,
      action: 'EVIDENCE_VALIDATED',
      resourceType: 'evidence',
      resourceId: evidenceId,
      details: JSON.stringify({
        validationNotes,
        blockchainVerified: isValidOnChain
      }),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({
      success: true,
      evidenceId,
      validated: true,
      blockchainVerified: isValidOnChain,
      validatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Evidence validation error:', error);
    res.status(500).json({ error: 'Failed to validate evidence' });
  }
});

// Verify evidence integrity
router.post('/:artifact_id/verify', authenticateToken, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const { artifact_id } = req.params;
    const file = req.file;

    // Get evidence by artifact ID
    const [evidenceRecord] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.artifactId, artifact_id))
      .limit(1);

    if (!evidenceRecord) {
      return res.status(404).json({ error: 'Evidence not found' });
    }

    let integrityValid = false;
    if (file) {
      // Verify file integrity if file provided
      integrityValid = await evidenceService.validateEvidenceIntegrity(
        evidenceRecord.hash,
        file.buffer
      );
    }

    // Generate forensic report
    const forensicReport = await evidenceService.generateForensicReport(evidenceRecord.id);

    res.json({
      artifactId: artifact_id,
      evidenceId: evidenceRecord.id,
      originalHash: evidenceRecord.hash,
      ipfsHash: evidenceRecord.ipfsHash,
      integrityValid: file ? integrityValid : undefined,
      blockchainTxHash: evidenceRecord.blockchainTxHash,
      forensicReport,
      chainOfCustody: JSON.parse(evidenceRecord.chainOfCustody || '[]')
    });
  } catch (error) {
    console.error('Evidence verification error:', error);
    res.status(500).json({ error: 'Failed to verify evidence' });
  }
});

export default router;