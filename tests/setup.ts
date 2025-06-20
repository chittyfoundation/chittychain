import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Test database setup
const testDbUrl = 'postgresql://test:test@localhost:5432/chittychain_test';

beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL = testDbUrl;
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6380'; // Use different port for test Redis
  
  // Initialize test database
  try {
    await execAsync('npm run db:push');
    console.log('✅ Test database initialized');
  } catch (error) {
    console.error('❌ Failed to initialize test database:', error);
  }
});

afterAll(async () => {
  // Cleanup
  console.log('🧹 Test cleanup completed');
});

beforeEach(async () => {
  // Clear test data before each test
});

afterEach(async () => {
  // Cleanup after each test
});