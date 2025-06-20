import { Router } from 'express';
import crypto from 'crypto';
import { db } from '../storage';
import { evidenceRecords, auditLogs } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { authenticateToken, requireCaseAccess, AuthRequest } from '../middleware/auth';
import { BlockchainService } from '../services/BlockchainService';

const router = Router();
const blockchainService = new BlockchainService();

// Bind artifact to case with cryptographic verification
router.post('/bind', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { 
      artifact_content,
      case_identifiers,
      user_identifiers,
      access_control,
      audit_trail 
    } = req.body;

    // Validate artifact content
    if (!artifact_content?.content_hash || !artifact_content?.content_type) {
      return res.status(400).json({ error: 'Invalid artifact content' });
    }

    // Validate case identifiers
    if (!case_identifiers?.jurisdiction || !case_identifiers?.case_number) {
      return res.status(400).json({ error: 'Invalid case identifiers' });
    }

    // Validate user identifiers
    if (!user_identifiers?.submitter_reg || !user_identifiers?.submitter_role) {
      return res.status(400).json({ error: 'Invalid user identifiers' });
    }

    // Generate artifact ID
    const artifactId = `ART-${artifact_content.content_hash.substring(0, 12)}`;
    
    // Generate case binding
    const caseBinding = `CASE-${case_identifiers.case_number}-${case_identifiers.jurisdiction}`;
    
    // Generate user binding
    const userBinding = `USER-${user_identifiers.submitter_reg}-${user_identifiers.submitter_role}`;
    
    // Create immutable hash
    const timestamp = new Date().toISOString();
    const immutableHash = crypto.createHash('sha256')
      .update(artifact_content.content_hash + caseBinding + userBinding + timestamp)
      .digest('hex');

    // Record on blockchain
    const txHash = await blockchainService.recordEvidence(
      case_identifiers.case_number,
      immutableHash,
      user_identifiers.submitter_reg,
      {
        artifactId,
        caseBinding,
        userBinding,
        contentType: artifact_content.content_type,
        extractionMetadata: artifact_content.extraction_metadata,
        accessControl: access_control,
        auditTrail: audit_trail
      }
    );

    // Create binding record
    const bindingRecord = {
      artifact_id: artifactId,
      case_binding: caseBinding,
      user_binding: userBinding,
      timestamp,
      immutable_hash: immutableHash,
      blockchain_tx_hash: txHash,
      verification_status: 'BOUND',
      isolation_verified: true
    };

    // Create audit log
    await db.insert(audit_logs).values({
      userId: req.user!.id,
      action: 'ARTIFACT_BOUND',
      resourceType: 'artifact',
      resourceId: artifactId,
      details: JSON.stringify({
        caseBinding,
        userBinding,
        immutableHash,
        txHash
      }),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.status(201).json({
      success: true,
      binding: bindingRecord
    });
  } catch (error) {
    console.error('Artifact binding error:', error);
    res.status(500).json({ error: 'Failed to bind artifact' });
  }
});

// Get artifact by ID
router.get('/:artifact_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { artifact_id } = req.params;

    // Get artifact from evidence table
    const [artifact] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.artifactId, artifact_id))
      .limit(1);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Verify user has access to the case
    if (!req.user?.caseAccess.includes(artifact.caseId) && req.user?.role !== 'COURT_OFFICER') {
      return res.status(403).json({ error: 'No access to this artifact' });
    }

    // Get blockchain data
    const txData = artifact.blockchainTxHash ? 
      await blockchainService.getTransactionByHash(artifact.blockchainTxHash) : null;

    res.json({
      artifact: {
        artifactId: artifact.artifactId,
        caseId: artifact.caseId,
        evidenceType: artifact.evidenceType,
        description: artifact.description,
        hash: artifact.hash,
        ipfsHash: artifact.ipfsHash,
        submittedAt: artifact.submittedAt,
        submittedBy: artifact.submittedBy,
        verifiedAt: artifact.verifiedAt,
        verifiedBy: artifact.verifiedBy,
        chainOfCustody: JSON.parse(artifact.chainOfCustody || '[]'),
        metadata: JSON.parse(artifact.metadata || '{}')
      },
      blockchain: {
        transactionHash: artifact.blockchainTxHash,
        transactionData: txData,
        verified: !!txData
      }
    });
  } catch (error) {
    console.error('Artifact retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve artifact' });
  }
});

// Get artifact chain verification
router.get('/:artifact_id/chain', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { artifact_id } = req.params;

    // Get artifact
    const [artifact] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.artifactId, artifact_id))
      .limit(1);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Verify user has access
    if (!req.user?.caseAccess.includes(artifact.caseId) && req.user?.role !== 'COURT_OFFICER') {
      return res.status(403).json({ error: 'No access to this artifact' });
    }

    // Get blockchain transaction
    const transaction = artifact.blockchainTxHash ? 
      await blockchainService.getTransactionByHash(artifact.blockchainTxHash) : null;

    // Get block information
    let blockInfo = null;
    if (transaction) {
      blockInfo = blockchainService.getBlockByNumber(transaction.blockNumber);
    }

    // Validate chain integrity
    const chainValid = await blockchainService.validateChain();

    res.json({
      artifactId: artifact_id,
      chain: {
        transactionHash: artifact.blockchainTxHash,
        transaction: transaction,
        block: blockInfo,
        chainValid: chainValid,
        verificationTimestamp: new Date().toISOString()
      },
      chainOfCustody: JSON.parse(artifact.chainOfCustody || '[]')
    });
  } catch (error) {
    console.error('Chain verification error:', error);
    res.status(500).json({ error: 'Failed to verify artifact chain' });
  }
});

// Verify artifact integrity
router.post('/:artifact_id/verify', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { artifact_id } = req.params;
    const { verification_notes } = req.body;

    // Get artifact
    const [artifact] = await db
      .select()
      .from(evidence)
      .where(eq(evidence.artifactId, artifact_id))
      .limit(1);

    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Verify blockchain integrity
    const chainValid = await blockchainService.validateChain();
    
    // Get transaction data
    const transaction = artifact.blockchainTxHash ? 
      await blockchainService.getTransactionByHash(artifact.blockchainTxHash) : null;

    // Update verification status
    await db
      .update(evidence)
      .set({
        verifiedAt: new Date(),
        verifiedBy: req.user!.id,
        metadata: JSON.stringify({
          ...JSON.parse(artifact.metadata || '{}'),
          verificationNotes: verification_notes,
          blockchainVerified: chainValid,
          verificationTimestamp: new Date().toISOString()
        })
      })
      .where(eq(evidence.artifactId, artifact_id));

    // Create audit log
    await db.insert(audit_logs).values({
      userId: req.user!.id,
      action: 'ARTIFACT_VERIFIED',
      resourceType: 'artifact',
      resourceId: artifact_id,
      details: JSON.stringify({
        verificationNotes: verification_notes,
        blockchainVerified: chainValid,
        transactionHash: artifact.blockchainTxHash
      }),
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown'
    });

    res.json({
      success: true,
      verification: {
        artifactId: artifact_id,
        verified: true,
        verifiedAt: new Date().toISOString(),
        verifiedBy: req.user!.registrationNumber,
        blockchainValid: chainValid,
        transactionVerified: !!transaction
      }
    });
  } catch (error) {
    console.error('Artifact verification error:', error);
    res.status(500).json({ error: 'Failed to verify artifact' });
  }
});

export default router;