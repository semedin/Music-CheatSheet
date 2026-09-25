// Link and navigation check for the whole folder. Exits 1 on any error.
//   node site/check.mjs
// Checks that:
//  - every root .html page is listed in site/catalog.mjs (so it is on the home page);
//  - every page carries the current shared top bar (otherwise: run node site/build.mjs);
//  - every local link in .html and .md files points at a file that exists,
//    including page names inside scripts (e.g. 'chords.html' in a data table).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {SECTIONS, DOCS, DOWNLOADS, NAV, UNLISTED} from './catalog.mjs';
import {navBlock, START, END} from './build.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const exists = f => fs.existsSync(path.join(root, f));
const errors = [], warnings = new Set();
const rootFiles = fs.readdirSync(root);
const pages = rootFiles.filter(f => f.endsWith('.html'));
const docs = rootFiles.filter(f => f.endsWith('.md'));

const listed = new Set([...SECTIONS.flatMap(s => s.pages.map(p => p.file)), ...UNLISTED]);
for (const p of pages) if (!listed.has(p)) errors.push(`${p}: not listed in site/catalog.mjs, so it is missing from the home page`);
for (const e of [...SECTIONS.flatMap(s => s.pages), ...DOCS, ...DOWNLOADS, ...NAV])
  if (!exists(e.file)) warnings.add(`${e.file}: in site/catalog.mjs but not in the folder (shown as unavailable)`);
for (const d of docs) if (!DOCS.some(x => x.file === d)) warnings.add(`${d}: not listed under DOCS in site/catalog.mjs`);

const block = navBlock();
for (const p of pages) {
  const html = fs.readFileSync(path.join(root, p), 'utf8'), s = html.indexOf(START), e = html.indexOf(END);
  if (s === -1 || e === -1) errors.push(`${p}: no shared top bar (run node site/build.mjs)`);
  else if (html.slice(s, e + END.length) !== block) errors.push(`${p}: shared top bar is out of date (run node site/build.mjs)`);
}

const skip = /^(?:[a-z][a-z0-9+.-]*:|#|\/\/|\$\{)/i;
function target(from, ref) {
  ref = ref.trim().replace(/[?#].*$/, '');
  if (!ref || skip.test(ref)) return null;
  try { ref = decodeURIComponent(ref); } catch {}
  return path.normalize(path.join(path.dirname(from), ref));
}
function checkRefs(file, refs) {
  for (const ref of new Set(refs)) {
    const t = target(file, ref);
    if (t && !exists(t)) errors.push(`${file}: broken link to ${ref}`);
  }
}
for (const p of pages) {
  const html = fs.readFileSync(path.join(root, p), 'utf8');
  const attrs = [...html.matchAll(/\b(?:href|src)\s*=\s*"([^"]*)"/g)].map(m => m[1])
    .concat([...html.matchAll(/\b(?:href|src)\s*=\s*'([^']*)'/g)].map(m => m[1]));
  // Page names held in script strings, e.g. {file:'chords.html'} or ['serum-v2.html', …].
  // Only .html: .md/.zip names in scripts are usually files the page generates for download.
  const scripted = [...html.matchAll(/['"`]([\w.-]+\.html)['"`]/g)].map(m => m[1]);
  checkRefs(p, [...attrs, ...scripted]);
}
for (const d of docs) {
  const md = fs.readFileSync(path.join(root, d), 'utf8').replace(/```[\s\S]*?```/g, '');
  checkRefs(d, [...md.matchAll(/\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)].map(m => m[1]));
}

for (const w of warnings) console.log('warning: ' + w);
for (const e of errors) console.log('error:   ' + e);
console.log(`${pages.length} pages, ${docs.length} notes checked: ${errors.length} error(s), ${warnings.size} warning(s).`);
process.exit(errors.length ? 1 : 0);
