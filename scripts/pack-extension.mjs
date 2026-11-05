// scripts/pack-extension.mjs
// Packages only the runtime Chrome Extension files into stacklens-v1.0.0.zip for Chrome Web Store upload
import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const OUT_ZIP = path.resolve('stacklens-v1.0.0.zip');
const INCLUDE_ITEMS = ['manifest.json', 'LICENSE', 'assets', 'rules', 'src', 'popup'];

async function pack() {
  try {
    await fs.unlink(OUT_ZIP);
  } catch {}

  const psCmd = `Compress-Archive -Path ${INCLUDE_ITEMS.map((i) => `'${i}'`).join(', ')} -DestinationPath '${OUT_ZIP}' -Force`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' });
  const stat = await fs.stat(OUT_ZIP);
  console.log(`[StackLens] Created Chrome Web Store package: ${OUT_ZIP} (${(stat.size / 1024).toFixed(1)} KB)`);
}

pack().catch((err) => {
  console.error(err);
  process.exit(1);
});

