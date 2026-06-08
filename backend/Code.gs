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

    // ── TEMP DEBUG — xóa sau khi debug xong ──
    if (action === 'debug-auth') {
      var s = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
      var roundtrip = 'UNKNOWN';
      if (s) {
        try {
          var p = '{"u":"TuanTT4","dn":"TuanTT4","r":"Admin","t":"Số","exp":' + (Date.now()+3600000) + '}';
          var b64 = Utilities.base64Encode(p, Utilities.Charset.UTF_8).replace(/[\r\n]/g, '');
          var sig = Utilities.computeHmacSha256Signature(p, s, Utilities.Charset.UTF_8);
          var hmac = sig.map(function(b){return ('0'+(b&0xFF).toString(16)).slice(-2);}).join('');
          roundtrip = validateToken(b64 + '.' + hmac) ? 'PASS' : 'FAIL';
        } catch(ex) { roundtrip = 'ERROR:' + ex.message; }
      }

      // ── Test the actual token sent from the browser ──
      var ext = null;
      if (body.externalToken) {
        var et = String(body.externalToken);
        var etParts = et.split('.');
        ext = { len: et.length, newline: et.indexOf('\n') >= 0, parts: etParts.length };
        if (etParts.length === 2) {
          ext.b64Len  = etParts[0].length;
          ext.hmacLen = etParts[1].length;
          ext.hmacIsHex = /^[0-9a-f]{64}$/.test(etParts[1]);
          try {
            var cleanB64   = etParts[0].replace(/[\r\n]/g, '');
            var decodedStr = Utilities.newBlob(Utilities.base64Decode(cleanB64)).getDataAsString();
            var expHmac    = _hmacHex(decodedStr);
            ext.hmacMatch    = (expHmac === etParts[1]);
            ext.payloadSnip  = decodedStr.substring(0, 60);
            ext.expHmacFirst8 = expHmac.substring(0, 8);
            ext.actHmacFirst8 = etParts[1].substring(0, 8);
          } catch(ex2) { ext.decodeErr = ex2.message; }
        }
        ext.validateResult = validateToken(et) ? 'PASS' : 'FAIL';
      }

      return _jsonResponse({ status:'ok', hasSecret: !!s, secretLen: s ? s.length : 0, roundtrip: roundtrip, ext: ext });
    }
    // ── END TEMP DEBUG ──

    // ── all other actions: validate token first ──
    var tokenData = validateToken(body.token);
    if (!tokenData) {
      return _jsonResponse({ status: 'error', error: 'AUTH_REQUIRED' });
    }

    // ── role gate: reject unknown roles ──
    var KNOWN_ROLES = ['Admin', 'User'];
    if (KNOWN_ROLES.indexOf(tokenData.r) === -1) {
      return _jsonResponse({ status: 'error', error: 'AUTH_REQUIRED' });
    }

    // ── role gate: Admin-only actions ──
    var ADMIN_ONLY = ['kpi-write'];
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

    if (action === 'ai-chat') {
      if (!body.message) throw new Error('ai-chat: thiếu message.');
      var aiContext = buildContext(tokenData);
      var aiHistory = Array.isArray(body.history) ? body.history : [];
      var aiReply = callGemini(aiContext, aiHistory, body.message);
      return _jsonResponse({ status: 'ok', reply: aiReply });
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
