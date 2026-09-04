// AiService.gs — Gemini AI Chat cho SHTD Dashboard
// GEMINI_API_KEY phải được set trong Script Properties trước khi dùng.

function buildContext(tokenData) {
  // (Phase 3) Cache context theo DATA_VER: các câu hỏi liên tiếp khi dữ liệu KHÔNG đổi
  // dùng lại context (bỏ 3 lần đọc sheet + build 1500-task index). Context lớn > cap →
  // _cachePutJson tự bỏ qua → build live như cũ (không regression).
  var _ctxKey = 'aictx|' + (typeof _dataVer === 'function' ? _dataVer() : '0');
  if (typeof _cacheGetJson === 'function') {
    var _hit = _cacheGetJson(_ctxKey);
    if (_hit && typeof _hit.ctx === 'string') return _hit.ctx;
  }

  var lines = [];
  var _ss = SpreadsheetApp.openById(SPREADSHEET_ID);   // mở 1 lần, chia sẻ cho các reader

  // Task data + số liệu tính sẵn (S59 Tier 2)
  try {
    var taskResult = sheetRead(_ss);
    var taskRows = taskResult.values;
    if (taskRows && taskRows.length > 1) {
      // Số liệu deterministic tính ở server — LLM dùng cho câu hỏi đếm/thống kê (đừng tự đếm dòng thô).
      lines.push(_aiTaskSummary_(taskRows));

      // Chỉ mục TOÀN BỘ task (gọn) — bao phủ mọi task, không cắt.
      lines.push('\n' + _aiTaskIndex_(taskRows));

      // Chi tiết mở rộng (đủ 24 cột) chỉ cho tối đa 200 task gần nhất — bổ sung cột free-text
      // (kết quả/kế hoạch/milestone/ý kiến BLĐ…). Để tra TOÀN BỘ dùng CHỈ MỤC ở trên.
      var RICH_CAP = 200;
      var dataRows = taskRows.length > RICH_CAP + 1 ? taskRows.slice(0, 1).concat(taskRows.slice(-RICH_CAP)) : taskRows;
      lines.push('\n=== CHI TIẾT MỞ RỘNG — ' + (dataRows.length - 1) + ' task gần nhất (đủ cột; KHÔNG phải toàn bộ — dùng CHỈ MỤC để bao phủ tất cả) ===');
      lines.push('Cột: ' + dataRows[0].join(' | '));
      for (var i = 1; i < dataRows.length; i++) lines.push(dataRows[i].join(' | '));
    }
  } catch (e) { Logger.log('buildContext task: ' + e.message); }

  // KPI data
  try {
    var kpiRows = kpiSheetRead();
    if (kpiRows && kpiRows.length > 0) {
      lines.push('\n=== DỮ LIỆU KPI (' + kpiRows.length + ' dòng) ===');
      for (var j = 0; j < kpiRows.length; j++) lines.push(kpiRows[j].join(' | '));
    }
  } catch (e) { Logger.log('buildContext kpi: ' + e.message); }

  // Initiative data
  try {
    var initRows = initiativeRead(_ss);
    if (initRows && initRows.length > 1) {
      lines.push('\n=== INITIATIVE & MILESTONE (' + (initRows.length - 1) + ' mục) ===');
      for (var k = 0; k < initRows.length; k++) lines.push(initRows[k].join(' | '));
    }
  } catch (e) { Logger.log('buildContext initiative: ' + e.message); }

  // (S59) Audit_Log đã BỎ khỏi context AI — nặng token, hiếm cần cho câu hỏi task/KPI;
  // giảm payload → doPost nhanh hơn, hạ xác suất lỗi 404 tầng vận chuyển Web App.

  var _ctx = lines.join('\n');
  if (typeof _cachePutJson === 'function') _cachePutJson(_ctxKey, { ctx: _ctx });   // bỏ qua nếu > cap
  return _ctx;
}

// ── Số liệu tính sẵn cho AI (S59 Tier 2) ──
// Khớp ngữ nghĩa dashboard: overdue = %HT < 100 AND deadline parse được AND deadline < hôm nay.
// Resolve cột theo HEADER (không index cứng); parse ngày/% theo cùng quy tắc frontend (helpers.js/parsers.js).

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
  return {
    cId:    findCol(function (h) { return h === 'ID'; }),
    cName:  findCol(function (h) { return h.indexOf('Task / Deliverable') === 0 || h.indexOf('Deliverable') !== -1; }),
    cAcc:   findCol(function (h) { return h.indexOf('PIC Accountable') === 0; }),
    cRes:   findCol(function (h) { return h.indexOf('PIC Responsible') === 0; }),
    cEnd:   findCol(function (h) { return h === 'Deadline'; }),
    cProg:  findCol(function (h) { return h === '% HT'; }),
    cState: findCol(function (h) { return h === 'Trạng thái'; }),
    cTeam:  findCol(function (h) { return h.indexOf('Team chính') === 0 || h === 'Team'; }),
    cVm:    findCol(function (h) { return h.indexOf('Vướng mắc') === 0; })
  };
}

