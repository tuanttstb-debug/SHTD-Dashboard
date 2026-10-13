// AiService.gs — Gemini AI Chat cho SHTD Dashboard
// GEMINI_API_KEY phải được set trong Script Properties trước khi dùng.
//
// S93 (2026-10-13) — TUNING "nhanh + tiết kiệm token" (gói Gemini miễn phí):
//   Đo LIVE trước tuning: 1 câu đếm = 169 s (Gemini 148 s), payload ~200K token/câu ≈ trần
//   free-tier/phút → 429 dồn. Kiến trúc mới:
//   (1) BUNDLE gọn: đọc sheet 1 lần → bản ghi task/initiative/KPI rút gọn, cache chia khúc 10'.
//   (2) ĐỊNH TUYẾN: câu đếm/liệt kê theo bộ lọc nhận diện được (quá hạn, sắp hạn, team,
//       trạng thái, PIC) → trả lời TẤT ĐỊNH từ bundle, KHÔNG gọi Gemini (0 token, < 5 s).
//   (3) Câu còn lại → gửi Gemini CHỈ phần dữ liệu liên quan (lọc + từ khóa, trần 120 task)
//       + số liệu tính sẵn → ~10K token thay vì ~200K.
//   (4) Model chính Flash-Lite + thinking thấp; 429 quota → nhảy model kế ngay (không ngủ).

var AI_TASK_CAP       = 120;   // số task tối đa gửi LLM
var AI_DETAIL_CAP     = 15;    // số task kèm cột free-text (kết quả/kế hoạch/BLĐ)
var AI_INIT_CAP       = 60;
var AI_KPI_CAP        = 120;
var AI_DET_LIST_CAP   = 50;    // số dòng tối đa của bảng trả lời tất định
var AI_HISTORY_TURNS  = 4;
var AI_HISTORY_CHARS  = 1200;
var AI_BUNDLE_TTL     = 600;   // 10' — sửa tay sheet không bump DATA_VER nên giữ TTL ngắn

// ══════════════════════════════════════════════════════════════════════════
// ĐIỂM VÀO (Code.gs route 'ai-chat')
// ══════════════════════════════════════════════════════════════════════════
function aiChatHandle_(message, history) {
  var t0 = Date.now();
  var bundle = _aiLoadBundle_();
  var q = _aiParseQuery_(message, bundle, history);

  if (q.deterministic) {
    var det = _aiDeterministicAnswer_(bundle, q);
    _aiLog_('det', '-', 200, Date.now() - t0, q.intent + ' ' + _aiFilterLabel_(q));
    return { status: 'ok', reply: det, mode: 'det' };
  }

  var ctx = _aiBuildPrompt_(bundle, q);
  try {
    var reply = callGemini(ctx, history, message);
    return { status: 'ok', reply: reply, mode: 'llm' };
  } catch (aiErr) {
    return _aiErrorResponse_(aiErr, _aiSummaryText_(bundle));
  }
}

// ══════════════════════════════════════════════════════════════════════════
// (1) BUNDLE — dữ liệu rút gọn + cache chia khúc
// ══════════════════════════════════════════════════════════════════════════

function _aiLoadBundle_() {
  var key = 'aib1|' + (typeof _dataVer === 'function' ? _dataVer() : '0');
  var hit = _aiCacheGetBig_(key);
  if (hit && hit.tasks) return hit;

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var taskRows = [], initRows = [], kpiRows = [];
  try { taskRows = sheetRead(ss).values || []; } catch (e) { Logger.log('ai bundle task: ' + e.message); }
  try { initRows = initiativeRead(ss) || []; }   catch (e) { Logger.log('ai bundle init: ' + e.message); }
  try { kpiRows  = kpiSheetRead() || []; }       catch (e) { Logger.log('ai bundle kpi: ' + e.message); }

  var bundle = _aiBuildBundle_(taskRows, initRows, kpiRows, new Date());
  _aiCachePutBig_(key, bundle);
  return bundle;
}

