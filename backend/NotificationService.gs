// ── SHTD Dashboard – Notification Service ──
//
// Nguồn noti: (1) trigger định kỳ notifScan() quét deadline mọi sheet mỗi sáng,
//             (2) real-time notifOnWrite() gọi trong doPost khi task/case/... được
//                 tạo (created) hoặc đóng (closed).
// Lưu trữ:   sheet "Notifications" (per-user read-state) — auto-create.
// Kênh:      chuông trong app (client poll notif-read) + email digest 1/ngày.
//
// Notifications schema (11 cột A→K):
//   A NotifID   = user|entityType|entityId|type  (idempotent key)
//   B Username  (recipient, lowercase)
//   C Type      due-3d | due-1d | due-today | overdue | created | closed
//   D EntityType task | case | issue | initiative | milestone | dev
//   E EntityID
//   F Title
//   G DueDate   (chuỗi gốc hiển thị)
//   H Message   (VI — dùng cho email + fallback chuông)
//   I CreatedTs (ISO)
//   J ReadTs    (ISO; rỗng = chưa đọc)
//   K EmailedDate (YYYY-MM-DD; chống gửi lại digest trong ngày)

var NOTIF_SHEET_NAME = 'Notifications';

var NOTIF_HEADER = [
  'NotifID', 'Username', 'Type', 'EntityType', 'EntityID',
  'Title', 'DueDate', 'Message', 'CreatedTs', 'ReadTs', 'EmailedDate'
];

// Cấu hình cột (0-based) theo từng entity — dùng chung cho scan + real-time.
var _NOTIF_CFG = {
  task:       { id:0, title:7,  deadline:12, status:14, progress:13, recips:[8,9] },
  'case':     { id:0, title:5,  deadline:14, status:10,              recips:[3]    },
  issue:      { id:0, title:2,  deadline:11, status:7,               recips:[16,15]},
  initiative: { id:0, title:1,  deadline:5,  status:9,  type:14,     recips:[3]    },
  dev:        { id:0, title:1,  deadline:6,  status:7,               recips:[3]    }
};

var _NOTIF_LABEL = {
  task:'Task', 'case':'Case', issue:'Issue',
  initiative:'Initiative', milestone:'Milestone', dev:'Dev Plan'
};

// Các loại nhắc "còn sống theo hạn" — phải thu hồi khi entity đóng/biến mất.
// (created/closed KHÔNG nằm đây: đó là thông báo sự kiện 1 lần, không phụ thuộc hạn.)
var _NOTIF_DUE_TYPES = { 'due-3d':1, 'due-1d':1, 'due-today':1, 'overdue':1 };

var _NOTIF_MMM = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

// Case_Pipeline stage → group (đồng bộ với constants.js CASE_STAGE_GROUP).
var _NOTIF_CASE_GRP = {
  'Tiếp nhận':'new',
  'Đã gặp KH/đang bổ sung thông tin':'active',
  'Chờ dữ liệu/ĐVKD':'active',
  'Chờ bổ sung hồ sơ':'active',
  'Đang phân tích':'active',
  'Chờ TTĐ/Thẩm định':'pending',
  'Trình nội bộ':'pending',
  'Đã xong phương án':'pending',
  'Đã trình TTV BĐS, đang phối hợp để báo cáo lại':'pending',
  'Trình phê duyệt':'pending',
  'Chờ giải ngân/triển khai':'done',
  'Đã phê duyệt':'done',
  'Đang triển khai':'done',
  'Tạm dừng/Blocked':'blocked'
};

/* ══════════════ Sheet helpers ══════════════ */

function _notifSheet_(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(NOTIF_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(NOTIF_SHEET_NAME);
    sheet.getRange(1, 1, 1, NOTIF_HEADER.length).setValues([NOTIF_HEADER]);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sheet;
}

function _notifToday_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
}

/* ══════════════ Date + status helpers ══════════════ */

