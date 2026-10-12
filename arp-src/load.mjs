// Loads Orbit's theory, sounds, bank and engine into one Node context, exactly as the page runs them.
// Used by test.mjs.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ENGINE_FILES = ['theory.js', 'sounds.js', 'bank.js', 'engine.js'];
export function load() {
  if (!globalThis.OE) {
    const src = ENGINE_FILES.map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n') + '\nObject.assign(globalThis, {OT, OSND, OB, OE});';
    vm.runInThisContext(src, {filename: 'orbit-engine.js'});
  }
  return {OT: globalThis.OT, OB: globalThis.OB, OE: globalThis.OE, OSND: globalThis.OSND};
}
