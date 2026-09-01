// ── SHTD Dashboard – Calendar Sync Service (Pha 1, giới hạn TuanTT4) ──
//
// Đồng bộ Task/Initiative của user lên Google Calendar để nhắc việc.
//   • Phạm vi: task ĐỊNH KỲ (Tuần/Tháng) → sự kiện lặp; task có deadline (chưa xong,
//     hạn ≥ hôm nay) → sự kiện 1 lần; initiative có deadline → sự kiện 1 lần.
//     Chỉ việc user là NGƯỜI PHỤ TRÁCH (Res/Acc).
//   • Công tắc tổng opt-in (Script Properties). User bật/tắt ở "Công việc của tôi".
//   • GIỚI HẠN cứng: chỉ 'TuanTT4' (whitelist) — user khác gọi bị từ chối.
//
// Cơ chế ghi lịch (tự phát hiện):
//   • Nếu email đích == tài khoản Google chạy script (owner) → GHI THẲNG vào lịch mặc định
//     của owner (đặt được nhắc offset chuẩn).
//   • Nếu khác → tạo trên 1 lịch phụ "SHTD – Nhắc việc" của owner + MỜI email làm khách
//     (guest-invite; nhắc theo mặc định lịch của khách).
//
// Sổ ánh xạ: sheet CAL_SYNC_MAP (idempotent — chỉ tạo/sửa/xóa phần thay đổi, chống trùng
//   + tôn trọng quota CalendarApp). Trạng thái bật/tắt + email + mốc sync: Script Properties.
//
// Deploy: cần owner cấp quyền Calendar (lần đầu gọi CalendarApp) + redeploy Web App +
//   installCalendarSyncTrigger() (trigger daily). KHÔNG đụng luồng cũ.

var CAL_MAP_SHEET     = 'CAL_SYNC_MAP';
var CAL_ALLOWED_USER  = 'tuantt4';                 // whitelist (lowercase)
var CAL_PROP_ON       = 'CAL_SYNC_ON';             // '1' | ''
var CAL_PROP_EMAIL    = 'CAL_SYNC_EMAIL';
var CAL_PROP_CALID    = 'CAL_SYNC_CALENDAR_ID';    // id lịch phụ (guest-invite)
var CAL_PROP_SYNCED   = 'CAL_SYNC_AT';             // ISO mốc reconcile gần nhất
var CAL_SECONDARY_NAME = 'SHTD – Nhắc việc';

var CAL_MAP_HEADER = [
  'Username', 'Entity_Type', 'Entity_Id', 'Occ',
  'Event_Id', 'Calendar_Id', 'Hash', 'State', 'Updated_At'
];

// Chỉ số cột (0-based) — GƯƠNG theo _NOTIF_CFG (NotificationService.gs). Giữ bản sao ở đây
// để service tự chứa (test sandbox độc lập, không phải nạp cả NotificationService).
var _CAL_CFG = {
  task:       { id: 0, title: 7, startDate: 11, deadline: 12, progress: 13, status: 14, recips: [8, 9], recurrence: 25 },
  initiative: { id: 0, title: 1, deadline: 5, status: 9, type: 14, recips: [3] }
};

var _CAL_MMM = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

/* ══════════════ Helper thuần (parse/recur/done) — TESTABLE ══════════════ */

function _calParseDate(s) {
  if (s instanceof Date) return isNaN(s.getTime()) ? null : new Date(s.getFullYear(), s.getMonth(), s.getDate());
  if (!s && s !== 0) return null;
  s = String(s).trim();
  if (!s) return null;
  var m;
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);                        // ISO
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[-\/ ]([A-Za-z]{3})[-\/ ](\d{2,4})$/);        // 30-Jul-26
  if (m) { var mon = _CAL_MMM[m[2].toLowerCase()]; if (mon != null) { var y = +m[3]; if (y < 100) y += 2000; return new Date(y, mon, +m[1]); } }
  m = s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);                // DD/MM/YYYY
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function _calRecurNorm(v) {
  var s = String(v == null ? '' : v).trim().toLowerCase();
  if (s.indexOf('tuần') !== -1 || s === 'tuan' || s === 'weekly' || s === 'week') return 'Tuần';
  if (s.indexOf('tháng') !== -1 || s === 'thang' || s === 'monthly' || s === 'month') return 'Tháng';
  return '';
}