// Thuần (test được): rows thô → bundle gọn.
function _aiBuildBundle_(taskRows, initRows, kpiRows, now) {
  var today = new Date(now.getTime()); today.setHours(0, 0, 0, 0);
  var tasks = [];
  if (taskRows && taskRows.length > 1) {
    var C = _aiResolveTaskCols_(taskRows[0]);
    for (var i = 1; i < taskRows.length; i++) {
      var r = taskRows[i];
      var name = C.cName !== -1 ? String(r[C.cName] || '').trim() : '';
      if (!name) continue;
      var res = C.cRes !== -1 ? String(r[C.cRes] || '').trim() : '';
      var acc = C.cAcc !== -1 ? String(r[C.cAcc] || '').trim() : '';
      var dlRaw = C.cEnd !== -1 ? String(r[C.cEnd] || '').trim() : '';
      var dl = _aiParseDate_(dlRaw);
      var detail = [];
      for (var d = 0; d < C.cDetail.length; d++) {
        var v = String(r[C.cDetail[d].i] || '').trim();
        if (v) detail.push(C.cDetail[d].h + ': ' + v);
      }
      tasks.push({
        id:  C.cId !== -1 ? String(r[C.cId] || '').trim() : '',
        st:  C.cState !== -1 ? String(r[C.cState] || '').trim() : '',
        p:   _aiProg_(C.cProg !== -1 ? r[C.cProg] : ''),
        tm:  C.cTeam !== -1 ? String(r[C.cTeam] || '').trim() : '',
        pic: res || acc,
        acc: acc,
        dl:  dlRaw,
        dd:  dl ? Math.round((dl.getTime() - today.getTime()) / 86400000) : null,   // số ngày tới hạn (âm = đã qua)
        nm:  _aiTrunc_(name, 120),
        vm:  _aiTrunc_(C.cVm !== -1 ? r[C.cVm] : '', 120),
        dt:  _aiTrunc_(detail.join(' · '), 320),
        ini: C.cIni !== -1 ? String(r[C.cIni] || '').trim() : ''
      });
    }
  }

  var inits = [];
  if (initRows && initRows.length > 1) {
    var H = initRows[0].map(function (h) { return String(h).trim(); });
    var pick = ['ID', 'Tên Initiative / Milestone', 'Type', 'Accountable', 'Deadline / Target', '% HT',
                'Trạng thái', 'Milestone Đang track', 'Deadline Milestone', 'Parent ID'];
    var idx = pick.map(function (p) { return H.indexOf(p); });
    inits.push(pick.join(' | '));
    for (var k = 1; k < initRows.length; k++) {
      var row = initRows[k];
      if (!String(row[0] || '').trim()) continue;
      inits.push(_aiTrunc_(idx.map(function (c) { return c === -1 ? '' : String(row[c] == null ? '' : row[c]).trim(); }).join(' | '), 260));
    }
  }

  var kpi = [];
  for (var j = 0; j < (kpiRows || []).length; j++) kpi.push(_aiTrunc_(kpiRows[j].join(' | '), 220));

  return { today: _aiIsoDate_(today), tasks: tasks, inits: inits, kpi: kpi };
}

function _aiIsoDate_(d) {
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}

// Cache > 100KB/key: gzip → base64 → chia khúc 90KB, ghi bằng putAll (1 lần gọi).
function _aiCachePutBig_(key, obj) {
  try {
    var b64 = Utilities.base64Encode(Utilities.gzip(Utilities.newBlob(JSON.stringify(obj))).getBytes());
    var CH = 90000, n = Math.ceil(b64.length / CH);
    if (n > 20) return;                                  // > ~1,8 MB → bỏ cache
    var m = {}; m[key + '|n'] = String(n);
    for (var i = 0; i < n; i++) m[key + '|' + i] = b64.substr(i * CH, CH);
    CacheService.getScriptCache().putAll(m, AI_BUNDLE_TTL);
  } catch (e) { /* cache best-effort */ }
}

function _aiCacheGetBig_(key) {
  try {
    var cache = CacheService.getScriptCache();
    var n = +cache.get(key + '|n');
    if (!n) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + '|' + i);
    var got = cache.getAll(keys), parts = [];
    for (var k = 0; k < n; k++) { if (!got[keys[k]]) return null; parts.push(got[keys[k]]); }
    var blob = Utilities.newBlob(Utilities.base64Decode(parts.join('')), 'application/x-gzip');
    return JSON.parse(Utilities.ungzip(blob).getDataAsString());
  } catch (e) { return null; }
}

// ── Helper parse (khớp ngữ nghĩa frontend helpers.js/parsers.js) ──

function _aiParseDate_(s) {
  if (s == null) return null;
  if (Object.prototype.toString.call(s) === '[object Date]') return isNaN(s) ? null : s;
  s = String(s).trim();
  if (!s) return null;
  var m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)))            return new Date(+m[1], +m[2] - 1, +m[3]); // ISO
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) {                                                  // D/M/Y hoặc M/D/Y
    var a = +m[1], b = +m[2], y = +m[3];
    if (a > 12) return new Date(y, b - 1, a);   // rõ ràng D/M
    if (b > 12) return new Date(y, a - 1, b);   // rõ ràng M/D
    return new Date(y, b - 1, a);               // nhập nhằng → giả định D/M (VN)
  }
  if ((m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/))) {                                              // DD-MMM-YY
    var mm = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(m[2].toLowerCase());
    if (mm >= 0) { var yy = +m[3]; if (yy < 100) yy += 2000; return new Date(yy, mm, +m[1]); }
  }
  var d = new Date(s);
  return isNaN(d) ? null : d;
}

function _aiProg_(v) {
  if (v == null) return 0;
  if (typeof v === 'number') return Math.min(100, Math.max(0, v <= 1 ? Math.round(v * 100) : Math.round(v)));
  var s = String(v).trim();
  var cv = parseFloat(s.replace('%', ''));
  if (isNaN(cv)) return 0;
  var p = (s.indexOf('%') === -1 && s.indexOf('.') !== -1 && cv <= 1) ? Math.round(cv * 100) : Math.round(cv);
  return Math.min(100, Math.max(0, p));
}

