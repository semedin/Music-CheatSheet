// Loads Orbit's theory helpers, X-Ray's and Blueprint's engines and Transplant's model, shapes, loop and engine
// into one Node context, exactly as the page runs them. Used by test.mjs.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {xrSource} from '../blueprint-src/xr-source.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);
export const FILES = ['../arp-src/theory.js', '../arp-src/sounds.js', 'model.js', 'shapes.js', 'loop.js', 'engine.js'];
export function load({analysis = false} = {}) {
  if (analysis && !globalThis.BP) {
    vm.runInThisContext(xrSource() + '\nglobalThis.XR = XR;', {filename: 'xray-engine.js'});
    vm.runInThisContext(fs.readFileSync(path.join(root, 'blueprint-src/synth.js'), 'utf8') + '\nglobalThis.BPDemo = BPDemo;', {filename: 'synth.js'});
    vm.runInThisContext(fs.readFileSync(path.join(root, 'blueprint-src/engine.js'), 'utf8') + '\nglobalThis.BP = BP;', {filename: 'blueprint-engine.js'});
  }
  if (!globalThis.TE) {
    const src = FILES.map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n') + '\nObject.assign(globalThis, {OT, OSND, TM, TSHAPES, TL, TE});';
    vm.runInThisContext(src, {filename: 'transplant.js'});
  }
  return {OT: globalThis.OT, TM: globalThis.TM, TSHAPES: globalThis.TSHAPES, TL: globalThis.TL, TE: globalThis.TE, XR: globalThis.XR, BP: globalThis.BP, BPDemo: globalThis.BPDemo};
}
