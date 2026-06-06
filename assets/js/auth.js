'use strict';

const AUTH_SESSION_KEY = 'shtd_auth_v1';

// ── Session storage ──

function getAuthSession() {
  try {
    const s = localStorage.getItem(AUTH_SESSION_KEY);
    if (!s) return null;
    const session = JSON.parse(s);
    if (!session.exp || Date.now() > session.exp) {
      localStorage.removeItem(AUTH_SESSION_KEY);
      return null;
    }
    return session; // { token, user, exp }
  } catch (e) {
    return null;
  }
}

function _setAuthSession(token, user) {
  const exp = Date.now() + 24 * 60 * 60 * 1000;
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify({ token, user, exp }));
}

function getCurrentUser() {
  const s = getAuthSession();
  return s ? s.user : null;
}

function isAdmin() {
  const u = getCurrentUser();
  return u && u.role === 'Admin';
}

// ── Shared GAS fetch helper — injects auth token automatically ──

async function gasPost(body) {
  const session = getAuthSession();
  const payload = Object.assign({}, body, { token: session ? session.token : '' });
  const res = await fetch(GS_WEBAPP_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body   : JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Apps Script lỗi HTTP: ' + res.status);
  const json = await res.json();
  if (json.error === 'AUTH_REQUIRED') {
    doLogout();
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }
  return json;
}

// ── Login / logout ──

async function doLogin(username, password) {
  const res = await fetch(GS_WEBAPP_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body   : JSON.stringify({ action: 'auth-login', username, password }),
  });
  if (!res.ok) throw new Error('Apps Script lỗi HTTP: ' + res.status);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.error || 'Đăng nhập thất bại.');
  _setAuthSession(json.token, json.user);
  return json.user;
}

function doLogout() {
  localStorage.removeItem(AUTH_SESSION_KEY);
  _closePillDropdown();
  showLoginScreen();
}

// ── Login screen UI ──

function showLoginScreen() {
  const el = document.getElementById('loginOverlay');
  if (el) el.style.display = 'flex';
  const uEl = document.getElementById('loginUsername');
  if (uEl) uEl.focus();
}

function hideLoginScreen() {
  const el = document.getElementById('loginOverlay');
  if (el) el.style.display = 'none';
}

function _setLoginError(msg) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent = msg;
  el.style.display = msg ? 'block' : 'none';
}

async function handleLogin() {
  const username = (document.getElementById('loginUsername').value || '').trim();
  const password = document.getElementById('loginPassword').value || '';
  const btn      = document.getElementById('loginBtn');

  _setLoginError('');
  if (!username || !password) {
    _setLoginError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
    return;
  }

  btn.disabled    = true;
  btn.innerHTML   = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng nhập…';

  try {
    const user = await doLogin(username, password);
    hideLoginScreen();
    applyUserToUI(user);
    await startApp();
  } catch (e) {
    _setLoginError(e.message);
    btn.disabled  = false;
    btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Đăng nhập';
  }
}

// Submit on Enter in password field
document.addEventListener('DOMContentLoaded', function() {
  const pwEl = document.getElementById('loginPassword');
  if (pwEl) pwEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') handleLogin();
  });
  const unEl = document.getElementById('loginUsername');
  if (unEl) unEl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('loginPassword').focus();
  });

  // Close dropdown on outside click
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-pill')) _closePillDropdown();
  });
});

// ── User-pill update after login ──

function applyUserToUI(user) {
  const initials = (user.displayName || user.username).slice(0, 2).toUpperCase();
  const pillEl   = document.querySelector('.user-pill');
  if (!pillEl) return;

  pillEl.innerHTML = `
    <div class="avatar">${initials}</div>
    <div>
      <div class="user-info-name">${user.displayName || user.username}</div>
      <div class="user-info-role">${user.role} · ${user.team}</div>
    </div>
    <div class="user-pill-dropdown" id="userDropdown">
      <div class="user-dd-info">
        <div class="user-dd-name">${user.displayName || user.username}</div>
        <div class="user-dd-role">${user.role} · ${user.team}</div>
      </div>
      <div class="user-dd-item danger" onclick="confirmLogout()">
        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
      </div>
    </div>`;

  pillEl.onclick = function(e) {
    e.stopPropagation();
    const dd = document.getElementById('userDropdown');
    if (dd) dd.classList.toggle('open');
  };
}

function _closePillDropdown() {
  const dd = document.getElementById('userDropdown');
  if (dd) dd.classList.remove('open');
}

async function confirmLogout() {
  _closePillDropdown();
  const ok = await uiConfirm('Đăng xuất', 'Bạn có chắc muốn đăng xuất không?', 'warning', 'Đăng xuất');
  if (ok) doLogout();
}
