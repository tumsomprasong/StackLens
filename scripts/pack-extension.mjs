// scripts/pack-extension.mjs
// Packages only runtime Chrome Extension files into versioned zip for Chrome Web Store upload
import { execFileSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

const INCLUDE_ITEMS = ['manifest.json', 'LICENSE', 'assets', 'rules', 'src', 'popup'];

async function pack() {
  const manifest = JSON.parse(await fs.readFile('manifest.json', 'utf8'));
  const version = manifest.version || '1.0.0';
  const outZip = path.resolve(`stacklens-v${version}.zip`);

  try {
    await fs.unlink(outZip);
  } catch {}

  const psCmd = `Compress-Archive -Path ${INCLUDE_ITEMS.map((i) => `'${i}'`).join(', ')} -DestinationPath '${outZip}' -Force`;
  execFileSync('powershell.exe', ['-NoProfile', '-Command', psCmd], { stdio: 'inherit' });
  const stat = await fs.stat(outZip);
  console.log(`[StackLens] Created Chrome Web Store package: ${outZip} (${(stat.size / 1024).toFixed(1)} KB)`);
}

pack().catch((err) => {
  console.error(err);
  process.exit(1);
});