function _aiResolveTaskCols_(headerRow) {
  var H = headerRow.map(function (h) { return String(h).trim(); });
  function findCol(pred) { for (var i = 0; i < H.length; i++) { if (pred(H[i])) return i; } return -1; }
  var detailNames = ['Milestone hiện tại', 'Kết quả tuần qua', 'Kế hoạch tuần tới', 'Nội dung cần BLĐ quyết', 'Ý kiến BLĐ'];
  var cDetail = [];
  for (var k = 0; k < detailNames.length; k++) {
    var ix = H.indexOf(detailNames[k]);
    if (ix !== -1) cDetail.push({ i: ix, h: detailNames[k].replace(' hiện tại', '').replace(' tuần qua', '').replace(' tuần tới', '') });
  }
  return {
    cId:    findCol(function (h) { return h === 'ID'; }),
    cName:  findCol(function (h) { return h.indexOf('Task / Deliverable') === 0 || h.indexOf('Deliverable') !== -1; }),
    cAcc:   findCol(function (h) { return h.indexOf('PIC Accountable') === 0; }),
    cRes:   findCol(function (h) { return h.indexOf('PIC Responsible') === 0; }),
    cEnd:   findCol(function (h) { return h === 'Deadline'; }),
    cProg:  findCol(function (h) { return h === '% HT'; }),
    cState: findCol(function (h) { return h === 'Trạng thái'; }),
    cTeam:  findCol(function (h) { return h.indexOf('Team chính') === 0 || h === 'Team'; }),
    cVm:    findCol(function (h) { return h.indexOf('Vướng mắc') === 0; }),
    cIni:   findCol(function (h) { return h === 'Initiative ID'; }),
    cDetail: cDetail
  };
}

function _aiTrunc_(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// Ngữ nghĩa khớp FE isOverdue (S87/S92): Hoàn thành / %≥100 / Tạm dừng KHÔNG tính quá hạn.
function _aiTaskDone_(t)   { return t.p >= 100 || t.st === 'Hoàn thành'; }
function _aiTaskPaused_(t) { return t.st === 'Tạm dừng'; }
function _aiTaskOpen_(t)   { return !_aiTaskDone_(t) && !_aiTaskPaused_(t); }
function _aiTaskOverdue_(t){ return _aiTaskOpen_(t) && t.dd !== null && t.dd < 0; }
function _aiTaskSoon_(t)   { return _aiTaskOpen_(t) && t.dd !== null && t.dd >= 0 && t.dd < 7; }

// ══════════════════════════════════════════════════════════════════════════
// (2) ĐỊNH TUYẾN câu hỏi
// ══════════════════════════════════════════════════════════════════════════

// Bỏ dấu tiếng Việt + thường hóa → so khớp ổn định.
function _aiNorm_(s) {
  return String(s == null ? '' : s).toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s\-_.\/]/g, ' ').replace(/\s+/g, ' ').trim();
}

