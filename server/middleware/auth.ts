import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'chittychain-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

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
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
};

export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
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

    const decoded = jwt.verify(token, JWT_SECRET) as any;
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
  const caseId = req.params.case_id || req.body.caseId;
  
  if (!caseId) {
    res.status(400).json({ error: 'Case ID required' });
    return;
  }

  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.user.caseAccess.includes(caseId) && req.user.role !== 'COURT_OFFICER') {
    res.status(403).json({ error: 'No access to this case' });
    return;
  }

  next();
};

export const validateRegistrationNumber = (regNumber: string): boolean => {
  return /^REG[0-9]{8}$/.test(regNumber);
};

export const validateBarNumber = (barNumber: string): boolean => {
  return /^BAR[0-9]{6}$/.test(barNumber);
};