// "Đã xong" — task hoàn thành (status chứa 'hoàn thành' hoặc %HT ≥ 100).
function _calTaskDone(status, progress) {
  var s = String(status || '').toLowerCase();
  if (s.indexOf('hoàn thành') !== -1) return true;
  var p = parseFloat(String(progress == null ? '' : progress).replace('%', ''));
  return (!isNaN(p) && p >= 100);
}
function _calInitDone(status) {
  var s = String(status || '').toLowerCase();
  return (s === 'done' || s.indexOf('hoàn thành') !== -1);
}

function _calDateOnly(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function _calIsoOf(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

// Cell người phụ trách có khớp username không (so lowercase, tách theo ; , /).
function _calRecipMatch(row, recipCols, userLc) {
  for (var i = 0; i < recipCols.length; i++) {
    var raw = String(row[recipCols[i]] == null ? '' : row[recipCols[i]]);
    var parts = raw.split(/[;,\/]/);
    for (var j = 0; j < parts.length; j++) {
      if (parts[j].trim().toLowerCase() === userLc) return true;
    }
  }
  return false;
}

/* ══════════════ Tính tập sự kiện MONG MUỐN — TESTABLE (thuần) ══════════════ */

// taskValues/initValues: 2D array (kèm header dòng 0). now: Date. username: string.
// Trả mảng spec: { key, entityType, entityId, kind:'recur'|'due', title, dateISO, freq, hash }
function _calDesiredEvents(username, taskValues, initValues, now) {
  var userLc = String(username || '').trim().toLowerCase();
  var today  = _calDateOnly(now || new Date());
  var out = [];

  // ── Tasks ──
  var tc = _CAL_CFG.task;
  if (taskValues && taskValues.length > 1) {
    for (var i = 1; i < taskValues.length; i++) {
      var r = taskValues[i];
      var id = String(r[tc.id] == null ? '' : r[tc.id]).trim();
      if (!id) continue;
      if (!_calRecipMatch(r, tc.recips, userLc)) continue;
      if (_calTaskDone(r[tc.status], r[tc.progress])) continue;
      var title = String(r[tc.title] == null ? '' : r[tc.title]).trim() || id;
      var freq  = _calRecurNorm(r[tc.recurrence]);
      if (freq) {
        // Sự kiện LẶP: mỏ neo = Start Date || Deadline || hôm nay (định weekday / day-of-month).
        var anchor = _calParseDate(r[tc.startDate]) || _calParseDate(r[tc.deadline]) || today;
        out.push(_calMakeSpec('task', id, 'recur', title, _calIsoOf(_calDateOnly(anchor)), freq));
      } else {
        // Sự kiện 1 LẦN theo deadline: chỉ khi hạn ≥ hôm nay (quá hạn → in-app lo, lịch vô ích).
        var dd = _calParseDate(r[tc.deadline]);
        if (dd && _calDateOnly(dd).getTime() >= today.getTime()) {
          out.push(_calMakeSpec('task', id, 'due', title, _calIsoOf(_calDateOnly(dd)), ''));
        }
      }
    }
  }

  // ── Initiatives (bỏ milestone) ──
  var ic = _CAL_CFG.initiative;
  if (initValues && initValues.length > 1) {
    for (var k = 1; k < initValues.length; k++) {
      var ir = initValues[k];
      var iid = String(ir[ic.id] == null ? '' : ir[ic.id]).trim();
      if (!iid) continue;
      var ty = String((ic.type != null ? ir[ic.type] : '') || '').toLowerCase();
      if (ty === 'milestone' || /-M\d+$/.test(iid)) continue;          // chỉ initiative gốc
      if (!_calRecipMatch(ir, ic.recips, userLc)) continue;
      if (_calInitDone(ir[ic.status])) continue;
      var idd = _calParseDate(ir[ic.deadline]);
      if (idd && _calDateOnly(idd).getTime() >= today.getTime()) {
        var ititle = String(ir[ic.title] == null ? '' : ir[ic.title]).trim() || iid;
        out.push(_calMakeSpec('initiative', iid, 'due', ititle, _calIsoOf(_calDateOnly(idd)), ''));
      }
    }
  }

  return out;
}

function _calMakeSpec(entityType, entityId, kind, title, dateISO, freq) {
  var occ = (kind === 'recur') ? 'RECUR' : 'DUE';
  var spec = {
    key: entityType + '|' + entityId + '|' + occ,
    entityType: entityType, entityId: entityId, kind: kind,
    title: title, dateISO: dateISO, freq: freq || ''
  };
  spec.hash = _calContentSig(spec);
  return spec;
}

// Chữ ký nội dung → đổi thì reconcile update (xóa+tạo lại).
function _calContentSig(spec) {
  return spec.kind + '|' + spec.title + '|' + spec.dateISO + '|' + (spec.freq || '');
}

/* ══════════════ Diff — TESTABLE (thuần) ══════════════ */

// desired: mảng spec. existing: mảng { key, eventId, hash }.
// → { create:[spec], update:[{spec, eventId}], del:[{key, eventId}], keep:[{spec, eventId}] }
function _calDiff(desired, existing) {
  var exByKey = {};
  for (var i = 0; i < existing.length; i++) exByKey[existing[i].key] = existing[i];
  var seen = {};
  var res = { create: [], update: [], del: [], keep: [] };

  for (var d = 0; d < desired.length; d++) {
    var spec = desired[d];
    seen[spec.key] = 1;
    var ex = exByKey[spec.key];
    if (!ex) { res.create.push(spec); }
    else if (String(ex.hash) !== String(spec.hash)) { res.update.push({ spec: spec, eventId: ex.eventId }); }
    else { res.keep.push({ spec: spec, eventId: ex.eventId }); }
  }
  for (var e = 0; e < existing.length; e++) {
    if (!seen[existing[e].key]) res.del.push({ key: existing[e].key, eventId: existing[e].eventId });
  }
  return res;
}

/* ══════════════ Script Properties + whitelist ══════════════ */

function _calProps() { return PropertiesService.getScriptProperties(); }
function _calAllowed(username) { return String(username || '').trim().toLowerCase() === CAL_ALLOWED_USER; }
function _calAssertAllowed(username) {
  if (!_calAllowed(username)) throw new Error('Tính năng đồng bộ Calendar hiện chỉ mở cho TuanTT4.');
}

function _calValidEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '').trim());
}

