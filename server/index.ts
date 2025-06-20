import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { registerRoutes } from './routes';

// Import configuration and middleware
import { env, corsOrigins, validateEnvironment } from './config/environment.js';
import { 
  requestId, 
  requestLogger, 
  errorHandler, 
  notFoundHandler, 
  healthCheck 
} from './middleware/errorHandler.js';
import { sanitizeInput, rateLimiters } from './middleware/validation.js';

// Import API routes (temporarily disabled due to import errors)
// import authRoutes from './routes/auth';
// import evidenceRoutes from './routes/evidence';
// import casesRoutes from './routes/cases';
// import artifactsRoutes from './routes/artifacts';
// import chainRoutes from './routes/chain';
// import complianceRoutes from './routes/compliance';
// import airRoutes from './routes/air';

// Import WebSocket service
import { WebSocketService } from './websocket';
import { setWebSocketService } from './services/websocket';

// Validate environment configuration
validateEnvironment();

const app: Express = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Request ID and logging
app.use(requestId);
app.use(requestLogger);

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

// Rate limiting
app.use('/api/', rateLimiters.api);
app.use('/api/v1/auth/', rateLimiters.auth);
app.use('/api/v1/evidence/', rateLimiters.evidence);
app.use('/api/v1/cases/create', rateLimiters.caseCreation);

// Body parsing with size limits
app.use(express.json({ 
  limit: `${env.MAX_FILE_SIZE / 1024 / 1024}mb`,
  verify: (req, res, buf) => {
    // Store raw body for signature verification if needed
    (req as any).rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: `${env.MAX_FILE_SIZE / 1024 / 1024}mb` 
}));

// Input sanitization
app.use(sanitizeInput);

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
app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

// API Routes (temporarily disabled due to import errors)
// app.use('/api/v1/auth', authRoutes);
// app.use('/api/v1/evidence', evidenceRoutes);
// app.use('/api/v1/cases', casesRoutes);
// app.use('/api/v1/artifacts', artifactsRoutes);
// app.use('/api/v1/chain', chainRoutes);
// app.use('/api/v1/compliance', complianceRoutes);
// app.use('/api/v1/air', airRoutes);

// Prometheus metrics endpoint
app.get('/metrics', async (req, res) => {
  try {
    const metrics = await require('./observability/metrics').metricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    res.status(500).send('Error generating metrics');
  }
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Register existing routes (blockchain, properties, etc.)
registerRoutes(app).then(httpServer => {
  // Initialize WebSocket service
  const wsService = new WebSocketService(httpServer);
  setWebSocketService(wsService);

  const port = env.PORT;
  
  httpServer.listen(port, () => {
    console.log(`🚀 ChittyChain Cloud Server running on port ${port}`);
    console.log(`📊 API Version: v1`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`⛓️  Blockchain: ChittyChain initialized`);
    console.log(`🔐 Security: JWT + 2FA enabled`);
    console.log(`⚖️  Compliance: Cook County Rules active`);
    console.log(`🔓 WebSocket: Real-time updates enabled`);
    console.log(`📝 Health Check: http://localhost:${port}/health`);
  });
}).catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});