function _notifParseDate(s) {
  if (!s && s !== 0) return null;
  s = String(s).trim();
  if (!s) return null;
  var m;
  // ISO YYYY-MM-DD (có/không kèm giờ)
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  // DD-MMM-YY / DD-MMM-YYYY  (30-Jul-26)
  m = s.match(/^(\d{1,2})[-\/ ]([A-Za-z]{3})[-\/ ](\d{2,4})$/);
  if (m) {
    var mon = _NOTIF_MMM[m[2].toLowerCase()];
    if (mon != null) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, mon, +m[1]); }
  }
  // DD/MM/YYYY hoặc DD-MM-YYYY
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

// Số ngày từ hôm nay (midnight) tới due (midnight). Âm = quá hạn.
function _notifDaysUntil(due) {
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var d = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function _notifCaseGroup(stage) {
  return _NOTIF_CASE_GRP[String(stage || '').trim()] || 'active';
}

// "Đóng" (closed) — chỉ trạng thái hoàn tất thực sự.
function _notifIsDone(etype, status, row, cfg) {
  var s = String(status || '').toLowerCase();
  if (etype === 'task') {
    if (s.indexOf('hoàn thành') !== -1) return true;
    var p = parseFloat(String((row && cfg) ? row[cfg.progress] : '').replace('%', ''));
    return (!isNaN(p) && p >= 100);
  }
  if (etype === 'case')  return _notifCaseGroup(status) === 'done';
  if (etype === 'issue') return s.indexOf('đã xử lý') !== -1;
  if (etype === 'dev')   return s === 'hoàn thành';
  if (etype === 'milestone') return (s === 'xong' || s === 'done' || s.indexOf('hoàn thành') !== -1);
  // initiative
  return (s === 'done' || s.indexOf('hoàn thành') !== -1);
}

// Bỏ qua khi quét due-soon: đã đóng, hoặc case đang blocked.
function _notifSkipDue(etype, status, row, cfg) {
  if (etype === 'case') { var g = _notifCaseGroup(status); return g === 'done' || g === 'blocked'; }
  return _notifIsDone(etype, status, row, cfg);
}

function _notifRowType(entityType, id, row, cfg) {
  if (entityType !== 'initiative') return entityType;
  var ty = String((cfg.type != null ? row[cfg.type] : '') || '').toLowerCase();
  if (ty === 'milestone' || /-M\d+$/.test(String(id))) return 'milestone';
  return 'initiative';
}

function _notifRecipients_(row, cfg) {
  var out = [], seen = {};
  for (var i = 0; i < cfg.recips.length; i++) {
    var v = String(row[cfg.recips[i]] || '').trim();
    if (!v) continue;
    var k = v.toLowerCase();
    if (seen[k]) continue;
    seen[k] = 1;
    out.push(v);
  }
  return out;
}

function _notifMessage_(etype, type, title, dueStr) {
  var lbl = '[' + (_NOTIF_LABEL[etype] || etype) + '] ';
  var t = title || '';
  switch (type) {
    case 'due-3d':    return lbl + '⏰ Còn 3 ngày đến hạn: "' + t + '" (' + dueStr + ')';
    case 'due-1d':    return lbl + '⏰ Còn 1 ngày đến hạn: "' + t + '" (' + dueStr + ')';
    case 'due-today': return lbl + '🔥 Đến hạn hôm nay: "' + t + '"';
    case 'overdue':   return lbl + '⚠️ Đã quá hạn: "' + t + '" (hạn ' + dueStr + ')';
    case 'created':   return lbl + '🆕 Công việc mới được giao: "' + t + '"';
    case 'closed':    return lbl + '✅ Đã hoàn thành/đóng: "' + t + '"';
  }
  return lbl + t;
}

/* ══════════════ User map (username → email) ══════════════ */

function _notifUserMap_() {
  var map = {};
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(USER_SHEET_NAME);
    if (!sheet) return map;
    var data = sheet.getDataRange().getValues();
    if (data.length < 2) return map;
    var H = data[0].map(function (h) { return String(h).trim(); });
    var iUser = H.indexOf('Username');
    var iDisp = H.indexOf('Display_Name');
    var iMail = H.indexOf('Email');
    var iActive = H.indexOf('Active');
    for (var i = 1; i < data.length; i++) {
      var u = String(data[i][iUser] || '').trim();
      if (!u) continue;
      var active = iActive < 0 ? true : !(data[i][iActive] === false || String(data[i][iActive]).toLowerCase() === 'false');
      map[u.toLowerCase()] = {
        username: u,
        display: iDisp >= 0 ? String(data[i][iDisp] || u) : u,
        email: iMail >= 0 ? String(data[i][iMail] || '').trim() : '',
        active: active
      };
    }
  } catch (e) { Logger.log('_notifUserMap_ error: ' + e.message); }
  return map;
}

