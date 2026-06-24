// ── SHTD Dashboard – Audit Log Service ──
// Appends one row per write action to the Audit_Log sheet.
// Schema: Timestamp | Username | Display_Name | Role | Action | Summary

var AUDIT_SHEET_NAME = 'Audit_Log';
var AUDIT_HEADER     = ['Timestamp','Username','Display_Name','Role','Action','Summary'];

function auditLog(tokenData, action, summary) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(AUDIT_SHEET_NAME);
      sheet.getRange(1, 1, 1, AUDIT_HEADER.length).setValues([AUDIT_HEADER]);
      sheet.setFrozenRows(1);
    }

    var row = [
      new Date().toISOString(),
      tokenData.u  || '',
      tokenData.dn || '',
      tokenData.r  || '',
      action,
      summary || '',
    ];

    sheet.appendRow(row);
  } catch (e) {
    // Audit failure must never break the main action
    Logger.log('auditLog error: ' + e.message);
  }
}

function auditReadByEntity(entityId) {
  try {
    var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(AUDIT_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return [];

    var data   = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
    var prefix = entityId + ' |';

    return data
      .filter(function(row) {
        var s = String(row[5] || '');
        return s === entityId || s.startsWith(prefix);
      })
      .map(function(row) {
        return [
          row[0] instanceof Date ? row[0].toISOString() : String(row[0]),
          String(row[1] || ''),
          String(row[2] || ''),
          String(row[3] || ''),
          String(row[4] || ''),
          String(row[5] || '')
        ];
      });
  } catch(e) {
    Logger.log('auditReadByEntity error: ' + e.message);
    return [];
  }
}