function _aiReEsc_(s) { return String(s).replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&'); }

var _AI_TEAMS = [
  { re: /\b(team |nhom )?ptkd ?mb\b/, v: 'PTKD MB' },
  { re: /\b(team |nhom )?ptkd ?mn\b/, v: 'PTKD MN' },
  { re: /\b(team |nhom )?bl\b/,       v: 'BL' },
  { re: /\b(team |nhom )?cv\b/,       v: 'CV' },
  { re: /\b(team|nhom) so\b/,         v: 'Số' }       // "số" trần dễ nhầm "số lượng" → bắt buộc "team số"
];

var _AI_STOP = ('task tasks cong viec co bao nhieu so luong hien nay tai dang cua trong la nhung cac may nao gi ' +
  'toi em anh chi minh ban team nhom cho biet hay liet ke danh sach xem show va voi thi o duoc bi ra giup vui long ' +
  'tong dem thong deadline han qua sap den het tat ca list ve theo pic phu trach nguoi ngay tuan thang nam the nhe a ' +
  'ah vay khong chua roi nua con lai bay gio hom tre muon cham tien do dang thuc hien mot 7 nao ha k ko').split(' ');

function _aiParseQuery_(message, bundle, history) {
  var n = _aiNorm_(message);
  var q = { raw: message, norm: n, intent: 'other', overdue: false, soon: false, team: '', state: '', pic: '', ids: [], keywords: [], deterministic: false };
  var rest = ' ' + n + ' ';
  function eat(re) { rest = rest.replace(re, ' '); }

  if (/\b(qua han|tre han|tre deadline|cham tien do|da qua deadline)\b/.test(n)) { q.overdue = true; eat(/\b(qua han|tre han|tre deadline|cham tien do|da qua deadline)\b/g); }
  if (/\b(sap (den |toi )?han|sap het han|sap toi deadline|den han trong)\b/.test(n)) { q.soon = true; eat(/\b(sap (den |toi )?han|sap het han|sap toi deadline|den han trong)\b/g); }

  for (var t = 0; t < _AI_TEAMS.length; t++) {
    if (_AI_TEAMS[t].re.test(n)) { q.team = _AI_TEAMS[t].v; eat(new RegExp(_AI_TEAMS[t].re.source, 'g')); break; }
  }

  // Trạng thái: lấy từ dữ liệu thật (không hard-code), ưu tiên chuỗi dài nhất.
  var states = {}, pics = {}, ids = {};
  var tasks = (bundle && bundle.tasks) || [];
  for (var i = 0; i < tasks.length; i++) {
    if (tasks[i].st) states[_aiNorm_(tasks[i].st)] = tasks[i].st;
    if (tasks[i].id) ids[_aiNorm_(tasks[i].id)] = tasks[i].id;
    var ps = String(tasks[i].pic + ',' + tasks[i].acc).split(/[,;\/\n]+/);
    for (var j = 0; j < ps.length; j++) { var pn = _aiNorm_(ps[j]); if (pn.length >= 3) pics[pn] = ps[j].trim(); }
  }
  var stKeys = Object.keys(states).sort(function (a, b) { return b.length - a.length; });
  for (var s = 0; s < stKeys.length; s++) {
    if (stKeys[s].length >= 4 && rest.indexOf(' ' + stKeys[s] + ' ') !== -1) { q.state = states[stKeys[s]]; eat(new RegExp(' ' + _aiReEsc_(stKeys[s]) + ' ', 'g')); rest = ' ' + rest + ' '; break; }
  }
  var picKeys = Object.keys(pics).sort(function (a, b) { return b.length - a.length; });
  for (var p = 0; p < picKeys.length; p++) {
    if (rest.indexOf(' ' + picKeys[p] + ' ') !== -1) { q.pic = pics[picKeys[p]]; eat(new RegExp(' ' + _aiReEsc_(picKeys[p]) + ' ', 'g')); rest = ' ' + rest + ' '; break; }
  }

  // Ý định
  if (/\b(bao nhieu|so luong|may task|dem|tong so|thong ke|co may)\b/.test(n)) q.intent = 'count';
  else if (/\b(liet ke|danh sach|nhung task|cac task|task nao|show|list)\b/.test(n)) q.intent = 'list';

  // Từ khóa còn lại (ID task + chữ có nghĩa) → dùng lọc context / chặn đường tất định.
  var toks = rest.split(' ');
  for (var w = 0; w < toks.length; w++) {
    var tk = toks[w];
    if (!tk) continue;
    if (ids[tk]) { q.ids.push(ids[tk]); continue; }
    if (tk.length < 2 || _AI_STOP.indexOf(tk) !== -1 || /^\d+$/.test(tk)) continue;
    q.keywords.push(tk);
  }

  // Tất định khi: hỏi đếm/liệt kê + KHÔNG còn từ khóa lạ + không nhắc ID + có bộ lọc (hoặc đếm tổng).
  var hasFilter = !!(q.overdue || q.soon || q.team || q.state || q.pic);
  q.deterministic = (q.intent === 'count' || q.intent === 'list') && q.keywords.length === 0 &&
                    q.ids.length === 0 && (hasFilter || q.intent === 'count');
  return q;
}

function _aiApplyFilters_(tasks, q) {
  var picN = q.pic ? _aiNorm_(q.pic) : '';
  return tasks.filter(function (t) {
    if (q.overdue && !_aiTaskOverdue_(t)) return false;
    if (q.soon && !_aiTaskSoon_(t)) return false;
    if (q.team && t.tm !== q.team) return false;
    if (q.state && t.st !== q.state) return false;
    if (picN && _aiNorm_(t.pic + ',' + t.acc).indexOf(picN) === -1) return false;
    return true;
  });
}

function _aiFilterLabel_(q) {
  var f = [];
  if (q.overdue) f.push('quá hạn');
  if (q.soon)    f.push('sắp đến hạn (7 ngày)');
  if (q.state)   f.push('trạng thái "' + q.state + '"');
  if (q.team)    f.push('team ' + q.team);
  if (q.pic)     f.push('PIC ' + q.pic);
  return f.join(', ');
}

function _aiCountBy_(list, field) {
  var m = {}, out = [];
  for (var i = 0; i < list.length; i++) { var k = list[i][field] || '(chưa gán)'; m[k] = (m[k] || 0) + 1; }
  for (var key in m) if (m.hasOwnProperty(key)) out.push([key, m[key]]);
  out.sort(function (a, b) { return b[1] - a[1]; });
  return out;
}

// Trả lời KHÔNG qua LLM — số chính xác, bảng gọn. Sắp: quá hạn lâu nhất / gần hạn nhất trước.
function _aiDeterministicAnswer_(bundle, q) {
  var list = _aiApplyFilters_(bundle.tasks, q);
  var label = _aiFilterLabel_(q);
  var out = [];
  if (!label) {
    out.push('Hiện có **' + list.length + '** task trong hệ thống (tính đến ' + bundle.today + ').');
  } else {
    out.push('Có **' + list.length + '** task ' + label + ' (tính đến ' + bundle.today + ').');
  }
  if (!list.length) { out.push('', '_⚡ Trả lời nhanh từ số liệu tính sẵn (không qua AI)._'); return out.join('\n'); }

  if (!q.state) {
    var bySt = _aiCountBy_(list, 'st');
    if (bySt.length > 1) out.push('- Theo trạng thái: ' + bySt.map(function (x) { return x[0] + ' **' + x[1] + '**'; }).join(' · '));
  }
  if (!q.pic) {
    var byPic = _aiCountBy_(list, 'pic').slice(0, 10);
    if (byPic.length > 1) out.push('- Theo PIC (top 10): ' + byPic.map(function (x) { return x[0] + ' **' + x[1] + '**'; }).join(' · '));
  }
  if (!q.team && !label) {
    var byTm = _aiCountBy_(list, 'tm');
    if (byTm.length > 1) out.push('- Theo team: ' + byTm.map(function (x) { return x[0] + ' **' + x[1] + '**'; }).join(' · '));
  }

  // Bảng: chỉ khi có bộ lọc (đếm tổng toàn hệ thống thì bảng vô nghĩa).
  if (label) {
    var sorted = list.slice().sort(function (a, b) {
      var da = a.dd === null ? 99999 : a.dd, db2 = b.dd === null ? 99999 : b.dd;
      return da - db2;
    });
    var cap = Math.min(sorted.length, AI_DET_LIST_CAP);
    out.push('', '| ID | PIC | Deadline | Trạng thái | %HT | Task |', '|---|---|---|---|---|---|');
    for (var i = 0; i < cap; i++) {
      var t = sorted[i];
      out.push('| ' + [t.id, t.pic, t.dl, t.st, t.p + '%', _aiTrunc_(t.nm, 80)].map(function (c) { return String(c).replace(/\|/g, '/'); }).join(' | ') + ' |');
    }
    if (sorted.length > cap) out.push('', '… và ' + (sorted.length - cap) + ' task khác — lọc chi tiết ở màn **Quản lý Task**.');
  }
  out.push('', '_⚡ Trả lời nhanh từ số liệu tính sẵn (không qua AI)._');
  return out.join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// (3) PROMPT GỌN cho LLM
// ══════════════════════════════════════════════════════════════════════════

function _aiSummaryText_(bundle) {
  var tasks = bundle.tasks || [];
  var overdue = tasks.filter(_aiTaskOverdue_), soon = tasks.filter(_aiTaskSoon_);
  var out = [];
  out.push('=== SỐ LIỆU TÍNH SẴN (chính xác — dùng cho câu hỏi đếm/thống kê) ===');
  out.push('Ngày hôm nay: ' + bundle.today);
  out.push('Tổng số task: ' + tasks.length);
  out.push('Số task QUÁ HẠN (chưa hoàn thành, không Tạm dừng, qua deadline): ' + overdue.length);
  out.push('Số task SẮP ĐẾN HẠN (7 ngày tới): ' + soon.length);
  out.push('Theo trạng thái: ' + _aiCountBy_(tasks, 'st').map(function (x) { return x[0] + ': ' + x[1]; }).join(' | '));
  out.push('Theo team: ' + _aiCountBy_(tasks, 'tm').map(function (x) { return x[0] + ': ' + x[1]; }).join(' | '));
  if (overdue.length) out.push('Quá hạn theo PIC: ' + _aiCountBy_(overdue, 'pic').slice(0, 20).map(function (x) { return x[0] + ': ' + x[1]; }).join(' | '));
  return out.join('\n');
}

function _aiBuildPrompt_(bundle, q) {
  var tasks = bundle.tasks || [];
  var hasFilter = q.overdue || q.soon || q.team || q.state || q.pic;
  var pool = hasFilter ? _aiApplyFilters_(tasks, q) : tasks;

  // Chấm điểm theo từ khóa + ID nhắc tới.
  var kws = q.keywords || [], idSet = {};
  for (var a = 0; a < (q.ids || []).length; a++) idSet[q.ids[a]] = 1;
  var scored = [];
  for (var i = 0; i < pool.length; i++) {
    var t = pool[i], sc = 0;
    if (idSet[t.id]) sc += 100;
    if (kws.length) {
      var hay = ' ' + _aiNorm_([t.id, t.nm, t.vm, t.dt, t.pic, t.tm, t.ini].join(' ')) + ' ';
      for (var k = 0; k < kws.length; k++) if (hay.indexOf(kws[k]) !== -1) sc += (hay.indexOf(' ' + kws[k] + ' ') !== -1 ? 2 : 1);
    }
    scored.push({ t: t, sc: sc });
  }
  var hits = scored.filter(function (x) { return x.sc > 0; });
  var chosen, note;
  if (hits.length) {
    hits.sort(function (x, y) { return y.sc - x.sc; });
    chosen = hits.map(function (x) { return x.t; });
    note = 'task khớp từ khóa/ID câu hỏi' + (hasFilter ? ' trong bộ lọc ' + _aiFilterLabel_(q) : '');
  } else if (hasFilter) {
    chosen = pool.slice();
    note = 'task theo bộ lọc ' + _aiFilterLabel_(q);
  } else {
    // Không bộ lọc, không từ khóa → task ĐANG MỞ, quá hạn/gần hạn trước.
    chosen = tasks.filter(_aiTaskOpen_);
    note = 'task đang mở (chưa hoàn thành, không Tạm dừng), ưu tiên quá hạn/gần hạn';
  }
  if (!hits.length) chosen.sort(function (x, y) { return (x.dd === null ? 99999 : x.dd) - (y.dd === null ? 99999 : y.dd); });
  var total = chosen.length;
  chosen = chosen.slice(0, AI_TASK_CAP);

  var lines = [_aiSummaryText_(bundle)];
  lines.push('\n=== DANH SÁCH TASK LIÊN QUAN — ' + chosen.length + '/' + total + ' ' + note +
             ' (TẬP ĐÃ LỌC, không phải toàn bộ ' + tasks.length + ' task; số tổng dùng SỐ LIỆU TÍNH SẴN) ===');
  lines.push('ID | Trạng thái | %HT | Team | PIC | Deadline | Tên | Vướng mắc');
  for (var j = 0; j < chosen.length; j++) {
    var c = chosen[j];
    lines.push([c.id, c.st, c.p, c.tm, c.pic, c.dl, c.nm, c.vm].join(' | '));
  }
  var det = chosen.slice(0, AI_DETAIL_CAP).filter(function (x) { return x.dt; });
  if (det.length) {
    lines.push('\n=== CHI TIẾT (kết quả/kế hoạch/BLĐ) ' + det.length + ' task đầu ===');
    for (var d = 0; d < det.length; d++) lines.push(det[d].id + ': ' + det[d].dt);
  }

  // Initiative: chỉ khi câu hỏi nhắc tới hoặc có từ khóa khớp.
  var inits = bundle.inits || [];
  if (inits.length > 1) {
    var wantInit = /\b(initiative|sang kien|milestone|du an|muc tieu|okr)\b/.test(q.norm);
    var iHits = [];
    if (kws.length) {
      for (var ii = 1; ii < inits.length; ii++) {
        var hn = _aiNorm_(inits[ii]);
        for (var kk = 0; kk < kws.length; kk++) if (hn.indexOf(kws[kk]) !== -1) { iHits.push(inits[ii]); break; }
      }
    }
    var iList = iHits.length ? iHits : (wantInit ? inits.slice(1) : []);
    if (iList.length) {
      lines.push('\n=== INITIATIVE & MILESTONE — ' + Math.min(iList.length, AI_INIT_CAP) + '/' + (inits.length - 1) + ' mục ===');
      lines.push(inits[0]);
      lines = lines.concat(iList.slice(0, AI_INIT_CAP));
    }
  }

  // KPI: chỉ khi hỏi KPI/chỉ tiêu.
  if (bundle.kpi && bundle.kpi.length && /\b(kpi|chi tieu|okr|ket qua kinh doanh)\b/.test(q.norm)) {
    lines.push('\n=== DỮ LIỆU KPI (' + Math.min(bundle.kpi.length, AI_KPI_CAP) + '/' + bundle.kpi.length + ' dòng) ===');
    lines = lines.concat(bundle.kpi.slice(0, AI_KPI_CAP));
  }
  return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// AI RESILIENCE (S84) + S93: Flash-Lite chính, thinking thấp, 429 quota → nhảy model ngay.
// ══════════════════════════════════════════════════════════════════════════

// Alias primary — Flash-Lite: nhanh nhất + quota miễn phí rộng nhất (S93: ưu tiên tốc độ/token
// hơn chất lượng). Dự phòng Flash. KHÔNG pin 'gemini-2.5-flash' (bị chặn new-users, S12).
var AI_MODEL_PRIMARY = 'gemini-flash-lite-latest';
var AI_MODEL_DEFAULT_CHAIN = ['gemini-flash-lite-latest', 'gemini-flash-latest'];

// Chuỗi model: đọc Script Property 'AI_MODEL_CHAIN' (JSON array hoặc phẩy); rỗng → mặc định.
function _aiModelChain() {
  var chain = AI_MODEL_DEFAULT_CHAIN.slice();
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('AI_MODEL_CHAIN');
    if (raw) {
      var arr = String(raw).trim().charAt(0) === '[' ? JSON.parse(raw) : String(raw).split(',');
      arr = arr.map(function (s) { return String(s).trim(); }).filter(function (s) { return s; });
      if (arr.length) chain = arr;
    }
  } catch (e) { /* giữ mặc định */ }
  var seen = {}, out = [];
  for (var i = 0; i < chain.length; i++) { if (!seen[chain[i]]) { seen[chain[i]] = 1; out.push(chain[i]); } }
  return out;
}

// Thinking: Script Property 'AI_THINKING' = low (mặc định) | minimal | medium | off.
// Model không hỗ trợ tham số → 400 nhắc "thinking" → callGemini tự bỏ tham số và gọi lại 1 lần.
function _aiThinkingConfig_() {
  var lv = '';
  try { lv = String(PropertiesService.getScriptProperties().getProperty('AI_THINKING') || '').trim().toLowerCase(); } catch (e) {}
  if (!lv) lv = 'low';
  if (lv === 'off') return null;
  return { thinkingLevel: lv };
}

// Backoff: 1s, 2s + jitter 0–500ms.
function _aiBackoffMs_(attempt) {
  return 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
}

// Phân loại HTTP code → nhóm xử lý.
function _aiErrClass_(code, status) {
  if (code === 404 || status === 'NOT_FOUND')       return 'MODEL_DEAD';  // model chết → nhảy model kế
  if (code === 429 || status === 'RESOURCE_EXHAUSTED') return 'QUOTA';   // hết quota phút/ngày → thử lại cùng model vô ích
  if (code === 400 || status === 'INVALID_ARGUMENT') return 'BADREQUEST';
  if (code === 401 || code === 403)                  return 'AUTH';
  return 'TRANSIENT';                                                     // 503/500/khác → backoff & retry
}

// Log best-effort → sheet AI_Log (đo latency/model/token thật).
function _aiLog_(outcome, model, httpCode, ms, note) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sh = ss.getSheetByName('AI_Log');
    if (!sh) {
      sh = ss.insertSheet('AI_Log');
      sh.appendRow(['Timestamp', 'Outcome', 'Model', 'HTTP', 'LatencyMs', 'Note']);
    }
    sh.appendRow([new Date(), outcome, model || '', httpCode || '', ms || '', String(note == null ? '' : note).slice(0, 300)]);
  } catch (e) { /* logging không được phá response */ }
}