/* ══════════════ Store (idempotent) ══════════════ */

function _notifRowFor_(rec) {
  return [
    rec.notifId, rec.username, rec.type, rec.entityType, rec.entityId,
    rec.title, rec.dueDate, rec.message, new Date().toISOString(), '', ''
  ];
}

// Ghi 1 noti nếu NotifID chưa tồn tại (không đụng ReadTs của bản ghi cũ).
function _notifAppendIfNew_(rec) {
  var sheet = _notifSheet_();
  var last = sheet.getLastRow();
  if (last > 1) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === rec.notifId) return false;
    }
  }
  sheet.appendRow(_notifRowFor_(rec));
  return true;
}

function _notifMakeRec_(username, type, etype, id, title, dueStr) {
  var u = String(username || '').toLowerCase();
  return {
    notifId: u + '|' + etype + '|' + id + '|' + type,
    username: u,
    type: type,
    entityType: etype,
    entityId: String(id),
    title: title || String(id),
    dueDate: dueStr || '',
    message: _notifMessage_(etype, type, title || String(id), dueStr || '')
  };
}

/* ══════════════ Client API: read / mark-read ══════════════ */

function notifRead(username, ss) {
  var u = String(username || '').toLowerCase();
  var sheet = _notifSheet_(ss);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var data = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length).getValues();
  var cutoff = Date.now() - 30 * 86400000;
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (String(r[1]).toLowerCase() !== u) continue;
    var createdTs = r[8] instanceof Date ? r[8].getTime() : Date.parse(r[8]);
    var read = !!r[9];
    if (read && createdTs && createdTs < cutoff) continue; // đã đọc & quá cũ → ẩn
    out.push({
      id: String(r[0]),
      type: String(r[2]),
      entityType: String(r[3]),
      entityId: String(r[4]),
      title: String(r[5]),
      dueDate: String(r[6]),
      message: String(r[7]),
      createdTs: r[8] instanceof Date ? r[8].toISOString() : String(r[8]),
      read: read
    });
  }
  out.sort(function (a, b) { return Date.parse(b.createdTs) - Date.parse(a.createdTs); });
  return out.slice(0, 100);
}

function notifMarkRead(username, ids, markAll) {
  var u = String(username || '').toLowerCase();
  var sheet = _notifSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return true;
  var idSet = {};
  if (!markAll && ids && ids.length) for (var k = 0; k < ids.length; k++) idSet[String(ids[k])] = 1;
  var range = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length);
  var data = range.getValues();
  var now = new Date().toISOString();
  var changed = false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase() !== u) continue;
    if (data[i][9]) continue; // đã đọc rồi
    if (markAll || idSet[String(data[i][0])]) { data[i][9] = now; changed = true; }
  }
  if (changed) { range.setValues(data); SpreadsheetApp.flush(); }
  return true;
}

/* ══════════════ Retraction: thu hồi nhắc due/overdue khi entity đã đóng ══════════════ */

