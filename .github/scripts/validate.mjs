import {execFileSync, spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const run = (cmd, args) => execFileSync(cmd, args, {cwd: root, stdio: 'inherit'});

// Verify that committed distributables actually match their shared source.
for (const script of ['arp-src/build.mjs', 'pocket-src/build.mjs', 'talk-src/build.mjs', 'site/build.mjs']) {
  run(process.execPath, [script]);
}
run('git', ['diff', '--exit-code', '--', '*.html', '*-src/template.html']);

const suites = [
  'site/check.mjs', 'pocket-src/test.mjs', 'arp-src/test.mjs', 'talk-src/test.mjs',
  'v2-src/test.mjs', 'v3-src/test.mjs', 'drum-library-src/test.mjs',
  'rumble-tests.mjs', 'xray-tests.mjs', 'blueprint-src/test.mjs', 'trance-src/test.mjs',
];
let next = 0;
const failures = [];
async function worker() {
  while (next < suites.length) {
    const script = suites[next++];
    const result = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [script], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
      let output = '';
      child.stdout.on('data', d => { output += d; });
      child.stderr.on('data', d => { output += d; });
      child.on('error', reject);
      child.on('close', (code, signal) => resolve({code, signal, output}));
    });
    if (result.code !== 0) {
      failures.push(script);
      console.error(`FAIL ${script} (exit ${result.code}, signal ${result.signal || 'none'})\n${result.output}`);
    } else {
      console.log(`PASS ${script}\n${result.output.trim().split('\n').slice(-2).join('\n')}`);
    }
  }
}
await Promise.all(Array.from({length: 3}, worker));
if (failures.length) {
  console.error(`${failures.length} suite(s) failed: ${failures.join(', ')}`);
  process.exitCode = 1;
} else {
  // Tests may write diagnostics, but must not silently change committed files.
  run('git', ['diff', '--exit-code']);
  console.log(`${suites.length} suites passed; generated pages and tracked files match.`);
}