function _calEffectiveEmail() {
  try { return String(Session.getEffectiveUser().getEmail() || '').trim().toLowerCase(); }
  catch (e) { return ''; }
}

/* ══════════════ Calendar helpers (chạm CalendarApp) ══════════════ */

// Trả { cal, direct } — direct = email đích trùng tài khoản owner → lịch mặc định.
function _calResolveCalendar(email) {
  var direct = !!email && String(email).trim().toLowerCase() === _calEffectiveEmail();
  if (direct) return { cal: CalendarApp.getDefaultCalendar(), direct: true };
  // Guest-invite → lịch phụ riêng của owner (giữ lịch chính gọn).
  var props = _calProps();
  var id = props.getProperty(CAL_PROP_CALID);
  var cal = null;
  if (id) { try { cal = CalendarApp.getCalendarById(id); } catch (e) { cal = null; } }
  if (!cal) {
    cal = CalendarApp.createCalendar(CAL_SECONDARY_NAME);
    props.setProperty(CAL_PROP_CALID, cal.getId());
  }
  return { cal: cal, direct: false };
}

function _calRecurrenceRule(freq) {
  var r = CalendarApp.newRecurrence();
  return (freq === 'Tuần') ? r.addWeeklyRule() : r.addMonthlyRule();
}

// Tạo sự kiện theo spec → trả eventId (chuỗi). Best-effort; ném lỗi để caller đếm.
function _calCreateEvent(spec, resolved, email) {
  var cal = resolved.cal, direct = resolved.direct;
  var title = '[SHTD] ' + spec.title + (spec.kind === 'recur' ? ' (định kỳ ' + spec.freq + ')' : '');
  var startDate = _calParseDate(spec.dateISO) || new Date();
  var opts = direct ? {} : { guests: email, sendInvites: true };
  var ev;
  if (spec.kind === 'recur') {
    ev = cal.createAllDayEventSeries(title, startDate, _calRecurrenceRule(spec.freq), opts);
  } else {
    ev = cal.createAllDayEvent(title, startDate, opts);
    if (direct) { try { ev.addPopupReminder(12 * 60); } catch (e2) {} }   // ~trưa hôm trước
  }
  return ev.getId();
}

