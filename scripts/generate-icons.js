import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Create clean SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="110" fill="#0f172a" />
  <path d="M256 120 L76 210 L256 300 L400 228 L400 350 L420 350 L420 218 L436 210 Z" fill="#ffffff" />
  <path d="M140 265 L140 340 C140 390 200 420 256 420 C312 420 372 390 372 340 L372 265 L256 325 Z" fill="#38bdf8" />
  <circle cx="256" cy="225" r="8" fill="#facc15" />
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);

// Helper function to create a valid uncompressed/deflated RGBA PNG
function createPng(width, height, drawFn) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcBuf = Buffer.alloc(4);
  const toCrc = Buffer.concat([typeBuf, data]);
  const crc = crc32(toCrc);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Simple CRC32 implementation
function crc32(buf) {
  let table = (crc32.table = crc32.table || (() => {
    let t = [];
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      t[i] = c >>> 0;
    }
    return t;
  })());

  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Drawing routine for Study Lab icon (Deep Slate background + Academic Cap symbol)
function drawStudyLabIcon(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const radius = isMaskable ? w * 0.5 : w * 0.44;

  // Background
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background color #0f172a (Deep Slate 900)
  let bgR = 15, bgG = 23, bgB = 42, bgA = 255;
  if (!isMaskable) {
    // Rounded squircle / soft edge
    const rSq = Math.pow(Math.abs(dx) / (w * 0.45), 4) + Math.pow(Math.abs(dy) / (h * 0.45), 4);
    if (rSq > 1.05) return [0, 0, 0, 0];
    if (rSq > 1.0) {
      bgA = Math.floor(255 * (1.05 - rSq) / 0.05);
    }
  }

  // Normalize (nx, ny) from -1 to 1 relative to center
  const scale = isMaskable ? 0.6 : 0.75;
  const nx = dx / (cx * scale);
  const ny = dy / (cy * scale);

  // Graduation cap diamond top: |nx| * 0.5 + |ny + 0.2| < 0.45
  const inDiamond = (Math.abs(nx) * 0.45 + Math.abs(ny + 0.15)) < 0.38;
  // Cap base: curved shield below diamond
  const inBase = (Math.abs(nx) < 0.42) && (ny > -0.05) && (ny < (0.45 - nx * nx * 0.5));

  if (inDiamond) {
    // Crisp white top
    return [255, 255, 255, 255];
  }

  if (inBase) {
    // Academic sky blue base
    return [56, 189, 248, 255];
  }

  // Tassel
  if (nx > 0.35 && nx < 0.45 && ny > -0.15 && ny < 0.35) {
    return [250, 204, 21, 255]; // Golden amber tassel
  }

  return [bgR, bgG, bgB, bgA];
}

// Generate icons
const sizes = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'favicon.ico', size: 64, maskable: false },
];

for (const { file, size, maskable } of sizes) {
  const buf = createPng(size, size, (x, y, w, h) => drawStudyLabIcon(x, y, w, h, maskable));
  fs.writeFileSync(path.join(publicDir, file), buf);
  console.log(`Generated public/${file} (${size}x${size})`);
}
