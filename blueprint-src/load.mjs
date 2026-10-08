// Loads X-Ray's engine, Blueprint's demo synth and Blueprint's engine into one Node context, exactly as the
// page runs them. Used by test.mjs.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {xrSource} from './xr-source.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
export function load() {
  // the main context, not a sandbox: sandboxed globals make Math-heavy code several times slower
  if (!globalThis.BP) {
    vm.runInThisContext(xrSource() + '\nglobalThis.XR = XR;', {filename: 'xray-engine.js'});
    vm.runInThisContext(fs.readFileSync(path.join(here, 'synth.js'), 'utf8') + '\nglobalThis.BPDemo = BPDemo;', {filename: 'synth.js'});
    vm.runInThisContext(fs.readFileSync(path.join(here, 'engine.js'), 'utf8') + '\nglobalThis.BP = BP;', {filename: 'engine.js'});
  }
  return {XR: globalThis.XR, BP: globalThis.BP, BPDemo: globalThis.BPDemo};
}
export async function analyse({XR, BP}, d) {
  const an = await XR.analyze({L: d.L, R: d.R, sr: d.sr});
  await BP.prepare(an);
  return an;
}
