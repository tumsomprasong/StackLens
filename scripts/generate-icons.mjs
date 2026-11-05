// scripts/generate-icons.mjs
// Pure Node.js high-precision 4x supersampled rasterizer for assets/logo.svg -> icon-16.png, icon-48.png, icon-128.png
import fs from 'fs/promises';
import zlib from 'zlib';

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(c1, c2, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    c1[0] + (c2[0] - c1[0]) * clamped,
    c1[1] + (c2[1] - c1[1]) * clamped,
    c1[2] + (c2[2] - c1[2]) * clamped
  ];
}

function blend(dst, src, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  const outA = a + dst[3] * (1 - a);
  if (outA <= 0) return [0, 0, 0, 0];
  return [
    (src[0] * a + dst[0] * dst[3] * (1 - a)) / outA,
    (src[1] * a + dst[1] * dst[3] * (1 - a)) / outA,
    (src[2] * a + dst[2] * dst[3] * (1 - a)) / outA,
    outA
  ];
}

function sdRoundedBox(px, py, x, y, w, h, r) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const hx = w / 2 - r;
  const hy = h / 2 - r;
  const qx = Math.abs(px - cx) - hx;
  const qy = Math.abs(py - cy) - hy;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function sdDiamond(px, py, cx, cy, rx, ry) {
  // Exact signed distance to diamond centered at (cx, cy) with half-width rx=36, half-height ry=18
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  // Line through (rx, 0) and (0, ry): x/rx + y/ry = 1
  return (dx / rx + dy / ry - 1) / Math.hypot(1 / rx, 1 / ry);
}

const C_BG_0 = hexToRgb('#0F172A');
const C_BG_1 = hexToRgb('#1E1B4B');
const C_BORDER = hexToRgb('#334155');
const C_BOT_FILL = hexToRgb('#312E81');
const C_BOT_STROKE = hexToRgb('#4F46E5');
const C_MID_0 = hexToRgb('#6366F1');
const C_MID_1 = hexToRgb('#4338CA');
const C_TOP_0 = hexToRgb('#22D3EE');
const C_TOP_1 = hexToRgb('#4F46E5');
const C_LENS_0 = hexToRgb('#38BDF8');
const C_LENS_1 = hexToRgb('#818CF8');
const C_GLARE = hexToRgb('#BAE6FD');

