import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default(5000),
  
  // Database
  DATABASE_URL: z.string().default('postgresql://localhost:5432/chittychain'),
  DATABASE_SSL: z.string().transform(Boolean).default(false),
  
  // JWT
  JWT_SECRET: z.string().min(32).default('chittychain-development-secret-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32).default('chittychain-encryption-key-32-chars'),
  HASH_SALT_ROUNDS: z.string().transform(Number).default(12),
  
  // IPFS
  IPFS_HOST: z.string().default('localhost'),
  IPFS_PORT: z.string().transform(Number).default(5001),
  IPFS_PROTOCOL: z.enum(['http', 'https']).default('http'),
  
  // Blockchain
  BLOCKCHAIN_DIFFICULTY: z.string().transform(Number).default(4),
  BLOCKCHAIN_MINING_REWARD: z.string().transform(Number).default(50),
  BLOCKCHAIN_BLOCK_TIME: z.string().transform(Number).default(10000),
  
  // External APIs
  COOK_COUNTY_API_URL: z.string().url().default('https://api.cookcounty.gov'),
  COOK_COUNTY_API_KEY: z.string().optional(),
  
  // CORS
  CORS_ORIGINS: z.string().default('http://localhost:3000,http://localhost:5000'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.string().transform(Number).default(900000), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(Number).default(100),
  
  // Sessions
  SESSION_SECRET: z.string().min(32).default('chittychain-session-secret-change-in-production'),
  SESSION_COOKIE_SECURE: z.string().transform(Boolean).default(false),
  SESSION_COOKIE_MAX_AGE: z.string().transform(Number).default(86400000), // 24 hours
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  SENTRY_DSN: z.string().optional(),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default(104857600), // 100MB
  UPLOAD_PATH: z.string().default('./uploads'),
  ALLOWED_FILE_TYPES: z.string().default('pdf,doc,docx,png,jpg,jpeg,gif,mp4,avi'),
  
  // Email
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Claude Code OAuth
  CLAUDE_CLIENT_ID: z.string().optional(),
  CLAUDE_CLIENT_SECRET: z.string().optional(),
  CLIENT_URL: z.string().url().default('http://localhost:5000'),
  
  // Anthropic API
  ANTHROPIC_API_VERSION: z.string().default('2023-06-01'),
  
  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform(Number),
  REDIS_PASSWORD: z.string().optional(),
  REDIS_DB: z.string().default('0').transform(Number),
});

const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    console.error('❌ Invalid environment configuration:');
    if (error instanceof z.ZodError) {
      error.errors.forEach((err) => {
        console.error(`  ${err.path.join('.')}: ${err.message}`);
      });
    }
    process.exit(1);
  }
};

export const env = parseEnv();

export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// CORS origins array
export const corsOrigins = env.CORS_ORIGINS.split(',').map(origin => origin.trim());

// Allowed file types array
export const allowedFileTypes = env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim());

// Database configuration
export const dbConfig = {
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : false,
};

// JWT configuration
export const jwtConfig = {
  secret: env.JWT_SECRET,
  expiresIn: env.JWT_EXPIRES_IN,
  refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
};

// IPFS configuration
export const ipfsConfig = {
  host: env.IPFS_HOST,
  port: env.IPFS_PORT,
  protocol: env.IPFS_PROTOCOL,
};

// Blockchain configuration
export const blockchainConfig = {
  difficulty: env.BLOCKCHAIN_DIFFICULTY,
  miningReward: env.BLOCKCHAIN_MINING_REWARD,
  blockTime: env.BLOCKCHAIN_BLOCK_TIME,
};

// Validation helpers
export const validateEnvironment = () => {
  if (isProduction) {
    const productionChecks = [
      { key: 'JWT_SECRET', value: env.JWT_SECRET, check: (v: string) => v !== 'chittychain-development-secret-key-change-in-production' },
      { key: 'SESSION_SECRET', value: env.SESSION_SECRET, check: (v: string) => v !== 'chittychain-session-secret-change-in-production' },
      { key: 'ENCRYPTION_KEY', value: env.ENCRYPTION_KEY, check: (v: string) => v !== 'chittychain-encryption-key-32-chars' },
    ];

    const failures = productionChecks.filter(check => !check.check(check.value));
    
    if (failures.length > 0) {
      console.error('❌ Production environment security check failed:');
      failures.forEach(failure => {
        console.error(`  ${failure.key} is using default development value`);
      });
      console.error('  Please update these values for production deployment');
      process.exit(1);
    }
    
    console.log('✅ Production environment security checks passed');
  }
};

export default env;