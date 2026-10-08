// Blueprint stands on X-Ray's engine (decoding, loudness, tempo, grid, sections, chords) and adds its own
// layer on top. Rather than keep a copy that drifts, the build lifts X-Ray's engine out of xray.html
// and makes three small, checked changes so Blueprint can reach a few of its internals.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.dirname(here);

export function xrSource() {
  const html = fs.readFileSync(path.join(root, 'xray.html'), 'utf8');
  const m = html.match(/\/\* xray-engine:start \*\/([\s\S]*?)\/\* xray-engine:end \*\//);
  if (!m) throw Error('xray.html: engine markers not found');
  let src = m[1];
  const patch = (from, to, what) => { if (!src.includes(from)) throw Error('xray.html changed; cannot patch: ' + what); src = src.replace(from, to); };
  // keep the decimated stereo signal that X-Ray already computes, so Blueprint doesn't redo it
  patch('const an = {version: 1, sr, dur,', 'const an = {La, Ra, ra, Ma, version: 1, sr, dur,', 'keep decimated audio');
  // expose the DSP helpers
  patch('return {analyze, derive,', 'return {_fft: makeFFT, _hann: hann, _filt: filt, _rbj: rbj, _biquad: biquad, _framesIn: framesIn, _maxIn: maxIn, _meanIn: meanIn, _argMaxIn: argMaxIn, _vlq: vlq, analyze, derive,', 'export helpers');
  return '/* xray-engine (from xray.html, lightly patched by blueprint-src/xr-source.mjs) */' + src;
}