function _aiTrunc_(s, n) {
  s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// Chỉ mục TOÀN BỘ task (gọn) — bao phủ mọi task để LLM lọc/đếm/liệt kê theo trạng thái/PIC/deadline,
// không bị giới hạn bởi khối "chi tiết mở rộng" (chỉ 200 task gần nhất). Giải quyết lỗi "chỉ xem 300 task".
function _aiTaskIndex_(rows) {
  var C = _aiResolveTaskCols_(rows[0]);
  var out = [];
  out.push('=== CHỈ MỤC TOÀN BỘ TASK (LIỆT KÊ ĐẦY ĐỦ MỌI TASK — dùng để đếm/lọc/liệt kê theo trạng thái, PIC, deadline) ===');
  out.push('ID | Trạng thái | %HT | Team | PIC | Deadline | Tên | Vướng mắc');
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (C.cName !== -1 && !String(r[C.cName] || '').trim()) continue;
    var pic = (C.cRes !== -1 && String(r[C.cRes] || '').trim()) ? String(r[C.cRes]).trim()
            : (C.cAcc !== -1 ? String(r[C.cAcc] || '').trim() : '');
    out.push(
      (C.cId    !== -1 ? String(r[C.cId]    || '').trim() : '') + ' | ' +
      (C.cState !== -1 ? String(r[C.cState] || '').trim() : '') + ' | ' +
      _aiProg_(C.cProg !== -1 ? r[C.cProg] : '') + ' | ' +
      (C.cTeam  !== -1 ? String(r[C.cTeam]  || '').trim() : '') + ' | ' +
      (pic || '') + ' | ' +
      (C.cEnd   !== -1 ? String(r[C.cEnd]   || '').trim() : '') + ' | ' +
      _aiTrunc_(C.cName !== -1 ? r[C.cName] : '', 90) + ' | ' +
      _aiTrunc_(C.cVm   !== -1 ? r[C.cVm]   : '', 70)
    );
  }
  return out.join('\n');
}

function _aiTaskSummary_(rows) {
  var C = _aiResolveTaskCols_(rows[0]);
  var cId = C.cId, cName = C.cName, cAcc = C.cAcc, cRes = C.cRes, cEnd = C.cEnd, cProg = C.cProg, cState = C.cState;

  var today = new Date(); today.setHours(0, 0, 0, 0);
  var soon  = new Date(today.getTime() + 7 * 24 * 3600 * 1000);

  var overdue = [], byPic = {}, stateCount = {}, soonCount = 0, total = 0;

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (cName !== -1 && !String(r[cName] || '').trim()) continue; // bỏ dòng rỗng
    total++;
    var st = cState !== -1 ? String(r[cState] || '').trim() : '';
    if (st) stateCount[st] = (stateCount[st] || 0) + 1;

    var prog = _aiProg_(cProg !== -1 ? r[cProg] : '');
    var dl   = cEnd !== -1 ? _aiParseDate_(r[cEnd]) : null;
    if (prog >= 100 || !dl) continue;

    if (dl < today) {
      var pic = (cRes !== -1 && String(r[cRes] || '').trim()) ? String(r[cRes]).trim()
              : (cAcc !== -1 ? String(r[cAcc] || '').trim() : '');
      pic = pic || '(chưa gán)';
      overdue.push({
        id:       cId   !== -1 ? String(r[cId]   || '').trim() : '',
        name:     cName !== -1 ? String(r[cName] || '').trim() : '',
        pic:      pic,
        deadline: cEnd  !== -1 ? String(r[cEnd]  || '').trim() : ''
      });
      byPic[pic] = (byPic[pic] || 0) + 1;
    } else if (dl < soon) {
      soonCount++;
    }
  }

  var tz = Session.getScriptTimeZone() || 'Asia/Ho_Chi_Minh';
  var out = [];
  out.push('=== SỐ LIỆU TÍNH SẴN (chính xác — dùng cho câu hỏi đếm/thống kê, KHÔNG tự đếm lại từ danh sách thô) ===');
  out.push('Ngày hôm nay: ' + Utilities.formatDate(today, tz, 'yyyy-MM-dd'));
  out.push('Tổng số task: ' + total);
  out.push('Số task QUÁ HẠN (chưa hoàn thành & qua deadline): ' + overdue.length);
  out.push('Số task SẮP ĐẾN HẠN (trong 7 ngày tới, chưa hoàn thành): ' + soonCount);

  var picLines = [];
  for (var p in byPic) { if (byPic.hasOwnProperty(p)) picLines.push(p + ': ' + byPic[p]); }
  if (picLines.length) out.push('Quá hạn theo PIC phụ trách (Responsible, fallback Accountable): ' + picLines.join(' | '));

  var stLines = [];
  for (var s in stateCount) { if (stateCount.hasOwnProperty(s)) stLines.push(s + ': ' + stateCount[s]); }
  if (stLines.length) out.push('Số task theo trạng thái: ' + stLines.join(' | '));

  if (overdue.length) {
    out.push('Chi tiết task quá hạn (ID | PIC | Deadline | Tên):');
    var cap = Math.min(overdue.length, 60);
    for (var k = 0; k < cap; k++) {
      var o = overdue[k];
      out.push('- ' + o.id + ' | ' + o.pic + ' | ' + o.deadline + ' | ' + o.name);
    }
    if (overdue.length > cap) out.push('… và ' + (overdue.length - cap) + ' task quá hạn khác (đã tính trong tổng).');
  }
  return out.join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// AI RESILIENCE (Nhóm 1 — 2026-09-04): retry+backoff+fallback+phân loại lỗi+log.
