/**
 * Image Dimension Test Fixture Generator
 * Generates lightweight PNG fixtures with specific declared dimensions
 * to test resource boundary enforcement in image decoders.
 *
 * CLI Arguments:
 *   --width, -W   <number> : Custom image width in pixels (e.g. --width 12000)
 *   --height, -H  <number> : Custom image height in pixels (e.g. --height 12000)
 *   --output, -o  <string> : Output filename or path for the custom dimension fixture
 *   --all                  : Run and generate default baseline test cases (default if no custom dimensions given)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as zlib from 'node:zlib';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Standard PNG signature
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Constructs a binary PNG chunk according to the PNG file format specification.
 * Formats: [4-byte length, 4-byte chunk type, N-byte data, 4-byte CRC-32 checksum].
 *
 * @param type - Four-character ASCII chunk type identifier (e.g. "IHDR", "IDAT", "IEND")
 * @param data - Raw byte buffer containing the chunk payload
 * @returns Complete binary chunk with length prefix and CRC-32 suffix
 */
function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const payload = Buffer.concat([typeBuf, data]);

  const crcBuf = Buffer.alloc(4);
  const crc = zlib.crc32(payload);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, payload, crcBuf]);
}

/**
 * Generates a valid, minimal-size PNG image buffer with custom declared dimensions.
 * Includes a valid PNG header, IHDR chunk with specified width/height, a single
 * deflated scanline in IDAT, and an IEND terminator chunk.
 *
 * @param width - Declared image width in pixels
 * @param height - Declared image height in pixels
 * @returns Binary Buffer containing the complete PNG file
 */
export function generatePNG(width: number, height: number): Buffer {
  // IHDR Chunk: 13 bytes
  // Width (4), Height (4), Bit depth (1), Color type (1), Compression (1), Filter (1), Interlace (1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8-bit depth
  ihdrData[9] = 0; // Greyscale color type
  ihdrData[10] = 0; // Deflate compression
  ihdrData[11] = 0; // Standard filter
  ihdrData[12] = 0; // Non-interlaced

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Minimal compressed scanline data (greyscale black line)
  const scanline = Buffer.alloc(width + 1); // 1 filter byte + width pixels
  scanline[0] = 0; // Filter None

  // Compress a single scanline to maintain minimal payload file size
  const compressed = zlib.deflateSync(scanline);
  const idatChunk = createChunk('IDAT', compressed);

  // IEND Chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([PNG_SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
}

/**
 * Parses command-line arguments using Node's native util.parseArgs.
 * Extracts custom width, height, output file path, and baseline generation flags.
 *
 * @returns Object containing parsed dimension options and execution flags
 */
function parseCliArgs() {
  const { values } = parseArgs({
    options: {
      width: { type: 'string', short: 'W' },
      height: { type: 'string', short: 'H' },
      output: { type: 'string', short: 'o' },
      all: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
    allowPositionals: false,
  });

  if (values.help) {
    console.log(`
Dimension Fixture Generator

Usage:
  pnpm generate:dimensions [options]

Options:
  -W, --width  <number>  Custom image width in pixels
  -H, --height <number>  Custom image height in pixels
  -o, --output <path>    Output file path
  --all                  Generate all baseline fixtures
  -h, --help             Show this help menu
`);
    process.exit(0);
  }

  const customWidth = values.width ? Number(values.width) : undefined;
  const customHeight = values.height ? Number(values.height) : undefined;
  const customOutput = values.output;
  const runBaseline = Boolean(values.all);

  return { customWidth, customHeight, customOutput, runBaseline };
}

/**
 * Main execution entry point.
 * Creates the sample output directory and generates either custom dimension PNGs
 * or default baseline test fixtures based on CLI arguments.
 */
function main() {
  const outputDir = path.join(__dirname, 'samples');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const { customWidth, customHeight, customOutput, runBaseline } = parseCliArgs();

  // If custom width and height are provided, generate the custom fixture
  if (customWidth !== undefined && customHeight !== undefined) {
    const filename = customOutput ?? `dimension_${customWidth}x${customHeight}.png`;
    const targetPath = path.isAbsolute(filename) ? filename : path.join(outputDir, filename);
    const imageBuf = generatePNG(customWidth, customHeight);

    fs.writeFileSync(targetPath, imageBuf);
    console.log(`[+] Generated Custom Fixture: ${path.basename(targetPath)} (${customWidth}x${customHeight}, ${imageBuf.length} bytes)`);
  }

  // Generate baseline fixtures if requested or if no custom dimension was specified
  if (runBaseline || (customWidth === undefined && customHeight === undefined)) {
    const baselineCases = [
      { name: 'dimension_1kx1k.png', width: 1000, height: 1000 },
      { name: 'dimension_10kx10k.png', width: 10000, height: 10000 },
      { name: 'dimension_30kx30k.png', width: 30000, height: 30000 },
      { name: 'dimension_65kx65k.png', width: 65535, height: 65535 },
    ];

    console.log('[*] Generating baseline test fixtures:');
    for (const tc of baselineCases) {
      const filePath = path.join(outputDir, tc.name);
      const imageBuf = generatePNG(tc.width, tc.height);

      fs.writeFileSync(filePath, imageBuf);
      console.log(`[+] Generated: ${tc.name} (${tc.width}x${tc.height}, ${imageBuf.length} bytes)`);
    }
  }
}

main();
