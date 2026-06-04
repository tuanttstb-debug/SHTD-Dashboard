# IMPACT ANALYSIS — Critical Findings

## FINDING 1: GAS.GS Patches Partially NOT Merged

### Status of Each Patch

| Patch | Function | Merged? | Evidence |
|---|---|---|---|
| v6.1 FIX 1 | `syncAction()` | ✅ YES | Present at Main.html:2398, Read-Then-Patch logic intact |
| v6.1 FIX 2 | FAB CSS position | ✅ YES | `.qv-fab { bottom: 80px }` at Main.html:679 |
| v6.2 FIX 3 | `handleSubmit()` | ✅ YES | `_showDuplicateIdBlocker` present at ~line 3300 |
| v6.2 FIX 4 | `taskToRow()` date format | ❌ **NO** | Main.html:2239 returns `DD/MM/YYYY`; GAS.GS should return `dd-mmm-yy` |
| v6.2 FIX 5 | `taskToRow()` progress format | ❌ **NO** | Main.html:2254 returns `t.progress\|\|0` (number); GAS.GS returns `"75%"` |
| v6.2 patch | `checkDupId()` behavior | ❌ **NO** | Main.html:2200 doesn't distinguish ADD vs EDIT in message text |

### Business Impact of Missing FIX 4 + FIX 5

**FIX 4 — Date export format:**
- Current: Excel export shows dates as "22/04/2026" (DD/MM/YYYY string)
- Should be: "22-Apr-26" (dd-mmm-yy)
- Impact: Excel may NOT auto-recognize the date format → dates sort alphabetically, not chronologically → reporting tools fail to process dates correctly

**FIX 5 — Progress % format:**
- Current: Excel export shows progress as `75` (number)
- Should be: `"75%"` (string with percent)
- Impact: Google Sheets reads the column as a plain number, not a percentage — visual formatting is wrong in the Sheet

**Action Required**: Apply FIX 4 and FIX 5 from GAS.GS to Main.html as Phase A3.

---

## FINDING 2: Orphaned HTML Inside `<style>` Block (Lines 153–178)

### Root Cause
During the Quick View Panel merge, the developer incorrectly pasted HTML elements INTO the `<style>` CSS block instead of the `<body>`. These elements are at lines 153–178, which are between the CSS `.topbar-right{}` rule and `.icon-btn{}` rule.

### What's Inside the Style Block

```css
/* Line 153 — legitimate CSS */
.topbar-right{display:flex;align-items:center;gap:10px;}

/* Lines 154–165 — ORPHANED HTML (inside <style>, never renders) */
<button class="qv-topbar-btn" onclick="openQuickView()" ...>
<button onclick="loadDemoData()">Load demo data</button>
<button onclick="clearDemoData()">Xóa data</button>
<button onclick="...toggle dark...">Toggle Dark</button>
</div>
</div>

/* Lines 168–178 — ORPHANED HTML (inside <style>, never renders) */
<div ...>Hướng dẫn merge vào dashboard.html gốc...</div>

/* Line 179 — legitimate CSS resumes */
.icon-btn{width:36px;height:36px;...}
```

### Rendering Behavior
The HTML inside `<style>` is treated as invalid CSS text by the browser and **silently ignored**. These elements are **NEVER rendered** to users.

### Consequences
1. **Quick View topbar button** (`.qv-topbar-btn`) is defined in CSS but **never appears in the rendered topbar** — only the FAB button triggers Quick View
2. **Debug buttons** (`loadDemoData`, `clearDemoData`) were never visible — functions may not exist
3. **Merge instructions** are never visible to users — they are dead code in CSS
4. The `.topbar-right` CSS rule IS parsed correctly (it's before the orphaned HTML)
5. The dark mode toggle in the orphaned section is DIFFERENT from the actual dark mode button (`id="darkModeBtn"`) in the real topbar — the orphaned one uses a direct `setAttribute` call while the real one calls `toggleDark()`

### Action Required (Phase A1)
- Remove lines 154–178 from the `<style>` block
- If Quick View topbar button is desired: add `<button class="qv-topbar-btn">` to the actual topbar HTML (lines ~1132–1143 in body)
- If debug buttons are needed: add them with proper guards in the body

---

## FINDING 3: `loadDemoData()` and `clearDemoData()` May Not Exist

### Analysis
These functions are referenced in the orphaned HTML inside `<style>` (lines 160–161). Since that HTML never renders, these function calls never execute. The functions themselves were NOT found in the scanned JS sections.

### Risk
- Low impact: functions never called
- If someone moves these buttons to the body without adding the functions, clicking them would throw `ReferenceError`

---

## FINDING 4: Two `taskToRow()` — Different Column Count

### Main.html version (line 2238)
Returns 23 elements matching `DB_COLS`:
```
[id, tuanBC, initiative, category, team, teamPhoiHop, type, name, picAcc, picRes, picSupport, startDate, endDate, progress(number), state, milestone, result, nextPlan, vuongMac, canBLD, noiDungBLD, crossTeam, highlight]
```

### GAS.GS version (line 420)
Returns 23 elements but:
- Column index 11: `fmtDateExport(t.startDate)` → "22-Apr-26" format
- Column index 12: `fmtDateExport(t.endDate)` → "22-Apr-26" format
- Column index 13: `t.progress + '%'` → "75%"

Both have 23 columns in the same order — safe to swap.

---

## FINDING 5: `status` Field vs `rag` Terminology Inconsistency

The data model uses `t.status` for the RAG field (Green/Amber/Red). However:
- The filter dropdown ID is `filterRag`
- The form field ID is `fRag`
- The badge function is `ragBadge(s)`
- But the stored property is `t.status`

This naming inconsistency makes code harder to search and understand. A future refactor should align naming to either `status` or `rag` consistently.
