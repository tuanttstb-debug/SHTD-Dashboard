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

var REPORT_TO_USERNAME = 'CuongVM1';   // người nhận chính (To)
var REPORT_CC_ROLE     = 'Teamlead';   // role được CC
var REPORT_FROM_NAME   = 'SHTD Dashboard — Khối Ngân hàng Doanh nghiệp';

/**
 * Phân giải người nhận từ User_Master.
 * @return {{toEmail:string, toName:string, cc:string[], warnings:string[]}}
 */
function _reportRecipients_(toUsername) {
  var wantTo = String(toUsername || REPORT_TO_USERNAME).trim().toLowerCase();
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

    // Cc — teamlead đang active, có email
    if (role.toLowerCase() === REPORT_CC_ROLE.toLowerCase() && active && email) {
      seenCc[email.toLowerCase()] = email;
    }
  }

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
  var subj = String(subject || '').trim() || ('Báo cáo tuần — ' + REPORT_FROM_NAME);

  var r = _reportRecipients_(opts.toUsername);
  var result = {
    to: r.toEmail, toName: r.toName, cc: r.cc, count: r.cc.length,
    sent: false, warnings: r.warnings
  };

  if (opts.dryRun) return result;                 // soi trước, KHÔNG gửi
  if (!r.toEmail)
    throw new Error('send-report: không có địa chỉ To hợp lệ → hủy gửi. ' + r.warnings.join(' '));

  var mail = { to: r.toEmail, subject: subj, htmlBody: html, name: REPORT_FROM_NAME };
  if (r.cc.length) mail.cc = r.cc.join(',');
  MailApp.sendEmail(mail);
  result.sent = true;
  return result;
}
