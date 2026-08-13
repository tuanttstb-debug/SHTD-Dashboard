// ── SHTD Dashboard – H2/2026 Team Management sheets ──
//
// Domain "Quản trị H2": 8 sheet cô lập, prefix H2_. KHÔNG đụng schema entity cũ.
// Action (việc để đạt KPI) = Task_Master (soft-link qua cột TaskRef ở Milestone) —
// KHÔNG đổi 24 cột Task_Master (quyết định Phase 1).
//
// Mỗi sheet dùng chung 4 helper generic: _h2Read / _h2Upsert / _h2Delete / _h2Owner.
// Ownership + lock + reassign id + audit + notif được xử lý ở Code.gs (như dev-upsert).
//
// Cột A luôn = ID (prefix + số) để tương thích reassignIdIfExists() (Concurrency.gs).
// Ngày lưu ISO YYYY-MM-DD (client chuẩn hoá bằng toISODate trước khi gửi).

// ── Header định nghĩa 8 sheet (khớp docs/PLAN_TRACK_B §3) ──
var H2_HEADERS = {
  'H2_Config':          ['Key', 'Value', 'Group', 'Note'],
  'H2_Objectives':      ['ID', 'Type', 'ParentID', 'Pillar', 'ObjectiveName', 'Why', 'Owner', 'Priority', 'Weight', 'Category', 'Status', 'StartDate', 'DueDate', 'CreatedBy'],
  'H2_KPIs':            ['ID', 'ObjectiveID', 'KpiName', 'KpiType', 'Baseline', 'Target', 'Unit', 'Weight', 'Deadline', 'Status', 'Evidence', 'Owner'],
  'H2_Milestones':      ['ID', 'KpiID', 'Month', 'Quarter', 'MilestoneName', 'DueDate', 'Owner', 'Status', 'RAG', 'TaskRef'],
  'H2_MonthlyTracking': ['ID', 'Month', 'KpiID', 'Member', 'Target', 'Actual', 'Progress', 'RAG', 'Issue', 'NextAction', 'SupportNeeded', 'UpdatedAt'],
  'H2_Risks':           ['ID', 'KpiID', 'Risk', 'Impact', 'Probability', 'Mitigation', 'Owner', 'Status'],
  'H2_Dependencies':    ['ID', 'KpiID', 'DependencyType', 'DependencyOwner', 'RequiredDate', 'Status', 'Note'],
  'H2_Reviews':         ['ID', 'Member', 'ReviewType', 'Period', 'Q_commit', 'Q_actual', 'Q_pct', 'Q_impact', 'Q_gap', 'Q_rootcause', 'Q_lesson', 'Q_adjust', 'Cap_Goal', 'Cap_Plan', 'Cap_Prior', 'Cap_Own', 'Cap_Risk', 'Cap_Dep', 'Cap_Track', 'Cap_Exec', 'CreatedAt']
};

// Cột "chủ sở hữu" (1-based) của từng sheet — cho ownership gate ở Code.gs.
// Objectives/KPIs/Milestones/Risks: Owner; Tracking: Member; Reviews: Member.
var H2_OWNER_COL = {
  'H2_Objectives':      7,   // G = Owner
  'H2_KPIs':            12,  // L = Owner
  'H2_Milestones':      7,   // G = Owner
  'H2_MonthlyTracking': 4,   // D = Member
  'H2_Risks':           7,   // G = Owner
  'H2_Dependencies':    0,   // (không gate theo owner riêng — theo KPI)
  'H2_Reviews':         2    // B = Member
};

// Giá trị mặc định seed cho H2_Config (data-driven, chỉnh trên sheet không cần deploy).
var H2_CONFIG_DEFAULTS = [
  ['period', 'H2/2026', 'meta', 'Kỳ áp dụng'],
  ['months', 'T8,T9,T10,T11,T12', 'meta', 'Các tháng tracking'],
  ['pillars', 'P1-BIZ,P2-CAP,P3-AI', 'taxonomy', 'Ba trụ cột'],
  ['categories', 'A,B,C,D', 'taxonomy', 'A=Business,B=Delivery,C=AI,D=Capability'],
  ['priorities', 'P1,P2,P3', 'taxonomy', 'P1=Must-win,P2=Important,P3=BAU'],
  ['max_objectives', '5', 'rule', 'Tối đa Objective/member'],
  ['max_p1', '3', 'rule', 'Tối đa P1/member'],
  ['rag_amber_pct', '20', 'rule', 'Chậm ≥ % này so kế hoạch → Amber'],
  ['rag_red_pct', '20', 'rule', 'Trễ > % này hoặc quá hạn → Red'],
  ['rag_deadline_amber_days', '14', 'rule', 'Deadline ≤ ngày này mà progress thấp → Amber']
];