// Lỗi "high demand" = Gemini HTTP 503 (quá tải, TẠM THỜI). Trước đây callGemini gọi
// 1 phát, gặp json.error là throw thẳng → user thấy lỗi ngay dù chỉ cần thử lại sau
// 1-2s. Nay: retry backoff cho 503/429/500, fallback sang model dự phòng, bắt 404
// model-chết riêng, ngân sách ≤ ~4-5 lời gọi Gemini/câu hỏi để không đốt quota (retry
// CŨNG tính vào RPD/RPM). Chuỗi model khám phá động qua refreshAiModelChain() (không
// hard-code model có thể đã bị Google shutdown / chặn với key này).
// ══════════════════════════════════════════════════════════════════════════

// Alias primary — luôn trỏ bản Flash mới nhất còn hỗ trợ. KHÔNG pin 'gemini-2.5-flash'
// (S12): model này bị Google chặn với API key/project mới ("no longer available to new users").
var AI_MODEL_PRIMARY = 'gemini-flash-latest';

// Chuỗi model: đọc từ Script Property 'AI_MODEL_CHAIN' (JSON array hoặc phẩy).
// Rỗng → chỉ primary alias (hành vi cũ, không regression). refreshAiModelChain() bơm
// danh sách model CÒN SỐNG mà key này TRUY CẬP ĐƯỢC (verify qua models.list).
function _aiModelChain() {
  var chain = [AI_MODEL_PRIMARY];
  try {
    var raw = PropertiesService.getScriptProperties().getProperty('AI_MODEL_CHAIN');
    if (raw) {
      var arr = String(raw).trim().charAt(0) === '[' ? JSON.parse(raw) : String(raw).split(',');
      arr = arr.map(function (s) { return String(s).trim(); }).filter(function (s) { return s; });
      if (arr.length) chain = arr;
    }
  } catch (e) { /* giữ default primary */ }
  var seen = {}, out = [];
  for (var i = 0; i < chain.length; i++) { if (!seen[chain[i]]) { seen[chain[i]] = 1; out.push(chain[i]); } }
  return out;
}

// Backoff: 1s, 2s, 4s + jitter 0–500ms. KHÔNG dựa Retry-After (GAS UrlFetch không expose tiện,
// tài liệu Gemini không đảm bảo header này).
function _aiBackoffMs_(attempt) {
  return 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
}

// Phân loại HTTP code → nhóm xử lý.
function _aiErrClass_(code, status) {
  if (code === 404 || status === 'NOT_FOUND')       return 'MODEL_DEAD';  // model chết → nhảy model kế + cảnh báo
  if (code === 400 || status === 'INVALID_ARGUMENT') return 'BADREQUEST'; // payload sai → permanent (mọi model như nhau)
  if (code === 401 || code === 403)                  return 'AUTH';       // key/quyền → permanent
  return 'TRANSIENT';                                                     // 503/429/500/khác → backoff & retry
}

// Ghi log kết quả AI (best-effort — try/catch nuốt, KHÔNG bao giờ phá luồng chính) → sheet
// AI_Log để đo tần suất 503 thật + latency + model. Sheet tự tạo lần đầu.
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

