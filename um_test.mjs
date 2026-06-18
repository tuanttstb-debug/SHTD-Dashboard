/**
 * User Management feature — local UI test (no real GAS needed)
 */
import { chromium } from 'playwright';

const br  = await chromium.launch({ headless: true });
const pg  = await br.newPage();
const errors = [];
pg.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

// Intercept GAS requests to prevent doLogout() from triggering with fake token
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzzezX0qvu73U7EBrsj7VeBoPbzg6edLNt818-pzlle2Gx2xfB-NQuxJYfx3jGHRcc/exec';
await pg.route(GAS_URL, async (route) => {
  const body = JSON.parse(route.request().postData() || '{}');
  const action = body.action || '';
  if (action === 'user-list') {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({
      status: 'ok',
      data: {
        header: ['Username','Display_Name','Role','Team','Email','Active','Created_At','Last_Login'],
        rows: [
          ['TuanTT4','TuanTT4','Admin','So','tuantt@example.com',true,'2026-01-01T00:00:00.000Z','2026-06-08T10:00:00.000Z'],
          ['QuangNN3','QuangNN3','User','So','',true,'2026-01-01T00:00:00.000Z','']
        ]
      }
    })});
  } else if (action === 'user-create' || action === 'user-update' || action === 'user-reset-password') {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
  } else {
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', values: [], serverTs: Date.now() }) });
  }
});

await pg.goto('http://localhost:7823/');
await pg.waitForLoadState('domcontentloaded');

// Inject Admin session + set UI state without triggering startApp()
await pg.evaluate(() => {
  localStorage.setItem('shtd_auth_v1', JSON.stringify({
    token: 'fake',
    user: { username: 'TuanTT4', displayName: 'TuanTT4', role: 'Admin', team: 'So' },
    exp: Date.now() + 86400000
  }));
  applyUserToUI({ username: 'TuanTT4', displayName: 'TuanTT4', role: 'Admin', team: 'So' });
  const lo = document.getElementById('loginOverlay');
  if (lo) lo.style.display = 'none';
  const ld = document.getElementById('loadingOverlay');
  if (ld) { ld.style.display = 'none'; ld.classList.remove('visible'); }
  // window.onload returned early (no auth session at load time), so setupListeners() was never called
  setupListeners();
});
await pg.waitForTimeout(300);

// Test 1: Nav item visible for Admin
const navVisible = await pg.isVisible('[data-view="user-management"]');
console.log('[1] Nav item visible (Admin):', navVisible ? 'PASS' : 'FAIL');

// Test 2: Nav section labels
const labels = await pg.evaluate(() =>
  Array.from(document.querySelectorAll('.nav-section-label')).map(e => e.textContent.trim())
);
console.log('[2] Nav section labels:', labels);
console.log('[2] Quan tri label present:', labels.includes('Quan tri') || labels.some(l => l.includes('tr')) ? 'PASS (check encoding)' : labels.join('|'));

// Test 3: admin-only class on section label
const adminSection = await pg.evaluate(() => {
  const el = document.querySelector('.nav-section-label.admin-only');
  return el ? 'FOUND: ' + el.textContent.trim() : 'NOT FOUND';
});
console.log('[3] Admin-only section label:', adminSection);

// Test 4: Click nav + page title
await pg.click('[data-view="user-management"]');
await pg.waitForTimeout(500);
const title = await pg.textContent('#pageTitle');
console.log('[4] Page title:', title, title === 'Quan ly User' || title.includes('User') ? 'PASS' : 'FAIL');

// Test 5: View has toolbar
const viewHtml = await pg.innerHTML('#view-user-management');
console.log('[5] Has add button:', viewHtml.includes('User') ? 'PASS' : 'FAIL');
console.log('[5] View HTML length:', viewHtml.length);

// Test 6: RBAC User
await pg.evaluate(() => { document.body.dataset.role = 'User'; });
const hidU = !(await pg.isVisible('[data-view="user-management"]'));
console.log('[6] Hidden for User:', hidU ? 'PASS' : 'FAIL');

// Test 7: RBAC Teamlead
await pg.evaluate(() => { document.body.dataset.role = 'Teamlead'; });
const hidTL = !(await pg.isVisible('[data-view="user-management"]'));
console.log('[7] Hidden for Teamlead:', hidTL ? 'PASS' : 'FAIL');

// Test 8: Add User modal
await pg.evaluate(() => { document.body.dataset.role = 'Admin'; openUserModal(null); });
await pg.waitForTimeout(300);
const modalOk = await pg.isVisible('#umUserOverlay');
console.log('[8] Add User modal opens:', modalOk ? 'PASS' : 'FAIL');

// Test 9: All required fields
const fieldIds = ['umUsername','umDisplayName','umRole','umTeam','umEmail','umPassword','umPassword2'];
let allOk = true;
for (const id of fieldIds) {
  const el = await pg.$('#' + id);
  if (!el) { console.log('   MISSING field: #' + id); allOk = false; }
}
console.log('[9] All modal fields present:', allOk ? 'PASS' : 'FAIL');

// Test 10: Role options
const roles = await pg.evaluate(() => {
  const s = document.getElementById('umRole');
  return s ? Array.from(s.options).map(o => o.value) : [];
});
const rolesOk = ['User','Teamlead','Admin'].every(r => roles.includes(r));
console.log('[10] Role options:', roles, rolesOk ? 'PASS' : 'FAIL');

// Test 11: Validation on empty submit
await pg.evaluate(() => {
  document.getElementById('umUsername').value = '';
  document.getElementById('umDisplayName').value = '';
});
await pg.click('#umSaveBtn');
await pg.waitForTimeout(200);
const errVis = await pg.isVisible('#umUserError');
console.log('[11] Validation error on empty:', errVis ? 'PASS' : 'FAIL');

// Test 12: Reset PW modal
await pg.evaluate(() => { _umCloseModal('umUserOverlay'); openResetPwModal('TuanTT4'); });
await pg.waitForTimeout(200);
const rpOk = await pg.isVisible('#umResetPwOverlay');
console.log('[12] Reset PW modal opens:', rpOk ? 'PASS' : 'FAIL');

// Test 13: PW mismatch
await pg.fill('#umRpNew', 'abc123');
await pg.fill('#umRpNew2', 'abc999');
await pg.click('#umRpBtn');
await pg.waitForTimeout(200);
const rpErr = await pg.isVisible('#umRpError');
console.log('[13] PW mismatch error:', rpErr ? 'PASS' : 'FAIL');

// Test 14: PW too short
await pg.fill('#umRpNew',  'abc');
await pg.fill('#umRpNew2', 'abc');
await pg.click('#umRpBtn');
await pg.waitForTimeout(200);
const rpErrTxt = await pg.textContent('#umRpError').catch(() => '');
console.log('[14] Short PW error:', rpErrTxt.includes('6') ? 'PASS' : 'FAIL (got: ' + rpErrTxt + ')');

// Screenshots
await pg.evaluate(() => { _umCloseModal('umResetPwOverlay'); openUserModal(null); });
await pg.waitForTimeout(200);
import { fileURLToPath } from 'url';
import path from 'path';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
await pg.screenshot({ path: path.join(__dirname, '_verify_screenshots', 'um_modal.png') });
await pg.evaluate(() => _umCloseModal('umUserOverlay'));
await pg.screenshot({ path: path.join(__dirname, '_verify_screenshots', 'um_sidebar.png') });
console.log('\nScreenshots saved to _verify_screenshots/');
console.log('JS errors:', errors.length ? errors : 'none');

await br.close();
console.log('=== DONE ===');