// Mark-read mọi nhắc due/overdue CHƯA đọc của 1 entity (mọi recipient).
// Dùng real-time khi entity vừa được đóng/hoàn thành trong app.
function _notifRetractEntity_(sheet, etype, id) {
  sheet = sheet || _notifSheet_();
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var range = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length);
  var data = range.getValues();
  var now = new Date().toISOString();
  var eid = String(id).trim();
  var changed = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][9]) continue;                             // đã đọc
    if (!_NOTIF_DUE_TYPES[String(data[i][2])]) continue;  // chỉ due/overdue
    if (String(data[i][3]) !== etype) continue;           // EntityType
    if (String(data[i][4]).trim() !== eid) continue;      // EntityID
    data[i][9] = now; changed++;
  }
  if (changed) { range.setValues(data); SpreadsheetApp.flush(); }
  return changed;
}

// Tập trạng thái sống của mọi entity: exist[key]=1 (còn tồn tại), done[key]=1 (đã đóng).
// key = etype|id (etype đã phân biệt milestone vs initiative như _notifRowType).
function _notifLiveState_() {
  var exist = {}, done = {};
  var types = ['task', 'case', 'issue', 'initiative', 'dev'];
  for (var t = 0; t < types.length; t++) {
    var entityType = types[t];
    var cfg = _NOTIF_CFG[entityType];
    var values;
    try { values = _notifReadEntity_(entityType); } catch (e) { values = null; }
    if (!values || values.length < 2) continue;
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var id = String(r[cfg.id] || '').trim();
      if (!id) continue;
      var etype = _notifRowType(entityType, id, r, cfg);
      var key = etype + '|' + id;
      exist[key] = 1;
      if (_notifIsDone(etype, r[cfg.status], r, cfg)) done[key] = 1;
    }
  }
  return { exist: exist, done: done };
}

// Thu hồi mọi nhắc due/overdue chưa đọc mà entity nay đã done HOẶC không còn tồn tại.
// Tự chữa cả tồn kho lịch sử + task đóng ngoài app (sửa Sheet tay / migration).
function _notifRetractStale_(sheet, live) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var range = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length);
  var data = range.getValues();
  var now = new Date().toISOString();
  var changed = 0;
  for (var i = 0; i < data.length; i++) {
    if (data[i][9]) continue;
    if (!_NOTIF_DUE_TYPES[String(data[i][2])]) continue;
    var key = String(data[i][3]) + '|' + String(data[i][4]).trim();
    if (live.done[key] || !live.exist[key]) { data[i][9] = now; changed++; }
  }
  if (changed) { range.setValues(data); SpreadsheetApp.flush(); }
  return changed;
}

/* ══════════════ Real-time: created / closed (gọi từ doPost) ══════════════ */

// Đọc trạng thái trước khi ghi. Trả null nếu lỗi (→ bỏ qua, không noti sai).
function notifPrior_(entityType, id) {
  try {
    var cfg = _NOTIF_CFG[entityType];
    if (!cfg) return null;
    var values = _notifReadEntity_(entityType);
    if (!values || values.length < 2) return { existed: false, done: false };
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      if (String(r[cfg.id]).trim() === String(id).trim()) {
        var etype = _notifRowType(entityType, id, r, cfg);
        return { existed: true, done: _notifIsDone(etype, r[cfg.status], r, cfg) };
      }
    }
    return { existed: false, done: false };
  } catch (e) {
    Logger.log('notifPrior_ error: ' + e.message);
    return null;
  }
}

function notifOnWrite(entityType, id, row, prior) {
  try {
    if (!prior) return;                 // không chắc chắn → bỏ qua
    var cfg = _NOTIF_CFG[entityType];
    if (!cfg || !row) return;
    var etype = _notifRowType(entityType, id, row, cfg);
    var status = row[cfg.status];
    var title = String(row[cfg.title] || '').trim() || String(id);
    var dueStr = String(row[cfg.deadline] || '').trim();
    var recips = _notifRecipients_(row, cfg);
    if (!recips.length) return;

    var eventType = null;
    var nowDone = _notifIsDone(etype, status, row, cfg);
    // Entity vừa đóng/hoàn thành → gỡ ngay mọi nhắc due/overdue cũ còn treo (mọi recipient).
    if (nowDone) _notifRetractEntity_(null, etype, id);
    if (!prior.existed) eventType = 'created';
    else if (nowDone && !prior.done) eventType = 'closed';
    if (!eventType) return;

    for (var i = 0; i < recips.length; i++) {
      _notifAppendIfNew_(_notifMakeRec_(recips[i], eventType, etype, id, title, dueStr));
    }
  } catch (e) {
    Logger.log('notifOnWrite error: ' + e.message);
  }
}