function sampleLogo(x, y) {
  // Coordinate space: 0..128
  let color = [0, 0, 0, 0];

  // 1. Background Squircle: x=0, y=0, w=128, h=128, rx=28
  const dBg = sdRoundedBox(x, y, 0, 0, 128, 128, 28);
  if (dBg < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dBg));
    const t = (x + y) / 256;
    color = blend(color, lerpColor(C_BG_0, C_BG_1, t), cov);
  }

  // 2. Border Squircle: x=3, y=3, w=122, h=122, rx=25, stroke-width=2, opacity=0.6
  const dBorder = Math.abs(sdRoundedBox(x, y, 3, 3, 122, 122, 25)) - 1.0;
  if (dBorder < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dBorder));
    color = blend(color, C_BORDER, cov * 0.6);
  }

  // 3. Bottom Layer Fill: M64 80 L28 62 L64 44 L100 62 Z (center 64, 62, rx=36, ry=18)
  const dBotFill = sdDiamond(x, y, 64, 62, 36, 18);
  if (dBotFill < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dBotFill));
    color = blend(color, C_BOT_FILL, cov * 0.85);
  }

  // 4. Bottom Layer Stroke: M28 76 L64 94 L100 76, stroke-width=6
  const dBotStroke = Math.min(
    distToSegment(x, y, 28, 76, 64, 94),
    distToSegment(x, y, 64, 94, 100, 76)
  ) - 3.0;
  if (dBotStroke < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dBotStroke));
    color = blend(color, C_BOT_STROKE, cov);
  }

  // 5. Middle Layer Stroke: M28 63 L64 81 L100 63, stroke-width=6
  const dMidStroke = Math.min(
    distToSegment(x, y, 28, 63, 64, 81),
    distToSegment(x, y, 64, 81, 100, 63)
  ) - 3.0;
  if (dMidStroke < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dMidStroke));
    const t = ((x - 28) / 72 + (y - 63) / 18) / 2;
    color = blend(color, lerpColor(C_MID_0, C_MID_1, t), cov);
  }

  // 6. Top Layer Fill: M64 66 L28 48 L64 30 L100 48 Z (center 64, 48, rx=36, ry=18)
  const dTopFill = sdDiamond(x, y, 64, 48, 36, 18);
  if (dTopFill < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dTopFill));
    const t = ((x - 28) / 72 + (y - 30) / 36) / 2;
    color = blend(color, lerpColor(C_TOP_0, C_TOP_1, t), cov);
  }

  // 7. Lens / Scanner Ring Overlay: cx=72, cy=70, r=24, fill=#0F172A (0.55), stroke=5.5
  const distLens = Math.hypot(x - 72, y - 70);
  const dLensFill = distLens - 24;
  if (dLensFill < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dLensFill));
    color = blend(color, C_BG_0, cov * 0.55);
  }
  const dLensStroke = Math.abs(distLens - 24) - 2.75;
  if (dLensStroke < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dLensStroke));
    const t = ((x - 48) / 48 + (y - 46) / 48) / 2;
    color = blend(color, lerpColor(C_LENS_0, C_LENS_1, t), cov);
  }

  // 8. Lens Glare: M60 56 A16 16 0 0 1 82 56 -> arc centered around (71, 67.4) r=16
  const glareCx = 71;
  const glareCy = 67.45;
  const glareDist = Math.abs(Math.hypot(x - glareCx, y - glareCy) - 16) - 1.25;
  if (glareDist < 0.5 && y <= 56.5 && x >= 59 && x <= 83) {
    const cov = Math.max(0, Math.min(1, 0.5 - glareDist));
    color = blend(color, C_GLARE, cov * 0.8);
  }

  // 9. Lens Handle: x1=90, y1=88, x2=105, y2=103, stroke-width=7.5
  const dHandle = distToSegment(x, y, 90, 88, 105, 103) - 3.75;
  if (dHandle < 0.5) {
    const cov = Math.max(0, Math.min(1, 0.5 - dHandle));
    const t = ((x - 90) / 15 + (y - 88) / 15) / 2;
    color = blend(color, lerpColor(C_LENS_0, C_LENS_1, t), cov);
  }

  return color;
}

// CRC32 Table for PNG
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    const rowStart = y * (1 + width * 4);
    rawData[rowStart] = 0; // filter type 0
    rgba.copy(rawData, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = zlib.deflateSync(rawData, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

async function generateIcon(size, filename) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 4; // 4x4 supersampling
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < samples; sy++) {
        for (let sx = 0; sx < samples; sx++) {
          const u = ((px + (sx + 0.5) / samples) / size) * 128;
          const v = ((py + (sy + 0.5) / samples) / size) * 128;
          const c = sampleLogo(u, v);
          r += c[0] * c[3];
          g += c[1] * c[3];
          b += c[2] * c[3];
          a += c[3];
        }
      }
      const totalSamples = samples * samples;
      const finalA = a / totalSamples;
      const idx = (py * size + px) * 4;
      if (finalA > 0) {
        rgba[idx] = Math.round(r / a);
        rgba[idx + 1] = Math.round(g / a);
        rgba[idx + 2] = Math.round(b / a);
        rgba[idx + 3] = Math.round(finalA * 255);
      }
    }
  }
  const pngBuffer = encodePng(size, size, rgba);
  await fs.writeFile(filename, pngBuffer);
  console.log(`[StackLens] Generated ${filename} (${size}x${size})`);
}

async function main() {
  await fs.mkdir('assets', { recursive: true });
  await generateIcon(16, 'assets/icon-16.png');
  await generateIcon(48, 'assets/icon-48.png');
  await generateIcon(128, 'assets/icon-128.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

