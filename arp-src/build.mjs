// Builds orbit.html: theory, sounds, bank, engine, audio and the page, inlined into one self-contained file
// with the shared Fieldwork top bar.
//   node arp-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withNav} from '../site/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const parts = {STYLE: read('style.css'), THEORY: read('theory.js'), SOUNDS: read('sounds.js'), BANK: read('bank.js'), ENGINE: read('engine.js'), AUDIO: read('audio.js'), APP: read('app.js')};
let html = read('template.html');
for (const [k, v] of Object.entries(parts)) { const tag = `/*${k}*/`; if (!html.includes(tag)) throw Error('template is missing ' + tag); html = html.replace(tag, () => v); }
html = withNav(html);
fs.writeFileSync(path.join(root, 'orbit.html'), html);
console.log(`orbit.html written (${(html.length / 1024).toFixed(0)} KB)`);
