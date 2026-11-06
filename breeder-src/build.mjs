// Builds breeder.html: Orbit's theory, patches, bank and engine, Transplant's loop reader, the hand-off helper and
// audio engine, and Breeder's genome and page, inlined into one self-contained file with the shared top bar.
//   node breeder-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withNav} from '../site/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const parts = {STYLE: read('style.css'), THEORY: read('../arp-src/theory.js'), SOUNDS: read('../arp-src/sounds.js'), BANK: read('../arp-src/bank.js'), ORBIT: read('../arp-src/engine.js'),
  LOOP: read('../transplant-src/loop.js'), HANDOFF: read('../transplant-src/handoff.js'), GENOME: read('genome.js'), AUDIO: read('../transplant-src/audio.js'), APP: read('app.js')};
let html = read('template.html');
for (const [k, v] of Object.entries(parts)) { const tag = `/*${k}*/`; if (!html.includes(tag)) throw Error('template is missing ' + tag); html = html.replace(tag, () => v); }
html = withNav(html);
fs.writeFileSync(path.join(root, 'breeder.html'), html);
console.log(`breeder.html written (${(html.length / 1024).toFixed(0)} KB)`);
