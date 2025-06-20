import { drizzle } from 'drizzle-orm/neon-serverless';
import { neonConfig, Pool } from '@neondatabase/serverless';
import * as schema from '@shared/schema';

// Configure Neon
if (process.env.NODE_ENV === 'development') {
  neonConfig.wsProxy = (host) => `${host}:5433/v1`;
  neonConfig.useSecureWebSocket = false;
}

// Create connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create drizzle instance
export const db = drizzle(pool, { schema });

// Export all schema tables for easy access
export * from '@shared/schema';