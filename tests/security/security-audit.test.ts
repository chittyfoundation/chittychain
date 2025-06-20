import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createServer } from '../../server/index';
import crypto from 'crypto';

describe('Security Audit Tests', () => {
  let app: any;
  let server: any;

  beforeAll(async () => {
    // Create test server instance
    app = await createServer();
    server = app.listen(0); // Use random port
  });

  describe('Authentication Security', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/cases')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/cases')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toContain('Invalid token');
    });

    it('should enforce rate limiting on auth endpoints', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/api/v1/auth/login')
          .send({ email: 'test@test.com', password: 'wrongpassword' })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    it('should validate password strength requirements', async () => {
      const weakPasswords = ['123', 'password', 'abc123'];
      
      for (const password of weakPasswords) {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: 'test@example.com',
            password,
            registrationNumber: 'REG12345678',
            firstName: 'Test',
            lastName: 'User'
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain('password');
      }
    });
  });

  describe('Input Validation Security', () => {
    it('should prevent SQL injection in case creation', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "UNION SELECT * FROM users",
      ];

      const validToken = generateTestToken();

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .post('/api/v1/cases/create')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            caseType: payload,
            jurisdiction: 'ILLINOIS-COOK',
            petitioner: 'Test Petitioner',
            filingDate: new Date().toISOString()
          });

        // Should either be rejected with validation error or sanitized
        expect([400, 422]).toContain(response.status);
      }
    });

    it('should prevent XSS in case descriptions', async () => {
      const xssPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        'javascript:alert("xss")',
      ];

      const validToken = generateTestToken();

      for (const payload of xssPayloads) {
        const response = await request(app)
          .post('/api/v1/cases/create')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            caseType: 'CIVIL',
            jurisdiction: 'ILLINOIS-COOK',
            petitioner: 'Test Petitioner',
            description: payload,
            filingDate: new Date().toISOString()
          });

        if (response.status === 201) {
          // If accepted, ensure XSS payload is sanitized
          expect(response.body.description).not.toContain('<script>');
          expect(response.body.description).not.toContain('javascript:');
        }
      }
    });

    it('should validate file upload types and sizes', async () => {
      const validToken = generateTestToken();

      // Test oversized file
      const oversizedBuffer = Buffer.alloc(200 * 1024 * 1024); // 200MB

      const response = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', oversizedBuffer, 'large-file.txt')
        .expect(413); // Payload too large

      // Test invalid file type
      const response2 = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'malicious.exe')
        .expect(400);

      expect(response2.body.error).toContain('file type');
    });
  });

  describe('Access Control Security', () => {
    it('should enforce case access permissions', async () => {
      const user1Token = generateTestToken('user1');
      const user2Token = generateTestToken('user2');

      // User 1 creates a case
      const caseResponse = await request(app)
        .post('/api/v1/cases/create')
        .set('Authorization', `Bearer ${user1Token}`)
        .send({
          caseType: 'CIVIL',
          jurisdiction: 'ILLINOIS-COOK',
          petitioner: 'Test Petitioner',
          filingDate: new Date().toISOString()
        });

      const caseId = caseResponse.body.id;

      // User 2 tries to access User 1's case
      const accessResponse = await request(app)
        .get(`/api/v1/cases/${caseId}`)
        .set('Authorization', `Bearer ${user2Token}`)
        .expect(403);

      expect(accessResponse.body.error).toContain('access denied');
    });

    it('should validate user roles for admin endpoints', async () => {
      const userToken = generateTestToken('user', 'attorney');
      const adminToken = generateTestToken('admin', 'admin');

      // Regular user tries to access admin endpoint
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      // Admin can access
      const adminResponse = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('Cryptographic Security', () => {
    it('should generate secure random values', () => {
      const random1 = crypto.randomBytes(32);
      const random2 = crypto.randomBytes(32);
      
      // Should be different
      expect(random1.equals(random2)).toBe(false);
      
      // Should be proper length
      expect(random1.length).toBe(32);
      expect(random2.length).toBe(32);
    });

    it('should use proper hash algorithms', async () => {
      const testData = 'test data for hashing';
      const hash = crypto.createHash('sha256').update(testData).digest('hex');
      
      // SHA-256 should produce 64 character hex string
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      
      // Should be deterministic
      const hash2 = crypto.createHash('sha256').update(testData).digest('hex');
      expect(hash).toBe(hash2);
    });

    it('should validate evidence file hashes', async () => {
      const validToken = generateTestToken();
      const testFile = Buffer.from('test file content');
      const correctHash = crypto.createHash('sha256').update(testFile).digest('hex');
      const wrongHash = 'incorrect-hash';

      // Upload with correct hash should succeed
      const response1 = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .field('hash', correctHash)
        .attach('file', testFile, 'test.txt')
        .expect(200);

      // Upload with wrong hash should fail
      const response2 = await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .field('hash', wrongHash)
        .attach('file', testFile, 'test2.txt')
        .expect(400);

      expect(response2.body.error).toContain('integrity check failed');
    });
  });

  describe('Network Security', () => {
    it('should set security headers', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      // Check for security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/v1/cases')
        .set('Origin', 'http://malicious-site.com')
        .expect(403); // Should reject unauthorized origins

      const response2 = await request(app)
        .options('/api/v1/cases')
        .set('Origin', 'http://localhost:3000')
        .expect(200); // Should allow authorized origins
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in API responses', async () => {
      const validToken = generateTestToken();

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Should not expose password hash, 2FA secret, etc.
      expect(response.body).not.toHaveProperty('passwordHash');
      expect(response.body).not.toHaveProperty('twoFactorSecret');
      expect(response.body).not.toHaveProperty('apiKeyHash');
    });

    it('should sanitize error messages', async () => {
      // Attempt to trigger database error
      const response = await request(app)
        .get('/api/v1/cases/invalid-id-format-that-causes-db-error')
        .set('Authorization', `Bearer ${generateTestToken()}`)
        .expect(400);

      // Error message should not expose internal database details
      expect(response.body.error).not.toContain('ECONNREFUSED');
      expect(response.body.error).not.toContain('database');
      expect(response.body.error).not.toContain('postgresql');
    });
  });

  describe('Audit Trail Security', () => {
    it('should log all security-relevant events', async () => {
      const validToken = generateTestToken();

      // Perform actions that should be logged
      await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@test.com', password: 'password' });

      await request(app)
        .post('/api/v1/evidence/upload')
        .set('Authorization', `Bearer ${validToken}`)
        .attach('file', Buffer.from('test'), 'test.txt');

      // Check that audit logs were created
      const logsResponse = await request(app)
        .get('/api/v1/admin/audit-logs')
        .set('Authorization', `Bearer ${generateTestToken('admin', 'admin')}`)
        .expect(200);

      expect(logsResponse.body.logs.length).toBeGreaterThan(0);
      
      const loginLog = logsResponse.body.logs.find((log: any) => log.action === 'LOGIN_ATTEMPT');
      const uploadLog = logsResponse.body.logs.find((log: any) => log.action === 'FILE_UPLOADED');
      
      expect(loginLog).toBeDefined();
      expect(uploadLog).toBeDefined();
    });
  });
});

// Helper function to generate test JWT tokens
function generateTestToken(userId = 'test-user', role = 'attorney') {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { 
      userId, 
      email: `${userId}@test.com`, 
      role,
      registrationNumber: `REG${Math.random().toString().slice(2, 10)}`
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
}