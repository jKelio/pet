import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const publicDir = join(import.meta.dir, '..', 'public');
const svg = readFileSync(join(publicDir, 'icon.svg'), 'utf-8');

const targets = [
  { file: 'icon.png',             width: 512 },
  { file: 'apple-touch-icon.png', width: 180 },
  { file: 'favicon.png',          width: 32  },
];

for (const { file, width } of targets) {
  const rendered = new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render();
  writeFileSync(join(publicDir, file), rendered.asPng());
  console.log(`✓ ${file} (${width}×${width})`);
}
