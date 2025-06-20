import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { ValidationError } from './errorHandler.js';
import { env } from '../config/environment.js';

// Common validation schemas
export const schemas = {
  // User registration
  userRegistration: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
    firstName: z.string().min(1, 'First name is required').max(50),
    lastName: z.string().min(1, 'Last name is required').max(50),
    registrationNumber: z.string().regex(/^REG[0-9]{8}$/, 'Invalid registration number format'),
    barNumber: z.string().regex(/^BAR[0-9]{6}$/, 'Invalid bar number format').optional(),
    role: z.enum(['PARTY_PETITIONER', 'PARTY_RESPONDENT', 'ATTORNEY', 'COURT_OFFICER', 'JUDGE']),
  }),

  // User login
  userLogin: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
    twoFactorToken: z.string().length(6, '2FA token must be 6 digits').optional(),
  }),

  // Case creation
  caseCreation: z.object({
    caseNumber: z.string().regex(/^[0-9]{4}-[A-Z]-[0-9]{6}$/, 'Invalid case number format'),
    caseType: z.enum(['CIVIL', 'CRIMINAL', 'FAMILY', 'PROBATE', 'TRAFFIC']),
    jurisdiction: z.string().regex(/^[A-Z]+-[A-Z]+$/, 'Invalid jurisdiction format'),
    petitioner: z.string().regex(/^REG[0-9]{8}$/, 'Invalid petitioner registration number'),
    respondent: z.string().regex(/^REG[0-9]{8}$/, 'Invalid respondent registration number').optional(),
    judge: z.string().max(100).optional(),
    filingDate: z.string().datetime('Invalid filing date format'),
    metadata: z.record(z.any()).optional(),
  }),

  // Evidence submission
  evidenceSubmission: z.object({
    caseId: z.string().min(1, 'Case ID is required'),
    evidenceType: z.enum(['DOCUMENT', 'PHOTO', 'VIDEO', 'AUDIO', 'DIGITAL', 'PHYSICAL']),
    description: z.string().min(1, 'Description is required').max(1000),
    metadata: z.record(z.any()).optional(),
  }),

  // Artifact binding
  artifactBinding: z.object({
    caseId: z.string().min(1, 'Case ID is required'),
    artifactType: z.enum(['EVIDENCE', 'FILING', 'CORRESPONDENCE', 'ORDER']),
    hash: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid hash format'),
    metadata: z.record(z.any()).optional(),
  }),

  // ID parameters
  caseId: z.object({
    case_id: z.string().min(1, 'Case ID is required'),
  }),

  artifactId: z.object({
    artifact_id: z.string().min(1, 'Artifact ID is required'),
  }),

  blockId: z.object({
    block_id: z.string().regex(/^[0-9]+$/, 'Block ID must be a number'),
  }),

  // Query parameters
  pagination: z.object({
    page: z.string().regex(/^[0-9]+$/).transform(Number).optional().default('1'),
    limit: z.string().regex(/^[0-9]+$/).transform(Number).optional().default('10'),
  }),

  timeRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// Validation middleware factory
export const validate = (schema: z.ZodSchema, target: 'body' | 'params' | 'query' = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      (req as any)[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));
        
        throw new ValidationError('Validation failed', details);
      }
      throw error;
    }
  };
};

// Sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  const sanitizeString = (str: string): string => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .trim();
  };

  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitize request body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query parameters
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

// File upload validation
export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file && !req.files) {
    next();
    return;
  }

  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/avi',
    'audio/mpeg',
    'audio/wav',
  ];

  const maxFileSize = env.MAX_FILE_SIZE; // 100MB default

  const validateFile = (file: Express.Multer.File) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new ValidationError(`File type ${file.mimetype} is not allowed`);
    }
    
    if (file.size > maxFileSize) {
      throw new ValidationError(`File size ${file.size} exceeds maximum allowed size of ${maxFileSize} bytes`);
    }
  };

  try {
    if (req.file) {
      validateFile(req.file);
    }
    
    if (req.files) {
      const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
      files.forEach(validateFile);
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Rate limiting configurations
export const rateLimiters = {
  // General API rate limit
  api: rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW,
    max: env.RATE_LIMIT_MAX,
    message: {
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Rate limit for evidence submission
  evidence: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 evidence submissions per hour
    message: {
      error: {
        code: 'EVIDENCE_RATE_LIMIT_EXCEEDED',
        message: 'Too many evidence submissions, please try again later',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),

  // Rate limit for case creation
  caseCreation: rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: 10, // 10 cases per day per user
    message: {
      error: {
        code: 'CASE_CREATION_RATE_LIMIT_EXCEEDED',
        message: 'Too many cases created today, please try again tomorrow',
      },
    },
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

// Cook County specific validation
export const validateCookCountyCompliance = (req: Request, res: Response, next: NextFunction) => {
  const { jurisdiction, caseNumber } = req.body;
  
  if (jurisdiction && !jurisdiction.startsWith('ILLINOIS-COOK')) {
    throw new ValidationError('This system is configured for Cook County, Illinois jurisdiction only');
  }
  
  if (caseNumber) {
    const year = caseNumber.split('-')[0];
    const currentYear = new Date().getFullYear();
    
    if (parseInt(year) > currentYear || parseInt(year) < currentYear - 10) {
      throw new ValidationError('Case year must be within the last 10 years');
    }
  }
  
  next();
};

// Legal document validation
export const validateLegalDocument = (req: Request, res: Response, next: NextFunction) => {
  if (req.file) {
    const file = req.file;
    
    // Check if it's a PDF for legal documents
    if (file.fieldname === 'legalDocument' && file.mimetype !== 'application/pdf') {
      throw new ValidationError('Legal documents must be in PDF format');
    }
    
    // Check file size for legal documents (max 50MB)
    if (file.fieldname === 'legalDocument' && file.size > 50 * 1024 * 1024) {
      throw new ValidationError('Legal documents must be under 50MB');
    }
  }
  
  next();
};