// Loads Orbit's theory, patches, bank and engine, Transplant's loop reader and Breeder's genome into one Node
// context, exactly as the page runs them. Used by test.mjs.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
export const FILES = ['../arp-src/theory.js', '../arp-src/sounds.js', '../arp-src/bank.js', '../arp-src/engine.js', '../transplant-src/loop.js', 'genome.js'];
export function load() {
  if (!globalThis.TB) vm.runInThisContext(FILES.map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n') + '\nObject.assign(globalThis, {OT, OSND, OB, OE, TL, TB});', {filename: 'breeder.js'});
  return {OT: globalThis.OT, OB: globalThis.OB, OE: globalThis.OE, TL: globalThis.TL, TB: globalThis.TB};
}
