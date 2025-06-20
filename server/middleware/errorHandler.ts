import { Request, Response, NextFunction } from 'express';
import { env } from '../config/environment.js';
import { storage } from '../storage.js';

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export class CustomError extends Error implements ApiError {
  statusCode: number;
  code: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.name = 'CustomError';
    this.statusCode = statusCode;
    this.code = code || 'INTERNAL_ERROR';
    this.details = details;
  }
}

export class ValidationError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends CustomError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends CustomError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends CustomError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends CustomError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

export class BlockchainError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 500, 'BLOCKCHAIN_ERROR', details);
    this.name = 'BlockchainError';
  }
}

export class LegalComplianceError extends CustomError {
  constructor(message: string, details?: any) {
    super(message, 422, 'LEGAL_COMPLIANCE_ERROR', details);
    this.name = 'LegalComplianceError';
  }
}

// Request ID middleware for tracing
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = crypto.randomUUID();
  req.headers['x-request-id'] = id;
  res.setHeader('X-Request-ID', id);
  next();
};

// Logger
export const logger = {
  info: (message: string, meta?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  warn: (message: string, meta?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error?: any, meta?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error('Error details:', error);
    }
    if (meta) {
      console.error('Meta:', JSON.stringify(meta));
    }
  },
  debug: (message: string, meta?: any) => {
    if (env.LOG_LEVEL === 'debug') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
};

// Request logging middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const requestId = req.headers['x-request-id'];
  
  logger.info(`${req.method} ${req.path}`, {
    requestId,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length'),
  });

  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[level](`${req.method} ${req.path} - ${res.statusCode}`, {
      requestId,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
    });
  });

  next();
};

// Audit logging for sensitive operations
export const auditLog = async (
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  req: Request,
  details?: any
) => {
  try {
    await storage.createAuditLog({
      userId,
      action,
      resourceType,
      resourceId,
      details: details || {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent') || 'unknown',
    });
    
    logger.info(`Audit: ${action}`, {
      userId,
      resourceType,
      resourceId,
      ip: req.ip,
    });
  } catch (error) {
    logger.error('Failed to create audit log', error, {
      userId,
      action,
      resourceType,
      resourceId,
    });
  }
};

// Main error handler middleware
export const errorHandler = (
  error: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const requestId = req.headers['x-request-id'];
  
  // Log the error
  logger.error(`Error in ${req.method} ${req.path}`, error, {
    requestId,
    stack: error.stack,
    userId: (req as any).user?.id,
  });

  // Determine status code
  let statusCode = error.statusCode || 500;
  let code = error.code || 'INTERNAL_ERROR';
  let message = error.message || 'Internal server error';

  // Handle specific error types
  if (error.name === 'ValidationError' || error.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    code = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  } else if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    code = 'TOKEN_EXPIRED';
    message = 'Authentication token expired';
  } else if (error.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = 'Invalid resource ID format';
  }

  // Prepare error response
  const errorResponse: any = {
    error: {
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  // Add details in development
  if (env.NODE_ENV === 'development') {
    errorResponse.error.stack = error.stack;
    if (error.details) {
      errorResponse.error.details = error.details;
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response) => {
  const requestId = req.headers['x-request-id'];
  
  logger.warn(`404 - Route not found: ${req.method} ${req.path}`, {
    requestId,
    ip: req.ip,
  });

  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId,
      timestamp: new Date().toISOString(),
    },
  });
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response) => {
  try {
    // Check database connectivity
    const dbHealthy = await storage.getAllUsers().then(() => true).catch(() => false);
    
    // Check system resources
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const health = {
      status: dbHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime)}s`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      },
      services: {
        database: dbHealthy ? 'up' : 'down',
        blockchain: 'up', // TODO: Add blockchain health check
      },
    };

    res.status(dbHealthy ? 200 : 503).json(health);
  } catch (error) {
    logger.error('Health check failed', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
    });
  }
};