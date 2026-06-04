# ASSUMPTION LOG — SHTD Dashboard

All assumptions made during Phase 0 discovery. Each must be validated with the Product Owner.

---

| ID | Assumption | Basis | Risk if Wrong |
|---|---|---|---|
| AS-001 | All patches from GAS.GS (v6.1, v6.2) have already been merged into Main.html | Comment headers in Main.html reference v6.1/v6.2 fixes | Duplicate ID protection and multi-user sync may not work correctly |
| AS-002 | The actual Google Apps Script backend is live and operational | `GS_WEBAPP_URL` is set and not a placeholder | Application cannot sync with Google Sheets |
| AS-003 | Google Sheets spreadsheet `1cpg1p_...` is accessible and has `Task_Master` sheet with 23 columns | Configured in code | Read/write will fail |
| AS-004 | `loadDemoData()` and `clearDemoData()` functions are intentionally present (for internal testing) | Buttons exist in HTML | These buttons call undefined functions → console errors |
| AS-005 | The visible merge instructions at lines 168–178 are unintentional leftovers from the Quick View merge process | Context from surrounding HTML | They may be intentionally rendered for development |
| AS-006 | The `fileHandle` global variable is dead code (never assigned, never used) | No assignment found in scanned code | May be used in an unscanned section |
| AS-007 | All 4 CDN dependencies (Chart.js, SheetJS, FontAwesome, DM Sans) are the intended production dependencies | Used throughout the app | No |
| AS-008 | Team names (Số, CV1, CV2, BL1, BL2, PTKD MB, PTKD MN, QLDM) are stable and do not need to change | Hardcoded in multiple places | Must be searched and replaced everywhere |
| AS-009 | `DEFAULT_PICS = ['Tuantt4', 'Dunglq1', 'Quangnn3']` are real team member usernames | Hardcoded constant | May need update as team changes |
| AS-010 | PIC Accountable default "Tuantt4" is intentional (team lead username) | Form default value | Wrong default will go unnoticed |
| AS-011 | The AI_CONTEXT files (DESIGN_SYSTEM.md, SYSTEM_ARCHITECTURE.md, etc.) are from another project used as design reference | Content references "TPBank BIZ", "index.html wizard", different file structure | May be aspirational targets for this project |
| AS-012 | The `GS_WEBAPP_URL` and `GS_SHEET_ID` in code are for the production environment | Only one set of credentials exists | Dev and prod share the same sheet |
| AS-013 | Users access the application directly as a local/hosted HTML file (not via a server) | No server-side rendering, no routing | Deployment model may be different |
| AS-014 | The initiative list is derived from task data (no separate initiative master in the app) | Code: initiatives built from unique `t.initiative` values | There may be an external source of truth for initiatives |
| AS-015 | PAGE_SIZE = 20 is acceptable for users | Default value | Users may want more/fewer rows |
| AS-016 | The week label format "Tuần XX/YYYY" (e.g., "Tuần 16/2026") is an ISO week number | ISO week calculation in `currentWeekLabel()` | Vietnamese convention may differ |