/* ══════════════ Entity readers (reuse các service sẵn có) ══════════════ */

function _notifReadEntity_(entityType) {
  if (entityType === 'task')       return sheetRead().values;
  if (entityType === 'case')       return caseRead();
  if (entityType === 'issue')      return issueRead();
  if (entityType === 'initiative') return initiativeRead();
  if (entityType === 'dev')        return devRead();
  return [];
}

/* ══════════════ Daily scan (trigger entry) ══════════════ */

// Sinh candidate due-soon/overdue cho 1 entity sheet.
function _notifDueCandidates_(entityType) {
  var out = [];
  try {
    var cfg = _NOTIF_CFG[entityType];
    var values = _notifReadEntity_(entityType);
    if (!values || values.length < 2) return out;
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var id = String(r[cfg.id] || '').trim();
      if (!id) continue;
      var etype = _notifRowType(entityType, id, r, cfg);
      if (_notifSkipDue(etype, r[cfg.status], r, cfg)) continue;
      var dueStr = String(r[cfg.deadline] || '').trim();
      var due = _notifParseDate(dueStr);
      if (!due) continue;
      var days = _notifDaysUntil(due);
      var type = null;
      if (days === 3) type = 'due-3d';
      else if (days === 1) type = 'due-1d';
      else if (days === 0) type = 'due-today';
      else if (days < 0) type = 'overdue';
      else continue;
      var title = String(r[cfg.title] || '').trim() || id;
      var recips = _notifRecipients_(r, cfg);
      for (var j = 0; j < recips.length; j++) {
        out.push(_notifMakeRec_(recips[j], type, etype, id, title, dueStr));
      }
    }
  } catch (e) {
    Logger.log('_notifDueCandidates_(' + entityType + ') error: ' + e.message);
  }
  return out;
}

function notifScan() {
  var sheet = _notifSheet_();
  var users = _notifUserMap_();

  // Index NotifID sẵn có để append idempotent theo lô.
  var existing = {};
  var last = sheet.getLastRow();
  if (last > 1) {
    var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) existing[String(ids[i][0])] = 1;
  }

  var cands = [];
  cands = cands.concat(_notifDueCandidates_('task'));
  cands = cands.concat(_notifDueCandidates_('case'));
  cands = cands.concat(_notifDueCandidates_('issue'));
  cands = cands.concat(_notifDueCandidates_('initiative'));
  cands = cands.concat(_notifDueCandidates_('dev'));

  var toAppend = [];
  for (var c = 0; c < cands.length; c++) {
    var rec = cands[c];
    var user = users[rec.username];
    if (user && user.active === false) continue;  // user bị khóa → bỏ
    if (existing[rec.notifId]) continue;
    existing[rec.notifId] = 1;
    toAppend.push(_notifRowFor_(rec));
  }
  if (toAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, toAppend.length, NOTIF_HEADER.length).setValues(toAppend);
    SpreadsheetApp.flush();
  }

  // Thu hồi nhắc due/overdue của entity nay đã đóng / biến mất (tự chữa tồn kho + đóng ngoài app).
  var retracted = _notifRetractStale_(sheet, _notifLiveState_());

  if ((toAppend.length || retracted) && typeof _bumpDataVer === 'function') {
    _bumpDataVer();   // noti đổi → client batch kế tiếp lấy lại (hết version gate)
  }

  _notifPurge_(sheet);
  var mailed = _notifSendDigests_(sheet, users);

  Logger.log('notifScan: +' + toAppend.length + ' noti mới, thu hồi ' + retracted + ', gửi ' + mailed + ' email digest.');
  return { created: toAppend.length, retracted: retracted, emailed: mailed };
}

