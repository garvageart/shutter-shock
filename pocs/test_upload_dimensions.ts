/**
 * Upload Dimension Limits Verification Tool
 * Tests whether the server validates image dimensions during upload
 * and enforces maximum boundary limits.
 *
 * CLI Arguments:
 *   --target, -t   <url>    : Target base URL (default: http://localhost:7770)
 *   --file, -f     <path>   : Path to a specific test image file (optional)
 *   --key, -k      <string> : API key for authenticated uploads (optional)
 *   --help, -h              : Display help information and CLI argument reference
 *
 * Stdin Support:
 *   You can pipe the API key via stdin to prevent exposing keys in process tables:
 *   e.g. echo "$VIZ_API_KEY" | pnpm tsx pocs/test_upload_dimensions.ts http://localhost:7770
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface UploadResult {
  filename: string;
  status: number;
  message: string;
}

function printHelp () {
  console.log(`
Upload Dimension Limits Test Tool

Usage:
  pnpm tsx pocs/test_upload_dimensions.ts [options] [targetUrl]

Options:
  -t, --target <url>     Target base URL (default: http://localhost:7770)
  -f, --file   <path>    Specific image file to test upload against
  -k, --key    <string>  API key for authenticated requests
  -h, --help             Show this help menu

Stdin Usage:
  Pipe the API key through stdin:
  grep VIZ_API_KEY .env | cut -d= -f2 | pnpm tsx pocs/test_upload_dimensions.ts
`);
}

function readStdinIfAvailable (): string {
  // Check if stdin has piped data available (non-interactive)
  try {
    if (!process.stdin.isTTY) {
      const input = fs.readFileSync(0, 'utf-8').trim();
      return input;
    }
  } catch {
    // Stdin empty or unavailable
  }
  return '';
}

function parseCliOptions () {
  const { values, positionals } = parseArgs({
    options: {
      target: { type: 'string', short: 't', default: 'http://localhost:7770' },
      file: { type: 'string', short: 'f' },
      key: { type: 'string', short: 'k' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: true,
  });

  if (values.help) {
    printHelp();
    process.exit(0);
  }

  const target = positionals[0] ?? values.target;
  const targetFile = values.file;
  let apiKey = values.key;

  if (!apiKey) {
    const pipedKey = readStdinIfAvailable();
    if (pipedKey) {
      apiKey = pipedKey;
    }
  }

  return { target, targetFile, apiKey };
}

async function testUpload (baseUrl: string, filePath: string, token?: string): Promise<UploadResult> {
  const filename = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  const formData = new FormData();
  const blob = new Blob([fileBuffer], { type: 'image/png' });
  formData.append('file', blob, filename);

  const headers: Record<string, string> = {
    'User-Agent': 'ShutterShock-Audit/1.0',
  };

  if (token) {
    headers['X-API-Key'] = token;
    headers['Authorization'] = `Bearer ${token}`;
  }

  const uploadUrl = `${baseUrl}/api/images`;

  try {
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: formData,
    });

    const bodyText = await response.text();
    return {
      filename,
      status: response.status,
      message: bodyText.slice(0, 200),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      filename,
      status: 0,
      message: `Connection error: ${message}`,
    };
  }
}

async function main () {
  const { target, targetFile, apiKey } = parseCliOptions();
  const samplesDir = path.join(__dirname, '..', 'payloads', 'dimensions', 'samples');

  console.log(`[*] Testing upload dimension limits on: ${target}`);
  console.log(`[*] Auth State: ${apiKey ? 'API Key Provided (via pipe/option)' : 'Unauthenticated'}`);
  console.log('----------------------------------------------------');

  let filesToTest: string[] = [];

  if (targetFile) {
    if (!fs.existsSync(targetFile)) {
      console.error(`[-] Specified file not found: ${targetFile}`);
      process.exit(1);
    }
    filesToTest = [targetFile];
  } else {
    if (!fs.existsSync(samplesDir)) {
      console.error(`[-] Samples directory not found at: ${samplesDir}`);
      console.error('[*] Run: pnpm tsx payloads/dimensions/generate_dimension_fixtures.ts');
      process.exit(1);
    }

    filesToTest = fs
      .readdirSync(samplesDir)
      .filter((f) => f.endsWith('.png'))
      .map((f) => path.join(samplesDir, f));
  }

  for (const filePath of filesToTest) {
    const result = await testUpload(target, filePath, apiKey);

    if (result.status === 401) {
      console.log(`[*] AUTH: [401 Unauthorized] Upload requires authentication (${result.filename})`);
    } else if (result.status === 400 || result.status === 413 || result.status === 422) {
      console.log(`[+] PASS: [${result.status}] Server rejected oversized dimension: ${result.filename}`);
    } else if (result.status >= 200 && result.status < 300) {
      console.log(`[!] ACCEPTED: [${result.status}] Server accepted file: ${result.filename}`);
    } else {
      console.log(`[*] STATUS: [${result.status}] ${result.filename} - ${result.message}`);
    }
  }
}

main();
