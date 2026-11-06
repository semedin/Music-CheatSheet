// Builds transplant.html: X-Ray's engine (lifted from xray.html, as Blueprint does), Blueprint's demo synth and
// engine, Orbit's theory helpers and patches, and Transplant's model, shapes, loop reader, engine, audio and page,
// inlined into one self-contained file with the shared Fieldwork top bar.
//   node transplant-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {xrSource} from '../blueprint-src/xr-source.mjs';
import {withNav} from '../site/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const parts = {
  STYLE: read('style.css'), XR: xrSource(), SYNTH: read('../blueprint-src/synth.js'), BPENGINE: read('../blueprint-src/engine.js'),
  THEORY: read('../arp-src/theory.js'), SOUNDS: read('../arp-src/sounds.js'), HANDOFF: read('handoff.js'),
  MODEL: read('model.js'), SHAPES: read('shapes.js'), LOOP: read('loop.js'), ENGINE: read('engine.js'), AUDIO: read('audio.js'), APP: read('app.js'),
};
let html = read('template.html');
for (const [k, v] of Object.entries(parts)) { const tag = `/*${k}*/`; if (!html.includes(tag)) throw Error('template is missing ' + tag); html = html.replace(tag, () => v); }
html = withNav(html);
fs.writeFileSync(path.join(root, 'transplant.html'), html);
console.log(`transplant.html written (${(html.length / 1024).toFixed(0)} KB)`);