// Xóa noti đã đọc & tạo > 30 ngày (giữ sheet gọn).
function _notifPurge_(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var data = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length).getValues();
  var cutoff = Date.now() - 30 * 86400000;
  for (var i = data.length - 1; i >= 0; i--) {
    var read = !!data[i][9];
    var createdTs = data[i][8] instanceof Date ? data[i][8].getTime() : Date.parse(data[i][8]);
    if (read && createdTs && createdTs < cutoff) sheet.deleteRow(i + 2);
  }
  SpreadsheetApp.flush();
}

/* ══════════════ Email digest (1/user/ngày) ══════════════ */

var _NOTIF_GROUP_ORDER = [
  { key: 'overdue',   types: ['overdue'],            label: 'Quá hạn' },
  { key: 'today',     types: ['due-today'],          label: 'Đến hạn hôm nay' },
  { key: 'soon',      types: ['due-1d', 'due-3d'],   label: 'Sắp đến hạn' },
  { key: 'created',   types: ['created'],            label: 'Công việc mới' },
  { key: 'closed',    types: ['closed'],             label: 'Đã hoàn thành' }
];

// Username KHÔNG nhận email digest nhắc việc (vẫn nhận chuông trong app + vẫn nhận
// email BÁO CÁO ĐỊNH KỲ riêng qua ReportEmailService). Cấu hình động qua
// Report_Config.Digest_Suppress (username cách nhau dấu phẩy); nếu KHÔNG có key đó
// trong sheet thì fallback hằng số bên dưới.
var _NOTIF_DIGEST_SUPPRESS_DEFAULT = ['cuongvm1'];

function _notifDigestSuppressSet_() {
  var set = {};
  var foundKey = false;
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Report_Config');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0] || '').trim() === 'Digest_Suppress') {
          foundKey = true;
          String(data[i][1] || '').split(',').forEach(function (u) {
            var v = u.trim().toLowerCase();
            if (v) set[v] = 1;
          });
        }
      }
    }
  } catch (e) { Logger.log('_notifDigestSuppressSet_ error: ' + e.message); }
  if (!foundKey) {
    _NOTIF_DIGEST_SUPPRESS_DEFAULT.forEach(function (u) { set[String(u).toLowerCase()] = 1; });
  }
  return set;
}

function _notifSendDigests_(sheet, users) {
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var range = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length);
  var data = range.getValues();
  var today = _notifToday_();
  var suppress = _notifDigestSuppressSet_();   // user không nhận email digest

  // Gom bản ghi chưa đọc & chưa gửi hôm nay theo user.
  var byUser = {};       // user → [ {rowIdx, type, message} ]
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (r[9]) continue;                                  // đã đọc → không email
    if (String(r[10]) === today) continue;               // đã email hôm nay
    var u = String(r[1]).toLowerCase();
    (byUser[u] || (byUser[u] = [])).push({ rowIdx: i, type: String(r[2]), message: String(r[7]) });
  }

  var sent = 0;
  for (var uk in byUser) {
    if (!byUser.hasOwnProperty(uk)) continue;
    var info = users[uk];
    var items = byUser[uk];
    // Đánh dấu đã email hôm nay dù có gửi được hay không (tránh spam khi thiếu email
    // hoặc user bị suppress → không xử lý lại lô này ở lần scan sau).
    for (var m = 0; m < items.length; m++) data[items[m].rowIdx][10] = today;
    if (suppress[uk]) continue;                          // user bị loại khỏi email nhắc việc
    if (!info || !info.email || (info.active === false)) continue;

    var body = _notifDigestHtml_(info.display, items);
    try {
      MailApp.sendEmail({
        to: info.email,
        subject: '🔔 SHTD Dashboard — ' + items.length + ' nhắc việc hôm nay',
        htmlBody: body
      });
      sent++;
    } catch (e) {
      Logger.log('digest mail lỗi (' + info.email + '): ' + e.message);
    }
  }
  range.setValues(data);
  SpreadsheetApp.flush();
  return sent;
}