// Degradation: khối "SỐ LIỆU TÍNH SẴN" (deterministic) khi LLM không trả lời được.
function _aiSummaryFromContext_(ctx) {
  if (!ctx) return '';
  var marker = '=== DANH SÁCH TASK LIÊN QUAN';
  var idx = ctx.indexOf(marker);
  var head = idx > 0 ? ctx.slice(0, idx) : ctx.slice(0, 4000);
  return String(head).trim();
}

function _aiErrorResponse_(err, contextText) {
  var raw = String(err && err.message != null ? err.message : err);
  var code = 'GEMINI_ERROR', retriable = false;
  if      (raw.indexOf('GEMINI_OVERLOADED|') === 0) { code = 'GEMINI_OVERLOADED'; retriable = true; }
  else if (raw.indexOf('GEMINI_MODELDEAD|')  === 0) { code = 'GEMINI_OVERLOADED'; retriable = true; }
  else if (raw.indexOf('GEMINI_QUOTA|')      === 0) { code = 'GEMINI_OVERLOADED'; retriable = true; }
  else if (raw.indexOf('GEMINI_EMPTY|')      === 0) { code = 'GEMINI_EMPTY';      retriable = true; }
  else if (raw.indexOf('GEMINI_BADREQUEST|') === 0) { code = 'GEMINI_BADREQUEST'; retriable = false; }
  else if (raw.indexOf('GEMINI_AUTH|')       === 0) { code = 'GEMINI_AUTH';       retriable = false; }
  var resp = { status: 'error', errorCode: code, retriable: retriable, error: raw.replace(/^GEMINI_[A-Z]+\|/, '') };
  if (code === 'GEMINI_OVERLOADED') {
    var deg = _aiSummaryFromContext_(contextText);
    if (deg) resp.degraded = deg;
  }
  return resp;
}

