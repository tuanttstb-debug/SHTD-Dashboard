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
    var ADMIN_ONLY = ['kpi-write', 'user-create', 'user-update', 'user-reset-password', 'send-report'];
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

    // ── Calendar Sync (Pha 1, giới hạn TuanTT4 — whitelist trong service) ──
    // Self-service: user thao tác trên CHÍNH mình (tokenData.u). Không cần Admin.
    if (action === 'cal-status') {
      return _jsonResponse({ status: 'ok', cal: calStatus(tokenData.u) });
    }
    if (action === 'cal-enable') {
      // email tùy chọn: bỏ trống → dùng Email đăng ký trong User_Master.
      var _calEn = calEnable(tokenData.u, body.email || '');
      auditLog(tokenData, 'cal-enable', String(_calEn.email || ''));
      return _jsonResponse({ status: 'ok', cal: _calEn });
    }
    if (action === 'cal-disable') {
      var _calDis = calDisable(tokenData.u);
      auditLog(tokenData, 'cal-disable', '');
      return _jsonResponse({ status: 'ok', cal: _calDis });
    }

    if (action === 'read') {
      var result = sheetRead();
      return _jsonResponse({ status: 'ok', values: result.values, serverTs: result.serverTs });
    }

    // ── batch-read: gộp nhiều domain trong 1 request, MỞ SPREADSHEET 1 LẦN ──
    // Thay ~7 request khởi động (mỗi cái tự openById) bằng 1. Client fallback về read lẻ
    // nếu action này chưa có (GAS chưa redeploy) → deploy không phá app ở cả 2 chiều.
    if (action === 'batch-read') {
      var _want = (body.domains && body.domains.length)
        ? body.domains
        : ['tasks', 'cases', 'issues', 'dev', 'initiatives', 'users', 'notifs'];

      // (Pha B) VERSION GATE THEO DOMAIN: client gửi map `vers` (ver đã biết mỗi domain).
      // Chỉ đọc + trả domain nào version ĐỔI → sửa 1 task không kéo tải lại 6 domain kia.
      var _curVers = {};
      for (var _vi = 0; _vi < _want.length; _vi++) _curVers[_want[_vi]] = _domainVer(_want[_vi]);
      var _cliVers = body.vers || {};
      // Tương thích ngược: client CŨ gửi `ver` (global đơn) → coi như biết mọi domain ở mức đó.
      if (body.ver && !body.vers) {
        for (var _dk in _curVers) if (!(_dk in _cliVers)) _cliVers[_dk] = body.ver;
      }
      var _changed = [];
      for (var _d in _curVers) {
        if (String(_cliVers[_d] == null ? '' : _cliVers[_d]) !== String(_curVers[_d])) _changed.push(_d);
      }
      // ver global cho tương thích ngược (client cũ đọc json.ver)
      var _cur = _dataVer();
      if (_changed.length === 0) {
        return _jsonResponse({ status: 'ok', ver: _cur, vers: _curVers, notModified: true });
      }
      var _bss  = SpreadsheetApp.openById(SPREADSHEET_ID);
      var _pick = {}; for (var _bi = 0; _bi < _changed.length; _bi++) _pick[_changed[_bi]] = true;
      var _bd = {};
      // Đọc LIVE (mở spreadsheet 1 lần) CHỈ domain đổi. Không cache sheet ở server.
      if (_pick.tasks)       _bd.tasks       = { values: sheetRead(_bss).values };
      if (_pick.cases)        _bd.cases       = { values: caseRead(_bss) };
      if (_pick.issues)       _bd.issues      = { values: issueRead(_bss) };
      if (_pick.dev)          _bd.dev         = { values: devRead(_bss) };
      if (_pick.initiatives)  _bd.initiatives = { values: initiativeRead(_bss) };
      if (_pick.users)        _bd.users       = userList(_bss);
      if (_pick.notifs)       _bd.notifs      = notifRead(tokenData.u, _bss);
      if (_pick.h2)           _bd.h2          = h2ReadAll(_bss);
      return _jsonResponse({ status: 'ok', ver: _cur, vers: _curVers, serverTs: _getTaskTs(), data: _bd });
    }

    if (action === 'write') {
      if (!body.values || !Array.isArray(body.values) || body.values.length < 2) {
        throw new Error('Payload write thiếu hoặc rỗng.');
      }
      sheetWrite(body.values, body.clientTs);
      _bumpDomainVer('tasks');
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
      _bumpDomainVer('initiatives');
      auditLog(tokenData, 'initiative-write', (body.values.length - 1) + ' rows');
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'user-list') {
      return _jsonResponse({ status: 'ok', data: userList() });
    }

    if (action === 'user-create') {
      if (!body.user || typeof body.user !== 'object') throw new Error('user-create: thiếu user data.');
      userCreate(body.user);
      _bumpDomainVer('users');
      auditLog(tokenData, 'user-create', body.user.username);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'user-update') {
      if (!body.user || typeof body.user !== 'object') throw new Error('user-update: thiếu user data.');
      userUpdate(body.user);
      _bumpDomainVer('users');
      auditLog(tokenData, 'user-update', body.user.username);
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'user-reset-password') {
      if (!body.username || !body.newPassword) throw new Error('user-reset-password: thiếu username hoặc newPassword.');
      userResetPassword(body.username, body.newPassword);
      _bumpDomainVer('users');
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
      _bumpDomainVer('cases');
      auditLog(tokenData, 'case-pipeline-write', (body.values.length - 1) + ' rows');
      return _jsonResponse({ status: 'ok' });
    }

    // ── Atomic single-row writes (task / case / initiative / issue / dev) ──
    // (Pha A) Dùng chung atomicUpsert_ (Concurrency.gs): khóa tối thiểu + idempotency reqId
    // + defer audit/notif ngoài khóa → giảm timeout/mất bản ghi ở tải đồng thời.
    if (action === 'task-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.taskId) {
        throw new Error('task-upsert: thiếu row hoặc taskId.');
      }
      return _jsonResponse(atomicUpsert_(body, tokenData, {
        sheetName: SHEET_NAME, entityType: 'task', upsertFn: sheetUpsertTask,
        idKey: 'taskId', nameKey: 'taskName', action: 'task-upsert', withServerTs: true
      }));
    }

    if (action === 'task-delete') {
      if (!body.taskId) throw new Error('task-delete: thiếu taskId.');
      sheetDeleteTask(body.taskId);
      _bumpDomainVer('tasks');
      auditLog(tokenData, 'task-delete', body.taskId + (body.taskName ? ' | ' + body.taskName : ''));
      return _jsonResponse({ status: 'ok', serverTs: _getTaskTs() });
    }

    if (action === 'case-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.caseId) {
        throw new Error('case-upsert: thiếu row hoặc caseId.');
      }
      return _jsonResponse(atomicUpsert_(body, tokenData, {
        sheetName: CASE_SHEET_NAME, entityType: 'case', upsertFn: caseUpsertRow,
        idKey: 'caseId', nameKey: 'caseName', action: 'case-upsert'
      }));
    }

    if (action === 'case-delete') {
      if (!body.caseId) throw new Error('case-delete: thiếu caseId.');
      caseDeleteRow(body.caseId);
      _bumpDomainVer('cases');
      auditLog(tokenData, 'case-delete', body.caseId + (body.caseName ? ' | ' + body.caseName : ''));
      return _jsonResponse({ status: 'ok' });
    }

    if (action === 'initiative-upsert') {
      if (!body.row || !Array.isArray(body.row) || !body.initId) {
        throw new Error('initiative-upsert: thiếu row hoặc initId.');
      }
      return _jsonResponse(atomicUpsert_(body, tokenData, {
        sheetName: INI_SHEET_NAME, entityType: 'initiative', upsertFn: initiativeUpsertRow,
        idKey: 'initId', nameKey: 'initName', action: 'initiative-upsert'
      }));
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
      return _jsonResponse(atomicUpsert_(body, tokenData, {
        sheetName: ISSUE_SHEET_NAME, entityType: 'issue', upsertFn: issueUpsertRow,
        idKey: 'issueId', nameKey: 'issueName', action: 'issue-upsert'
      }));
    }

    if (action === 'issue-delete') {
      if (!body.issueId) throw new Error('issue-delete: thiếu issueId.');
      issueDeleteRow(body.issueId);
      _bumpDomainVer('issues');
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
      return _jsonResponse(atomicUpsert_(body, tokenData, {
        sheetName: DEV_SHEET_NAME, entityType: 'dev', upsertFn: devUpsertRow,
        idKey: 'devId', nameKey: 'devName', action: 'dev-upsert'
      }));
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
      _bumpDomainVer('dev');
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

    // ── Gửi báo cáo tuần qua email (Admin-only). HTML dựng ở AIOS build_email.js;
    //    GAS tự phân giải người nhận từ User_Master: To=CuongVM1, Cc=Teamlead active. ──
    if (action === 'send-report') {
      var _rep = sendWeeklyReport_(body.html, body.subject, {
        toUsername: body.toUsername,
        dryRun: body.dryRun === true
      });
      auditLog(tokenData, 'send-report',
        (_rep.sent ? 'sent' : 'dry') + ' to=' + _rep.to + ' cc=' + _rep.count);
      return _jsonResponse({ status: 'ok', report: _rep });
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

/**
 * (Pha C) Keep-warm — OPT-IN. Gắn vào Time-driven trigger (vd mỗi 5–10') trong GAS Editor:
 *   Triggers → Add Trigger → function: keepWarm → Time-driven → Minutes timer → Every 5 minutes.
 * Giảm cold-start (lần gọi đầu sau nghỉ) → login/ghi/đọc bớt spike chậm. Chỉ chạm Properties,
 * KHÔNG mở spreadsheet → nhẹ, an toàn, không tốn quota đọc Sheets. Không bắt buộc để app chạy.
 */
function keepWarm() {
  try { PropertiesService.getScriptProperties().getProperty('SHTD_DATA_VER'); } catch (e) {}
  return 'warm';
}
