/* ══════════════════════════════════════════════════════════════════════════
 * ReportEmailService.gs — Gửi BÁO CÁO TUẦN (điều hành-first) qua email.
 *
 * Bối cảnh: HTML báo cáo (template đã DUYỆT) được dựng ở AIOS weekly-report
 * (build_email.js) rồi POST vào action 'send-report' (Code.gs). GAS là bên GỬI:
 * nó tự PHÂN GIẢI người nhận từ User_Master (nguồn sự thật server-side) rồi MailApp.
 *
 *   • To  = user có Username khớp REPORT_TO_USERNAME (mặc định 'CuongVM1').
 *   • Cc  = mọi user Role = REPORT_CC_ROLE ('Teamlead'), Active≠false, CÓ email;
 *           loại trùng địa chỉ đã nằm ở To.
 *
 * Admin-only (gate ở Code.gs). Hỗ trợ dryRun: phân giải + trả người nhận nhưng
 * KHÔNG gửi — để soi trước khi bắn thật.
 * ══════════════════════════════════════════════════════════════════════════ */

// ── Mặc định (fallback khi sheet Report_Config CHƯA tồn tại) ──
var REPORT_TO_USERNAME = 'CuongVM1';   // người nhận chính (To)
var REPORT_CC_ROLE     = 'Teamlead';   // role được CC
var REPORT_FROM_NAME   = 'SHTD Dashboard — Khối Ngân hàng Doanh nghiệp';
var REPORT_CONFIG_SHEET = 'Report_Config';

/**
 * Chạy 1 LẦN từ Apps Script editor để tạo sheet cấu hình Report_Config.
 * Không ghi đè nếu sheet đã tồn tại (chỉnh giá trị ngay trên sheet, không cần sửa code).
 */
function setupReportConfig() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (ss.getSheetByName(REPORT_CONFIG_SHEET)) {
    Logger.log('Report_Config đã tồn tại. Chỉnh giá trị trực tiếp trên sheet, hoặc xóa sheet để reset.');
    return;
  }
  var sheet = ss.insertSheet(REPORT_CONFIG_SHEET);
  var rows = [
    ['Key',         'Value',                'Ghi chú'],
    ['Enabled',     'true',                 'true/false — false thì CHẶN gửi thật (vẫn cho dry-run)'],
    ['To_Username', REPORT_TO_USERNAME,     'Username người nhận chính (To), phải khớp User_Master'],
    ['Cc_Role',     REPORT_CC_ROLE,         'Role được Cc; nhiều role cách nhau dấu phẩy (vd: Teamlead,Manager)'],
    ['Cc_Extra',    '',                     'Email Cc thêm ngoài role, cách nhau dấu phẩy (tùy chọn)'],
    ['From_Name',   REPORT_FROM_NAME,       'Tên hiển thị người gửi']
  ];
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setFontWeight('bold');
  sheet.setColumnWidth(1, 130);
  sheet.setColumnWidth(2, 320);
  sheet.setColumnWidth(3, 460);
  sheet.setFrozenRows(1);
  SpreadsheetApp.flush();
  Logger.log('✅ Report_Config đã tạo. Chỉnh Value trực tiếp trên sheet để đổi người nhận (không cần sửa code).');
}

/**
 * Đọc cấu hình từ sheet Report_Config → map {enabled, toUsername, ccRoles[], ccExtra[], fromName}.
 * Nếu sheet chưa tồn tại → dùng hằng số mặc định ở đầu file (không vỡ).
 */
function _reportConfig_() {
  var cfg = {
    enabled: true,
    toUsername: REPORT_TO_USERNAME,
    ccRoles: [REPORT_CC_ROLE],
    ccExtra: [],
    fromName: REPORT_FROM_NAME,
    fromSheet: false
  };
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(REPORT_CONFIG_SHEET);
  if (!sheet) return cfg;

  var data = sheet.getDataRange().getValues();
  var kv = {};
  for (var i = 1; i < data.length; i++) {   // bỏ header
    var k = String(data[i][0] || '').trim();
    if (k) kv[k] = String(data[i][1] === undefined ? '' : data[i][1]).trim();
  }
  cfg.fromSheet = true;

  if (kv.Enabled !== undefined && kv.Enabled !== '')
    cfg.enabled = !(kv.Enabled.toLowerCase() === 'false');
  if (kv.To_Username) cfg.toUsername = kv.To_Username;
  if (kv.Cc_Role !== undefined && kv.Cc_Role !== '')
    cfg.ccRoles = kv.Cc_Role.split(',').map(function (s) { return s.trim(); })
                            .filter(function (s) { return s; });
  if (kv.Cc_Extra)
    cfg.ccExtra = kv.Cc_Extra.split(',').map(function (s) { return s.trim(); })
                             .filter(function (s) { return s; });
  if (kv.From_Name) cfg.fromName = kv.From_Name;
  return cfg;
}

