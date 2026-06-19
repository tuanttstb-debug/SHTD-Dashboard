// ── SHTD Dashboard – GAS Web App entry point ──
//
// Deploy hướng dẫn:
//   1. Extensions → Apps Script → paste 3 file này
//   2. Deploy → New deployment → Web App
//      - Execute as: Me
//      - Who has access: Anyone
//   3. Copy Web App URL → dán vào GS_WEBAPP_URL trong index.html
//
// API contract (POST, Content-Type: text/plain):
//   { action: 'read' }
//     → { status: 'ok', values: [[header], [row], ...] }
//
//   { action: 'write', values: [[header], [row], ...] }
//     → { status: 'ok' }
//
//   Lỗi bất kỳ → { status: 'error', error: '<message>' }

/**
 * Trả về JSON response với CORS header cho phép mọi origin.
 * Content-Type phải là text/plain để tránh preflight OPTIONS.
 */
function _jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * doPost – điểm vào duy nhất của Web App.
 * Client gửi body là JSON string với Content-Type: text/plain.
 */
function doPost(e) {
  try {
    var body   = JSON.parse(e.postData.contents);
    var action = (body.action || '').toLowerCase();

    // ── auth-login: no token required ──
    if (action === 'auth-login') {
      if (!body.username || !body.password) throw new Error('Thiếu thông tin đăng nhập.');
      var loginResult = authLogin(body.username, body.password);
      return _jsonResponse({ status: 'ok', token: loginResult.token, user: loginResult.user });
    }

    // ── all other actions: validate token first ──
    var tokenData = validateToken(body.token);
    if (!tokenData) {
      return _jsonResponse({ status: 'error', error: 'AUTH_REQUIRED' });
    }

    // ── role gate: reject unknown roles ──
    var KNOWN_ROLES = ['Admin', 'User', 'Teamlead'];
    if (KNOWN_ROLES.indexOf(tokenData.r) === -1) {
      return _jsonResponse({ status: 'error', error: 'AUTH_REQUIRED' });
    }

    // ── role gate: Admin-only actions ──
    var ADMIN_ONLY = ['kpi-write', 'user-create', 'user-update', 'user-reset-password'];
    if (ADMIN_ONLY.indexOf(action) !== -1 && tokenData.r !== 'Admin') {
      return _jsonResponse({ status: 'error', error: 'FORBIDDEN' });
    }

    if (action === 'change-password') {
      if (!body.oldPassword || !body.newPassword) throw new Error('Thiếu thông tin đổi mật khẩu.');
      changePassword(tokenData, body.oldPassword, body.newPassword);
      auditLog(tokenData, 'change-password', 'password updated');
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'read') {
      var result = sheetRead();
      return _jsonResponse({ status: 'ok', values: result.values, serverTs: result.serverTs });
    }

    if (action === 'write') {
      if (!body.values || !Array.isArray(body.values) || body.values.length < 2) {
        throw new Error('Payload write thiếu hoặc rỗng.');
      }
      sheetWrite(body.values, body.clientTs);
      auditLog(tokenData, 'task-write', (body.values.length - 1) + ' rows');
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'kpi-write') {
      if (!body.values || !Array.isArray(body.values)) {
        throw new Error('kpi-write: thiếu values.');
      }
      kpiSheetWrite(body.values);
      auditLog(tokenData, 'kpi-write', (body.values.length) + ' rows');
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'kpi-read') {
      return _jsonResponse({ status: 'ok', values: kpiSheetRead() });
    }

    if (action === 'initiative-read') {
      return _jsonResponse({ status: 'ok', values: initiativeRead() });
    }

    if (action === 'initiative-write') {
      if (!body.values || !Array.isArray(body.values) || body.values.length < 1) {
        throw new Error('initiative-write: thiếu values.');
      }
      initiativeWrite(body.values);
      auditLog(tokenData, 'initiative-write', (body.values.length - 1) + ' rows');
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'user-list') {
      return _jsonResponse({ status: 'ok', data: userList() });
    }

    if (action === 'user-create') {
      if (!body.user || typeof body.user !== 'object') throw new Error('user-create: thiếu user data.');
      userCreate(body.user);
      auditLog(tokenData, 'user-create', body.user.username);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'user-update') {
      if (!body.user || typeof body.user !== 'object') throw new Error('user-update: thiếu user data.');
      userUpdate(body.user);
      auditLog(tokenData, 'user-update', body.user.username);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'user-reset-password') {
      if (!body.username || !body.newPassword) throw new Error('user-reset-password: thiếu username hoặc newPassword.');
      userResetPassword(body.username, body.newPassword);
      auditLog(tokenData, 'user-reset-password', body.username);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'ai-chat') {
      if (!body.message) throw new Error('ai-chat: thiếu message.');
      var aiContext = buildContext(tokenData);
      var aiHistory = Array.isArray(body.history) ? body.history : [];
      var aiReply = callGemini(aiContext, aiHistory, body.message);
      return _jsonResponse({ status: 'ok', reply: aiReply });
    }

    if (action === 'case-pipeline-read') {
      return _jsonResponse({ status: 'ok', values: caseRead() });
    }

    if (action === 'case-pipeline-write') {
      if (!body.values || !Array.isArray(body.values) || body.values.length < 1) {
        throw new Error('case-pipeline-write: thiếu values.');
      }
      caseWrite(body.values);
      auditLog(tokenData, 'case-pipeline-write', (body.values.length - 1) + ' rows');
      return _jsonResponse({ status: 'ok' });
    }

    // ── Atomic single-row writes (task / case / initiative) ──
    if (action === 'task-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.taskId) {
        throw new Error('task-upsert: thiếu row hoặc taskId.');
      }
      sheetUpsertTask(body.row, body.taskId);
      auditLog(tokenData, 'task-upsert', body.taskId + (body.taskName ? ' | ' + body.taskName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'task-delete') {
      if (!body.taskId) throw new Error('task-delete: thiếu taskId.');
      sheetDeleteTask(body.taskId);
      auditLog(tokenData, 'task-delete', body.taskId + (body.taskName ? ' | ' + body.taskName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'case-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.caseId) {
        throw new Error('case-upsert: thiếu row hoặc caseId.');
      }
      caseUpsertRow(body.row, body.caseId);
      auditLog(tokenData, 'case-upsert', body.caseId + (body.caseName ? ' | ' + body.caseName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'case-delete') {
      if (!body.caseId) throw new Error('case-delete: thiếu caseId.');
      caseDeleteRow(body.caseId);
      auditLog(tokenData, 'case-delete', body.caseId + (body.caseName ? ' | ' + body.caseName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'initiative-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.initId) {
        throw new Error('initiative-upsert: thiếu row hoặc initId.');
      }
      initiativeUpsertRow(body.row, body.initId);
      auditLog(tokenData, 'initiative-upsert', body.initId + (body.initName ? ' | ' + body.initName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    throw new Error('action không hợp lệ: ' + action);

  } catch (err) {
    return _jsonResponse({ status: 'error', error: err.message });
  }
}

/**
 * doGet – trả về thông tin trạng thái (dùng để kiểm tra URL còn sống không).
 * Không trả dữ liệu thực tế.
 */
function doGet(e) {
  return _jsonResponse({ status: 'ok', message: 'SHTD Dashboard GAS backend is running.' });
}