// Xóa sự kiện theo occ (RECUR = series / DUE = đơn). Best-effort (nuốt lỗi not-found).
function _calDeleteEvent(eventId, key, resolved) {
  if (!eventId) return;
  var cal = resolved.cal;
  var isRecur = /\|RECUR$/.test(String(key));
  try {
    if (isRecur) { var s = cal.getEventSeriesById(eventId); if (s) s.deleteEventSeries(); }
    else         { var ev = cal.getEventById(eventId);      if (ev) ev.deleteEvent(); }
  } catch (e) { Logger.log('_calDeleteEvent bỏ qua: ' + e.message); }
}

/* ══════════════ Sổ ánh xạ CAL_SYNC_MAP ══════════════ */

function _calMapSheet(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CAL_MAP_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CAL_MAP_SHEET);
    sheet.getRange(1, 1, 1, CAL_MAP_HEADER.length).setValues([CAL_MAP_HEADER]);
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
  }
  return sheet;
}

// Đọc mọi dòng (không header) → [{row:[...], user, key, eventId, hash, state}].
function _calMapReadAll(sheet) {
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var vals = sheet.getRange(2, 1, last - 1, CAL_MAP_HEADER.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    out.push({
      row: v,
      user: String(v[0] || '').toLowerCase(),
      key: String(v[1]) + '|' + String(v[2]) + '|' + String(v[3]),
      eventId: String(v[4] || ''),
      calId: String(v[5] || ''),
      hash: String(v[6] || ''),
      state: String(v[7] || 'active')
    });
  }
  return out;
}

// Ghi lại toàn bộ MAP = (dòng user KHÁC giữ nguyên) + (newRows của user này).
function _calMapRewriteUser(sheet, userLc, allRows, newRows) {
  var keep = [];
  for (var i = 0; i < allRows.length; i++) {
    if (allRows[i].user !== userLc) keep.push(allRows[i].row);
  }
  var body = keep.concat(newRows);
  // Xóa vùng dữ liệu cũ rồi ghi lại.
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, CAL_MAP_HEADER.length).clearContent();
  if (body.length) sheet.getRange(2, 1, body.length, CAL_MAP_HEADER.length).setValues(body);
  SpreadsheetApp.flush();
}

function _calMapRow(userDisplay, spec, eventId, calId) {
  return [
    userDisplay, spec.entityType, spec.entityId, (spec.kind === 'recur' ? 'RECUR' : 'DUE'),
    eventId, calId, spec.hash, 'active', new Date().toISOString()
  ];
}

/* ══════════════ Reconcile (điều phối) ══════════════ */

