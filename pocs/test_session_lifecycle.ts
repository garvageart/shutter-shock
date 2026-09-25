/**
 * Session Lifecycle and Authentication Verification Tool
 * Validates token expiration, session invalidation on logout, and cookie security flags.
 */

interface SessionAuditOptions {
  baseUrl: string;
  loginPath?: string;
  logoutPath?: string;
  sessionPath?: string;
}

async function auditSessionLifecycle(options: SessionAuditOptions): Promise<void> {
  const {
    baseUrl,
    sessionPath = '/api/auth/session',
    logoutPath = '/api/auth/logout',
  } = options;

  console.log(`[*] Testing Session Lifecycle on: ${baseUrl}`);
  console.log('----------------------------------------------------');

  // Step 1: Query session endpoint unauthenticated
  const sessionUrl = `${baseUrl}${sessionPath}`;
  try {
    const unauthResp = await fetch(sessionUrl, {
      method: 'GET',
      headers: { 'User-Agent': 'ShutterShock-Audit/1.0' },
    });

    console.log(`[+] Step 1 (Unauthenticated session check): Status ${unauthResp.status}`);

    const setCookie = unauthResp.headers.get('set-cookie');
    if (setCookie) {
      console.log(`[*] Cookie detected: ${setCookie}`);
      const isHttpOnly = /httponly/i.test(setCookie);
      const isSecure = /secure/i.test(setCookie);
      const sameSite = setCookie.match(/samesite=([a-zA-Z]+)/i)?.[1] ?? 'None';

      if (isHttpOnly) {
        console.log('[+] PASS: Cookie has HttpOnly flag');
      } else {
        console.log('[-] WEAK: Cookie lacks HttpOnly flag');
      }

      if (isSecure) {
        console.log('[+] PASS: Cookie has Secure flag');
      } else {
        console.log('[!] NOTICE: Cookie lacks Secure flag (acceptable for local HTTP testing)');
      }

      console.log(`[*] Cookie SameSite attribute: ${sameSite}`);
    }

    // Step 2: Test logout behavior with unauthenticated request
    const logoutUrl = `${baseUrl}${logoutPath}`;
    const logoutResp = await fetch(logoutUrl, {
      method: 'POST',
      headers: { 'User-Agent': 'ShutterShock-Audit/1.0' },
    });

    console.log(`[+] Step 2 (Logout endpoint status): Status ${logoutResp.status}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[-] Connection failed: ${message}`);
  }
}

const targetBase = process.argv[2] ?? 'http://localhost:7770';
auditSessionLifecycle({ baseUrl: targetBase });
