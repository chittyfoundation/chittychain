import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server/index';
import crypto from 'crypto';

describe('Evidence Submission and Verification Flow', () => {
  let app: any;
  let server: any;
  let userToken: string;
  let caseId: string;

  beforeAll(async () => {
    app = await createServer();
    server = app.listen(0);
    
    // Create test user and get token
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'evidencetest@chittychain.com',
        password: 'SecurePassword123!',
        registrationNumber: 'REG87654321',
        barNumber: 'BAR123456',
        firstName: 'Evidence',
        lastName: 'Tester',
        role: 'attorney'
      });

    userToken = registerResponse.body.token || generateTestToken();
  });

  beforeEach(async () => {
    // Create a fresh case for each test
    const caseResponse = await request(app)
      .post('/api/v1/cases/create')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        caseType: 'CIVIL',
        jurisdiction: 'ILLINOIS-COOK',
        petitioner: 'Test Petitioner',
        respondent: 'Test Respondent',
        filingDate: new Date().toISOString(),
        description: 'Test case for evidence flow testing'
      });

    caseId = caseResponse.body.id;
  });

  describe('Evidence Upload Process', () => {
    it('should successfully upload and bind evidence to blockchain', async () => {
      const testFile = Buffer.from('This is a test legal document with important evidence.');
      const fileHash = crypto.createHash('sha256').update(testFile).digest('hex');

      // Step 1: Upload file to IPFS
      const uploadResponse = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .field('hash', fileHash)
        .attach('file', testFile, 'evidence-document.pdf')
        .expect(200);

      expect(uploadResponse.body).toMatchObject({
        success: true,
        filename: 'evidence-document.pdf',
        fileHash,
        ipfsHash: expect.any(String),
        size: expect.any(Number)
      });

      const ipfsHash = uploadResponse.body.ipfsHash;

      // Step 2: Bind evidence to case and blockchain
      const bindResponse = await request(app)
        .post('/api/v1/artifacts/bind')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          case_id: caseId,
          evidence_type: 'document',
          description: 'Critical evidence document',
          file_hash: fileHash,
          ipfs_hash: ipfsHash,
          metadata: {
            filename: 'evidence-document.pdf',
            fileSize: testFile.length,
            mimeType: 'application/pdf'
          }
        })
        .expect(201);

      expect(bindResponse.body).toMatchObject({
        artifact_id: expect.stringMatching(/^ART-[a-f0-9]{12}$/),
        case_binding: expect.stringContaining(caseId),
        blockchain_tx_hash: expect.any(String),
        ipfs_hash: ipfsHash,
        verification_status: 'verified'
      });

      const artifactId = bindResponse.body.artifact_id;

      // Step 3: Verify evidence chain
      const verifyResponse = await request(app)
        .get(`/api/v1/chain/verify/${artifactId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        artifact_id: artifactId,
        chain_valid: true,
        integrity_verified: true,
        blockchain_confirmed: true
      });
    });

    it('should detect file tampering during verification', async () => {
      const originalFile = Buffer.from('Original legal document content.');
      const tamperedFile = Buffer.from('Tampered legal document content!');
      
      const originalHash = crypto.createHash('sha256').update(originalFile).digest('hex');

      // Upload original file
      const uploadResponse = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .field('hash', originalHash)
        .attach('file', originalFile, 'legal-doc.pdf')
        .expect(200);

      // Bind to blockchain
      const bindResponse = await request(app)
        .post('/api/v1/artifacts/bind')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          case_id: caseId,
          evidence_type: 'document',
          description: 'Legal document for tampering test',
          file_hash: originalHash,
          ipfs_hash: uploadResponse.body.ipfsHash
        })
        .expect(201);

      const artifactId = bindResponse.body.artifact_id;

      // Attempt verification with tampered file
      const verifyResponse = await request(app)
        .post(`/api/v1/evidence/${artifactId}/verify`)
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', tamperedFile, 'legal-doc.pdf')
        .expect(200);

      expect(verifyResponse.body).toMatchObject({
        artifactId,
        integrityValid: false,
        originalHash,
        forensicReport: expect.objectContaining({
          tamperingDetected: true,
          hashMismatch: true
        })
      });
    });
  });

  describe('Evidence Chain of Custody', () => {
    it('should maintain complete chain of custody records', async () => {
      const testFile = Buffer.from('Chain of custody test document');
      const fileHash = crypto.createHash('sha256').update(testFile).digest('hex');

      // Upload and bind evidence
      const uploadResponse = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .field('hash', fileHash)
        .attach('file', testFile, 'custody-test.pdf');

      const bindResponse = await request(app)
        .post('/api/v1/artifacts/bind')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          case_id: caseId,
          evidence_type: 'document',
          description: 'Chain of custody test',
          file_hash: fileHash,
          ipfs_hash: uploadResponse.body.ipfsHash
        });

      const artifactId = bindResponse.body.artifact_id;

      // Validate evidence (simulating legal review)
      await request(app)
        .post('/api/v1/evidence/validate')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          evidenceId: bindResponse.body.evidence_id,
          validationNotes: 'Evidence reviewed and approved by legal team'
        })
        .expect(200);

      // Get chain of custody
      const custodyResponse = await request(app)
        .get(`/api/v1/artifacts/${artifactId}/chain`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(custodyResponse.body.chainOfCustody).toHaveLength(3);
      expect(custodyResponse.body.chainOfCustody).toEqual([
        expect.objectContaining({
          action: 'Evidence Uploaded',
          timestamp: expect.any(String),
          user: expect.any(String)
        }),
        expect.objectContaining({
          action: 'Evidence Bound to Case',
          timestamp: expect.any(String),
          user: expect.any(String)
        }),
        expect.objectContaining({
          action: 'Evidence Validated',
          timestamp: expect.any(String),
          user: expect.any(String)
        })
      ]);
    });
  });

  describe('Batch Evidence Processing', () => {
    it('should handle multiple evidence files in one submission', async () => {
      const files = [
        { content: 'Document 1 content', name: 'doc1.pdf' },
        { content: 'Document 2 content', name: 'doc2.pdf' },
        { content: 'Image evidence data', name: 'photo1.jpg' }
      ];

      const request_builder = request(app)
        .post('/api/v1/evidence/batch')
        .set('Authorization', `Bearer ${userToken}`)
        .field('caseId', caseId)
        .field('documentType', 'batch_evidence')
        .field('description', 'Batch evidence submission test');

      // Attach all files
      files.forEach((file, index) => {
        const buffer = Buffer.from(file.content);
        request_builder.attach('files', buffer, file.name);
      });

      const response = await request_builder.expect(200);

      expect(response.body).toMatchObject({
        success: true,
        totalFiles: 3,
        successfulUploads: 3,
        results: expect.arrayContaining([
          expect.objectContaining({
            filename: 'doc1.pdf',
            evidenceId: expect.any(String),
            artifactId: expect.stringMatching(/^ART-[a-f0-9]{12}$/),
            hash: expect.any(String),
            txHash: expect.any(String)
          })
        ])
      });
    });
  });

  describe('Evidence Timeline and Audit', () => {
    it('should provide complete timeline of case evidence', async () => {
      // Submit multiple pieces of evidence over time
      for (let i = 1; i <= 3; i++) {
        const testFile = Buffer.from(`Evidence document ${i} content`);
        
        const uploadResponse = await request(app)
          .post('/api/v1/evidence/upload')
          .set('Authorization', `Bearer ${userToken}`)
          .attach('file', testFile, `evidence-${i}.pdf`);

        await request(app)
          .post('/api/v1/artifacts/bind')
          .set('Authorization', `Bearer ${userToken}`)
          .send({
            case_id: caseId,
            evidence_type: 'document',
            description: `Evidence document ${i}`,
            file_hash: crypto.createHash('sha256').update(testFile).digest('hex'),
            ipfs_hash: uploadResponse.body.ipfsHash
          });

        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Get evidence timeline
      const timelineResponse = await request(app)
        .get(`/api/v1/evidence/${caseId}/timeline`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(timelineResponse.body).toMatchObject({
        caseId,
        totalEvidence: 3,
        timeline: expect.arrayContaining([
          expect.objectContaining({
            artifactId: expect.stringMatching(/^ART-[a-f0-9]{12}$/),
            type: 'document',
            description: expect.stringContaining('Evidence document'),
            submittedAt: expect.any(String),
            status: expect.any(String),
            blockchainTxHash: expect.any(String)
          })
        ])
      });

      // Timeline should be ordered by submission time (newest first)
      const timestamps = timelineResponse.body.timeline.map((item: any) => 
        new Date(item.submittedAt).getTime()
      );
      
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i - 1]);
      }
    });
  });

  describe('Evidence Download and Access Control', () => {
    it('should allow authorized download of evidence files', async () => {
      const testContent = 'Confidential legal document content for download test';
      const testFile = Buffer.from(testContent);
      
      const uploadResponse = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testFile, 'confidential.pdf');

      const ipfsHash = uploadResponse.body.ipfsHash;

      // Download file
      const downloadResponse = await request(app)
        .get(`/api/v1/evidence/download/${ipfsHash}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(downloadResponse.body.toString()).toBe(testContent);
      expect(downloadResponse.headers['content-type']).toContain('application');
      expect(downloadResponse.headers['content-disposition']).toContain('attachment');
    });

    it('should prevent unauthorized access to evidence files', async () => {
      const testFile = Buffer.from('Confidential document');
      
      const uploadResponse = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${userToken}`)
        .attach('file', testFile, 'confidential.pdf');

      const ipfsHash = uploadResponse.body.ipfsHash;

      // Try to download without authentication
      await request(app)
        .get(`/api/v1/evidence/download/${ipfsHash}`)
        .expect(401);

      // Try to download with different user's token
      const otherUserToken = generateTestToken('other-user');
      await request(app)
        .get(`/api/v1/evidence/download/${ipfsHash}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(404); // Should not find evidence they don't have access to
    });
  });
});

function generateTestToken(userId = 'test-user') {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId, 
      email: `${userId}@test.com`, 
      role: 'attorney',
      registrationNumber: `REG${Math.random().toString().slice(2, 10)}`
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}