// Admin (chạy tay trong editor): models.list → chain = [Flash-Lite alias, Flash alias] lọc theo
// model key này THẬT SỰ truy cập được; lưu Script Property AI_MODEL_CHAIN.
function refreshAiModelChain() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa cấu hình.');
  var resp = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey + '&pageSize=200',
    { muteHttpExceptions: true });
  var json = JSON.parse(resp.getContentText());
  if (!json.models) throw new Error('models.list lỗi: ' + (json.error ? json.error.message : resp.getContentText().slice(0, 200)));
  var avail = {};
  for (var i = 0; i < json.models.length; i++) {
    var m = json.models[i];
    if ((m.supportedGenerationMethods || []).indexOf('generateContent') === -1) continue;
    avail[String(m.name || '').replace(/^models\//, '')] = 1;
  }
  var chain = AI_MODEL_DEFAULT_CHAIN.filter(function (n) { return avail[n]; });
  if (!chain.length) chain = AI_MODEL_DEFAULT_CHAIN.slice();
  PropertiesService.getScriptProperties().setProperty('AI_MODEL_CHAIN', JSON.stringify(chain));
  _aiLog_('chain', chain.join(' > '), 200, 0, 'refreshed');
  Logger.log('AI_MODEL_CHAIN = ' + JSON.stringify(chain));
  return chain;
}

function callGemini(contextText, history, userMessage) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình trong Script Properties.');

  var systemPrompt =
    'Bạn là trợ lý AI nội bộ nhóm Số Hóa Tín Dụng (SHTD), Khối KHDN ngân hàng. Trả lời tiếng Việt, ngắn gọn, ' +
    'chỉ về task/KPI/initiative/milestone dựa trên dữ liệu dưới đây; từ chối câu ngoài phạm vi.\n' +
    '- Trích ID khi nhắc mục cụ thể. Không bịa; thiếu thông tin thì nói rõ.\n' +
    '- Câu đếm/thống kê: dùng "SỐ LIỆU TÍNH SẴN", không tự đếm danh sách.\n' +
    '- "DANH SÁCH TASK LIÊN QUAN" là tập ĐÃ LỌC theo câu hỏi; nếu cần dữ liệu ngoài tập này, gợi ý người dùng hỏi cụ thể hơn (PIC/team/trạng thái/từ khóa).\n' +
    '- Liệt kê dạng bảng gọn "ID | PIC | Deadline | ...".\n\n' +
    'DỮ LIỆU:\n' + contextText;

  var contents = [];
  var recentHistory = (history || []).slice(-AI_HISTORY_TURNS);
  for (var i = 0; i < recentHistory.length; i++) {
    contents.push({ role: recentHistory[i].role, parts: [{ text: _aiTrunc_(recentHistory[i].text, AI_HISTORY_CHARS) }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  var genCfg = { temperature: 0.2, maxOutputTokens: 2048 };
  var think = _aiThinkingConfig_();
  if (think) genCfg.thinkingConfig = think;
  var payload = { system_instruction: { parts: [{ text: systemPrompt }] }, contents: contents, generationConfig: genCfg };

  var chain = _aiModelChain();
  var lastErr = null;

  for (var mi = 0; mi < chain.length; mi++) {
    var model = chain[mi];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    // Model chính tối đa 2 lần (503); dự phòng 1 phát → tổng ≤ 3 lời gọi/câu.
    var maxAttempts = (mi === 0) ? 2 : 1;
    var thinkDropped = false;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var t0 = Date.now(), code, text, json = null;
      try {
        var response = UrlFetchApp.fetch(url, {
          method: 'POST', contentType: 'application/json',
          payload: JSON.stringify(payload), muteHttpExceptions: true
        });
        code = response.getResponseCode();
        text = response.getContentText();
        try { json = JSON.parse(text); } catch (pe) { json = null; }
      } catch (netErr) {
        _aiLog_('neterr', model, 0, Date.now() - t0, netErr.message);
        lastErr = new Error('GEMINI_OVERLOADED|' + netErr.message);
        if (attempt < maxAttempts - 1) { Utilities.sleep(_aiBackoffMs_(attempt)); continue; }
        break;
      }
      var ms = Date.now() - t0;

      if (code === 200 && json && json.candidates && json.candidates[0] && json.candidates[0].content &&
          json.candidates[0].content.parts && json.candidates[0].content.parts.length) {
        var parts = json.candidates[0].content.parts, ans = [];
        for (var pi = 0; pi < parts.length; pi++) if (parts[pi].text != null && !parts[pi].thought) ans.push(parts[pi].text);
        if (ans.length) {
          var um = json.usageMetadata || {};
          _aiLog_('ok', model, code, ms, (mi === 0 ? '' : 'fallback#' + mi + ' ') + 'v=' + (json.modelVersion || '?') +
                  ' in=' + (um.promptTokenCount || '?') + ' out=' + (um.candidatesTokenCount || '?') +
                  ' think=' + (um.thoughtsTokenCount || 0));
          return ans.join('');
        }
      }

      if (code === 200) {
        var fr = (json && json.candidates && json.candidates[0] && json.candidates[0].finishReason) || 'NO_CONTENT';
        _aiLog_('empty', model, code, ms, fr);
        lastErr = new Error('GEMINI_EMPTY|' + fr);
        break;
      }

      var emsg = (json && json.error && json.error.message) ? json.error.message : ('HTTP ' + code);
      var estatus = (json && json.error && json.error.status) ? json.error.status : '';
      var klass = _aiErrClass_(code, estatus);
      _aiLog_('err', model, code, ms, klass + ' ' + emsg);

      // Model không nhận tham số thinking → bỏ tham số, gọi lại cùng model 1 lần.
      if (klass === 'BADREQUEST' && genCfg.thinkingConfig && !thinkDropped && /thinking/i.test(emsg)) {
        delete genCfg.thinkingConfig; thinkDropped = true; attempt--; continue;
      }
      if (klass === 'BADREQUEST') throw new Error('GEMINI_BADREQUEST|' + emsg);
      if (klass === 'AUTH')       throw new Error('GEMINI_AUTH|' + emsg);
      if (klass === 'MODEL_DEAD') { lastErr = new Error('GEMINI_MODELDEAD|' + model + ': ' + emsg); break; }
      if (klass === 'QUOTA')      { lastErr = new Error('GEMINI_QUOTA|' + emsg); break; }   // nhảy model kế, không ngủ
      lastErr = new Error('GEMINI_OVERLOADED|' + emsg);
      if (attempt < maxAttempts - 1) Utilities.sleep(_aiBackoffMs_(attempt));
    }
  }

  throw lastErr || new Error('GEMINI_OVERLOADED|Không có model khả dụng.');
}
