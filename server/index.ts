import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { registerRoutes } from './routes';

// Import API routes
import authRoutes from './routes/auth';
import evidenceRoutes from './routes/evidence';
import casesRoutes from './routes/cases';
import artifactsRoutes from './routes/artifacts';
import chainRoutes from './routes/chain';

const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Session management
app.use(session({
  secret: process.env.SESSION_SECRET || 'chittychain-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth attempts
  message: 'Too many authentication attempts, please try again later.',
  skipSuccessfulRequests: true,
});

const evidenceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Limit evidence submissions
  message: 'Evidence submission rate limit exceeded.',
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/evidence/submit', evidenceLimiter);
app.use('/api/v1/evidence/batch', evidenceLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/evidence', evidenceRoutes);
app.use('/api/v1/cases', casesRoutes);
app.use('/api/v1/artifacts', artifactsRoutes);
app.use('/api/v1/chain', chainRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ChittyChain Cloud Server',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// Register existing routes (blockchain, properties, etc.)
const httpServer = await registerRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large' });
    }
    return res.status(400).json({ error: err.message });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON' });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const port = process.env.PORT || 5000;

httpServer.listen(port, () => {
  console.log(`ChittyChain Cloud Server running on port ${port}`);
  console.log(`API Version: v1`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Blockchain: ChittyChain initialized`);
  console.log(`Security: JWT + 2FA enabled`);
  console.log(`Compliance: Illinois Court Rules active`);
});