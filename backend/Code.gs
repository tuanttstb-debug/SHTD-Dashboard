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
      var _priorTask = notifPrior_('task', body.taskId);
      sheetUpsertTask(body.row, body.taskId);
      auditLog(tokenData, 'task-upsert', body.taskId + (body.taskName ? ' | ' + body.taskName : ''));
      notifOnWrite('task', body.taskId, body.row, _priorTask);
      return _jsonResponse({ status: 'ok', serverTs: _getTaskTs() });
    }

    if (action === 'task-delete') {
      if (!body.taskId) throw new Error('task-delete: thiếu taskId.');
      sheetDeleteTask(body.taskId);
      auditLog(tokenData, 'task-delete', body.taskId + (body.taskName ? ' | ' + body.taskName : ''));
      return _jsonResponse({ status: 'ok', serverTs: _getTaskTs() });
    }

    if (action === 'case-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.caseId) {
        throw new Error('case-upsert: thiếu row hoặc caseId.');
      }
      var _priorCase = notifPrior_('case', body.caseId);
      caseUpsertRow(body.row, body.caseId);
      auditLog(tokenData, 'case-upsert', body.caseId + (body.caseName ? ' | ' + body.caseName : ''));
      notifOnWrite('case', body.caseId, body.row, _priorCase);
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
      var _priorInit = notifPrior_('initiative', body.initId);
      initiativeUpsertRow(body.row, body.initId);
      auditLog(tokenData, 'initiative-upsert', body.initId + (body.initName ? ' | ' + body.initName : ''));
      notifOnWrite('initiative', body.initId, body.row, _priorInit);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'audit-read') {
      if (!body.entityId) throw new Error('audit-read: thiếu entityId.');
      return _jsonResponse({ status: 'ok', rows: auditReadByEntity(body.entityId) });
    }

    if (action === 'issue-read') {
      return _jsonResponse({ status: 'ok', values: issueRead() });
    }

    if (action === 'issue-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.issueId) {
        throw new Error('issue-upsert: thiếu row hoặc issueId.');
      }
      var _priorIssue = notifPrior_('issue', body.issueId);
      issueUpsertRow(body.row, body.issueId);
      auditLog(tokenData, 'issue-upsert', body.issueId + (body.issueName ? ' | ' + body.issueName : ''));
      notifOnWrite('issue', body.issueId, body.row, _priorIssue);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'issue-delete') {
      if (!body.issueId) throw new Error('issue-delete: thiếu issueId.');
      issueDeleteRow(body.issueId);
      auditLog(tokenData, 'issue-delete', body.issueId + (body.issueName ? ' | ' + body.issueName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    // ── Dev Plan (Plan phát triển bản thân) ──
    // Ownership: chỉ PIC (chủ dòng) hoặc Admin được ghi/xóa.
    if (action === 'dev-read') {
      return _jsonResponse({ status: 'ok', values: devRead() });
    }

    if (action === 'dev-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.devId) {
        throw new Error('dev-upsert: thiếu row hoặc devId.');
      }
      if (tokenData.r !== 'Admin') {
        var me         = String(tokenData.u || '').toLowerCase();
        var existingPic = devGetPicById(body.devId);           // null nếu dòng mới
        var newPic      = String(body.row[3] || '').toLowerCase(); // cột D = PIC
        if (existingPic !== null && String(existingPic).toLowerCase() !== me) {
          return _jsonResponse({ status: 'error', error: 'FORBIDDEN_NOT_OWNER' });
        }
        if (newPic !== me) {
          return _jsonResponse({ status: 'error', error: 'FORBIDDEN_PIC_MISMATCH' });
        }
      }
      var _priorDev = notifPrior_('dev', body.devId);
      devUpsertRow(body.row, body.devId);
      auditLog(tokenData, 'dev-upsert', body.devId + (body.devName ? ' | ' + body.devName : ''));
      notifOnWrite('dev', body.devId, body.row, _priorDev);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'dev-delete') {
      if (!body.devId) throw new Error('dev-delete: thiếu devId.');
      if (tokenData.r !== 'Admin') {
        var meDel        = String(tokenData.u || '').toLowerCase();
        var existingPicD = devGetPicById(body.devId);
        if (existingPicD !== null && String(existingPicD).toLowerCase() !== meDel) {
          return _jsonResponse({ status: 'error', error: 'FORBIDDEN_NOT_OWNER' });
        }
      }
      devDeleteRow(body.devId);
      auditLog(tokenData, 'dev-delete', body.devId + (body.devName ? ' | ' + body.devName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    // ── Notifications (chuông + read-state per-user) ──
    if (action === 'notif-read') {
      return _jsonResponse({ status: 'ok', notifs: notifRead(tokenData.u) });
    }

    if (action === 'notif-mark-read') {
      notifMarkRead(tokenData.u, Array.isArray(body.ids) ? body.ids : [], body.all === true);
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
