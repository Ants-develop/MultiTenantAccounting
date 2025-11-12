#!/usr/bin/env node
// Stop script for the server
import { execSync } from 'child_process';
import { config } from 'dotenv';

// Load environment variables
config();

const port = process.env.PORT || 5000;

console.log(`Stopping server on port ${port}...`);

try {
  // Use kill-port package via npx
  execSync(`npx kill-port ${port}`, { stdio: 'inherit' });
  console.log(`✅ Server stopped on port ${port}`);
} catch (error) {
  console.error(`❌ Error stopping server: ${error.message}`);
  process.exit(1);
}

