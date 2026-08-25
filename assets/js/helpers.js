const esc  = s => (s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'));
const _esc = esc;

const picNorm = n => { const s = (n||'').toString().trim(); return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : ''; };

/* ══════════════════════════════════════════════════════════════════════
   UNIFIED DATE HANDLING (single source of truth for the whole project)
   ─────────────────────────────────────────────────────────────────────
   Canonical in Google Sheet + in-memory: ISO 'YYYY-MM-DD'.
   Canonical on-screen display:           'DD/MM/YYYY'.
   `<input type="date">` needs ISO → memory being ISO means modals bind
   directly with no per-view conversion.
   `toISODate()` is intentionally permissive so legacy / mangled data
   (Google Sheets localised months like "30-thg 7-26", real Date cells,
   Excel serials, DD-MMM-YY, DD/MM/YYYY) all normalise to one ISO string.
════════════════════════════════════════════════════════════════════════ */
const _MMM_MAP = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function _isoFromYMD(y, m0, d) {
  if (!(y >= 1900 && y <= 2200) || m0 < 0 || m0 > 11 || d < 1 || d > 31) return '';
  return `${y}-${String(m0 + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
// Parse ANY supported representation → ISO 'YYYY-MM-DD' (or '' if empty/unparseable). Never throws.
function toISODate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : _isoFromYMD(v.getFullYear(), v.getMonth(), v.getDate());
  if (typeof v === 'number') {                       // Excel/Sheets serial
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d) ? '' : _isoFromYMD(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }
  const s = String(v).trim();
  if (!s) return '';
  const _yr = y => { const n = +y; return n < 100 ? (n < 50 ? 2000 + n : 1900 + n) : n; };
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))                 return _isoFromYMD(+m[1], +m[2] - 1, +m[3]); // ISO (opt. time)
  if ((m = s.match(/^(\d{1,2})[\-\/]([A-Za-z]{3,})[\-\/](\d{2,4})$/))) {                                          // DD-MMM-YY(YY)
    const mo = _MMM_MAP[m[2].slice(0, 3).toLowerCase()];
    if (mo !== undefined) return _isoFromYMD(_yr(m[3]), mo, +m[1]);
  }
  if ((m = s.match(/^(\d{1,2})[\-\/\s]+(?:thg|tháng)\.?\s*(\d{1,2})[\-\/\s,]+(\d{2,4})$/i)))                       // DD-thg M-YY (VN locale)
    return _isoFromYMD(_yr(m[3]), +m[2] - 1, +m[1]);
  if ((m = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/)))      return _isoFromYMD(+m[3], +m[2] - 1, +m[1]);  // DD/MM/YYYY (day-first, VN)
  const d = new Date(s);
  return isNaN(d) ? '' : _isoFromYMD(d.getFullYear(), d.getMonth(), d.getDate());
}

// Display: any stored value → 'DD/MM/YYYY' (or '–' when empty/unparseable).
const fmtDate = v => { const iso = toISODate(v); if (!iso) return '–'; const p = iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; };

function parseVNDate(s) {
  const iso = toISODate(s);
  if (!iso) return null;
  const [y, m, d] = iso.split('-');
  return new Date(+y, +m - 1, +d);
}

function isOverdue(endDateString, progress) {
  if (progress >= 100 || !endDateString) return false;
  const endDateObj = parseVNDate(endDateString);
  if (!endDateObj || isNaN(endDateObj)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDateObj < today;
}

const ragBadge = s => { const c = {Green:'badge-green',Amber:'badge-amber',Red:'badge-red'}[s]||'badge-gray'; return `<span class="badge ${c}">${s||'–'}</span>`; };

const stateChip = s => {
  const map = { 'Chưa bắt đầu':'s0','Đang thực hiện':'s1','Hoàn thành chuẩn bị':'s2','Hoàn thành':'s3','Tạm dừng':'s4','Blocked':'s5' };
  const label = typeof tState === 'function' ? tState(s) : (s || '–');
  return `<span class="state-chip ${map[s]||'s0'}">${label}</span>`;
};

/* ── Auto-complete: %HT = 100 ⇒ trạng thái "hoàn thành" ──
   Áp cho Task / Initiative (root) / Dev — 3 entity có trường phần trăm.
   Case & Bug KHÔNG có cột % (chạy theo stage/status) → cố ý bỏ qua.
   Xem thêm backend/DataCleanupService.gs (bulk one-off phía Sheet). */
const COMPLETE_PCT = 100;

// Parse "80%" | "80" | 80 | 0.8 → số 0..100 (nhất quán với _dcPct_ ở GAS).
function _pctNum(v) {
  if (v == null || v === '') return 0;
  const raw = String(v).trim();
  let n = parseFloat(raw.replace('%', ''));
  if (isNaN(n)) return 0;
  if (raw.indexOf('%') === -1 && n > 0 && n <= 1) n = n * 100;   // dạng phân số 0..1
  return n;
}

// Mỗi hàm chuẩn hoá 1 object in-memory; trả về true nếu có thay đổi.
function normTaskComplete(t) {
  if (t && _pctNum(t.progress) >= COMPLETE_PCT && t.state !== 'Hoàn thành') { t.state = 'Hoàn thành'; return true; }
  return false;
}
function normInitComplete(i) {
  if (!i) return false;
  // Chỉ ROOT initiative; milestone (-M\d+ / type=milestone) dùng "Xong" → bỏ qua.
  const isMs = (i.type === 'milestone') || (typeof _isMilestone === 'function' && _isMilestone(i.id));
  if (isMs) return false;
  if (_pctNum(i.pct) >= COMPLETE_PCT && i.status !== 'Done') { i.status = 'Done'; return true; }
  return false;
}
function normDevComplete(d) {
  if (d && _pctNum(d.progress) >= COMPLETE_PCT && d.state !== 'Hoàn thành') { d.state = 'Hoàn thành'; return true; }
  return false;
}

// Quét TOÀN BỘ dữ liệu in-memory (display consistency — KHÔNG ghi mạng).
// Idempotent, rẻ; gọi ở đầu renderAll() để UI không bao giờ hiện "100% mà chưa hoàn thành".
function normalizeCompleteInMemory() {
  let ct = 0, ci = 0, cd = 0;
  (db && db.tasks || []).forEach(t => { if (normTaskComplete(t)) ct++; });
  (db && db.initiatives || []).forEach(i => { if (normInitComplete(i)) ci++; });
  (typeof dbDev !== 'undefined' ? dbDev : []).forEach(d => { if (normDevComplete(d)) cd++; });
  return { tasks: ct, inits: ci, dev: cd, total: ct + ci + cd };
}

// Làm sạch TOÀN BỘ + GHI về Sheet (Task/Initiative/Dev). Dùng cho nút/console FE.
// Chỉ persist các item thực sự đổi → tránh mass-write không cần thiết.
async function cleanupCompleteByProgress() {
  const changedTasks = (db && db.tasks || []).filter(normTaskComplete);
  const changedInits = (db && db.initiatives || []).filter(normInitComplete);
  const changedDev   = (typeof dbDev !== 'undefined' ? dbDev : []).filter(normDevComplete);
  const total = changedTasks.length + changedInits.length + changedDev.length;

  if (total === 0) { if (typeof toast === 'function') toast('Dữ liệu đã sạch — không có mục nào 100% mà chưa hoàn thành.', 'info'); return { total: 0 }; }

  try {
    for (const t of changedTasks) { if (typeof _gasTaskUpsert === 'function') await _gasTaskUpsert(t, t.id); }
    for (const i of changedInits) { if (typeof syncInitiativeEdit === 'function') await syncInitiativeEdit(i); }
    for (const d of changedDev)   { if (typeof _gasDevUpsert === 'function') await _gasDevUpsert(d); }
    if (typeof persist === 'function') persist();
    if (typeof persistDev === 'function') persistDev();
    if (typeof renderAll === 'function') renderAll();
    if (typeof toast === 'function') toast(`✅ Đã chuẩn hoá ${total} mục về "hoàn thành" (Task ${changedTasks.length} · Initiative ${changedInits.length} · Dev ${changedDev.length}).`, 'success', 6000);
  } catch (e) {
    if (typeof toast === 'function') toast('Lỗi khi làm sạch dữ liệu: ' + (e && e.message || e), 'error', 6000);
  }
  return { total, tasks: changedTasks.length, inits: changedInits.length, dev: changedDev.length };
}

// Wrapper cho nút toolbar (admin): đếm read-only → hỏi xác nhận → chạy cleanup (ghi Sheet).
async function uiCleanupCompleteByProgress() {
  const isMs = i => (i && ((i.type === 'milestone') || (typeof _isMilestone === 'function' && _isMilestone(i.id))));
  const nTask = (db && db.tasks || []).filter(t => _pctNum(t.progress) >= COMPLETE_PCT && t.state !== 'Hoàn thành').length;
  const nInit = (db && db.initiatives || []).filter(i => !isMs(i) && _pctNum(i.pct) >= COMPLETE_PCT && i.status !== 'Done').length;
  const nDev  = (typeof dbDev !== 'undefined' ? dbDev : []).filter(d => _pctNum(d.progress) >= COMPLETE_PCT && d.state !== 'Hoàn thành').length;
  const total = nTask + nInit + nDev;

  if (total === 0) { if (typeof toast === 'function') toast('Dữ liệu đã sạch — không có mục 100% nào chưa hoàn thành.', 'info'); return; }

  const ok = (typeof uiConfirm === 'function')
    ? await uiConfirm('Chuẩn hoá hoàn thành',
        `Đặt trạng thái <strong>hoàn thành</strong> cho <strong>${total}</strong> mục đã đạt 100% (Task ${nTask} · Initiative ${nInit} · Dev ${nDev}). Thao tác ghi trực tiếp lên Google Sheets.`,
        'info', `Chuẩn hoá ${total} mục`)
    : confirm(`Chuẩn hoá ${total} mục về hoàn thành?`);
  if (!ok) return;
  await cleanupCompleteByProgress();
}

/* ── Report Week (ISO-8601) — tuần báo cáo ĐA TUẦN cho Task ──
   Membership = autoWeeks(Start→max(Deadline, hôm nay nếu chưa xong)) ∪ pinnedWeeks(nhập tay).
   Mọi read path (filter/preset/report/dashboard/quickview) dùng taskReportWeeks() làm hàm gốc.
   Nhãn canonical: "Tuần WW/YYYY" theo ISO week-year (thứ 2 đầu tuần). */
const REPORT_WEEK_MAX_SPAN = 60;                 // chặn dữ liệu ngày rác làm phình membership

// {year, week} ISO-8601 của 1 Date (year = ISO week-year, có thể lệch năm dương lịch ở biên).
function isoWeekParts(d) {
  const dt  = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = dt.getUTCDay() || 7;               // CN(0) → 7
  dt.setUTCDate(dt.getUTCDate() + 4 - day);      // dời tới thứ 5 của tuần ISO
  const ys  = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((dt - ys) / 86400000) + 1) / 7);
  return { year: dt.getUTCFullYear(), week };
}
function isoWeekLabel(d) {
  const p = isoWeekParts(d);
  return `Tuần ${String(p.week).padStart(2,'0')}/${p.year}`;
}
function currentIsoWeekLabel() { return isoWeekLabel(new Date()); }

// Thứ 2 (đầu tuần ISO) của Date, giờ về 00:00 local.
function isoWeekMonday(d) {
  const dt  = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = dt.getDay() || 7;
  dt.setDate(dt.getDate() - (day - 1));
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// Mảng nhãn tuần ISO từ start → end (inclusive). Cap REPORT_WEEK_MAX_SPAN (giữ các tuần gần end nhất).
function isoWeeksInRange(start, end) {
  if (!start || !end) return [];
  let a = isoWeekMonday(start), b = isoWeekMonday(end);
  if (b < a) { const tmp = a; a = b; b = tmp; }
  const out = [];
  const cur = new Date(b);
  while (cur >= a && out.length < REPORT_WEEK_MAX_SPAN) {
    out.push(isoWeekLabel(cur));
    cur.setDate(cur.getDate() - 7);
  }
  return out.reverse();
}

// '2026-W16' (giá trị <input type="week">) ⇄ 'Tuần 16/2026'
function weekInputToLabel(v) {
  const m = /^(\d{4})-W(\d{1,2})$/.exec(String(v || '').trim());
  return m ? `Tuần ${m[2].padStart(2, '0')}/${m[1]}` : '';
}
function labelToWeekInput(label) {
  const m = /(\d{1,2})\s*\/\s*(\d{4})/.exec(String(label || ''));
  return m ? `${m[2]}-W${m[1].padStart(2, '0')}` : '';
}

// Chuẩn hoá 1 chuỗi tuần tự do → 'Tuần WW/YYYY' hoặc '' nếu không parse được.
// Bắt: 'Tuần 16/2026', 'T16/2026', '16/2026', '2026-W16', 'W16 2026', 'tuan 16 2026'…
function parseWeekLabel(s) {
  s = String(s == null ? '' : s).trim();
  if (!s) return '';
  let m = /^(\d{4})-W(\d{1,2})$/i.exec(s);
  if (m) { const w = +m[2]; if (w >= 1 && w <= 53) return `Tuần ${String(w).padStart(2,'0')}/${m[1]}`; }
  m = /(\d{1,2})\s*[\/\-]\s*(\d{4})/.exec(s);                 // WW/YYYY
  if (m) { const w = +m[1]; if (w >= 1 && w <= 53) return `Tuần ${String(w).padStart(2,'0')}/${m[2]}`; }
  m = /(\d{4})\D+W?\s*(\d{1,2})/i.exec(s);                    // YYYY … WW
  if (m) { const w = +m[2]; if (w >= 1 && w <= 53) return `Tuần ${String(w).padStart(2,'0')}/${m[1]}`; }
  return '';
}

// Parse cột 'Tuần BC' (đa giá trị, phân cách ; hoặc ,) → mảng nhãn (giữ chuỗi lạ để không mất tag cũ).
function parsePinnedWeeks(tuanBCRaw) {
  return String(tuanBCRaw == null ? '' : tuanBCRaw)
    .split(/[;,]/).map(x => x.trim()).filter(Boolean)
    .map(x => parseWeekLabel(x) || x);
}

// So sánh 2 nhãn tuần theo (year, week); nhãn không chuẩn đẩy về cuối.
function _weekKey(s) { const m = /(\d{1,2})\s*\/\s*(\d{4})/.exec(String(s || '')); return m ? (+m[2]) * 100 + (+m[1]) : Infinity; }
function _weekLabelCmp(a, b) { return _weekKey(a) - _weekKey(b) || String(a).localeCompare(String(b)); }

// HÀM GỐC: các tuần báo cáo của task = auto(từ ngày) ∪ pinned(tay), sorted asc + deduped.
function taskReportWeeks(task) {
  if (!task) return [];
  const pinned = parsePinnedWeeks(task.tuanBC);
  const s = typeof parseVNDate === 'function' ? parseVNDate(task.startDate) : null;
  const e = typeof parseVNDate === 'function' ? parseVNDate(task.endDate)   : null;
  let auto = [];
  if (s || e) {
    const startD = s || e;
    let endD     = e || s;
    const today  = new Date(); today.setHours(0, 0, 0, 0);
    if (task.state !== 'Hoàn thành' && today > endD) endD = today;   // quá hạn chưa xong → kéo tới tuần này
    auto = isoWeeksInRange(startD, endD);
  }
  return [...new Set([...auto, ...pinned])].sort(_weekLabelCmp);
}

// ══════════════════════════════════════════════════════════════════
// TASK ĐỊNH KỲ (S80) — key kỳ tuần/tháng + trạng thái + tick 1 click
// Xem AI_CONTEXT/RECURRING_TASK_DESIGN.md. Log 1 lần, tick 1 click, auto-reset mỗi kỳ.
// ══════════════════════════════════════════════════════════════════

// Chuẩn hoá cột 'Định kỳ' → '' | 'Tuần' | 'Tháng'
function normRecurrence(v) {
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if (s.indexOf('tuần') !== -1 || s === 'tuan' || s === 'weekly' || s === 'week' || s === 'w') return 'Tuần';
  if (s.indexOf('tháng') !== -1 || s === 'thang' || s === 'monthly' || s === 'month' || s === 'm') return 'Tháng';
  return '';
}

// Nhãn kỳ THÁNG: 'Tháng MM/YYYY'
function monthLabel(d) { return `Tháng ${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; }
function currentMonthLabel() { return monthLabel(new Date()); }

// Nhãn kỳ hiện tại theo tần suất
function periodLabelOf(freq, date) {
  const d = date || new Date();
  if (freq === 'Tuần')  return isoWeekLabel(d);
  if (freq === 'Tháng') return monthLabel(d);
  return '';
}
function currentPeriodLabel(freq) { return periodLabelOf(freq, new Date()); }

// Mảng nhãn kỳ THÁNG từ start → end (inclusive), cap 120 chặn ngày rác.
function monthsInRange(start, end) {
  if (!start || !end) return [];
  let a = new Date(start.getFullYear(), start.getMonth(), 1);
  let b = new Date(end.getFullYear(), end.getMonth(), 1);
  if (b < a) { const t = a; a = b; b = t; }
  const out = []; const cur = new Date(a);
  while (cur <= b && out.length < 120) { out.push(monthLabel(cur)); cur.setMonth(cur.getMonth() + 1); }
  return out;
}

// Key so sánh kỳ (year*100 + week|month) — dùng chung tuần/tháng để sort + so "trước".
function _periodKey(label) {
  const m = /(\d{1,2})\s*\/\s*(\d{4})/.exec(String(label || ''));
  return m ? (+m[2]) * 100 + (+m[1]) : Infinity;
}
function _periodEq(a, b) { return _periodKey(a) === _periodKey(b); }

// Parse cột 'Kỳ đã xong' → mảng nhãn (giữ chuỗi, chỉ trim/lọc rỗng).
function parseDonePeriods(raw) {
  return String(raw == null ? '' : raw).split(/[;,]/).map(x => x.trim()).filter(Boolean);
}

// Danh sách kỳ task định kỳ "phải làm" từ Start → hôm nay (gồm kỳ hiện tại).
function taskDuePeriods(task) {
  const freq = normRecurrence(task && task.recurrence);
  if (!freq) return [];
  const s = typeof parseVNDate === 'function' ? parseVNDate(task.startDate) : null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const startD = s || today;
  if (freq === 'Tuần')  return isoWeeksInRange(startD, today);
  if (freq === 'Tháng') return monthsInRange(startD, today);
  return [];
}

// Trạng thái định kỳ của task (cho UI + nhắc).
// → { isRecurring, freq, curLabel, done(kỳ hiện tại), missed:[kỳ trước chưa xong], hasMissed, total, doneCount }
function taskPeriodStatus(task) {
  const freq = normRecurrence(task && task.recurrence);
  if (!freq) return { isRecurring: false, freq: '' };
  const curLabel  = currentPeriodLabel(freq);
  const doneSet   = parseDonePeriods(task.donePeriods);
  const isDone    = doneSet.some(x => _periodEq(x, curLabel));
  const due       = taskDuePeriods(task);
  const curKey    = _periodKey(curLabel);
  const missed    = due.filter(p => _periodKey(p) < curKey && !doneSet.some(x => _periodEq(x, p)));
  const doneCount = due.filter(p => doneSet.some(x => _periodEq(x, p))).length;
  return { isRecurring: true, freq, curLabel, done: isDone, missed, hasMissed: missed.length > 0, total: due.length, doneCount };
}

// Toggle "xong kỳ hiện tại" → trả chuỗi donePeriods mới (caller lưu qua task-upsert). Không side-effect.
function togglePeriodDone(task, on) {
  const freq = normRecurrence(task && task.recurrence);
  if (!freq) return task ? (task.donePeriods || '') : '';
  const curLabel = currentPeriodLabel(freq);
  const cur = parseDonePeriods(task.donePeriods);
  const has = cur.some(x => _periodEq(x, curLabel));
  const want = (on === undefined) ? !has : !!on;
  let arr = cur.filter(x => !_periodEq(x, curLabel));
  if (want) arr.push(curLabel);
  arr.sort((a, b) => _periodKey(a) - _periodKey(b));
  return arr.join('; ');
}

// Handler DÙNG CHUNG (My Work/Tasks/QuickView): tick "xong kỳ hiện tại" 1 task →
// mutate donePeriods + lưu qua task-upsert (fire-and-forget). Trả status mới; caller tự re-render.
function taskTogglePeriodDone(taskId) {
  const t = (typeof db !== 'undefined' && db.tasks) ? db.tasks.find(x => x.id === taskId) : null;
  if (!t || !normRecurrence(t.recurrence)) return null;
  t.donePeriods = togglePeriodDone(t);
  if (typeof _gasTaskUpsert === 'function') _gasTaskUpsert(t, t.id);   // fire-and-forget
  return taskPeriodStatus(t);
}

// HTML badge + nút tick trạng thái kỳ. onclickFn = tên hàm wrapper của view (nhận taskId).
function taskPeriodBadgeHtml(task, onclickFn) {
  const st = taskPeriodStatus(task);
  if (!st.isRecurring) return '';
  const noun = st.freq === 'Tuần' ? 'tuần' : 'tháng';
  const id = String(task.id).replace(/'/g, "\\'");
  const btn = st.done
    ? `<button type="button" class="rt-period-btn rt-period-done" onclick="${onclickFn}('${id}')" title="Đã xong ${st.curLabel} — bấm để bỏ đánh dấu">✓ Xong ${noun} này</button>`
    : `<button type="button" class="rt-period-btn rt-period-todo" onclick="${onclickFn}('${id}')" title="Đánh dấu xong ${st.curLabel}">Xong ${noun} này?</button>`;
  const miss = st.hasMissed
    ? ` <span class="rt-period-miss" title="Chưa hoàn thành: ${st.missed.join(', ')}">⚠ Miss ${st.missed.length}</span>`
    : '';
  return `<span class="rt-period-wrap" data-freq="${st.freq}">${btn}${miss}</span>`;
}

// task có thuộc 1 tuần cụ thể không (dùng cho filter/report).
function taskInReportWeek(task, weekLabel) {
  if (!weekLabel) return true;
  return taskReportWeeks(task).indexOf(weekLabel) !== -1;
}

// Số sortable của tuần báo cáo sớm nhất (để sort cột bảng).
function taskFirstWeekKey(task) {
  const w = taskReportWeeks(task);
  return w.length ? _weekKey(w[0]) : Infinity;
}

// Nhãn hiển thị gọn cho cột bảng: tuần đầu + "(+N)" nếu nhiều tuần.
function taskWeeksBadge(task) {
  const w = taskReportWeeks(task);
  if (!w.length) return '–';
  return w.length === 1 ? w[0] : `${w[0]} (+${w.length - 1})`;
}

// Tập hợp mọi tuần báo cáo CANONICAL trên toàn bộ task (đã lọc nhãn lạ) — cho dropdown filter, sorted asc.
function allReportWeeks() {
  const set = new Set();
  ((typeof db !== 'undefined' && db.tasks) || []).forEach(t =>
    taskReportWeeks(t).forEach(w => { if (_weekKey(w) !== Infinity) set.add(w); }));
  return [...set].sort(_weekLabelCmp);
}

function genId(init, team, ms, extra = []) {
  let pfx;
  if (!init || init === 'BAU') {
    pfx = (team ? team.replace(/\s+/g, '') : 'SO') + '-';
  } else if (ms) {
    const msShort = (ms.match(/-?(M\d+)$/i) || [])[1] || ms;
    pfx = init + '-' + msShort + '-';
  } else {
    pfx = init + '-';
  }
  let max = 0;
  [...db.tasks, ...extra].forEach(t => {
    if (t.id && t.id.toUpperCase().startsWith(pfx.toUpperCase())) {
      const n = parseInt(t.id.substring(pfx.length));
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return pfx + String(max + 1).padStart(3, '0');
}

// Storage serializer: any value → canonical ISO 'YYYY-MM-DD' for the Sheet.
// (Name kept for backward-compat with existing *ToRow() call sites.)
function fmtDateExport(d) {
  return toISODate(d);
}
