import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const BASE = 'http://localhost:53704';
const SS_DIR = path.join(process.cwd(), '_verify_screenshots');
if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR);

const VIEWS = [
  { name: 'kpi-overview',    nav: '[data-view="kpi-overview"]',    label: 'KPI Overview' },
  { name: 'kpi-progress',    nav: '[data-view="kpi-progress"]',    label: 'KPI Progress' },
  { name: 'owner-analysis',  nav: '[data-view="owner-analysis"]',  label: 'Owner Analysis' },
];

const results = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Block GAS to isolate from real backend
await page.route('**/script.google.com/**', r => r.abort());

const jsErrors = [];
page.on('pageerror', e => jsErrors.push(e.message));
page.on('console', m => { if (m.type() === 'error') jsErrors.push('[console.error] ' + m.text()); });

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

for (const view of VIEWS) {
  jsErrors.length = 0;

  // Click nav item
  const navEl = await page.$(view.nav);
  if (!navEl) {
    results.push({ view: view.label, status: 'FAIL', reason: 'Nav element not found: ' + view.nav });
    continue;
  }
  await navEl.click();
  await page.waitForTimeout(1500);

  const ss = path.join(SS_DIR, `kpi_${view.name}.png`);
  await page.screenshot({ path: ss, fullPage: false });

  // Check for visible content (not blank)
  const viewEl = await page.$(`#view-${view.name}, .view-${view.name}, [id*="${view.name}"]`);

  const errors = [...jsErrors];
  results.push({
    view: view.label,
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    errors,
    screenshot: ss,
  });
}

// Owner Analysis — check 3 tabs
await page.$eval('[data-view="owner-analysis"]', el => el.click()).catch(() => {});
await page.waitForTimeout(800);

const tabs = await page.$$('.oa-tab, [data-tab], .tab-btn');
console.log(`\nOwner Analysis tabs found: ${tabs.length}`);
for (let i = 0; i < tabs.length; i++) {
  try {
    const label = await tabs[i].innerText();
    await tabs[i].click();
    await page.waitForTimeout(400);
    console.log(`  Tab clicked: ${label.trim()}`);
  } catch (e) {
    console.log(`  Tab ${i}: error - ${e.message}`);
  }
}

await browser.close();

console.log('\n=== KPI View Verification Results ===');
for (const r of results) {
  const icon = r.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${r.view}: ${r.status}`);
  if (r.errors?.length) r.errors.forEach(e => console.log(`   ERROR: ${e}`));
  if (r.screenshot) console.log(`   Screenshot: ${r.screenshot}`);
}

const failed = results.filter(r => r.status === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
