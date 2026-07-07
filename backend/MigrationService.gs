/**
 * MigrationService.gs — One-time data migration: BL1 + BL2 → BL
 *
 * Sheets updated: Task_Master, Case_Pipeline, User_Master
 * Sheets NOT touched: Audit_Log (historical data stays as-is)
 * Task/Case IDs are NOT changed (e.g. BL1-028 stays BL1-028).
 * Only the team/Team field values are updated.
 *
 * Column search is NORMALIZED (case-insensitive, strips spaces) to handle:
 *   Task_Master  → "Team chính"
 *   Case_Pipeline → "Team"
 *   User_Master  → "Team"
 *
 * Usage (GAS Editor):
 *   1. Run dryRunTeamBL()  → check Logger output for preview
 *   2. Run commitTeamBL()  → write changes to sheets
 */

/* ── Public entry points ── */
function dryRunTeamBL()  { migrateTeamsBL_(true);  }
function commitTeamBL()  { migrateTeamsBL_(false); }

/* ── Normalize: lowercase + strip whitespace/dash/slash ── */
function _norm(s) {
  return String(s || '').toLowerCase().replace(/[\s\t_\-\/]+/g, '');
}

/* ── Core migration ── */
function migrateTeamsBL_(dryRun) {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var label = dryRun ? '[DRY RUN]' : '[COMMIT]';
  Logger.log('%s BL1+BL2 → BL migration started', label);

  var results = [];
  results = results.concat(_migrateSheet(ss, 'Task_Master',    'team', dryRun));
  results = results.concat(_migrateSheet(ss, 'Case_Pipeline',  'team', dryRun));
  results = results.concat(_migrateSheet(ss, 'User_Master',    'team', dryRun));

  Logger.log('%s Total rows updated: %s', label, results.length);
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    Logger.log('  %s | sheet=%s | row=%s | col=%s (header="%s") | old="%s" → new="BL"',
      label, r.sheet, r.row, r.col, r.header, r.oldVal);
  }

  if (!dryRun && results.length > 0) {
    Logger.log('[COMMIT] Migration complete. Ask active users to do a hard-reload (Ctrl+Shift+R) or click "Xóa Cache".');
  }
  if (results.length === 0) {
    Logger.log('%s Nothing to update — BL1/BL2 not found in any team column (already migrated or column not matched).', label);
  }
  return results;
}

/**
 * Scan one sheet for BL1 or BL2 in the team column, replace with BL.
 * Column is found by NORMALIZED keyword match (handles "Team chính", "Team", "team" etc.)
 * Returns array of change records.
 */
function _migrateSheet(ss, sheetName, colKeyword, dryRun) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('WARN: sheet "%s" not found — skipped', sheetName);
    return [];
  }

  var data    = sheet.getDataRange().getValues();
  var headers = data[0];
  var nkw     = _norm(colKeyword);

  /* Case-insensitive, normalized partial match (handles "Team chính" → includes "team") */
  var colIdx = -1;
  var matchedHeader = '';
  for (var h = 0; h < headers.length; h++) {
    var nh = _norm(headers[h]);
    if (nh === nkw || nh.indexOf(nkw) === 0) {  // exact OR starts-with (e.g. "teamchính" starts with "team")
      colIdx = h;
      matchedHeader = String(headers[h]);
      break;
    }
  }

  if (colIdx === -1) {
    Logger.log('WARN: no column matching "%s" found in sheet "%s" — skipped. Headers: [%s]',
      colKeyword, sheetName, headers.join(' | '));
    return [];
  }

  Logger.log('INFO: sheet "%s" — matched column "%s" at index %s', sheetName, matchedHeader, colIdx + 1);

  var changes = [];
  for (var i = 1; i < data.length; i++) {
    var val = String(data[i][colIdx] || '').trim();
    if (val === 'BL1' || val === 'BL2') {
      changes.push({ sheet: sheetName, row: i + 1, col: colIdx + 1, header: matchedHeader, oldVal: val });
      if (!dryRun) {
        sheet.getRange(i + 1, colIdx + 1).setValue('BL');
      }
    }
  }

  Logger.log('[%s] %s: %s rows to update in column "%s"',
    dryRun ? 'DRY RUN' : 'COMMIT', sheetName, changes.length, matchedHeader);
  return changes;
}
