/**
 * verify_date_unify.mjs — Unified date handling (helpers.js)
 * Canonical storage/memory = ISO 'YYYY-MM-DD'; display = 'DD/MM/YYYY'.
 * Guards the Google-Sheets locale bug ("30-thg 7-26") + every legacy format
 * (Date obj, Excel serial, DD-MMM-YY, DD/MM/YYYY) → one ISO string.
 */
import { chromium } from 'playwright';
import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 3047;
const BASE = `http://localhost:${PORT}`;

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

let pass = 0, fail = 0;
const PASS = m => { pass++; console.log('  ✅ ' + m); };
const FAIL = m => { fail++; console.log('  ❌ ' + m); };
const eq   = (name, got, exp) => (JSON.stringify(got) === JSON.stringify(exp))
  ? PASS(`${name} = ${JSON.stringify(got)}`)
  : FAIL(`${name}: nhận ${JSON.stringify(got)}, kỳ vọng ${JSON.stringify(exp)}`);

const browser = await chromium.launch();
const page = await browser.newPage();
const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));

await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.waitForFunction(() => typeof toISODate === 'function' && typeof fmtDate === 'function');

console.log('\n=== verify_date_unify ===');

// D1: toISODate — every supported input → ISO
const d1 = await page.evaluate(() => ({
  iso:      toISODate('2026-07-30'),
  isoTime:  toISODate('2026-07-30T00:00:00.000Z'),
  mmm:      toISODate('30-Jul-26'),
  mmmFull:  toISODate('30-Jul-2026'),
  ddmmyyyy: toISODate('30/07/2026'),
  dateObj:  toISODate(new Date(2026, 6, 30)),   // month 6 = July
  serial:   toISODate(46233),                    // Sheets serial for 2026-07-30
  empty:    toISODate(''),
  nullv:    toISODate(null),
  junk:     toISODate('hello'),
}));
eq('D1a ISO passthrough',        d1.iso,      '2026-07-30');
eq('D1b ISO w/ time',            d1.isoTime,  '2026-07-30');
eq('D1c DD-MMM-YY',              d1.mmm,      '2026-07-30');
eq('D1d DD-MMM-YYYY',            d1.mmmFull,  '2026-07-30');
eq('D1e DD/MM/YYYY',             d1.ddmmyyyy, '2026-07-30');
eq('D1f Date object',            d1.dateObj,  '2026-07-30');
eq('D1g Excel serial 46233',     d1.serial,   '2026-07-30');
eq('D1h empty → ""',             d1.empty,    '');
eq('D1i null → ""',              d1.nullv,    '');
eq('D1j junk → ""',              d1.junk,     '');

// D2: THE BUG — Google Sheets Vietnamese locale month "thg 7"
const d2 = await page.evaluate(() => ({
  dash:  toISODate('30-thg 7-26'),
  disp:  fmtDate('30-thg 7-26'),
  full:  toISODate('30-tháng 7-2026'),
}));
eq('D2a "30-thg 7-26" → ISO',        d2.dash, '2026-07-30');
eq('D2b "30-thg 7-26" display fixed', d2.disp, '30/07/2026');   // was the broken "26/thg 7/30"
eq('D2c "30-tháng 7-2026" → ISO',    d2.full, '2026-07-30');

// D3: fmtDate — display DD/MM/YYYY, empty → dash
const d3 = await page.evaluate(() => ({
  iso:   fmtDate('2026-07-30'),
  mmm:   fmtDate('30-Jul-26'),
  empty: fmtDate(''),
  junk:  fmtDate('nope'),
}));
eq('D3a fmtDate ISO',       d3.iso,   '30/07/2026');
eq('D3b fmtDate DD-MMM-YY', d3.mmm,   '30/07/2026');
eq('D3c fmtDate empty',     d3.empty, '–');
eq('D3d fmtDate junk',      d3.junk,  '–');

// D4: parseVNDate → real Date (for isOverdue/dashboard/report)
const d4 = await page.evaluate(() => {
  const a = parseVNDate('2026-07-30');
  const b = parseVNDate('30-Jul-26');
  const c = parseVNDate('');
  return {
    aYear: a ? a.getFullYear() : null, aMon: a ? a.getMonth() : null, aDay: a ? a.getDate() : null,
    bIso: b ? `${b.getFullYear()}-${String(b.getMonth()+1).padStart(2,'0')}-${String(b.getDate()).padStart(2,'0')}` : null,
    cNull: c,
  };
});
eq('D4a parseVNDate ISO year',  d4.aYear, 2026);
eq('D4b parseVNDate ISO month', d4.aMon,  6);
eq('D4c parseVNDate ISO day',   d4.aDay,  30);
eq('D4d parseVNDate DD-MMM-YY', d4.bIso,  '2026-07-30');
eq('D4e parseVNDate empty null', d4.cNull, null);

// D5: fmtDateExport = storage serializer → ISO (any input)
const d5 = await page.evaluate(() => ({
  mmm:  fmtDateExport('30-Jul-26'),
  thg:  fmtDateExport('30-thg 7-26'),
  iso:  fmtDateExport('2026-07-30'),
  empty: fmtDateExport(''),
}));
eq('D5a fmtDateExport DD-MMM-YY → ISO', d5.mmm,  '2026-07-30');
eq('D5b fmtDateExport thg → ISO',       d5.thg,  '2026-07-30');
eq('D5c fmtDateExport ISO → ISO',       d5.iso,  '2026-07-30');
eq('D5d fmtDateExport empty → ""',      d5.empty, '');

// D6: round-trip stability (store → display → store)
const d6 = await page.evaluate(() => {
  const stored = fmtDateExport('30-thg 7-26');   // → ISO
  const shown  = fmtDate(stored);                // → DD/MM/YYYY
  const back   = fmtDateExport(shown);           // → ISO again
  return { stored, shown, back, stable: stored === back };
});
eq('D6 round-trip stable (thg→ISO→DD/MM→ISO)', d6.stable, true);

// D7: no JS errors on load
eq('D7 no JS console errors', jsErrors, []);

console.log(`\n  TOTAL: ${pass + fail} | ✅ PASS: ${pass} | ❌ FAIL: ${fail}`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
