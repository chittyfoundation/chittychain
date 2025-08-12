import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Configure Neon
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  neonConfig.useSecureWebSocket = false;
}

// Create connection pool - prioritize NEON_DATABASE_URL for custom Neon database
const connectionString = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export all schema tables for easy access
export * from '@shared/schema';