/** Lấy sheet theo tên, tự tạo + ghi header (+ seed Config) nếu chưa có. */
function _h2Sheet(sheetName, ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(sheetName);
  var header = H2_HEADERS[sheetName];
  if (!header) throw new Error('H2: sheet không hợp lệ: ' + sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, header.length).setValues([header]);
    if (sheetName === 'H2_Config' && H2_CONFIG_DEFAULTS.length) {
      sheet.getRange(2, 1, H2_CONFIG_DEFAULTS.length, header.length).setValues(H2_CONFIG_DEFAULTS);
    }
    SpreadsheetApp.flush();
  }
  return sheet;
}

/** Đọc toàn bộ 1 sheet H2 dưới dạng mảng 2D (display values). */
function _h2Read(sheetName, ss) {
  var sheet   = _h2Sheet(sheetName, ss);
  var header  = H2_HEADERS[sheetName];
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) return [header];
  var lastCol = Math.max(sheet.getLastColumn(), header.length);
  return sheet.getRange(1, 1, lastRow, lastCol).getDisplayValues();
}

/** Upsert 1 dòng theo ID (cột A); không thấy → append. */
function _h2Upsert(sheetName, rowValues, id) {
  var sheet   = _h2Sheet(sheetName);
  var lastRow = sheet.getLastRow();

  var targetRow = -1;
  if (lastRow > 1) {
    var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < idCol.length; i++) {
      if (String(idCol[i][0]).trim() === String(id).trim()) { targetRow = i + 2; break; }
    }
  }
  if (targetRow !== -1) {
    sheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.getRange(lastRow + 1, 1, 1, rowValues.length).setValues([rowValues]);
  }
  SpreadsheetApp.flush();
}

/** Xóa 1 dòng theo ID (cột A). */
function _h2Delete(sheetName, id) {
  var sheet   = _h2Sheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  var idCol = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < idCol.length; i++) {
    if (String(idCol[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 2);
      SpreadsheetApp.flush();
      return;
    }
  }
}

/**
 * Trả về giá trị chủ sở hữu (cột Owner/Member) của 1 ID — cho ownership gate.
 * null nếu ID chưa tồn tại (dòng mới → member tạo cho chính mình).
 */
function _h2Owner(sheetName, id) {
  var ownerCol = H2_OWNER_COL[sheetName] || 0;
  if (!ownerCol) return null;
  var sheet   = _h2Sheet(sheetName);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  var data = sheet.getRange(2, 1, lastRow - 1, ownerCol).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      return String(data[i][ownerCol - 1] || '').trim();
    }
  }
  return null;
}

/**
 * Xử lý upsert cho mọi sheet H2 (gọi từ Code.gs router).
 * RBAC: config/objective/kpi/milestone/risk/dep = Admin/Teamlead (challenge & duyệt);
 *       tracking/review = owner (member) hoặc Admin/Teamlead (ownership gate như dev-upsert).
 * Trả về payload object; Code.gs bọc _jsonResponse.
 */
function h2HandleUpsert(body, tokenData, sheetName) {
  if (!body.row || !Array.isArray(body.row) || !body.id) {
    throw new Error(sheetName + '-upsert: thiếu row hoặc id.');
  }
  var lead       = (tokenData.r === 'Admin' || tokenData.r === 'Teamlead');
  var ownerGated = (sheetName === 'H2_MonthlyTracking' || sheetName === 'H2_Reviews');

  if (!ownerGated && !lead) return { status: 'error', error: 'FORBIDDEN' };
  if (ownerGated && !lead) {
    var me            = String(tokenData.u || '').toLowerCase();
    var existingOwner = _h2Owner(sheetName, body.id);       // null nếu dòng mới
    var col           = H2_OWNER_COL[sheetName];
    var newOwner      = String(body.row[col - 1] || '').toLowerCase();
    if (existingOwner !== null && String(existingOwner).toLowerCase() !== me) {
      return { status: 'error', error: 'FORBIDDEN_NOT_OWNER' };
    }
    if (newOwner !== me) {
      return { status: 'error', error: 'FORBIDDEN_OWNER_MISMATCH' };
    }
  }

  var lock = _acquireWriteLock();
  try {
    var id = body.id;
    if (body.isNew) {
      id = reassignIdIfExists(sheetName, body.id);
      if (id !== body.id) body.row[0] = id;
    }
    _h2Upsert(sheetName, body.row, id);
    auditLog(tokenData, sheetName.toLowerCase() + '-upsert', id + (body.name ? ' | ' + body.name : ''));
    return { status: 'ok', id: id };
  } finally {
    lock.releaseLock();
  }
}

