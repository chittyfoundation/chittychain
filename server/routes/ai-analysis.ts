import { Router, Request, Response } from 'express';
import { AIAnalysisService, ContentAnalysisRequest } from '../services/AIAnalysisService.js';
import { EvidenceService, EvidenceRecord } from '../services/EvidenceService.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { z } from 'zod';

// Helper function to convert EvidenceRecord to EvidenceItem for AI analysis
function convertToEvidenceItem(record: EvidenceRecord): import('../services/AIAnalysisService.js').EvidenceItem {
  return {
    ...record,
    evidenceId: record.id,
    contentType: record.metadata?.mimeType?.startsWith('image/') ? 'image' : 
                record.metadata?.mimeType?.startsWith('video/') ? 'video' :
                record.metadata?.mimeType?.startsWith('audio/') ? 'audio' : 'document',
    description: record.documentType,
    priority: 'medium' as const,
    timestamp: record.createdAt,
  };
}

const router = Router();
const aiAnalysisService = new AIAnalysisService(
  process.env.ANTHROPIC_API_KEY,
  process.env.OPENAI_API_KEY
);
const evidenceService = new EvidenceService();

// Request schemas
const analyzeEvidenceSchema = z.object({
  evidenceId: z.string(),
  analysisDepth: z.enum(['basic', 'standard', 'comprehensive', 'forensic']).default('standard'),
  focusAreas: z.array(z.string()).optional(),
  legalContext: z.object({
    caseType: z.string(),
    jurisdiction: z.string(),
    applicableLaws: z.array(z.string()).optional(),
  }).optional(),
});

const detectPatternsSchema = z.object({
  evidenceIds: z.array(z.string()),
  patternTypes: z.array(z.enum(['temporal', 'spatial', 'behavioral', 'content'])).default(['temporal', 'content']),
  caseId: z.string().optional(),
});

const generateTimelineSchema = z.object({
  evidenceIds: z.array(z.string()),
  caseId: z.string().optional(),
  includeInferred: z.boolean().default(true),
});

const crossReferenceSchema = z.object({
  evidenceIds: z.array(z.string()),
  analysisDepth: z.enum(['basic', 'comprehensive']).default('basic'),
});

/**
 * POST /api/v1/ai-analysis/evidence/:evidenceId
 * Analyze a single piece of evidence using AI
 */
