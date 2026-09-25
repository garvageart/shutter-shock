/**
 * Role-Based Access Control (RBAC) and Privilege Escalation Verification Tool
 * Verifies that administrative endpoints reject unprivileged or unauthenticated requests.
 */

interface AdminEndpoint {
  name: string;
  path: string;
  method: string;
  body?: Record<string, unknown>;
}

const ADMIN_ENDPOINTS: AdminEndpoint[] = [
  { name: 'System Settings', path: '/api/admin/settings', method: 'GET' },
  { name: 'User Management Listing', path: '/api/admin/users', method: 'GET' },
  { name: 'System Diagnostic Logs', path: '/api/admin/system/logs', method: 'GET' },
  { name: 'Jobs Queue State', path: '/api/jobs', method: 'GET' },
  { name: 'Storage Stats', path: '/api/system/storage', method: 'GET' },
];

async function checkPrivilegeBoundaries(baseUrl: string, nonAdminToken?: string): Promise<void> {
  console.log(`[*] Testing Admin/Privileged Endpoints on: ${baseUrl}`);
  console.log(`[*] Mode: ${nonAdminToken ? 'Low-Privilege Token' : 'Unauthenticated'}`);
  console.log('----------------------------------------------------');

  for (const ep of ADMIN_ENDPOINTS) {
    const url = `${baseUrl}${ep.path}`;
    const headers: Record<string, string> = {
      'User-Agent': 'ShutterShock-Audit/1.0',
    };

    if (nonAdminToken) {
      headers['Authorization'] = `Bearer ${nonAdminToken}`;
    }

    try {
      const resp = await fetch(url, {
        method: ep.method,
        headers,
      });

      const status = resp.status;
      if (status === 401 || status === 403) {
        console.log(`[+] PASS: [${status}] Endpoint protected: ${ep.name} (${ep.path})`);
      } else if (status >= 200 && status < 300) {
        console.log(`[-] VULNERABILITY: [${status}] Privileged endpoint accessible: ${ep.name} (${ep.path})`);
      } else {
        console.log(`[*] STATUS: [${status}] ${ep.name} (${ep.path})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[-] ERROR checking ${ep.name}: ${message}`);
    }
  }
}

const targetBase = process.argv[2] ?? 'http://localhost:7770';
const token = process.argv[3];

checkPrivilegeBoundaries(targetBase, token);