/** Xử lý delete cho các sheet H2 (gọi từ Code.gs router). */
function h2HandleDelete(body, tokenData, sheetName) {
  if (!body.id) throw new Error(sheetName + '-delete: thiếu id.');
  var lead       = (tokenData.r === 'Admin' || tokenData.r === 'Teamlead');
  var ownerGated = (sheetName === 'H2_MonthlyTracking' || sheetName === 'H2_Reviews');

  if (!ownerGated && !lead) return { status: 'error', error: 'FORBIDDEN' };
  if (ownerGated && !lead) {
    var meDel         = String(tokenData.u || '').toLowerCase();
    var existingOwnerD = _h2Owner(sheetName, body.id);
    if (existingOwnerD !== null && String(existingOwnerD).toLowerCase() !== meDel) {
      return { status: 'error', error: 'FORBIDDEN_NOT_OWNER' };
    }
  }
  _h2Delete(sheetName, body.id);
  auditLog(tokenData, sheetName.toLowerCase() + '-delete', body.id + (body.name ? ' | ' + body.name : ''));
  return { status: 'ok' };
}

/**
 * Liên kết Task vào Milestone (chỉ cập nhật cột TaskRef của H2_Milestones).
 * RBAC (owner-gated như tracking/review): chủ mốc (Owner == token.u) HOẶC Admin/Teamlead.
 * body: { id: milestoneId, taskRef: 'SO-26-001, SO-26-002', name }.
 * Tách riêng khỏi milestone-upsert để member link được task của mình mà KHÔNG
 * cần quyền sửa toàn bộ mốc (mốc vẫn do lead challenge & duyệt).
 */
function h2HandleTaskLink(body, tokenData) {
  if (!body.id) throw new Error('h2-milestone-tasklink: thiếu id.');
  var sheetName = 'H2_Milestones';
  var lead      = (tokenData.r === 'Admin' || tokenData.r === 'Teamlead');
  var me        = String(tokenData.u || '').toLowerCase();
  var owner     = _h2Owner(sheetName, body.id);      // null nếu mốc chưa tồn tại
  if (!lead) {
    if (owner === null) return { status: 'error', error: 'NOT_FOUND' };
    if (String(owner).toLowerCase() !== me) return { status: 'error', error: 'FORBIDDEN_NOT_OWNER' };
  }

  var lock = _acquireWriteLock();
  try {
    var sheet   = _h2Sheet(sheetName);
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return { status: 'error', error: 'NOT_FOUND' };
    var taskRefCol = H2_HEADERS[sheetName].indexOf('TaskRef') + 1;   // 1-based (=10)
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === String(body.id).trim()) {
        sheet.getRange(i + 2, taskRefCol, 1, 1).setValue(String(body.taskRef || ''));
        SpreadsheetApp.flush();
        auditLog(tokenData, 'h2-milestone-tasklink', body.id + ' | ' + String(body.taskRef || ''));
        return { status: 'ok', id: body.id };
      }
    }
    return { status: 'error', error: 'NOT_FOUND' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Đọc gộp toàn bộ domain H2 trong 1 lần gọi (giảm round-trip client).
 * Trả về object { config, objectives, kpis, milestones, tracking, risks, deps, reviews }.
 */
function h2ReadAll(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);   // mở 1 lần cho cả 8 sheet (trước: 8 lần)
  return {
    config:     _h2Read('H2_Config', ss),
    objectives: _h2Read('H2_Objectives', ss),
    kpis:       _h2Read('H2_KPIs', ss),
    milestones: _h2Read('H2_Milestones', ss),
    tracking:   _h2Read('H2_MonthlyTracking', ss),
    risks:      _h2Read('H2_Risks', ss),
    deps:       _h2Read('H2_Dependencies', ss),
    reviews:    _h2Read('H2_Reviews', ss)
  };
}
