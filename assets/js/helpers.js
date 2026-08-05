const esc  = s => (s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'));
const _esc = esc;

const picNorm = n => { const s = (n||'').toString().trim(); return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : ''; };

const fmtDate = d => { if (!d) return '–'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

function parseVNDate(s) {
  if (!s) return null;
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,m,d] = s.split('-'); return new Date(+y, +m-1, +d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d,m,y] = s.split('/'); return new Date(+y, +m-1, +d);
  }
  return null;
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

function fmtDateExport(d) {
  if (!d) return '';
  d = String(d).trim();
  let day, month0based, year4;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const parts = d.split('-');
    year4       = parseInt(parts[0], 10);
    month0based = parseInt(parts[1], 10) - 1;
    day         = parseInt(parts[2], 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const parts = d.split('/');
    day         = parseInt(parts[0], 10);
    month0based = parseInt(parts[1], 10) - 1;
    year4       = parseInt(parts[2], 10);
  } else {
    return d;
  }
  if (month0based < 0 || month0based > 11) return d;
  const dd  = String(day).padStart(2, '0');
  const mmm = _MMM[month0based];
  const yy  = String(year4).slice(-2);
  return `${dd}-${mmm}-${yy}`;
}
