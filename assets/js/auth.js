'use strict';

const AUTH_SESSION_KEY = 'shtd_auth_v1';

// Hard cap trên MỌI request tới GAS — chống treo vô hạn khi mạng chậm / bị chặn
// (ANBM / mạng nội bộ có thể giữ kết nối tới script.google.com mà không trả về).
// Mặc định 30s cho thao tác TƯƠNG TÁC (login/đổi mật khẩu/ghi) → fail nhanh, không treo.
const GAS_TIMEOUT_MS = 30000;

// Ngân sách rộng hơn cho các lần TẢI dữ liệu (read) — payload lớn (toàn bộ sheet),
// trên mạng nội bộ bị bóp băng thông chậm là HỢP LỆ nên không được cắt oan ở 30s.
// Quá ngân sách này → coi như kết nối chết → nút "Sync/Thử lại" + cache (xử lý ở app.js).
const GAS_READ_TIMEOUT_MS = 90000;

// Ngân sách RIÊNG cho ai-chat: server phải buildContext (đọc toàn bộ Task ~1500 dòng)
// RỒI mới gọi Gemini (LLM chậm) → 30s quá chật, dễ abort oan. AI là read-only nên chờ lâu an toàn.
const GAS_AI_TIMEOUT_MS = 120000;

// Trong lúc khởi động (startApp), KHÔNG tự đăng xuất khi 1 read chớp nhoáng trả AUTH_REQUIRED.
// Một blip mạng không được phép xóa phiên vừa đăng nhập → app.js bật/tắt cờ này quanh startApp.
let _authStartupGrace = false;

// fetch có timeout qua AbortController: quá hạn → abort + báo lỗi rõ ràng thay vì spin mãi.
async function _fetchWithTimeout(url, opts, ms) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || GAS_TIMEOUT_MS);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
  } catch (e) {
    if (e && e.name === 'AbortError') {
      throw new Error('Máy chủ phản hồi quá lâu (mạng chậm hoặc bị chặn). Vui lòng thử lại.');
    }
    throw new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  } finally {
    clearTimeout(timer);
  }
}

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

function canImport() {
  const u = getCurrentUser();
  return u && (u.role === 'Admin' || u.role === 'Teamlead');
}

function isCurrentUser(username) {
  const u = getCurrentUser();
  return !!u && (username || '').toLowerCase() === u.username.toLowerCase();
}

// ── Shared GAS fetch helper — injects auth token automatically ──

// timeoutMs (tùy chọn): các read lớn truyền GAS_READ_TIMEOUT_MS; mặc định 30s (tương tác).
async function gasPost(body, timeoutMs) {
  const session = getAuthSession();
  const payload = Object.assign({}, body, { token: session ? session.token : '' });
  const res = await _fetchWithTimeout(GS_WEBAPP_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body   : JSON.stringify(payload),
  }, timeoutMs);
  if (!res.ok) throw new Error('Apps Script lỗi HTTP: ' + res.status);
  const json = await res.json();
  if (json.error === 'AUTH_REQUIRED') {
    // Lúc khởi động: giữ phiên, để startApp hiển thị nút "Thử lại" (một blip mạng
    // không được xóa phiên vừa đăng nhập). Ngoài khởi động: hết hạn thật → đăng xuất.
    if (!_authStartupGrace) doLogout();
    const err = new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    err.code = 'AUTH_REQUIRED';
    throw err;
  }
  return json;
}

// ── Login / logout ──

async function doLogin(username, password) {
  const res = await _fetchWithTimeout(GS_WEBAPP_URL, {
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
  } finally {
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
  document.body.dataset.role = user.role || 'User';
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
      <div class="user-dd-item" onclick="_closePillDropdown();showChangePwModal()">
        <i class="fa-solid fa-key"></i> Đổi mật khẩu
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

// ── Change password ──

function showChangePwModal() {
  let overlay = document.getElementById('changePwOverlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'changePwOverlay';
    overlay.className = 'overlay';
    overlay.style.cssText = 'display:flex;z-index:3000;';
    overlay.innerHTML = `
      <div class="modal" style="max-width:380px;">
        <div class="modal-header">
          <div class="modal-title"><i class="fa-solid fa-key" style="margin-right:6px;"></i>Đổi mật khẩu</div>
          <button class="icon-btn" onclick="document.getElementById('changePwOverlay').style.display='none'"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
          <div class="form-group">
            <label class="form-label">Mật khẩu hiện tại</label>
            <input class="form-control" id="cpOldPw" type="password" autocomplete="current-password">
          </div>
          <div class="form-group">
            <label class="form-label">Mật khẩu mới <span style="color:var(--text-3);font-weight:400;">(tối thiểu 6 ký tự)</span></label>
            <input class="form-control" id="cpNewPw" type="password" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label">Nhập lại mật khẩu mới</label>
            <input class="form-control" id="cpNewPw2" type="password" autocomplete="new-password">
          </div>
          <div id="cpError" style="display:none;color:var(--danger);font-size:13px;"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" onclick="document.getElementById('changePwOverlay').style.display='none'">Hủy</button>
          <button class="btn btn-primary" id="cpBtn" onclick="handleChangePw()"><i class="fa-solid fa-floppy-disk"></i> Lưu mật khẩu</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
  }
  ['cpOldPw','cpNewPw','cpNewPw2'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  document.getElementById('cpError').style.display = 'none';
  overlay.style.display = 'flex';
  setTimeout(() => document.getElementById('cpOldPw')?.focus(), 50);
}

async function handleChangePw() {
  const oldPw  = document.getElementById('cpOldPw').value;
  const newPw  = document.getElementById('cpNewPw').value;
  const newPw2 = document.getElementById('cpNewPw2').value;
  const errEl  = document.getElementById('cpError');
  const btn    = document.getElementById('cpBtn');

  const setErr = msg => { errEl.textContent = msg; errEl.style.display = 'block'; };

  if (!oldPw || !newPw || !newPw2) { setErr('Vui lòng nhập đầy đủ các trường.'); return; }
  if (newPw !== newPw2)             { setErr('Mật khẩu mới nhập lại không khớp.'); return; }
  if (newPw.length < 6)             { setErr('Mật khẩu mới phải có ít nhất 6 ký tự.'); return; }

  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu…';
  errEl.style.display = 'none';

  try {
    const res = await gasPost({ action: 'change-password', oldPassword: oldPw, newPassword: newPw });
    if (res.status !== 'ok') throw new Error(res.error || 'Lỗi không xác định.');
    document.getElementById('changePwOverlay').style.display = 'none';
    if (typeof toast === 'function') toast('✅ Đã đổi mật khẩu thành công!', 'success');
  } catch (e) {
    setErr(e.message);
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu mật khẩu';
  }
}