// Trích khối "SỐ LIỆU TÍNH SẴN" (deterministic) từ context đã build — dùng cho degradation
// khi mọi model LLM chết: user vẫn nhận số liệu đếm/thống kê CHÍNH XÁC mà không cần LLM,
// KHÔNG rời biên dữ liệu (không gọi bên thứ 3). Tái dùng dữ liệu đã có, không đọc lại sheet.
function _aiSummaryFromContext_(ctx) {
  if (!ctx) return '';
  var marker = '=== CHỈ MỤC TOÀN BỘ TASK';
  var idx = ctx.indexOf(marker);
  var head = idx > 0 ? ctx.slice(0, idx) : ctx.slice(0, 4000);
  return String(head).trim();
}

// Chuyển lỗi callGemini → response CÓ CẤU TRÚC (errorCode + retriable) cho FE localize + quyết
// định retry đúng lớp. Kèm degradation deterministic khi quá tải.
function _aiErrorResponse_(err, contextText) {
  var raw = String(err && err.message != null ? err.message : err);
  var code = 'GEMINI_ERROR', retriable = false;
  if      (raw.indexOf('GEMINI_OVERLOADED|') === 0) { code = 'GEMINI_OVERLOADED'; retriable = true; }
  else if (raw.indexOf('GEMINI_MODELDEAD|')  === 0) { code = 'GEMINI_OVERLOADED'; retriable = true; } // với user: "bận, thử lại"
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

// Admin/trigger (KHÔNG gọi trong request path — thêm round-trip + có thể tự 503). Gọi models.list
// lấy model CÒN SỐNG key này dùng được, ưu tiên dòng 'flash' (rẻ/nhanh), lưu Script Property
// AI_MODEL_CHAIN. Chạy tay trong editor hoặc gắn Time-driven trigger hàng tuần.
function refreshAiModelChain() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa cấu hình.');
  var resp = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey + '&pageSize=200',
    { muteHttpExceptions: true });
  var json = JSON.parse(resp.getContentText());
  if (!json.models) throw new Error('models.list lỗi: ' + (json.error ? json.error.message : resp.getContentText().slice(0, 200)));
  var flash = [];
  for (var i = 0; i < json.models.length; i++) {
    var m = json.models[i];
    if ((m.supportedGenerationMethods || []).indexOf('generateContent') === -1) continue;
    var name = String(m.name || '').replace(/^models\//, '');
    if (/preview|exp|thinking|image|tts|embedding|vision|audio/i.test(name)) continue; // bỏ model đặc thù
    if (/flash/i.test(name)) flash.push(name);
  }
  flash.sort();
  var lite = flash.filter(function (n) { return /lite/i.test(n) && n !== AI_MODEL_PRIMARY; });
  var full = flash.filter(function (n) { return !/lite/i.test(n) && n !== AI_MODEL_PRIMARY; });
  var chain = [AI_MODEL_PRIMARY];
  var rest = lite.concat(full);
  for (var k = 0; k < rest.length && chain.length < 3; k++) if (chain.indexOf(rest[k]) === -1) chain.push(rest[k]);
  PropertiesService.getScriptProperties().setProperty('AI_MODEL_CHAIN', JSON.stringify(chain));
  _aiLog_('chain', chain.join(' > '), 200, 0, 'refreshed');
  Logger.log('AI_MODEL_CHAIN = ' + JSON.stringify(chain));
  return chain;
}