router.post('/evidence/:evidenceId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { evidenceId } = req.params;
    const validatedData = analyzeEvidenceSchema.parse(req.body);

    // Mock evidence retrieval - in real implementation would query database
    const mockEvidence: EvidenceRecord = {
      id: evidenceId,
      hash: 'sample_hash',
      caseId: 'case_123',
      documentType: 'legal-document',
      ipfsHash: 'QmX8r9vQ2K3nP7L5tF4gH9wE6sA1mC2bD3eF8gH9wE6sA1m',
      submittedBy: req.user?.id || 'unknown',
      chainOfCustody: [],
      metadata: { mimeType: 'application/pdf' },
      createdAt: new Date(),
      retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000,
    };

    // Convert to EvidenceItem for AI analysis
    const evidence = convertToEvidenceItem(mockEvidence);

    // Check user has access to this evidence
    if (evidence.submittedBy !== req.user?.id && req.user?.role !== 'admin') {
      return res.status(403).json({
        error: 'Access denied to evidence item',
      });
    }

    // Create analysis request
    const analysisRequest: ContentAnalysisRequest = {
      evidenceId,
      contentType: evidence.contentType,
      analysisDepth: validatedData.analysisDepth,
      focusAreas: validatedData.focusAreas,
      legalContext: validatedData.legalContext ? {
        ...validatedData.legalContext,
        applicableLaws: validatedData.legalContext.applicableLaws || []
      } : undefined,
    };

    // Perform AI analysis
    const analysis = await aiAnalysisService.analyzeEvidence(evidence, analysisRequest);

    res.json({
      success: true,
      analysis,
      message: 'Evidence analysis completed successfully',
    });

  } catch (error) {
    console.error('Evidence analysis error:', error);
    res.status(500).json({
      error: 'Evidence analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ai-analysis/patterns
 * Detect patterns across multiple evidence items
 */
router.post('/patterns', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = detectPatternsSchema.parse(req.body);

    // Mock evidence retrieval - convert IDs to mock evidence items
    const evidenceItems = validatedData.evidenceIds.map(evidenceId => {
      const mockRecord: EvidenceRecord = {
        id: evidenceId,
        hash: `hash_${evidenceId}`,
        caseId: 'case_123',
        documentType: 'legal-document',
        ipfsHash: `QmHash${evidenceId}`,
        submittedBy: req.user?.id || 'unknown',
        chainOfCustody: [],
        metadata: { mimeType: 'application/pdf' },
        createdAt: new Date(),
        retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000,
      };
      return convertToEvidenceItem(mockRecord);
    });

    if (evidenceItems.length === 0) {
      return res.status(404).json({
        error: 'No accessible evidence items found',
      });
    }

    // Detect patterns
    const patterns = await aiAnalysisService.detectPatterns(evidenceItems, validatedData.patternTypes);

    res.json({
      success: true,
      patterns,
      evidenceCount: evidenceItems.length,
      message: `Found ${patterns.length} patterns across ${evidenceItems.length} evidence items`,
    });

  } catch (error) {
    console.error('Pattern detection error:', error);
    res.status(500).json({
      error: 'Pattern detection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ai-analysis/timeline
 * Generate AI-powered timeline from evidence
 */
router.post('/timeline', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = generateTimelineSchema.parse(req.body);

    // Mock evidence retrieval
    const evidenceItems = validatedData.evidenceIds.map(evidenceId => {
      const mockRecord: EvidenceRecord = {
        id: evidenceId,
        hash: `hash_${evidenceId}`,
        caseId: 'case_123',
        documentType: 'legal-document',
        ipfsHash: `QmHash${evidenceId}`,
        submittedBy: req.user?.id || 'unknown',
        chainOfCustody: [],
        metadata: { mimeType: 'application/pdf' },
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random dates in last 30 days
        retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000,
      };
      return convertToEvidenceItem(mockRecord);
    });

    if (evidenceItems.length === 0) {
      return res.status(404).json({
        error: 'No accessible evidence items found',
      });
    }

    // Generate timeline
    const timeline = await aiAnalysisService.generateTimeline(evidenceItems);

    res.json({
      success: true,
      timeline,
      evidenceCount: evidenceItems.length,
      timelineEvents: timeline.length,
      timeRange: {
        start: timeline[0]?.timestamp,
        end: timeline[timeline.length - 1]?.timestamp,
      },
      message: 'Evidence timeline generated successfully',
    });

  } catch (error) {
    console.error('Timeline generation error:', error);
    res.status(500).json({
      error: 'Timeline generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/v1/ai-analysis/cross-reference
 * Cross-reference evidence items for relationships and anomalies
 */
router.post('/cross-reference', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const validatedData = crossReferenceSchema.parse(req.body);

    // Mock evidence retrieval
    const evidenceItems = validatedData.evidenceIds.map(evidenceId => {
      const mockRecord: EvidenceRecord = {
        id: evidenceId,
        hash: `hash_${evidenceId}`,
        caseId: 'case_123',
        documentType: 'legal-document',
        ipfsHash: `QmHash${evidenceId}`,
        submittedBy: req.user?.id || 'unknown',
        chainOfCustody: [],
        metadata: { mimeType: 'application/pdf' },
        createdAt: new Date(),
        retentionPeriod: 7 * 365 * 24 * 60 * 60 * 1000,
      };
      return convertToEvidenceItem(mockRecord);
    });

    if (evidenceItems.length < 2) {
      return res.status(400).json({
        error: 'At least 2 evidence items required for cross-reference analysis',
      });
    }

    // Perform cross-reference analysis
    const crossReference = await aiAnalysisService.crossReferenceEvidence(evidenceItems);

    res.json({
      success: true,
      crossReference,
      evidenceCount: evidenceItems.length,
      relationshipsFound: crossReference.relationships.length,
      clustersFound: crossReference.clusters.length,
      anomaliesFound: crossReference.anomalies.length,
      message: 'Cross-reference analysis completed successfully',
    });

  } catch (error) {
    console.error('Cross-reference analysis error:', error);
    res.status(500).json({
      error: 'Cross-reference analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/ai-analysis/analysis/:analysisId
 * Get a specific analysis result
 */
router.get('/analysis/:analysisId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const { analysisId } = req.params;

    // In a real implementation, this would fetch from database
    // For now, return mock data indicating the analysis is cached
    
    res.json({
      success: true,
      analysis: {
        analysisId,
        status: 'completed',
        cached: true,
        message: 'Analysis retrieved from cache',
      },
    });

  } catch (error) {
    console.error('Analysis retrieval error:', error);
    res.status(500).json({
      error: 'Analysis retrieval failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/v1/ai-analysis/capabilities
 * Get AI analysis capabilities and model information
 */
router.get('/capabilities', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const capabilities = {
      models: {
        text: {
          primary: 'claude-sonnet-4-20250514',
          backup: 'gpt-4o',
          capabilities: [
            'Entity extraction',
            'Content classification',
            'Sentiment analysis',
            'Legal relevance assessment',
            'Pattern recognition',
          ],
        },
        image: {
          primary: 'claude-sonnet-4-20250514',
          backup: 'gpt-4o',
          capabilities: [
            'Object detection',
            'Scene analysis',
            'Metadata examination',
            'Anomaly detection',
            'Forensic analysis',
          ],
        },
        audio: {
          primary: 'whisper-1',
          capabilities: [
            'Speech transcription',
            'Speaker identification',
            'Audio quality assessment',
            'Background noise analysis',
          ],
        },
      },
      analysisTypes: [
        'content',
        'pattern',
        'timeline',
        'metadata',
        'forensic',
      ],
      patternTypes: [
        'temporal',
        'spatial',
        'behavioral',
        'content',
      ],
      legalFeatures: [
        'Admissibility assessment',
        'Chain of custody verification',
        'Authenticity validation',
        'Privilege detection',
        'Relevance scoring',
      ],
      maxEvidenceItems: 1000,
      supportedFormats: [
        'text/plain',
        'application/pdf',
        'image/jpeg',
        'image/png',
        'video/mp4',
        'audio/mp3',
        'audio/wav',
      ],
      apiKeysConfigured: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
      },
    };

    res.json({
      success: true,
      capabilities,
      message: 'AI analysis capabilities retrieved successfully',
    });

  } catch (error) {
    console.error('Capabilities retrieval error:', error);
    res.status(500).json({
      error: 'Capabilities retrieval failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export { router as aiAnalysisRouter };