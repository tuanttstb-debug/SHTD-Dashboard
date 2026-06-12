/**
 * debug_login.mjs — Tái hiện lỗi đăng nhập local bằng user thật
 * KHÔNG chặn GAS — để login flow chạy thật.
 */
import { chromium } from './node_modules/playwright/index.mjs';

const BASE = 'http://localhost:3030';
const USERNAME = process.env.LOGIN_USER || 'TuanTT4';
const PASSWORD = process.env.LOGIN_PASS || 'TuanTT4';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on('console', m => { if (m.type() === 'error') console.log('[console.error]', m.text()); });
page.on('pageerror', e => console.log('[pageerror]', e.message));
page.on('requestfailed', r => {
  if (r.url().includes('script.google')) console.log('[requestfailed]', r.url().slice(0, 90), '→', r.failure()?.errorText);
});
page.on('response', async r => {
  if (r.url().includes('script.google')) {
    let bodyTxt = '';
    try { bodyTxt = (await r.text()).slice(0, 300); } catch (_) {}
    console.log('[GAS response]', r.status(), r.url().slice(0, 90));
    console.log('   body:', bodyTxt);
  }
});

await page.goto(BASE);
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(1500);

const loginVisible = await page.evaluate(() => {
  const el = document.getElementById('loginOverlay');
  return el ? getComputedStyle(el).display !== 'none' : false;
});
console.log('[1] Login overlay hiển thị:', loginVisible);

if (loginVisible) {
  await page.fill('#loginUsername', USERNAME);
  await page.fill('#loginPassword', PASSWORD);
  console.log(`[2] Bấm Đăng nhập với ${USERNAME}/***`);
  await page.click('#loginBtn');
  await page.waitForTimeout(15000); // GAS có thể chậm

  const errTxt = await page.evaluate(() => {
    const el = document.getElementById('loginError');
    return el && el.style.display !== 'none' ? el.textContent : '';
  });
  const stillLogin = await page.evaluate(() => {
    const el = document.getElementById('loginOverlay');
    return el ? getComputedStyle(el).display !== 'none' : false;
  });
  console.log('[3] Lỗi hiển thị trên form:', JSON.stringify(errTxt));
  console.log('[4] Vẫn ở màn login:', stillLogin);
  if (!stillLogin) {
    const user = await page.evaluate(() => JSON.parse(localStorage.getItem('shtd_auth_v1') || 'null')?.user);
    console.log('[5] ĐĂNG NHẬP THÀNH CÔNG — user:', JSON.stringify(user));
  }
}

await browser.close();
