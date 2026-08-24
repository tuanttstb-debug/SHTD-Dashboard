/**
 * verify_h2_core.mjs — B2 client core (h2-core.js) unit + load smoke tests
 *
 *  H2C1  – Module loaded: dbH2 + compute fns exist; no collision
 *  H2C2  – _h2Parse: grid→objects keyed by header; drops empty-ID rows
 *  H2C3  – h2Achievement up-direction (baseline<target)
 *  H2C4  – h2Achievement down-direction (target<baseline: TAT/thời gian)
 *  H2C5  – h2Achievement binary via Status done → 100
 *  H2C6  – h2ComputeRag: explicit tracking RAG RED honored
 *  H2C7  – h2ComputeRag: overdue deadline + <100 → RED
 *  H2C8  – h2ComputeRag: achievement ≥100 → GREEN
 *  H2C9  – h2Score: weighted objective sum (60/40 × 50/100 = 70)
 *  H2C10 – h2WeightValidate: 100→ok, 90→not ok
 *  H2C11 – h2Capacity: P1 over max → overload flag
 *  H2C12 – h2FlagBadKpi: missing target/unit/weight flagged
 *  H2CX  – No JS errors on page load (module loads cleanly with app)
 *
 * Run: node verify_h2_core.mjs
 */

import { chromium } from 'playwright';
import http         from 'http';
import fs           from 'fs';
import path         from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT      = 3071;
const BASE_URL  = `http://localhost:${PORT}`;

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const fp  = path.join(__dirname, url === '/' ? 'index.html' : url);
  try {
    const data = fs.readFileSync(fp);
    const ext  = path.extname(fp);
    const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' }[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch { res.writeHead(404); res.end('404'); }
});
server.listen(PORT);

