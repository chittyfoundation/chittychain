import { Router } from 'express';
import qrcode from 'qrcode';
import { db } from '../storage';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import {
  generateToken,
  hashPassword,
  verifyPassword,
  generate2FASecret,
  verify2FAToken,
  validateRegistrationNumber,
  authenticateToken,
  AuthRequest
} from '../middleware/auth';
import claudeCodeRoutes from './auth/claudeCode';

const router = Router();

// Mount Claude Code authentication routes
router.use('/claude', claudeCodeRoutes);

// User registration with 2FA setup
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      registrationNumber, 
      barNumber, 
      firstName, 
      lastName,
      role 
    } = req.body;

    // Validate registration number format
    if (!validateRegistrationNumber(registrationNumber)) {
      return res.status(400).json({ error: 'Invalid registration number format (REG########)' });
    }

    // Check if user already exists
    const existingUser = await db.getUserByUsername(email);

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Generate 2FA secret
    const twoFASecret = generate2FASecret(registrationNumber);
    
    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await db.createUser({
      email,
      passwordHash: hashedPassword,
      registrationNumber,
      barNumber,
      firstName,
      lastName,
      role: role || 'PARTY_RESPONDENT',
      twoFactorSecret: twoFASecret.base32,
      isActive: false // Requires 2FA verification to activate
    });

    // Generate QR code for 2FA setup
    const qrCodeUrl = await qrcode.toDataURL(twoFASecret.otpauth_url!);

    res.status(201).json({
      message: 'Registration successful. Please set up 2FA to activate account.',
      userId: newUser.id,
      qrCode: qrCodeUrl,
      secret: twoFASecret.base32 // In production, don't send this
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Verify 2FA and activate account
router.post('/verify-2fa', async (req, res) => {
  try {
    const { userId, token } = req.body;

    const user = await db.getUser(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not set up for this user' });
    }

    const isValid = verify2FAToken(user.twoFactorSecret, token);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Activate user account
    await db.updateUser(userId, { isActive: true });

    res.json({ message: '2FA verified successfully. Account activated.' });
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: '2FA verification failed' });
  }
});

// Login with password and 2FA
router.post('/login', async (req, res) => {
  try {
    const { email, password, twoFactorToken } = req.body;

    const user = await db.getUserByUsername(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: 'Account not activated. Please complete 2FA setup.' });
    }

    // Verify 2FA token
    if (!user.twoFactorSecret || !verify2FAToken(user.twoFactorSecret, twoFactorToken)) {
      return res.status(401).json({ error: 'Invalid 2FA token' });
    }

    // Generate JWT
    const token = generateToken({
      id: user.id,
      registrationNumber: user.registrationNumber,
      role: user.role,
      caseAccess: [] // TODO: Load from case_parties table
    });

    // Update last login
    await db.updateUser(user.id, { lastLogin: new Date() });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        registrationNumber: user.registrationNumber,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify party access to case
router.post('/verify-party', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { caseId, partyRegistrationNumber } = req.body;

    // TODO: Implement case party verification logic
    // This would check if the party is associated with the case

    res.json({
      verified: true,
      caseId,
      partyRegistrationNumber,
      role: 'PARTY_RESPONDENT'
    });
  } catch (error) {
    console.error('Party verification error:', error);
    res.status(500).json({ error: 'Party verification failed' });
  }
});

// Get user permissions for a case
router.get('/permissions/:user_id/:case_id', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { user_id, case_id } = req.params;

    // TODO: Implement permission checking logic
    // This would check the user's role and case association

    res.json({
      userId: user_id,
      caseId: case_id,
      permissions: {
        canView: true,
        canSubmitEvidence: true,
        canEditCase: false,
        canDeleteEvidence: false,
        canApproveEvidence: false
      }
    });
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  }
});

// Create audit trail entry
router.post('/audit-trail', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const { action, resourceType, resourceId, details } = req.body;

    // TODO: Implement audit trail creation
    // This would create an entry in the audit_logs table

    res.json({
      auditId: 'AUDIT-' + Date.now(),
      userId: req.user?.id,
      action,
      resourceType,
      resourceId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Audit trail error:', error);
    res.status(500).json({ error: 'Failed to create audit trail' });
  }
});

export default router;