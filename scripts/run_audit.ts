/**
 * Unified Security Audit Runner
 * Executes security header audits, authorization checks, and session tests.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const targetUrl = process.argv[2] ?? 'http://localhost:7770';

const SUITES = [
  { name: 'Security Headers & CORS', path: 'scripts/check_security_headers.ts' },
  { name: 'Broken Object Level Authorization (BOLA)', path: 'pocs/test_bola_authorization.ts' },
  { name: 'Session Lifecycle', path: 'pocs/test_session_lifecycle.ts' },
  { name: 'Role-Based Access Controls (RBAC)', path: 'pocs/test_role_escalation.ts' },
];

console.log('====================================================');
console.log(`ShutterShock Automated Security Audit`);
console.log(`Target: ${targetUrl}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('====================================================\n');

for (const suite of SUITES) {
  console.log(`\n>>> Running Suite: ${suite.name} <<<`);
  const scriptPath = join(rootDir, suite.path);

  const result = spawnSync('node', ['--experimental-strip-types', scriptPath, targetUrl], {
    stdio: 'inherit',
    encoding: 'utf-8',
  });

  if (result.status !== 0) {
    console.log(`[!] Suite ${suite.name} exited with status code ${result.status}`);
  }
}

console.log('\n====================================================');
console.log('Audit Completed.');
console.log('====================================================');
