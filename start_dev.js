#!/usr/bin/env node

// Simple development server starter
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting ChittyChain development server...');

// Start the development server
const server = spawn('npx', ['tsx', 'server/index.ts'], {
  cwd: __dirname,
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
  }
});

server.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

server.on('close', (code) => {
  console.log(`🔴 Server process exited with code ${code}`);
  process.exit(code || 0);
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down development server...');
  server.kill('SIGTERM');
});

process.on('SIGTERM', () => {
  server.kill('SIGTERM');
});