function _notifDigestHtml_(displayName, items) {
  var buckets = {};
  for (var i = 0; i < items.length; i++) (buckets[items[i].type] || (buckets[items[i].type] = [])).push(items[i].message);

  var html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;">';
  html += '<p>Chào <b>' + _notifEsc_(displayName) + '</b>,</p>';
  html += '<p>Tổng hợp nhắc việc của bạn hôm nay:</p>';
  for (var g = 0; g < _NOTIF_GROUP_ORDER.length; g++) {
    var grp = _NOTIF_GROUP_ORDER[g];
    var lines = [];
    for (var ti = 0; ti < grp.types.length; ti++) {
      var arr = buckets[grp.types[ti]];
      if (arr) for (var a = 0; a < arr.length; a++) lines.push(arr[a]);
    }
    if (!lines.length) continue;
    html += '<h3 style="margin:16px 0 6px;font-size:15px;">' + grp.label + ' (' + lines.length + ')</h3><ul style="margin:0;padding-left:20px;">';
    for (var l = 0; l < lines.length; l++) html += '<li style="margin:3px 0;">' + _notifEsc_(lines[l]) + '</li>';
    html += '</ul>';
  }
  html += '<p style="margin-top:18px;color:#888;font-size:12px;">Email tự động từ SHTD Dashboard. Mở app và bấm 🔔 để thao tác nhanh.</p></div>';
  return html;
}

function _notifEsc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ══════════════ Setup + dry-run (chạy 1 lần trong GAS editor) ══════════════ */

// Cài trigger quét mỗi sáng ~8h. Chạy 1 lần; tự dọn trigger trùng.
function installNotifTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'notifScan') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('notifScan').timeBased().atHour(8).everyDays(1).create();
  Logger.log('✅ Đã cài trigger notifScan mỗi ngày ~8h.');
}

// Dry-run: đếm nhắc due/overdue SẼ bị thu hồi (entity đã done / biến mất). KHÔNG ghi sheet.
// Chạy trước để soi tồn kho; sau đó chạy notifScan() (hoặc chờ trigger sáng) để dọn thật.
function notifRetractStalePreview() {
  var sheet = _notifSheet_();
  var last = sheet.getLastRow();
  if (last < 2) { Logger.log('Notifications rỗng.'); return { stale: 0, samples: [] }; }
  var live = _notifLiveState_();
  var data = sheet.getRange(2, 1, last - 1, NOTIF_HEADER.length).getValues();
  var stale = 0, samples = [];
  for (var i = 0; i < data.length; i++) {
    if (data[i][9]) continue;
    if (!_NOTIF_DUE_TYPES[String(data[i][2])]) continue;
    var key = String(data[i][3]) + '|' + String(data[i][4]).trim();
    if (live.done[key] || !live.exist[key]) {
      stale++;
      if (samples.length < 30) {
        samples.push((live.done[key] ? '[done]    ' : '[missing] ') + data[i][1] + ' → ' + data[i][7]);
      }
    }
  }
  Logger.log('notifRetractStalePreview — sẽ thu hồi: ' + stale + ' nhắc due/overdue.');
  for (var s = 0; s < samples.length; s++) Logger.log('• ' + samples[s]);
  return { stale: stale, samples: samples };
}

// Dry-run: log số noti sẽ sinh, KHÔNG ghi sheet / KHÔNG gửi email.
function notifSelfTest() {
  var cands = []
    .concat(_notifDueCandidates_('task'))
    .concat(_notifDueCandidates_('case'))
    .concat(_notifDueCandidates_('issue'))
    .concat(_notifDueCandidates_('initiative'))
    .concat(_notifDueCandidates_('dev'));
  var byType = {};
  for (var i = 0; i < cands.length; i++) byType[cands[i].type] = (byType[cands[i].type] || 0) + 1;
  Logger.log('notifSelfTest — tổng candidate: ' + cands.length);
  Logger.log(JSON.stringify(byType));
  for (var j = 0; j < Math.min(cands.length, 20); j++) Logger.log('• ' + cands[j].username + ' → ' + cands[j].message);
  return { total: cands.length, byType: byType };
}
