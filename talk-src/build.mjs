import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {withNav} from '../site/build.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url));
let html = fs.readFileSync(path.join(dir, 'template.html'), 'utf8');
for (const [tag, file] of Object.entries({STYLE: 'style.css', THEORY: '../arp-src/theory.js', ENGINE: 'engine.js', AUDIO: 'audio.js', APP: 'app.js'}))
  html = html.replace(`/*${tag}*/`, () => fs.readFileSync(path.join(dir, file), 'utf8'));
fs.writeFileSync(path.join(dir, '../talk.html'), withNav(html));
console.log('Built standalone talk.html');
