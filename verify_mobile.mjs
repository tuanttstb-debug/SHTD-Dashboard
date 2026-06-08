import { chromium } from 'playwright';

const BASE = 'http://localhost:53704';
const SS = 'D:\\Công việc\\Vibecode\\SHTD-Dashboard\\_verify_screenshots';

const DEVICES = [
  { name: 'iPhone SE (375px)',  width: 375,  height: 667 },
  { name: 'Galaxy S20 (360px)', width: 360,  height: 800 },
  { name: 'iPhone 14 (390px)',  width: 390,  height: 844 },
  { name: 'Small (320px)',      width: 320,  height: 568 },
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const dev of DEVICES) {
  const page = await browser.newPage({ viewport: { width: dev.width, height: dev.height } });
  await page.route('**/script.google.com/**', r => r.abort());
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);

  // Check hamburger visible and clickable
  const ham = await page.$('#hamburger');
  const hamBox = await ham?.boundingBox();
  const hamVisible = hamBox && hamBox.width > 0 && hamBox.x >= 0 && hamBox.x < dev.width;

  // Check sidebar hidden by default
  const sidebar = await page.$('#sidebar');
  const sidebarBox = await sidebar?.boundingBox();
  const sidebarHidden = !sidebarBox || sidebarBox.x < 0;

  // Check qv-topbar-btn hidden
  const qvBtn = await page.$('.qv-topbar-btn');
  const qvBox = await qvBtn?.boundingBox();
  const qvHidden = !qvBox || qvBox.width === 0;

  // Screenshot topbar
  const slug = dev.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  await page.screenshot({ path: `${SS}\\mob_topbar_${slug}.png`, clip: { x: 0, y: 0, width: dev.width, height: 64 } });

  // Open sidebar via hamburger click
  let sidebarOpens = false;
  if (hamVisible) {
    await ham.click();
    await page.waitForTimeout(400);
    const afterBox = await sidebar?.boundingBox();
    sidebarOpens = afterBox && afterBox.x >= 0;
    await page.screenshot({ path: `${SS}\\mob_sidebar_open_${slug}.png`, clip: { x: 0, y: 0, width: dev.width, height: dev.height } });
    // Close sidebar
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  const status = (hamVisible && qvHidden && sidebarOpens) ? 'PASS' : 'FAIL';
  results.push({ dev: dev.name, status, hamVisible, hamBox: hamBox ? `x:${Math.round(hamBox.x)} w:${Math.round(hamBox.width)}` : 'NOT FOUND', qvHidden, sidebarOpens });

  await page.close();
}

await browser.close();

console.log('\n=== Mobile Topbar Verification ===');
for (const r of results) {
  console.log(`${r.status === 'PASS' ? '✅' : '❌'} ${r.dev}`);
  console.log(`   Hamburger visible: ${r.hamVisible} (${r.hamBox})`);
  console.log(`   QV btn hidden: ${r.qvHidden}`);
  console.log(`   Sidebar opens on click: ${r.sidebarOpens}`);
}
const failed = results.filter(r => r.status === 'FAIL');
console.log(`\n${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length > 0 ? 1 : 0);
