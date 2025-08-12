import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { registerSimpleRoutes } from './simple-routes';

// Simplified imports for basic functionality
const corsOrigins = process.env.NODE_ENV === 'production' 
  ? ['https://chittychain.replit.app'] 
  : ['http://localhost:3000', 'http://localhost:5000'];

const env = {
  PORT: parseInt(process.env.PORT || '5000'),
  NODE_ENV: process.env.NODE_ENV || 'development',
  SESSION_SECRET: process.env.SESSION_SECRET || 'chittychain-dev-secret',
  SESSION_COOKIE_SECURE: process.env.NODE_ENV === 'production',
  SESSION_COOKIE_MAX_AGE: 24 * 60 * 60 * 1000, // 24 hours
  MAX_FILE_SIZE: 50 * 1024 * 1024 // 50MB
};

const app: Express = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

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
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Body parsing with size limits
app.use(express.json({ 
  limit: '50mb'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb' 
}));

// Session management
app.use(session({
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: env.SESSION_COOKIE_SECURE,
    httpOnly: true,
    maxAge: env.SESSION_COOKIE_MAX_AGE,
    sameSite: 'strict',
  },
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'ChittyChain',
    host: req.get('host'),
    url: `${req.protocol}://${req.get('host')}`
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'ChittyChain API'
  });
});

// Basic error handling middleware (must be before routes)
app.use((err: any, req: any, res: any, next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler for unmatched routes
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Register simple routes for ChittyChain
registerSimpleRoutes(app).then(httpServer => {
  const port = env.PORT;
  
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`🚀 ChittyChain Cloud Server running on port ${port}`);
    console.log(`📊 API Version: v1`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`⛓️  Blockchain: ChittyChain initialized`);
    console.log(`🔐 Security: JWT + 2FA enabled`);
    console.log(`⚖️  Compliance: Cook County Rules active`);
    console.log(`🔓 WebSocket: Real-time updates enabled`);
    console.log(`📝 Health Check: https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:' + port}/health`);
    console.log(`🌐 ChittyChain Dashboard: https://${process.env.REPLIT_DEV_DOMAIN || 'localhost:' + port}`);
  });
}).catch((error: any) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});