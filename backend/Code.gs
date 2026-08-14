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

    // ── (Phase 3) DATA_VER bump nằm trong auditLog() → bump SAU KHI ghi đã commit (đúng thứ tự,
    // tránh race "bump trước-ghi" khiến read xen giữa latch dữ liệu cũ). auditLog gọi ở mọi write.

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

    // ── batch-read: gộp nhiều domain trong 1 request, MỞ SPREADSHEET 1 LẦN ──
    // Thay ~7 request khởi động (mỗi cái tự openById) bằng 1. Client fallback về read lẻ
    // nếu action này chưa có (GAS chưa redeploy) → deploy không phá app ở cả 2 chiều.
    if (action === 'batch-read') {
      // scope 'mine' = chỉ task của user + team, đang mở (gồm quá hạn) → payload nhỏ cho lần load đầu.
      // Chỉ cho phép User thường scope; Admin/Teamlead luôn đọc full (cần dữ liệu toàn đội).
      var _scope = (body.scope === 'mine' && tokenData.r !== 'Admin' && tokenData.r !== 'Teamlead')
        ? 'mine' : 'all';
      var _cur = _dataVer();
      // VERSION GATE theo TỪNG scope: mine gắn thêm '|mine|<user>' để mine-ver và all-ver không đụng nhau.
      var _verKey = (_scope === 'mine') ? (_cur + '|mine|' + tokenData.u) : _cur;
      if (body.ver && String(body.ver) === _verKey) {
        return _jsonResponse({ status: 'ok', ver: _verKey, scope: _scope, notModified: true });
      }
      var _bss  = SpreadsheetApp.openById(SPREADSHEET_ID);
      var _want = (body.domains && body.domains.length)
        ? body.domains
        : ['tasks', 'cases', 'issues', 'dev', 'initiatives', 'users', 'notifs'];
      var _pick = {}; for (var _bi = 0; _bi < _want.length; _bi++) _pick[_want[_bi]] = true;
      var _bd = {};
      // Đọc LIVE (mở spreadsheet 1 lần). Không cache sheet ở server: version gate đã lo phần
      // "không đổi = không tải"; khi ĐỔI thì phải trả dữ liệu mới → đọc live để luôn tươi (không stale).
      if (_pick.tasks) {
        if (_scope === 'mine') {
          var _myTeam = resolveUserTeam(_bss, tokenData.u);
          _bd.tasks = { values: taskRowsScopedMine(_bss, tokenData.u, _myTeam) };
        } else {
          _bd.tasks = { values: sheetRead(_bss).values };
        }
      }
      if (_pick.cases)        _bd.cases       = { values: caseRead(_bss) };
      if (_pick.issues)       _bd.issues      = { values: issueRead(_bss) };
      if (_pick.dev)          _bd.dev         = { values: devRead(_bss) };
      if (_pick.initiatives)  _bd.initiatives = { values: initiativeRead(_bss) };
      if (_pick.users)        _bd.users       = userList(_bss);
      if (_pick.notifs)       _bd.notifs      = notifRead(tokenData.u, _bss);
      if (_pick.h2)           _bd.h2          = h2ReadAll(_bss);
      return _jsonResponse({ status: 'ok', ver: _verKey, scope: _scope, serverTs: _getTaskTs(), data: _bd });
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
      var _lockTask = _acquireWriteLock();
      try {
        var _taskId = body.taskId;
        if (body.isNew) {
          _taskId = reassignIdIfExists(SHEET_NAME, body.taskId);
          if (_taskId !== body.taskId) body.row[0] = _taskId;   // đồng bộ ô ID trong dòng
        }
        var _priorTask = notifPrior_('task', _taskId);
        sheetUpsertTask(body.row, _taskId);
        auditLog(tokenData, 'task-upsert', _taskId + (body.taskName ? ' | ' + body.taskName : ''));
        notifOnWrite('task', _taskId, body.row, _priorTask);
        return _jsonResponse({ status: 'ok', serverTs: _getTaskTs(), id: _taskId });
      } finally {
        _lockTask.releaseLock();
      }
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
      var _lockCase = _acquireWriteLock();
      try {
        var _caseId = body.caseId;
        if (body.isNew) {
          _caseId = reassignIdIfExists(CASE_SHEET_NAME, body.caseId);
          if (_caseId !== body.caseId) body.row[0] = _caseId;
        }
        var _priorCase = notifPrior_('case', _caseId);
        caseUpsertRow(body.row, _caseId);
        auditLog(tokenData, 'case-upsert', _caseId + (body.caseName ? ' | ' + body.caseName : ''));
        notifOnWrite('case', _caseId, body.row, _priorCase);
        return _jsonResponse({ status: 'ok', id: _caseId });
      } finally {
        _lockCase.releaseLock();
      }
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
      var _lockInit = _acquireWriteLock();
      try {
        var _initId = body.initId;
        if (body.isNew) {
          _initId = reassignIdIfExists(INI_SHEET_NAME, body.initId);
          if (_initId !== body.initId) body.row[0] = _initId;
        }
        var _priorInit = notifPrior_('initiative', _initId);
        initiativeUpsertRow(body.row, _initId);
        auditLog(tokenData, 'initiative-upsert', _initId + (body.initName ? ' | ' + body.initName : ''));
        notifOnWrite('initiative', _initId, body.row, _priorInit);
        return _jsonResponse({ status: 'ok', id: _initId });
      } finally {
        _lockInit.releaseLock();
      }
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
      var _lockIssue = _acquireWriteLock();
      try {
        var _issueId = body.issueId;
        if (body.isNew) {
          _issueId = reassignIdIfExists(ISSUE_SHEET_NAME, body.issueId);
          if (_issueId !== body.issueId) body.row[0] = _issueId;
        }
        var _priorIssue = notifPrior_('issue', _issueId);
        issueUpsertRow(body.row, _issueId);
        auditLog(tokenData, 'issue-upsert', _issueId + (body.issueName ? ' | ' + body.issueName : ''));
        notifOnWrite('issue', _issueId, body.row, _priorIssue);
        return _jsonResponse({ status: 'ok', id: _issueId });
      } finally {
        _lockIssue.releaseLock();
      }
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
      var _lockDev = _acquireWriteLock();
      try {
        var _devId = body.devId;
        if (body.isNew) {
          _devId = reassignIdIfExists(DEV_SHEET_NAME, body.devId);
          if (_devId !== body.devId) body.row[0] = _devId;
        }
        var _priorDev = notifPrior_('dev', _devId);
        devUpsertRow(body.row, _devId);
        auditLog(tokenData, 'dev-upsert', _devId + (body.devName ? ' | ' + body.devName : ''));
        notifOnWrite('dev', _devId, body.row, _priorDev);
        return _jsonResponse({ status: 'ok', id: _devId });
      } finally {
        _lockDev.releaseLock();
      }
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

    // ── H2 Team Management (Quản trị H2) ──
    // Read gộp toàn domain (mọi role đã login). Write: gate trong h2HandleUpsert/Delete.
    if (action === 'h2-read-all') {
      return _jsonResponse({ status: 'ok', data: h2ReadAll() });
    }

    var H2_UPSERT_MAP = {
      'h2-config-upsert':    'H2_Config',
      'h2-objective-upsert': 'H2_Objectives',
      'h2-kpi-upsert':       'H2_KPIs',
      'h2-milestone-upsert': 'H2_Milestones',
      'h2-tracking-upsert':  'H2_MonthlyTracking',
      'h2-risk-upsert':      'H2_Risks',
      'h2-dep-upsert':       'H2_Dependencies',
      'h2-review-upsert':    'H2_Reviews'
    };
    var H2_DELETE_MAP = {
      'h2-objective-delete': 'H2_Objectives',
      'h2-kpi-delete':       'H2_KPIs',
      'h2-milestone-delete': 'H2_Milestones',
      'h2-risk-delete':      'H2_Risks',
      'h2-dep-delete':       'H2_Dependencies'
    };
    if (H2_UPSERT_MAP[action]) return _jsonResponse(h2HandleUpsert(body, tokenData, H2_UPSERT_MAP[action]));
    if (H2_DELETE_MAP[action]) return _jsonResponse(h2HandleDelete(body, tokenData, H2_DELETE_MAP[action]));
    // Link Task ↔ Milestone (owner-gated: chủ mốc hoặc lead) — chỉ sửa cột TaskRef.
    if (action === 'h2-milestone-tasklink') return _jsonResponse(h2HandleTaskLink(body, tokenData));

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