function callGemini(contextText, history, userMessage) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình trong Script Properties.');

  var systemPrompt =
    'Bạn là trợ lý AI nội bộ của nhóm Số Hóa Tín Dụng (SHTD), Khối KHDN ngân hàng.\n' +
    'Nhiệm vụ: Trả lời câu hỏi về task, KPI, initiative, milestone dựa trên dữ liệu được cung cấp.\n' +
    'Quy tắc bắt buộc:\n' +
    '- Chỉ trả lời về dữ liệu dự án SHTD. Từ chối câu hỏi ngoài phạm vi.\n' +
    '- Luôn trả lời bằng tiếng Việt.\n' +
    '- Trích dẫn ID task hoặc ID initiative khi đề cập mục cụ thể.\n' +
    '- Không bịa đặt dữ liệu; nếu không có thông tin hãy nói rõ.\n' +
    '- Với câu hỏi đếm/thống kê (bao nhiêu task, quá hạn, sắp hạn, theo PIC/trạng thái…): DÙNG số trong mục "SỐ LIỆU TÍNH SẴN" — KHÔNG tự đếm lại từ danh sách thô.\n' +
    '- "CHỈ MỤC TOÀN BỘ TASK" liệt kê TẤT CẢ task trong hệ thống — dùng nó để lọc/liệt kê theo trạng thái (vd Blocked), PIC, deadline. TUYỆT ĐỐI KHÔNG nói kiểu "chỉ xem được 300 task" hay "các task còn lại chưa hiển thị".\n' +
    '- Khi liệt kê nhiều mục: trả lời ĐẦY ĐỦ, không cắt ngắn; ưu tiên bảng gọn dạng "ID | PIC | Deadline". Chỉ tóm tắt khi người dùng yêu cầu.\n\n' +
    'DỮ LIỆU DỰ ÁN:\n' + contextText;

  // Build contents array — limit history to last 10 turns to avoid token overflow
  var contents = [];
  var recentHistory = history.slice(-10);
  for (var i = 0; i < recentHistory.length; i++) {
    contents.push({ role: recentHistory[i].role, parts: [{ text: recentHistory[i].text }] });
  }
  contents.push({ role: 'user', parts: [{ text: userMessage }] });

  var payload = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: contents,
    // 2048 quá nhỏ so với chỉ thị "liệt kê ĐẦY ĐỦ" → nâng 4096 để hết cắt cụt câu trả lời dài.
    generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
  };
  var body = JSON.stringify(payload);

  var chain = _aiModelChain();
  var lastErr = null;

  for (var mi = 0; mi < chain.length; mi++) {
    var model = chain[mi];
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
    // Model chính retry tối đa 3 lần; model dự phòng chỉ 1 phát → tổng ≤ ~4-5 lời gọi (không đốt quota).
    var maxAttempts = (mi === 0) ? 3 : 1;

    for (var attempt = 0; attempt < maxAttempts; attempt++) {
      var t0 = Date.now(), code, text, json = null;
      try {
        var response = UrlFetchApp.fetch(url, {
          method: 'POST', contentType: 'application/json',
          payload: body, muteHttpExceptions: true
        });
        code = response.getResponseCode();
        text = response.getContentText();
        try { json = JSON.parse(text); } catch (pe) { json = null; }
      } catch (netErr) {
        // Lỗi tầng UrlFetch (hiếm — vd DNS/timeout) → coi như transient, backoff & retry.
        _aiLog_('neterr', model, 0, Date.now() - t0, netErr.message);
        lastErr = new Error('GEMINI_OVERLOADED|' + netErr.message);
        if (attempt < maxAttempts - 1) { Utilities.sleep(_aiBackoffMs_(attempt)); continue; }
        break;
      }
      var ms = Date.now() - t0;

      // Thành công + có nội dung hợp lệ.
      if (code === 200 && json && json.candidates && json.candidates[0] && json.candidates[0].content &&
          json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
          json.candidates[0].content.parts[0].text != null) {
        _aiLog_('ok', model, code, ms, mi === 0 ? '' : ('fallback#' + mi));
        return json.candidates[0].content.parts[0].text;
      }

      // 200 nhưng thiếu nội dung (safety block / cắt MAX_TOKENS rỗng / finishReason lạ).
      if (code === 200) {
        var fr = (json && json.candidates && json.candidates[0] && json.candidates[0].finishReason) || 'NO_CONTENT';
        _aiLog_('empty', model, code, ms, fr);
        lastErr = new Error('GEMINI_EMPTY|' + fr);
        break; // đổi model có thể khác kết quả → thử model kế 1 lần
      }

      // Lỗi HTTP → phân loại.
      var emsg = (json && json.error && json.error.message) ? json.error.message : ('HTTP ' + code);
      var estatus = (json && json.error && json.error.status) ? json.error.status : '';
      var klass = _aiErrClass_(code, estatus);
      _aiLog_('err', model, code, ms, klass + ' ' + emsg);

      if (klass === 'BADREQUEST') throw new Error('GEMINI_BADREQUEST|' + emsg); // payload sai — mọi model như nhau
      if (klass === 'AUTH')       throw new Error('GEMINI_AUTH|' + emsg);       // key/quyền — permanent
      if (klass === 'MODEL_DEAD') { lastErr = new Error('GEMINI_MODELDEAD|' + model + ': ' + emsg); break; } // → model kế
      // TRANSIENT (503/429/500/…) → backoff & retry cùng model.
      lastErr = new Error('GEMINI_OVERLOADED|' + emsg);
      if (attempt < maxAttempts - 1) Utilities.sleep(_aiBackoffMs_(attempt));
    }
    // hết attempt model này → sang model kế trong chain
  }

  throw lastErr || new Error('GEMINI_OVERLOADED|Không có model khả dụng.');
}