let passed = 0, failed = 0;
function log(id, ok, msg) {
  console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`);
  if (ok) passed++; else failed++;
}
const approx = (a, b, eps = 0.5) => Math.abs(a - b) < eps;

const browser = await chromium.launch();
const page    = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
// Chặn mọi call GAS thật → cách ly network (readH2 sẽ fail lặng)
await page.route('**script.google.com**', r => r.abort());

await page.goto(BASE_URL, { waitUntil: 'load' });
await page.waitForTimeout(400);

/* H2C1 — module loaded */
const loaded = await page.evaluate(() => ({
  db: typeof dbH2 === 'object' && dbH2 && Array.isArray(dbH2.objectives),
  fns: ['h2Achievement','h2ComputeRag','h2Score','h2Capacity','h2WeightValidate','h2FlagBadKpi','_h2Parse','readH2','_gasH2Upsert']
        .every(f => typeof window[f] === 'function' || eval(`typeof ${f} === 'function'`))
}));
log('H2C1', loaded.db && loaded.fns, `dbH2 present=${loaded.db}, compute fns present=${loaded.fns}`);

/* H2C2 — _h2Parse */
const parse = await page.evaluate(() => {
  const grid = [['ID','Name'], ['OBJ-1','A'], ['','skip'], ['OBJ-2','B']];
  const out = _h2Parse(grid);
  return { n: out.length, first: out[0] && out[0].ID, name: out[0] && out[0].Name };
});
log('H2C2', parse.n === 2 && parse.first === 'OBJ-1' && parse.name === 'A', `parsed ${parse.n} rows (empty-ID dropped), first=${parse.first}`);

/* seed helper: set dbH2 then run fn */
async function withData(seed, fn) {
  return page.evaluate(({ seed, fnStr }) => {
    Object.assign(dbH2, { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] });
    Object.assign(dbH2, seed);
    // eslint-disable-next-line no-eval
    return eval('(' + fnStr + ')()');
  }, { seed, fnStr: fn.toString() });
}

/* H2C3 — achievement up */
const c3 = await withData(
  { kpis: [{ ID: 'K1', Baseline: '120', Target: '300', Unit: 'KH', Weight: '100', Status: '' }] },
  () => h2Achievement(dbH2.kpis[0])   // no tracking → uses tracking actual? none → falls to binary 0
);
// no actual → cannot compute numeric; expect 0 (binary, not done)
log('H2C3a', approx(c3, 0), `no-actual up KPI → ${c3} (expect 0 baseline)`);
const c3b = await withData(
  { kpis: [{ ID: 'K1', Baseline: '120', Target: '300', Unit: 'KH', Weight: '100' }],
    tracking: [{ ID: 'T1', Month: 'T10', KpiID: 'K1', Actual: '210' }] },
  () => h2Achievement(dbH2.kpis[0])
);
log('H2C3', approx(c3b, 50), `up-direction 120→300 actual 210 → ${c3b}% (expect 50)`);

/* H2C4 — achievement down */
const c4 = await withData(
  { kpis: [{ ID: 'K1', Baseline: '8', Target: '5', Unit: 'ngày' }],
    tracking: [{ ID: 'T1', Month: 'T10', KpiID: 'K1', Actual: '6.5' }] },
  () => h2Achievement(dbH2.kpis[0])
);
log('H2C4', approx(c4, 50), `down-direction 8→5 actual 6.5 → ${c4}% (expect 50)`);

/* H2C5 — binary done */
const c5 = await withData(
  { kpis: [{ ID: 'K1', Baseline: '', Target: 'Đạt', Unit: '', Status: 'Done' }] },
  () => h2Achievement(dbH2.kpis[0])
);
log('H2C5', approx(c5, 100), `binary Status=Done → ${c5}% (expect 100)`);

/* H2C6 — explicit RAG */
const c6 = await withData(
  { kpis: [{ ID: 'K1', Target: '10' }],
    tracking: [{ ID: 'T1', Month: 'T9', KpiID: 'K1', RAG: 'RED', Progress: '80' }] },
  () => h2ComputeRag(dbH2.kpis[0])
);
log('H2C6', c6 === 'RED', `explicit tracking RAG RED → ${c6}`);

/* H2C7 — overdue → RED */
const c7 = await withData(
  { kpis: [{ ID: 'K1', Target: '10', Deadline: '2026-01-01' }],
    tracking: [{ ID: 'T1', Month: 'T8', KpiID: 'K1', Progress: '40' }] },
  () => h2ComputeRag(dbH2.kpis[0])
);
log('H2C7', c7 === 'RED', `overdue deadline + 40% → ${c7} (expect RED)`);

/* H2C8 — ≥100 GREEN */
const c8 = await withData(
  { kpis: [{ ID: 'K1', Baseline: '0', Target: '10' }],
    tracking: [{ ID: 'T1', Month: 'T12', KpiID: 'K1', Actual: '10', Progress: '100' }] },
  () => h2ComputeRag(dbH2.kpis[0])
);
log('H2C8', c8 === 'GREEN', `achievement 100% → ${c8} (expect GREEN)`);

/* H2C9 — score weighted */
const c9 = await withData(
  { objectives: [
      { ID: 'O1', Type: 'member', Owner: 'quang', Weight: '60' },
      { ID: 'O2', Type: 'member', Owner: 'quang', Weight: '40' } ],
    kpis: [
      { ID: 'K1', ObjectiveID: 'O1', Weight: '100', Baseline: '0', Target: '10' },
      { ID: 'K2', ObjectiveID: 'O2', Weight: '100', Status: 'Done' } ],
    tracking: [ { ID: 'T1', Month: 'T10', KpiID: 'K1', Actual: '5' } ] },
  () => h2Score('quang').score   // O1: 50%, O2: 100% → 0.6*50 + 0.4*100 = 70
);
log('H2C9', approx(c9, 70), `score 60/40 × 50/100 → ${c9} (expect 70)`);

/* H2C10 — weight validate */
const c10 = await withData(
  { objectives: [
      { ID: 'O1', Type: 'member', Owner: 'quang', Weight: '60' },
      { ID: 'O2', Type: 'member', Owner: 'quang', Weight: '40' },
      { ID: 'O3', Type: 'member', Owner: 'dung', Weight: '90' } ] },
  () => { const v = h2WeightValidate(); return { q: v.find(x=>x.member==='quang'), d: v.find(x=>x.member==='dung') }; }
);
log('H2C10', c10.q.ok === true && c10.d.ok === false, `quang=${c10.q.total}(ok=${c10.q.ok}), dung=${c10.d.total}(ok=${c10.d.ok})`);

/* H2C11 — capacity overload */
const c11 = await withData(
  { config: [{ Key: 'max_p1', Value: '3' }, { Key: 'max_objectives', Value: '5' }],
    objectives: [
      { ID: 'O1', Type: 'member', Owner: 'quang', Priority: 'P1' },
      { ID: 'O2', Type: 'member', Owner: 'quang', Priority: 'P1' },
      { ID: 'O3', Type: 'member', Owner: 'quang', Priority: 'P1' },
      { ID: 'O4', Type: 'member', Owner: 'quang', Priority: 'P1' } ] },
  () => { const c = h2Capacity(); const q = c.find(x=>x.member==='quang'); return { p1: q.p1, overload: q.overload }; }
);
log('H2C11', c11.p1 === 4 && c11.overload === true, `quang P1=${c11.p1} → overload=${c11.overload} (max_p1=3)`);

/* H2C12 — flag bad KPI */
const c12 = await withData(
  { kpis: [{ ID: 'K1', KpiName: 'x', Target: '', Unit: '', Weight: '', Owner: '', KpiType: '' }] },
  () => h2FlagBadKpi(dbH2.kpis[0])
);
log('H2C12', c12.length >= 4 && c12.some(f=>/Target/.test(f)) && c12.some(f=>/Weight/.test(f)), `flags: ${c12.join('; ')}`);

/* H2CX — no JS errors */
log('H2CX', jsErrors.length === 0, jsErrors.length ? `errors: ${jsErrors.join(' | ')}` : 'no JS errors on load');

console.log(`\n── H2 core: ${passed}/${passed + failed} passed ──`);
await browser.close();
server.close();
process.exit(failed ? 1 : 0);
