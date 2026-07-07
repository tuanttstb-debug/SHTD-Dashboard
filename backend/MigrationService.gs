/**
 * MigrationService.gs — One-time data migration: BL1 + BL2 → BL
 *
 * Sheets updated: Task_Master, Case_Pipeline, User_Master
 * Sheets NOT touched: Audit_Log (historical data stays as-is)
 * Task/Case IDs are NOT changed (e.g. BL1-028 stays BL1-028).
 * Only the `team` / `Team` field values are updated.
 *
 * Usage (GAS Editor):
 *   1. Run dryRunTeamBL()  → check Logger output for preview
 *   2. Run commitTeamBL()  → write changes to sheets
 */

/* ── Public entry points ── */
function dryRunTeamBL()  { migrateTeamsBL_(true);  }
function commitTeamBL()  { migrateTeamsBL_(false); }

/* ── Core migration ── */
function migrateTeamsBL_(dryRun) {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const label = dryRun ? '[DRY RUN]' : '[COMMIT]';
  Logger.log('%s BL1+BL2 → BL migration started', label);

  const results = [];
  results.push(..._migrateSheet(ss, 'Task_Master',    'team',  dryRun));
  results.push(..._migrateSheet(ss, 'Case_Pipeline',  'team',  dryRun));
  results.push(..._migrateSheet(ss, 'User_Master',    'Team',  dryRun));

  Logger.log('%s Total rows updated: %s', label, results.length);
  results.forEach(r => Logger.log('  %s | sheet=%s | row=%s | col=%s | old=%s → new=BL',
    label, r.sheet, r.row, r.col, r.oldVal));

  if (!dryRun && results.length > 0) {
    Logger.log('[COMMIT] Migration complete. Recommend a hard-refresh for all active users.');
  }
  return results;
}

/**
 * Scan one sheet for BL1 or BL2 in the given column header, replace with BL.
 * Returns array of change records.
 */
function _migrateSheet(ss, sheetName, colHeader, dryRun) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('WARN: sheet "%s" not found — skipped', sheetName);
    return [];
  }

  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const colIdx  = headers.indexOf(colHeader);
  if (colIdx === -1) {
    Logger.log('WARN: column "%s" not found in sheet "%s" — skipped', colHeader, sheetName);
    return [];
  }

  const changes = [];
  for (let i = 1; i < data.length; i++) {
    const val = String(data[i][colIdx] || '').trim();
    if (val === 'BL1' || val === 'BL2') {
      changes.push({ sheet: sheetName, row: i + 1, col: colIdx + 1, oldVal: val });
      if (!dryRun) {
        sheet.getRange(i + 1, colIdx + 1).setValue('BL');
      }
    }
  }

  Logger.log('[%s] %s: %s rows to update in column "%s"',
    dryRun ? 'DRY RUN' : 'COMMIT', sheetName, changes.length, colHeader);
  return changes;
}
