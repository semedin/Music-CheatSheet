// Builds blueprint.html: X-Ray's engine (lifted from xray.html), the demo synth, Blueprint's engine and the
// page, inlined into one self-contained file with the shared Fieldwork top bar.
//   node blueprint-src/build.mjs
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {xrSource} from './xr-source.mjs';
import {withNav} from '../site/build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);
const read = f => fs.readFileSync(path.join(here, f), 'utf8');
const parts = {STYLE: read('style.css'), XR: xrSource(), SYNTH: read('synth.js'), ENGINE: read('engine.js'), APP: read('app.js')};
let html = read('template.html');
for (const [k, v] of Object.entries(parts)) { const tag = k === 'STYLE' ? `/*${k}*/` : `/*${k}*/`; if (!html.includes(tag)) throw Error('template is missing ' + tag); html = html.replace(tag, () => v); }
html = withNav(html);
fs.writeFileSync(path.join(root, 'blueprint.html'), html);
console.log(`blueprint.html written (${(html.length / 1024).toFixed(0)} KB)`);
