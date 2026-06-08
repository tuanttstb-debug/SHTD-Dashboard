// AiService.gs — Gemini AI Chat cho SHTD Dashboard
// GEMINI_API_KEY phải được set trong Script Properties trước khi dùng.

function buildContext(tokenData) {
  var lines = [];

  // Task data
  try {
    var taskResult = sheetRead();
    var taskRows = taskResult.values;
    if (taskRows && taskRows.length > 1) {
      var dataRows = taskRows.length > 301 ? taskRows.slice(0, 1).concat(taskRows.slice(-300)) : taskRows;
      lines.push('=== DANH SÁCH TASK (' + (dataRows.length - 1) + ' task) ===');
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

  // Audit Log — last 50 rows
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var auditSheet = ss.getSheetByName('Audit_Log');
    if (auditSheet && auditSheet.getLastRow() > 1) {
      var lastRow = auditSheet.getLastRow();
      var startRow = Math.max(2, lastRow - 49);
      var auditData = auditSheet.getRange(startRow, 1, lastRow - startRow + 1, 6).getValues();
      lines.push('\n=== LỊCH SỬ THAY ĐỔI GẦN ĐÂY ===');
      lines.push('Thời gian | Tài khoản | Tên | Vai trò | Hành động | Chi tiết');
      for (var m = 0; m < auditData.length; m++) lines.push(auditData[m].join(' | '));
    }
  } catch (e) { Logger.log('buildContext audit: ' + e.message); }

  return lines.join('\n');
}

function callGemini(contextText, history, userMessage) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) throw new Error('GEMINI_API_KEY chưa được cấu hình trong Script Properties.');

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey;

  var systemPrompt =
    'Bạn là trợ lý AI nội bộ của nhóm Số Hóa Tín Dụng (SHTD), Khối KHDN ngân hàng.\n' +
    'Nhiệm vụ: Trả lời câu hỏi về task, KPI, initiative, milestone dựa trên dữ liệu được cung cấp.\n' +
    'Quy tắc bắt buộc:\n' +
    '- Chỉ trả lời về dữ liệu dự án SHTD. Từ chối câu hỏi ngoài phạm vi.\n' +
    '- Luôn trả lời bằng tiếng Việt.\n' +
    '- Trích dẫn ID task hoặc ID initiative khi đề cập mục cụ thể.\n' +
    '- Không bịa đặt dữ liệu; nếu không có thông tin hãy nói rõ.\n' +
    '- Trả lời ngắn gọn, súc tích, dùng bullet point khi liệt kê.\n\n' +
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
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
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