/**
 * Phân giải người nhận từ User_Master (theo cấu hình Report_Config).
 * @return {{toEmail:string, toName:string, cc:string[], warnings:string[]}}
 */
function _reportRecipients_(toUsername) {
  var cfg = _reportConfig_();
  var wantTo = String(toUsername || cfg.toUsername).trim().toLowerCase();
  var ccRolesLc = cfg.ccRoles.map(function (r) { return r.toLowerCase(); });
  var out = { toEmail: '', toName: '', cc: [], warnings: [] };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('send-report: không thấy sheet ' + USER_SHEET_NAME);
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('send-report: User_Master rỗng.');

  var H = data[0].map(function (h) { return String(h).trim(); });
  var iUser   = H.indexOf('Username');
  var iDisp   = H.indexOf('Display_Name');
  var iMail   = H.indexOf('Email');
  var iRole   = H.indexOf('Role');
  var iActive = H.indexOf('Active');
  if (iUser < 0 || iMail < 0 || iRole < 0)
    throw new Error('send-report: User_Master thiếu cột Username/Email/Role.');

  var seenCc = {};   // emailLower → email (dedup, giữ bản gốc)
  for (var i = 1; i < data.length; i++) {
    var uname = String(data[i][iUser] || '').trim();
    if (!uname) continue;
    var email = String(data[i][iMail] || '').trim();
    var role  = String(data[i][iRole] || '').trim();
    var disp  = iDisp >= 0 ? String(data[i][iDisp] || uname) : uname;
    var active = iActive < 0 ? true
      : !(data[i][iActive] === false || String(data[i][iActive]).toLowerCase() === 'false');

    // To — người nhận chính (dù active hay không vẫn khớp để cảnh báo rõ)
    if (uname.toLowerCase() === wantTo) {
      out.toName = disp;
      if (email) out.toEmail = email;
      else out.warnings.push('Người nhận chính "' + uname + '" chưa có Email.');
      if (!active) out.warnings.push('Người nhận chính "' + uname + '" đang bị khóa (Active=false).');
    }

    // Cc — user thuộc role cấu hình, đang active, có email
    if (ccRolesLc.indexOf(role.toLowerCase()) !== -1 && active && email) {
      seenCc[email.toLowerCase()] = email;
    }
  }

  // Cc_Extra — email chỉ định trực tiếp trong Report_Config (ngoài role)
  cfg.ccExtra.forEach(function (e) {
    if (e && e.indexOf('@') !== -1) seenCc[e.toLowerCase()] = e;
  });

  if (!out.toName)
    out.warnings.push('Không tìm thấy user "' + wantTo + '" trong User_Master.');

  // Loại trùng địa chỉ To khỏi Cc
  var toLc = out.toEmail.toLowerCase();
  Object.keys(seenCc).forEach(function (k) { if (k !== toLc) out.cc.push(seenCc[k]); });
  out.cc.sort();
  return out;
}

/**
 * Gửi (hoặc dry-run) báo cáo tuần.
 * @param {string} html   Thân HTML (đã dựng ở AIOS build_email.js).
 * @param {string} subject Tiêu đề email.
 * @param {{toUsername?:string, dryRun?:boolean}} opts
 * @return {{to:string, toName:string, cc:string[], count:number, sent:boolean, warnings:string[]}}
 */
function sendWeeklyReport_(html, subject, opts) {
  opts = opts || {};
  if (!html || !String(html).trim()) throw new Error('send-report: thiếu html.');
  var cfg = _reportConfig_();
  var subj = String(subject || '').trim() || ('Báo cáo tuần — ' + cfg.fromName);

  var r = _reportRecipients_(opts.toUsername);
  var result = {
    to: r.toEmail, toName: r.toName, cc: r.cc, count: r.cc.length,
    sent: false, enabled: cfg.enabled, fromSheet: cfg.fromSheet, warnings: r.warnings
  };

  if (opts.dryRun) return result;                 // soi trước, KHÔNG gửi
  if (!cfg.enabled)
    throw new Error('send-report: Report_Config.Enabled=false → gửi thật bị chặn (đổi sang true để bật).');
  if (!r.toEmail)
    throw new Error('send-report: không có địa chỉ To hợp lệ → hủy gửi. ' + r.warnings.join(' '));

  var mail = { to: r.toEmail, subject: subj, htmlBody: html, name: cfg.fromName };
  if (r.cc.length) mail.cc = r.cc.join(',');
  MailApp.sendEmail(mail);
  result.sent = true;
  return result;
}
