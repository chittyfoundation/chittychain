import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '@shared/schema';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/chittychain';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export const db = drizzle(pool, { schema });