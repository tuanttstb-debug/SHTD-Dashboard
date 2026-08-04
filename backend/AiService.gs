// AiService.gs — Gemini AI Chat cho SHTD Dashboard
// GEMINI_API_KEY phải được set trong Script Properties trước khi dùng.

function buildContext(tokenData) {
  var lines = [];

  // Task data + số liệu tính sẵn (S59 Tier 2)
  try {
    var taskResult = sheetRead();
    var taskRows = taskResult.values;
    if (taskRows && taskRows.length > 1) {
      // Số liệu deterministic tính ở server — LLM dùng cho câu hỏi đếm/thống kê (đừng tự đếm dòng thô).
      lines.push(_aiTaskSummary_(taskRows));

      var dataRows = taskRows.length > 301 ? taskRows.slice(0, 1).concat(taskRows.slice(-300)) : taskRows;
      lines.push('\n=== DANH SÁCH TASK (' + (dataRows.length - 1) + ' task) ===');
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
    var initRows = initiativeRead();
    if (initRows && initRows.length > 1) {
      lines.push('\n=== INITIATIVE & MILESTONE (' + (initRows.length - 1) + ' mục) ===');
      for (var k = 0; k < initRows.length; k++) lines.push(initRows[k].join(' | '));
    }
  } catch (e) { Logger.log('buildContext initiative: ' + e.message); }

  // (S59) Audit_Log đã BỎ khỏi context AI — nặng token, hiếm cần cho câu hỏi task/KPI;
  // giảm payload → doPost nhanh hơn, hạ xác suất lỗi 404 tầng vận chuyển Web App.

  return lines.join('\n');
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

function _aiTaskSummary_(rows) {
  var H = rows[0].map(function (h) { return String(h).trim(); });
  function findCol(pred) { for (var i = 0; i < H.length; i++) { if (pred(H[i])) return i; } return -1; }
  var cId    = findCol(function (h) { return h === 'ID'; });
  var cName  = findCol(function (h) { return h.indexOf('Task / Deliverable') === 0 || h.indexOf('Deliverable') !== -1; });
  var cAcc   = findCol(function (h) { return h.indexOf('PIC Accountable') === 0; });
  var cRes   = findCol(function (h) { return h.indexOf('PIC Responsible') === 0; });
  var cEnd   = findCol(function (h) { return h === 'Deadline'; });
  var cProg  = findCol(function (h) { return h === '% HT'; });
  var cState = findCol(function (h) { return h === 'Trạng thái'; });

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

function callGemini(contextText, history, userMessage) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình trong Script Properties.');

  // Model alias 'gemini-flash-latest' luôn trỏ tới bản Flash mới nhất còn hỗ trợ.
  // Đổi từ 'gemini-2.5-flash' (S12) — model này bị Google chặn với API key/project mới (lỗi "no longer available to new users").
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=' + apiKey;

  var systemPrompt =
    'Bạn là trợ lý AI nội bộ của nhóm Số Hóa Tín Dụng (SHTD), Khối KHDN ngân hàng.\n' +
    'Nhiệm vụ: Trả lời câu hỏi về task, KPI, initiative, milestone dựa trên dữ liệu được cung cấp.\n' +
    'Quy tắc bắt buộc:\n' +
    '- Chỉ trả lời về dữ liệu dự án SHTD. Từ chối câu hỏi ngoài phạm vi.\n' +
    '- Luôn trả lời bằng tiếng Việt.\n' +
    '- Trích dẫn ID task hoặc ID initiative khi đề cập mục cụ thể.\n' +
    '- Không bịa đặt dữ liệu; nếu không có thông tin hãy nói rõ.\n' +
    '- Với câu hỏi đếm/thống kê (bao nhiêu task, quá hạn, sắp hạn, theo PIC/trạng thái…): DÙNG số trong mục "SỐ LIỆU TÍNH SẴN" — KHÔNG tự đếm lại từ danh sách thô.\n' +
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
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }
  };

  var response = UrlFetchApp.fetch(url, {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var json = JSON.parse(response.getContentText());
  if (json.error) throw new Error('Gemini API lỗi: ' + json.error.message);
  if (!json.candidates || !json.candidates[0] || !json.candidates[0].content) {
    throw new Error('Gemini không trả về kết quả hợp lệ.');
  }

  return json.candidates[0].content.parts[0].text;
}