// Đưa lịch của user về ĐÚNG tập mong muốn (create/update/delete phần chênh). Trả thống kê.
function calSyncNow(username) {
  _calAssertAllowed(username);
  var userLc = String(username).trim().toLowerCase();
  var props  = _calProps();
  var on     = props.getProperty(CAL_PROP_ON) === '1';
  var email  = String(props.getProperty(CAL_PROP_EMAIL) || '').trim();

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var mapSheet = _calMapSheet(ss);
  var allRows  = _calMapReadAll(mapSheet);
  var existing = [];
  for (var i = 0; i < allRows.length; i++) {
    if (allRows[i].user === userLc && allRows[i].state === 'active') {
      existing.push({ key: allRows[i].key, eventId: allRows[i].eventId, hash: allRows[i].hash });
    }
  }

  var desired = [];
  if (on) {
    var taskValues = sheetRead(ss).values;
    var initValues = initiativeRead(ss);
    desired = _calDesiredEvents(username, taskValues, initValues, new Date());
  }

  var diff = _calDiff(desired, existing);
  var resolved = _calResolveCalendar(email);
  var calId = '';
  try { calId = resolved.cal.getId(); } catch (e) {}

  var newRows = [];
  var stat = { created: 0, updated: 0, deleted: 0, kept: 0, errors: 0 };

  // keep — giữ nguyên eventId, ghi lại dòng MAP.
  for (var a = 0; a < diff.keep.length; a++) {
    var kp = diff.keep[a];
    newRows.push(_calMapRow(username, kp.spec, kp.eventId, calId));
    stat.kept++;
  }
  // create
  for (var b = 0; b < diff.create.length; b++) {
    try {
      var evId = _calCreateEvent(diff.create[b], resolved, email);
      newRows.push(_calMapRow(username, diff.create[b], evId, calId));
      stat.created++;
    } catch (e) { stat.errors++; Logger.log('create lỗi: ' + e.message); }
  }
  // update = xóa cũ + tạo mới (tránh sửa series phức tạp)
  for (var c = 0; c < diff.update.length; c++) {
    try {
      _calDeleteEvent(diff.update[c].eventId, diff.update[c].spec.key, resolved);
      var evId2 = _calCreateEvent(diff.update[c].spec, resolved, email);
      newRows.push(_calMapRow(username, diff.update[c].spec, evId2, calId));
      stat.updated++;
    } catch (e) { stat.errors++; Logger.log('update lỗi: ' + e.message); }
  }
  // delete
  for (var d2 = 0; d2 < diff.del.length; d2++) {
    try { _calDeleteEvent(diff.del[d2].eventId, diff.del[d2].key, resolved); stat.deleted++; }
    catch (e) { stat.errors++; Logger.log('delete lỗi: ' + e.message); }
  }

  _calMapRewriteUser(mapSheet, userLc, allRows, newRows);
  props.setProperty(CAL_PROP_SYNCED, new Date().toISOString());
  Logger.log('calSyncNow(' + username + '): ' + JSON.stringify(stat));
  return stat;
}

/* ══════════════ API (gọi từ doPost) ══════════════ */

function calStatus(username) {
  var allowed = _calAllowed(username);
  var props = _calProps();
  return {
    allowed: allowed,
    on: allowed && props.getProperty(CAL_PROP_ON) === '1',
    email: allowed ? String(props.getProperty(CAL_PROP_EMAIL) || '') : '',
    syncedAt: allowed ? String(props.getProperty(CAL_PROP_SYNCED) || '') : ''
  };
}

function calEnable(username, email) {
  _calAssertAllowed(username);
  if (!_calValidEmail(email)) throw new Error('Email Google không hợp lệ.');
  var props = _calProps();
  props.setProperty(CAL_PROP_ON, '1');
  props.setProperty(CAL_PROP_EMAIL, String(email).trim());
  var stat = calSyncNow(username);
  var st = calStatus(username);
  st.stat = stat;
  return st;
}

function calDisable(username) {
  _calAssertAllowed(username);
  var props = _calProps();
  props.setProperty(CAL_PROP_ON, '');           // tắt trước → calSyncNow desired = [] → gỡ hết
  var stat = calSyncNow(username);
  return { allowed: true, on: false, email: String(props.getProperty(CAL_PROP_EMAIL) || ''),
           syncedAt: String(props.getProperty(CAL_PROP_SYNCED) || ''), stat: stat };
}

/* ══════════════ Trigger (daily) + setup ══════════════ */

// Đồng bộ lại hằng ngày → bắt kịp task mới/đổi deadline/hoàn thành/gỡ.
function calSyncDaily() {
  try {
    if (_calProps().getProperty(CAL_PROP_ON) !== '1') return;
    calSyncNow(CAL_ALLOWED_USER);
  } catch (e) { Logger.log('calSyncDaily lỗi: ' + e.message); }
}

// Chạy 1 lần trong GAS editor để gắn trigger @7h30 (sau DateGuard @7h, trước notifScan @8h).
function installCalendarSyncTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'calSyncDaily') ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger('calSyncDaily').timeBased().atHour(7).nearMinute(30).everyDays(1).create();
  Logger.log('✅ Đã gắn trigger calSyncDaily @7h30.');
}

// Tiện ích self-test bật thử (chạy trong editor). KHÔNG dùng ở production.
function calSelfTestEnable(email) {
  return calEnable('TuanTT4', email);
}
