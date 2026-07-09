/**
 * run_tests.mjs — Sequential test runner for all active SHTD test suites.
 * Usage: node run_tests.mjs
 * CI:    npm test
 */

import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUITES = [
  'verify_i18n_p3.mjs',         // 62 tests  S45
  'verify_i18n_p2.mjs',         // 36 tests  S43
  'verify_my_work.mjs',         // 55 tests  S44b
  'verify_issue_tracker.mjs',   // 61 tests  S41
  'verify_mobile_s37.mjs',      // 21 tests  S37
  'verify_case_pipeline_s36.mjs', // 28 tests S36
  'verify_action_plan.mjs',     // 24 tests  S34
  'verify_history.mjs',         // 47 tests  S33
  'verify_atomic_write.mjs',    // 41 tests  S30
  'verify_case_pipeline.mjs',   // 22 tests  S20
  'verify_bld_queue.mjs',       // 46 tests  S19
  'verify_milestone_task.mjs',  // 23 tests  S27
  'verify_task_init_popup.mjs', // 28 tests  S25
  'verify_filter_cascade.mjs',  // 23 tests  S23
  'verify_import_rbac.mjs',     // 15 tests  S23
  'verify_modal_layout.mjs',    //  9 tests  S23
];

const SEP = '='.repeat(62);
let passed = 0;
let failed = 0;
const failures = [];
const start = Date.now();

console.log(`${SEP}`);
console.log(`SHTD Dashboard — Test Runner  (${SUITES.length} suites)`);
console.log(`${SEP}\n`);

for (const suite of SUITES) {
  const suiteStart = Date.now();
  process.stdout.write(`▶ ${suite} … `);
  try {
    execFileSync(process.execPath, [path.join(__dirname, suite)], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const ms = Date.now() - suiteStart;
    console.log(`✅  (${ms}ms)`);
    passed++;
  } catch (err) {
    const ms = Date.now() - suiteStart;
    console.log(`❌  (${ms}ms)`);
    // Print the suite's stdout/stderr so CI logs show what failed
    const out = (err.stdout || '').toString().trim();
    const errOut = (err.stderr || '').toString().trim();
    if (out) console.log(out.split('\n').map(l => `    ${l}`).join('\n'));
    if (errOut) console.error(errOut.split('\n').map(l => `    ${l}`).join('\n'));
    failures.push(suite);
    failed++;
  }
}

const total = Date.now() - start;
console.log(`\n${SEP}`);
console.log(`Result: ${passed}/${SUITES.length} suites passed  (${total}ms)`);
if (failed > 0) {
  console.error(`\nFAILED suites (${failed}):`);
  failures.forEach(s => console.error(`  ✗ ${s}`));
  process.exit(1);
} else {
  console.log('All suites passed ✅');
}
