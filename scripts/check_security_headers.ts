/**
 * Security Headers and CORS Assessment Tool
 * Audits HTTP response headers and CORS configurations against security baselines.
 */

interface HeaderRule {
  expected?: string;
  required: boolean;
}

const SECURITY_HEADERS: Record<string, HeaderRule> = {
  'x-content-type-options': { expected: 'nosniff', required: true },
  'x-frame-options': { required: true },
  'content-security-policy': { required: true },
  'referrer-policy': { required: true },
  'strict-transport-security': { required: false },
};

async function auditHeaders (targetUrl: string): Promise<boolean> {
  console.log(`[*] Auditing headers for: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'ShutterShock-Audit/1.0' },
    });

    console.log(`[+] HTTP Status: ${response.status}`);
    console.log('Security Headers');
    console.log('------------------------------------');

    for (const [header, rule] of Object.entries(SECURITY_HEADERS)) {
      const val = response.headers.get(header);
      if (!val) {
        if (rule.required) {
          console.log(`[-] MISSING: ${header}`);
        } else {
          console.log(`[*] OPTIONAL MISSING: ${header}`);
        }
      } else {
        if (rule.expected && !val.toLowerCase().includes(rule.expected.toLowerCase())) {
          console.log(`[!] WEAK: ${header} = "${val}" (expected: ${rule.expected})`);
        } else {
          console.log(`[+] PASS: ${header} = "${val}"`);
        }
      }
    }

    // CORS Preflight check
    console.log('CORS Configuration');
    console.log('------------------------------------');

    try {
      const corsResponse = await fetch(targetUrl, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://attacker.example.com',
          'Access-Control-Request-Method': 'GET',
        },
      });

      const acao = corsResponse.headers.get('access-control-allow-origin');
      const acac = corsResponse.headers.get('access-control-allow-credentials');

      if (acao === '*') {
        console.log('[!] NOTICE: Wildcard CORS origin (*) allowed');
      } else if (acao === 'https://attacker.example.com') {
        if (acac === 'true') {
          console.log('[-] CRITICAL: Reflected CORS origin with credentials enabled');
        } else {
          console.log('[!] WARNING: Arbitrary origin reflected without credentials');
        }
      } else {
        console.log('[+] PASS: No permissive origin reflection found');
      }
    } catch {
      console.log('[*] OPTIONS preflight request not handled by endpoint');
    }

    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[-] Connection failed: ${message}`);
    
    return false;
  }
}

const target = process.argv[2] ?? 'http://localhost:7770';
auditHeaders(target).then((ok) => {
  if (!ok) {
    process.exit(1);
  }
});
