import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { Request, Response, NextFunction } from 'express';
import { env, jwtConfig } from '../config/environment.js';
import { storage } from '../storage.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    registrationNumber: string;
    role: string;
    caseAccess: string[];
  };
}

export const generateToken = (user: any): string => {
  return jwt.sign(
    {
      id: user.id,
      registrationNumber: user.registrationNumber,
      role: user.role,
      caseAccess: user.caseAccess || []
    },
    jwtConfig.secret,
    { expiresIn: jwtConfig.expiresIn }
  );
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, env.HASH_SALT_ROUNDS);
};

export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export const generate2FASecret = (registrationNumber: string): speakeasy.GeneratedSecret => {
  return speakeasy.generateSecret({
    name: `ChittyChain (${registrationNumber})`,
    length: 32
  });
};

export const verify2FAToken = (secret: string, token: string): boolean => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2
  });
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'Access token required' });
      return;
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireCaseAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const caseId = req.params.case_id || req.body.caseId;
    
    if (!caseId) {
      res.status(400).json({ error: 'Case ID required' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Court officers have access to all cases
    if (req.user.role === 'COURT_OFFICER' || req.user.role === 'JUDGE') {
      next();
      return;
    }

    // Check if user has access to this specific case
    const legalCase = await storage.getCase(caseId);
    if (!legalCase) {
      res.status(404).json({ error: 'Case not found' });
      return;
    }

    // Check if user is a party to the case or their attorney
    const user = await storage.getUser(parseInt(req.user.id));
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const hasAccess = 
      legalCase.petitioner === user.registrationNumber ||
      legalCase.respondent === user.registrationNumber ||
      legalCase.createdBy === user.registrationNumber ||
      req.user.caseAccess.includes(caseId);

    if (!hasAccess) {
      // Log access attempt for audit
      await storage.createAuditLog({
        userId: req.user.id,
        action: 'UNAUTHORIZED_CASE_ACCESS_ATTEMPT',
        resourceType: 'CASE',
        resourceId: caseId,
        details: { userRole: req.user.role, registrationNumber: req.user.registrationNumber },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || 'unknown',
      });
      
      res.status(403).json({ error: 'No access to this case' });
      return;
    }

    next();
  } catch (error) {
    console.error('Case access verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const validateRegistrationNumber = (regNumber: string): boolean => {
  return /^REG[0-9]{8}$/.test(regNumber);
};

export const validateBarNumber = (barNumber: string): boolean => {
  return /^BAR[0-9]{6}$/.test(barNumber);
};