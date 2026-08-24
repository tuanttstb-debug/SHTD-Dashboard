/**
 * verify_mobile_s37.mjs — S37 Mobile Responsive Fix
 * Checks: topbar position:fixed, content padding-top, thead top offset,
 *         toolbar stacking, path-hint hidden — all at iPhone SE viewport (375×812).
 */
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT   = 3037;
const BASE   = `http://localhost:${PORT}`;
const OUT    = 'test-results/mobile_s37';
const IPHONE = { width: 375, height: 812, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

fs.mkdirSync(OUT, { recursive: true });

/* ── HTTP server ── */
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

/* ── helpers ── */
let pass = 0, fail = 0;
function ok(name)   { console.log(`  ✅ ${name}`); pass++; }
function bad(name, detail) { console.error(`  ❌ ${name}${detail ? ': ' + detail : ''}`); fail++; }

async function injectAuth(page) {
  await page.evaluate(() => {
    // suppress login overlay
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
    // inject minimal auth
    localStorage.setItem('shtd_auth_v1', JSON.stringify({
      username:'TuanTT4', displayName:'Tuấn TT4', role:'Admin', team:'Số',
      token:'test-token', expiresAt: Date.now() + 86400000
    }));
    localStorage.setItem('shtd_v2', JSON.stringify({
      tasks: [
        { id:'CV-001', name:'Task A', state:'Đang làm', rag:'Xanh', team:'Số',
          picRes:'TuanTT4', picAcc:'TuanTT4', highlight:'Y',
          deadline:'2026-12-31', startDate:'2026-01-01', progress:50 },
        { id:'CV-002', name:'Task B', state:'Đang làm', rag:'Đỏ', team:'BL',
          picRes:'DungLQ1', picAcc:'DungLQ1', highlight:'Y',
          deadline:'2026-01-01', startDate:'2026-01-01', progress:10 }
      ],
      initiatives: [], cases: [], _serverTs: null, deletedIds: []
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.evaluate(() => {
    const lo = document.getElementById('loginOverlay');
    if (lo) lo.style.display = 'none';
  });
}

const browser = await chromium.launch();
const ctx     = await browser.newContext({ viewport: IPHONE });
const page    = await ctx.newPage();

console.log('\n══════════════════════════════════════════');
console.log(' S37 Mobile Smoke Test  (375×812 iPhone)');
console.log('══════════════════════════════════════════\n');

/* ── Load page ── */
await page.goto(BASE, { waitUntil: 'networkidle' });
await injectAuth(page);
await page.waitForTimeout(600);

/* ══════════════════════════════════════════════
   M1: Topbar — position:fixed + z-index + top:0
   ══════════════════════════════════════════════ */
console.log('M1 — Topbar CSS on mobile:');
{
  const styles = await page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    if (!tb) return null;
    const cs = getComputedStyle(tb);
    return {
      position: cs.position,
      top:      cs.top,
      left:     cs.left,
      right:    cs.right,
      zIndex:   cs.zIndex,
      height:   cs.height,
    };
  });

  if (!styles) { bad('topbar element found'); }
  else {
    styles.position === 'fixed'
      ? ok(`position: fixed`)
      : bad(`position should be fixed`, styles.position);

    styles.top === '0px'
      ? ok(`top: 0px`)
      : bad(`top should be 0px`, styles.top);

    parseInt(styles.zIndex) >= 100
      ? ok(`z-index: ${styles.zIndex} (≥100)`)
      : bad(`z-index too low`, styles.zIndex);

    const h = parseInt(styles.height);
    (h >= 56 && h <= 70)
      ? ok(`height: ${styles.height} (56–70px range)`)
      : bad(`unexpected height`, styles.height);
  }
}

/* ══════════════════════════════════════════════
   M2: Topbar visible at top of viewport
   ══════════════════════════════════════════════ */
console.log('\nM2 — Topbar rect in viewport:');
{
  const rect = await page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    if (!tb) return null;
    const r = tb.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, height: r.height, left: r.left };
  });

  if (!rect) { bad('getBoundingClientRect failed'); }
  else {
    rect.top === 0
      ? ok(`topbar.top === 0 (flush with viewport top)`)
      : bad(`topbar not at viewport top`, `top=${rect.top}`);

    rect.left === 0
      ? ok(`topbar.left === 0`)
      : bad(`topbar not at left edge`, `left=${rect.left}`);
  }
}

/* Screenshot: dashboard with visible topbar */
await page.screenshot({ path: `${OUT}/01_dashboard_topbar.png`, fullPage: false });
console.log(`  📸 ${OUT}/01_dashboard_topbar.png`);

/* ══════════════════════════════════════════════
   M3: Content padding-top clears topbar
   ══════════════════════════════════════════════ */
console.log('\nM3 — Content padding-top:');
{
  const pt = await page.evaluate(() => {
    const c = document.querySelector('.content');
    if (!c) return null;
    return getComputedStyle(c).paddingTop;
  });

  if (!pt) { bad('.content not found'); }
  else {
    const px = parseInt(pt);
    px >= 68
      ? ok(`content padding-top: ${pt} (≥68px)`)
      : bad(`content padding-top too small`, pt);
  }
}

/* ══════════════════════════════════════════════
   M4: Hamburger visible + clickable
   ══════════════════════════════════════════════ */
console.log('\nM4 — Hamburger button:');
{
  const hb = await page.$('#hamburger');
  if (!hb) { bad('#hamburger not found'); }
  else {
    const vis = await hb.isVisible();
    vis ? ok('hamburger is visible') : bad('hamburger not visible');

    const rect = await hb.boundingBox();
    if (rect) {
      (rect.x >= 0 && rect.y >= 0 && rect.y < 70)
        ? ok(`hamburger at (${Math.round(rect.x)}, ${Math.round(rect.y)}) — within topbar`)
        : bad('hamburger outside expected topbar area', `y=${rect.y}`);
    }
  }
}

/* ══════════════════════════════════════════════
   M5: Sidebar opens over fixed topbar
   ══════════════════════════════════════════════ */
console.log('\nM5 — Sidebar open/close:');
{
  await page.click('#hamburger');
  await page.waitForTimeout(400);
  const sidebar = await page.$('.sidebar.open');
  sidebar
    ? ok('sidebar opens on hamburger click')
    : bad('sidebar did not open');

  await page.screenshot({ path: `${OUT}/02_sidebar_open.png`, fullPage: false });
  console.log(`  📸 ${OUT}/02_sidebar_open.png`);

  // close via overlay — tap to the right of the 280px sidebar
  const overlay = await page.$('.sidebar-overlay.visible');
  if (overlay) {
    await page.mouse.click(350, 400); // right of sidebar (280px wide), on overlay
    await page.waitForTimeout(300);
    const closed = !(await page.$('.sidebar.open'));
    closed ? ok('sidebar closes via overlay tap') : bad('sidebar did not close');
  } else {
    bad('sidebar overlay not visible after open');
  }
}

/* ══════════════════════════════════════════════
   M6: Navigate to Tasks — toolbar stacks vertically
   ══════════════════════════════════════════════ */
console.log('\nM6 — Tasks toolbar stacking:');
await page.evaluate(() => {
  // Direct DOM activation — bypasses auth-gated navigateTo()
  // Must clear inline style="display:none" — it overrides CSS class rules
  document.querySelectorAll('.view-section').forEach(s => {
    s.style.display = '';
    s.classList.remove('active');
  });
  const tv = document.getElementById('view-tasks');
  if (tv) { tv.style.display = ''; tv.classList.add('active'); }
  const pt = document.getElementById('pageTitle');
  if (pt) pt.textContent = 'Quản lý Task';
});
await page.waitForTimeout(400);

{
  const toolbarStyles = await page.evaluate(() => {
    const tb = document.querySelector('#view-tasks .toolbar');
    if (!tb) return null;
    const cs = getComputedStyle(tb);
    return { flexDirection: cs.flexDirection, alignItems: cs.alignItems };
  });

  if (!toolbarStyles) { bad('.toolbar not found in tasks view'); }
  else {
    toolbarStyles.flexDirection === 'column'
      ? ok(`toolbar flex-direction: column`)
      : bad('toolbar should be column', toolbarStyles.flexDirection);

    toolbarStyles.alignItems === 'flex-start'
      ? ok('toolbar align-items: flex-start')
      : bad('toolbar align-items wrong', toolbarStyles.alignItems);
  }

  // Check toolbar-right width is 100%
  const rightWidth = await page.evaluate(() => {
    const tr = document.querySelector('#view-tasks .toolbar-right');
    if (!tr) return null;
    const cs = getComputedStyle(tr);
    return { width: tr.offsetWidth, parentWidth: tr.parentElement.offsetWidth };
  });

  if (rightWidth) {
    Math.abs(rightWidth.width - rightWidth.parentWidth) <= 2
      ? ok(`toolbar-right spans full width (${rightWidth.width}px)`)
      : bad('toolbar-right not full width', `${rightWidth.width} vs parent ${rightWidth.parentWidth}`);
  }

  // All toolbar-right buttons that are rendered (not display:none) must be in viewport
  const btns = await page.evaluate(() => {
    const tr = document.querySelector('#view-tasks .toolbar-right');
    if (!tr) return [];
    return [...tr.querySelectorAll('.btn')].map(b => {
      const r = b.getBoundingClientRect();
      const cs = getComputedStyle(b);
      const intentionallyHidden = cs.display === 'none'; // e.g. #btnSync (hidden until GAS connected)
      return {
        text: b.innerText.trim().slice(0,20) || b.id,
        inViewport: r.height > 0 && r.bottom > 0 && r.top < window.innerHeight,
        hidden: intentionallyHidden
      };
    });
  });

  const rendered = btns.filter(b => !b.hidden);
  const visible  = rendered.filter(b => b.inViewport);
  const clipped  = rendered.filter(b => !b.inViewport);
  ok(`${visible.length} rendered toolbar buttons in viewport: ${visible.map(b=>b.text).join(', ')}`);
  clipped.length === 0
    ? ok('no rendered toolbar buttons clipped outside viewport')
    : bad(`${clipped.length} rendered buttons outside viewport`, clipped.map(b=>b.text).join(', '));

  await page.screenshot({ path: `${OUT}/03_tasks_toolbar.png`, fullPage: false });
  console.log(`  📸 ${OUT}/03_tasks_toolbar.png`);

  // Scroll down to see if more buttons are below
  await page.screenshot({ path: `${OUT}/04_tasks_toolbar_scroll.png`, fullPage: true });
  console.log(`  📸 ${OUT}/04_tasks_toolbar_scroll.png (full page)`);
}

/* ══════════════════════════════════════════════
   M7: path-hint hidden on mobile
   ══════════════════════════════════════════════ */
console.log('\nM7 — path-hint hidden:');
{
  const phDisplay = await page.evaluate(() => {
    const ph = document.querySelector('.path-hint');
    if (!ph) return 'not found';
    return getComputedStyle(ph).display;
  });

  phDisplay === 'none'
    ? ok('path-hint display:none on mobile ✓')
    : bad('path-hint should be hidden', phDisplay);
}

/* ══════════════════════════════════════════════
   M8: Sticky thead top clears fixed topbar
   ══════════════════════════════════════════════ */
console.log('\nM8 — Sticky thead top offset:');
{
  const theadTop = await page.evaluate(() => {
    const th = document.querySelector('thead');
    if (!th) return null;
    return getComputedStyle(th).top;
  });

  if (!theadTop) { bad('thead not found'); }
  else {
    const px = parseInt(theadTop);
    px >= 56
      ? ok(`thead top: ${theadTop} (≥56px — clears fixed topbar)`)
      : bad('thead top too small, may overlap topbar', theadTop);
  }
}

/* ══════════════════════════════════════════════
   M9: Navigate to Case Pipeline — toolbar
   ══════════════════════════════════════════════ */
console.log('\nM9 — Case Pipeline toolbar:');
await page.evaluate(() => {
  document.querySelectorAll('.view-section').forEach(s => {
    s.style.display = '';
    s.classList.remove('active');
  });
  const cp = document.getElementById('view-case-pipeline');
  if (cp) { cp.style.display = ''; cp.classList.add('active'); }
  const pt = document.getElementById('pageTitle');
  if (pt) pt.textContent = 'Case Pipeline';
});
await page.waitForTimeout(400);

{
  const cpToolbar = await page.evaluate(() => {
    const tb = document.querySelector('#view-case-pipeline .toolbar');
    if (!tb) return null;
    const cs = getComputedStyle(tb);
    const tr = tb.querySelector('.toolbar-right');
    return {
      flexDirection: cs.flexDirection,
      rightWidth: tr ? tr.offsetWidth : 0,
      parentWidth: tb.offsetWidth
    };
  });

  if (!cpToolbar) { bad('.toolbar not found in case-pipeline view'); }
  else {
    cpToolbar.flexDirection === 'column'
      ? ok('CP toolbar flex-direction: column')
      : bad('CP toolbar should be column', cpToolbar.flexDirection);

    Math.abs(cpToolbar.rightWidth - cpToolbar.parentWidth) <= 2
      ? ok(`CP toolbar-right full width (${cpToolbar.rightWidth}px)`)
      : bad('CP toolbar-right not full width', `${cpToolbar.rightWidth} vs ${cpToolbar.parentWidth}`);
  }

  await page.screenshot({ path: `${OUT}/05_cp_toolbar.png`, fullPage: false });
  console.log(`  📸 ${OUT}/05_cp_toolbar.png`);
}

/* ══════════════════════════════════════════════
   M10: Topbar still visible after content scroll
   ══════════════════════════════════════════════ */
console.log('\nM10 — Topbar fixed while content scrolls:');
await page.evaluate(() => {
  document.querySelectorAll('.view-section').forEach(s => {
    s.style.display = '';
    s.classList.remove('active');
  });
  const tv = document.getElementById('view-tasks');
  if (tv) { tv.style.display = ''; tv.classList.add('active'); }
});
await page.waitForTimeout(300);

{
  // Scroll the content div down
  await page.evaluate(() => {
    const c = document.getElementById('contentArea');
    if (c) c.scrollTop = 300;
  });
  await page.waitForTimeout(200);

  const topbarRect = await page.evaluate(() => {
    const tb = document.querySelector('.topbar');
    if (!tb) return null;
    const r = tb.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom };
  });

  if (topbarRect) {
    topbarRect.top === 0
      ? ok('topbar stays at viewport top (y=0) after content scroll')
      : bad('topbar moved after scroll', `top=${topbarRect.top}`);
  }

  await page.screenshot({ path: `${OUT}/06_topbar_after_scroll.png`, fullPage: false });
  console.log(`  📸 ${OUT}/06_topbar_after_scroll.png`);
}

/* ══════════════════════════════════════════════
   Summary
   ══════════════════════════════════════════════ */
await browser.close();
server.close();

const total = pass + fail;
console.log('\n══════════════════════════════════════════');
console.log(` Results: ${pass}/${total} PASS${fail > 0 ? `  —  ${fail} FAIL` : ''}`);
console.log('══════════════════════════════════════════\n');

if (fail > 0) process.exit(1);
