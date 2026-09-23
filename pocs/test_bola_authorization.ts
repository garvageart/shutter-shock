/**
 * Broken Object Level Authorization (BOLA/IDOR) Verification Tool
 * Tests whether resource identifiers can be accessed across user boundaries or without authorization.
 */

interface ResourceTestConfig {
  name: string;
  path: string;
  method: string;
}

const TEST_ENDPOINTS: ResourceTestConfig[] = [
  { name: 'Image Details', path: '/api/images/jkdashjkg ahkjsdaad a', method: 'GET' },
  { name: 'Image Metadata', path: '/api/images/fdsahfdatfasas/metadata', method: 'GET' },
  { name: 'Collection Details', path: '/api/collections/test-collection-uid', method: 'GET' },
  { name: 'User Profile', path: '/api/users/test-user-uid', method: 'GET' },
  { name: 'Trash Listing', path: '/api/trash', method: 'GET' },
];

async function runBolaTests(baseUrl: string, token?: string): Promise<void> {
  console.log(`[*] Running Authorization Checks against: ${baseUrl}`);
  console.log(`[*] Auth State: ${token ? 'Authenticated Token Provided' : 'Unauthenticated'}`);
  console.log('----------------------------------------------------');

  for (const endpoint of TEST_ENDPOINTS) {
    const url = `${baseUrl}${endpoint.path}`;
    const headers: Record<string, string> = {
      'User-Agent': 'ShutterShock-Audit/1.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const resp = await fetch(url, {
        method: endpoint.method,
        headers,
      });

      const status = resp.status;
      if (status === 401 || status === 403) {
        console.log(`[+] PASS: [${status}] Access blocked for ${endpoint.name} (${endpoint.path})`);
      } else if (status === 404) {
        console.log(`[*] INFO: [404] Not Found for ${endpoint.name} (${endpoint.path})`);
      } else if (status >= 200 && status < 300) {
        if (!token) {
          console.log(`[-] VULNERABILITY: [${status}] Unauthenticated access allowed to ${endpoint.name} (${endpoint.path})`);
        } else {
          console.log(`[!] NOTICE: [${status}] Endpoint returned data for ${endpoint.name} (${endpoint.path})`);
        }
      } else {
        console.log(`[*] STATUS: [${status}] ${endpoint.name} (${endpoint.path})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[-] ERROR testing ${endpoint.name}: ${message}`);
    }
  }
}

const targetBase = process.argv[2] ?? 'http://localhost:7770';
const authToken = process.argv[3];

runBolaTests(targetBase, authToken);
