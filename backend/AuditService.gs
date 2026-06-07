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
