// ── SHTD Dashboard – Issue Tracker view ──

let _itSort       = { key: 'ngayPhatSinh', dir: 'desc' };
let _itPage       = 1;
const _IT_PAGE_SIZE = 20;
let _itFilterSystem   = '';
let _itFilterType     = '';
let _itFilterSeverity = '';
let _itFilterStatus   = '';
let _itFilterDept     = '';
let _itFilterSearch   = '';
let _itPreset     = 'open';   // 'open' | 'breach' | 'done' | 'all'
let _itChartTrend  = null;
let _itChartSystem = null;
let _itTrendMode  = 'week';   // 'week' | 'month'
let _itViewId     = null;
let _itEditId     = null;

function renderIssueTracker() {
  _itRenderKpi();
  _itRenderCharts();
  _itRenderTable();
}

/* ══════════════════════
   KPI CARDS
══════════════════════ */
function _itRenderKpi() {
  const today = new Date(); today.setHours(0,0,0,0);
  const all   = dbIssues;

  const total  = all.length;
  const open   = all.filter(i => i.trangThai !== 'Đã xử lý').length;
  const breach = all.filter(i => {
    if (i.trangThai === 'Đã xử lý' || !i.deadline) return false;
    const d = new Date(i.deadline); d.setHours(0,0,0,0);
    return d < today;
  }).length;

  const resolved = all.filter(i => i.trangThai === 'Đã xử lý' && i.ngayPhatSinh && i.ngayGiaiQuyet);
  let avgDays = '–';
  if (resolved.length) {
    const sum = resolved.reduce((s, i) => {
      const diff = Math.max(0, Math.round((new Date(i.ngayGiaiQuyet) - new Date(i.ngayPhatSinh)) / 86400000));
      return s + diff;
    }, 0);
    avgDays = (sum / resolved.length).toFixed(1) + ' ngày';
  }

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set('itStatTotal',  total);
  set('itStatOpen',   open);
  set('itStatBreach', breach);
  set('itStatMttr',   avgDays);

  // Nav badge — shows SLA breach count
  const badge = document.getElementById('navBadgeIssue');
  if (badge) { badge.textContent = breach; badge.style.display = breach > 0 ? '' : 'none'; }
}

/* ══════════════════════
   CHARTS
══════════════════════ */
function _itRenderCharts() {
  _itRenderTrendChart();
  _itRenderSystemChart();
  _itRenderMttrTable();
  _itRenderRootCauseTable();
}

function _itRenderTrendChart() {
  const canvas = document.getElementById('itTrendChart');
  if (!canvas) return;
  if (_itChartTrend) { _itChartTrend.destroy(); _itChartTrend = null; }

  const buckets = {};
  dbIssues.forEach(i => {
    if (!i.ngayPhatSinh) return;
    const d = new Date(i.ngayPhatSinh);
    if (isNaN(d)) return;
    let key;
    if (_itTrendMode === 'week') {
      const mon = new Date(d);
      mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      key = mon.toISOString().slice(0, 10);
    } else {
      key = i.ngayPhatSinh.slice(0, 7);
    }
    buckets[key] = (buckets[key] || 0) + 1;
  });

  const labels = Object.keys(buckets).sort();
  const data   = labels.map(k => buckets[k]);
  const dispLabels = _itTrendMode === 'month'
    ? labels.map(l => { const [y,m] = l.split('-'); return _MMM[parseInt(m,10)-1] + ' ' + y.slice(-2); })
    : labels;

  _itChartTrend = new Chart(canvas, {
    type: 'line',
    data: {
      labels: dispLabels,
      datasets: [{
        label: 'Issue phát sinh',
        data,
        borderColor: 'var(--primary)',
        backgroundColor: 'rgba(99,102,241,0.08)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
    }
  });
}

function _itRenderSystemChart() {
  const canvas = document.getElementById('itSystemChart');
  if (!canvas) return;
  if (_itChartSystem) { _itChartSystem.destroy(); _itChartSystem = null; }

  const counts = {};
  dbIssues.forEach(i => { const s = i.heTong || 'Khác'; counts[s] = (counts[s]||0)+1; });
  const sorted = Object.entries(counts).sort((a,b) => b[1]-a[1]);

  _itChartSystem = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: sorted.map(([k]) => k),
      datasets: [{
        label: 'Số issue',
        data: sorted.map(([,v]) => v),
        backgroundColor: ['#6366f1','#f59e0b','#10b981','#f87171','#a78bfa'].slice(0, sorted.length),
        borderRadius: 6,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 } } }
    }
  });
}

function _itRenderMttrTable() {
  const el = document.getElementById('itMttrTable');
  if (!el) return;

  const rows = ISSUE_DEPTS.map(dept => {
    const res = dbIssues.filter(i =>
      i.phongBan === dept && i.trangThai === 'Đã xử lý' && i.ngayPhatSinh && i.ngayGiaiQuyet
    );
    if (!res.length) return null;
    const sum = res.reduce((s,i) => s + Math.max(0, Math.round((new Date(i.ngayGiaiQuyet)-new Date(i.ngayPhatSinh))/86400000)), 0);
    return { dept, count: res.length, avg: (sum/res.length).toFixed(1) };
  }).filter(Boolean);

  if (!rows.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:20px;font-size:13px;">Chưa có issue đã xử lý</div>';
    return;
  }
  el.innerHTML = `<table class="it-stat-table">
    <thead><tr><th>Phòng ban</th><th>Đã xử lý</th><th>MTTR (ngày)</th></tr></thead>
    <tbody>${rows.map(r => `<tr>
      <td><span class="it-dept-badge">${esc(r.dept)}</span></td>
      <td>${r.count}</td>
      <td><strong>${r.avg}</strong></td>
    </tr>`).join('')}</tbody>
  </table>`;
}

function _itRenderRootCauseTable() {
  const el = document.getElementById('itRootCauseTable');
  if (!el) return;

  const counts = {};
  dbIssues.forEach(i => {
    const cause = (i.nguyenNhan || '').trim();
    if (!cause) return;
    counts[cause] = (counts[cause]||0)+1;
  });
  const sorted = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,5);

  if (!sorted.length) {
    el.innerHTML = '<div style="text-align:center;color:var(--text-3);padding:20px;font-size:13px;">Chưa có dữ liệu nguyên nhân</div>';
    return;
  }
  el.innerHTML = `<table class="it-stat-table">
    <thead><tr><th>#</th><th>Nguyên nhân</th><th>Lần</th></tr></thead>
    <tbody>${sorted.map(([cause,cnt],idx) => {
      const disp = cause.length > 45 ? cause.slice(0,45)+'…' : cause;
      return `<tr>
        <td style="color:var(--text-3);width:28px;">${idx+1}</td>
        <td title="${esc(cause)}">${esc(disp)}</td>
        <td><strong>${cnt}</strong></td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
}

/* ══════════════════════
   FILTERED LIST
══════════════════════ */
function _itGetFiltered() {
  const today = new Date(); today.setHours(0,0,0,0);

  let list = dbIssues.filter(i => {
    if (_itPreset === 'open')   return i.trangThai !== 'Đã xử lý';
    if (_itPreset === 'breach') {
      if (i.trangThai === 'Đã xử lý' || !i.deadline) return false;
      const d = new Date(i.deadline); d.setHours(0,0,0,0);
      return d < today;
    }
    if (_itPreset === 'done') return i.trangThai === 'Đã xử lý';
    return true;
  });

  if (_itFilterSystem)   list = list.filter(i => i.heTong === _itFilterSystem);
  if (_itFilterType)     list = list.filter(i => i.loaiIssue === _itFilterType);
  if (_itFilterSeverity) list = list.filter(i => i.mucDo === _itFilterSeverity);
  if (_itFilterStatus)   list = list.filter(i => i.trangThai === _itFilterStatus);
  if (_itFilterDept)     list = list.filter(i => i.phongBan === _itFilterDept);
  if (_itFilterSearch) {
    const q = _itFilterSearch.toLowerCase();
    list = list.filter(i =>
      i.id.toLowerCase().includes(q) ||
      i.tieuDe.toLowerCase().includes(q) ||
      i.nguyenNhan.toLowerCase().includes(q)
    );
  }

  const sevOrder = { 'Critical':0,'High':1,'Medium':2,'Low':3 };
  list.sort((a,b) => {
    let av = a[_itSort.key]||'', bv = b[_itSort.key]||'';
    if (_itSort.key === 'mucDo') { av = sevOrder[av]??99; bv = sevOrder[bv]??99; }
    if (av < bv) return _itSort.dir === 'asc' ? -1 : 1;
    if (av > bv) return _itSort.dir === 'asc' ?  1 : -1;
    return 0;
  });
  return list;
}

/* ══════════════════════
   TABLE RENDER
══════════════════════ */
function _itRenderTable() {
  const filtered   = _itGetFiltered();
  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / _IT_PAGE_SIZE));
  if (_itPage > totalPages) _itPage = totalPages;
  const page = filtered.slice((_itPage-1)*_IT_PAGE_SIZE, _itPage*_IT_PAGE_SIZE);
  const today = new Date(); today.setHours(0,0,0,0);

  const tbody = document.getElementById('itTbody');
  if (!tbody) return;

  if (!page.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:36px;color:var(--text-3);">
      <i class="fa-solid fa-bug" style="font-size:28px;opacity:.25;display:block;margin-bottom:8px;"></i>Không có issue nào
    </td></tr>`;
  } else {
    tbody.innerHTML = page.map(i => {
      const isBreach = i.trangThai !== 'Đã xử lý' && i.deadline && new Date(i.deadline) < today;
      return `<tr class="${isBreach ? 'row-overdue' : ''}" onclick="openIssueViewPopup('${esc(i.id)}')" style="cursor:pointer;">
        <td style="font-family:monospace;font-size:11px;color:var(--text-3);">${esc(i.id)}</td>
        <td style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(i.tieuDe)}">${esc(i.tieuDe)}</td>
        <td><span class="it-system-badge">${esc(i.heTong||'–')}</span></td>
        <td><span class="it-severity-badge it-sev-${(i.mucDo||'').toLowerCase()}">${esc(i.mucDo||'–')}</span></td>
        <td><span class="it-status-chip it-st-${_itStatusClass(i.trangThai)}">${esc(i.trangThai||'–')}</span></td>
        <td><span class="it-dept-badge">${esc(i.phongBan||'–')}</span></td>
        <td style="font-size:12px;">${esc(i.ngayPhatSinh||'–')}</td>
        <td style="font-size:12px;${isBreach ? 'color:var(--danger);font-weight:700;' : ''}">${esc(i.deadline||'–')}</td>
        <td onclick="event.stopPropagation();">
          <div style="display:flex;gap:4px;">
            <button class="btn btn-ghost btn-sm" onclick="openIssueModal('${esc(i.id)}')" title="Chỉnh sửa"><i class="fa-solid fa-pen"></i></button>
            <button class="btn btn-ghost btn-sm" onclick="_itDeleteIssue('${esc(i.id)}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');
  }

  const countEl = document.getElementById('itCountInfo');
  if (countEl) countEl.textContent = `Hiển thị ${page.length} / ${total} issue`;

  _itRenderPagination(totalPages);
  _itUpdatePresetCounts();
}

function _itStatusClass(status) {
  if (status === 'Đã xử lý') return 'done';
  if (status === 'Tạm dừng') return 'paused';
  if (status === 'Testing' || status === 'UAT') return 'testing';
  return 'active';
}

function _itRenderPagination(totalPages) {
  const el = document.getElementById('itPagination');
  if (!el) return;
  if (totalPages <= 1) { el.innerHTML = ''; return; }
  el.innerHTML = Array.from({length: totalPages}, (_,i) => i+1)
    .map(p => `<button class="page-btn${p===_itPage?' active':''}" onclick="_itGoPage(${p})">${p}</button>`)
    .join('');
}

function _itGoPage(p) { _itPage = p; _itRenderTable(); }

function _itUpdatePresetCounts() {
  const today = new Date(); today.setHours(0,0,0,0);
  const all = dbIssues;
  const countOpen   = all.filter(i => i.trangThai !== 'Đã xử lý').length;
  const countBreach = all.filter(i => {
    if (i.trangThai === 'Đã xử lý' || !i.deadline) return false;
    const d = new Date(i.deadline); d.setHours(0,0,0,0);
    return d < today;
  }).length;
  const countDone   = all.filter(i => i.trangThai === 'Đã xử lý').length;

  const setCount = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val || ''; };
  setCount('it-pcount-open',   countOpen);
  setCount('it-pcount-breach', countBreach);
  setCount('it-pcount-done',   countDone);
  setCount('it-pcount-all',    all.length);
}

/* ══════════════════════
   PRESET TABS
══════════════════════ */
function itSetPreset(preset) {
  _itPreset = preset;
  _itPage   = 1;
  document.querySelectorAll('.it-preset-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('it-preset-'+preset)?.classList.add('active');
  _itRenderTable();
}

/* ══════════════════════
   FILTERS
══════════════════════ */
function itFilterChange() {
  _itPage = 1;
  _itFilterSystem   = document.getElementById('itFSystem')?.value   || '';
  _itFilterType     = document.getElementById('itFType')?.value     || '';
  _itFilterSeverity = document.getElementById('itFSeverity')?.value || '';
  _itFilterStatus   = document.getElementById('itFStatus')?.value   || '';
  _itFilterDept     = document.getElementById('itFDept')?.value     || '';
  _itFilterSearch   = document.getElementById('itFSearch')?.value   || '';
  _itRenderTable();
}

function itClearFilters() {
  ['itFSystem','itFType','itFSeverity','itFStatus','itFDept','itFSearch']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  _itFilterSystem = _itFilterType = _itFilterSeverity = _itFilterStatus = _itFilterDept = _itFilterSearch = '';
  _itPage = 1;
  _itRenderTable();
}

function itSortBy(key) {
  if (_itSort.key === key) _itSort.dir = _itSort.dir === 'asc' ? 'desc' : 'asc';
  else { _itSort.key = key; _itSort.dir = 'asc'; }
  _itRenderTable();
}

/* ══════════════════════
   CRUD MODAL
══════════════════════ */
function openIssueModal(id) {
  _itEditId = id || null;
  const iss = id ? dbIssues.find(i => i.id === id) : null;

  document.getElementById('itModalTitle').textContent = iss ? 'Chỉnh sửa Issue' : 'Thêm Issue mới';
  document.getElementById('itOrigId').value = iss?.id || '';

  const today = _itDateISO(new Date());
  _itSetField('itfNgayPS',    iss?.ngayPhatSinh || today);
  _itSetField('itfTieuDe',    iss?.tieuDe       || '');
  _itSetField('itfHeTong',    iss?.heTong        || '');
  _itSetField('itfLoai',      iss?.loaiIssue     || '');
  _itSetField('itfMucDo',     iss?.mucDo         || '');
  _itSetField('itfLoaiXuLy',  iss?.loaiXuLy      || 'Đơn giản');
  _itSetField('itfPhongBan',  iss?.phongBan      || '');
  _itSetField('itfNguyenNhan',iss?.nguyenNhan    || '');
  _itSetField('itfDeXuat',    iss?.deXuat         || '');
  _itSetField('itfDeadline',  iss?.deadline       || '');
  _itSetField('itfNgayGQ',    iss?.ngayGiaiQuyet  || '');
  _itSetField('itfTicket',    iss?.ticketNgoai    || '');
  _itSetField('itfAnhHuong',  iss?.anhHuong       || '');
  _itSetField('itfNguoiXuLy', iss?.nguoiXuLy      || '');
  _itSetField('itfGhiChu',    iss?.ghiChu         || '');

  // Auto-fill người log for new issues
  const auth = typeof getAuthSession === 'function' ? getAuthSession() : null;
  _itSetField('itfNguoiLog', iss?.nguoiLog || auth?.user?.username || '');

  _itUpdateStatusOptions();
  _itSetField('itfTrangThai', iss?.trangThai || 'Mới');

  // Auto-calc deadline for new issues when severity already set
  if (!iss && !document.getElementById('itfDeadline')?.value) _itAutoDeadline();

  document.getElementById('itModal').style.display = 'flex';
  setTimeout(() => document.getElementById('itfTieuDe')?.focus(), 50);
}

function closeIssueModal() {
  document.getElementById('itModal').style.display = 'none';
  _itEditId = null;
}

function _itSetField(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function _itUpdateStatusOptions() {
  const loaiXuLy = document.getElementById('itfLoaiXuLy')?.value;
  const statuses = loaiXuLy === 'Phức tạp' ? ISSUE_STATUS_COMPLEX : ISSUE_STATUS_SIMPLE;
  const sel = document.getElementById('itfTrangThai');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = statuses.map(s => `<option value="${esc(s)}"${s===current?' selected':''}>${esc(s)}</option>`).join('');
}

function _itAutoDeadline() {
  const mucDo = document.getElementById('itfMucDo')?.value;
  const days  = ISSUE_SLA_DAYS[mucDo];
  if (!days) return;
  const d = new Date();
  d.setDate(d.getDate() + days);
  const dlEl = document.getElementById('itfDeadline');
  if (dlEl && !dlEl.value) dlEl.value = _itDateISO(d);
}

function _itDateISO(d) {
  return d.getFullYear() + '-'
    + String(d.getMonth()+1).padStart(2,'0') + '-'
    + String(d.getDate()).padStart(2,'0');
}

async function itSaveIssue() {
  const tieuDe = (document.getElementById('itfTieuDe')?.value || '').trim();
  if (!tieuDe) { toast('Vui lòng nhập tiêu đề issue.', 'warning'); return; }

  const origId = document.getElementById('itOrigId')?.value || '';
  const isNew  = !origId;

  const iss = {
    id:            isNew ? genIssueId() : origId,
    ngayPhatSinh:  document.getElementById('itfNgayPS')?.value     || '',
    tieuDe,
    heTong:        document.getElementById('itfHeTong')?.value      || '',
    loaiIssue:     document.getElementById('itfLoai')?.value        || '',
    mucDo:         document.getElementById('itfMucDo')?.value       || '',
    loaiXuLy:      document.getElementById('itfLoaiXuLy')?.value    || 'Đơn giản',
    trangThai:     document.getElementById('itfTrangThai')?.value   || 'Mới',
    phongBan:      document.getElementById('itfPhongBan')?.value    || '',
    nguyenNhan:    (document.getElementById('itfNguyenNhan')?.value || '').trim(),
    deXuat:        (document.getElementById('itfDeXuat')?.value     || '').trim(),
    deadline:      document.getElementById('itfDeadline')?.value    || '',
    ngayGiaiQuyet: document.getElementById('itfNgayGQ')?.value      || '',
    ticketNgoai:   (document.getElementById('itfTicket')?.value     || '').trim(),
    anhHuong:      (document.getElementById('itfAnhHuong')?.value   || '').trim(),
    nguoiLog:      (document.getElementById('itfNguoiLog')?.value   || '').trim(),
    nguoiXuLy:     (document.getElementById('itfNguoiXuLy')?.value  || '').trim(),
    ghiChu:        (document.getElementById('itfGhiChu')?.value     || '').trim(),
  };

  if (isNew) {
    dbIssues.push(iss);
  } else {
    const idx = dbIssues.findIndex(i => i.id === origId);
    if (idx >= 0) dbIssues[idx] = iss; else dbIssues.push(iss);
  }

  persistIssues();
  closeIssueModal();
  renderIssueTracker();
  toast('✅ ' + (isNew ? 'Đã tạo issue ' : 'Đã cập nhật issue ') + iss.id, 'success');
  _gasIssueUpsert(iss);
}

async function _itDeleteIssue(id) {
  const iss = dbIssues.find(i => i.id === id);
  if (!iss) return;
  const ok = await uiConfirm(
    'Xóa Issue',
    `Xóa issue <strong>${esc(iss.tieuDe)}</strong>?<br>Thao tác không thể hoàn tác.`,
    'Xóa', 'Hủy'
  );
  if (!ok) return;
  dbIssues = dbIssues.filter(i => i.id !== id);
  persistIssues();
  renderIssueTracker();
  toast('Đã xóa issue ' + id, 'info');
  _gasIssueDelete(id, iss.tieuDe);
}

/* ══════════════════════
   VIEW POPUP
══════════════════════ */
function openIssueViewPopup(id) {
  const iss = dbIssues.find(i => i.id === id);
  if (!iss) return;
  _itViewId = id;

  const today    = new Date(); today.setHours(0,0,0,0);
  const isBreach = iss.trangThai !== 'Đã xử lý' && iss.deadline
    && new Date(iss.deadline) < today;

  const el = document.getElementById('itViewOverlay');
  el.innerHTML = `
    <div class="cp-view-modal" style="max-width:680px;">
      <div class="cp-view-header">
        <div>
          <div style="font-size:11px;font-family:monospace;color:var(--text-3);margin-bottom:4px;">${esc(iss.id)}</div>
          <div style="font-size:17px;font-weight:700;line-height:1.35;">${esc(iss.tieuDe)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;">
            <span class="it-severity-badge it-sev-${(iss.mucDo||'').toLowerCase()}">${esc(iss.mucDo||'–')}</span>
            <span class="it-status-chip it-st-${_itStatusClass(iss.trangThai)}">${esc(iss.trangThai||'–')}</span>
            <span class="it-system-badge">${esc(iss.heTong||'–')}</span>
            ${isBreach ? '<span style="color:var(--danger);font-size:12px;font-weight:700;"><i class="fa-solid fa-triangle-exclamation"></i> SLA Breach</span>' : ''}
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;flex-shrink:0;">
          <button class="btn btn-outline btn-sm" onclick="closeIssueViewPopup();openIssueModal('${esc(iss.id)}')">
            <i class="fa-solid fa-pen"></i> Chỉnh sửa
          </button>
          <button class="btn btn-ghost btn-sm" onclick="closeIssueViewPopup()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="cp-view-grid">
        ${_itVR('Loại issue',     iss.loaiIssue)}
        ${_itVR('Loại xử lý',    iss.loaiXuLy)}
        ${_itVR('Phòng ban',      iss.phongBan)}
        ${_itVR('Ngày phát sinh', iss.ngayPhatSinh)}
        ${_itVR('Deadline',       iss.deadline,  isBreach ? 'color:var(--danger);font-weight:700;' : '')}
        ${_itVR('Ngày giải quyết',iss.ngayGiaiQuyet || '–')}
        ${_itVR('Người log',      iss.nguoiLog)}
        ${_itVR('Người xử lý',   iss.nguoiXuLy)}
        ${_itVR('Ticket ngoài',   iss.ticketNgoai)}
        ${_itVR('Ảnh hưởng NV',  iss.anhHuong)}
      </div>
      ${iss.nguyenNhan ? `<div class="cp-view-section"><div class="cp-view-label">Nguyên nhân</div><div class="cp-view-val" style="white-space:pre-wrap;">${esc(iss.nguyenNhan)}</div></div>` : ''}
      ${iss.deXuat     ? `<div class="cp-view-section"><div class="cp-view-label">Đề xuất</div><div class="cp-view-val" style="white-space:pre-wrap;">${esc(iss.deXuat)}</div></div>` : ''}
      ${iss.ghiChu     ? `<div class="cp-view-section"><div class="cp-view-label">Ghi chú</div><div class="cp-view-val" style="white-space:pre-wrap;">${esc(iss.ghiChu)}</div></div>` : ''}
    </div>`;

  el.style.display = 'flex';
}

function _itVR(label, val, style) {
  if (!val) return '';
  return `<div class="cp-view-row">
    <div class="cp-view-label">${esc(label)}</div>
    <div class="cp-view-val"${style ? ` style="${style}"` : ''}>${esc(val)}</div>
  </div>`;
}

function closeIssueViewPopup() {
  document.getElementById('itViewOverlay').style.display = 'none';
  _itViewId = null;
}

/* ══════════════════════
   EXPORT EXCEL
══════════════════════ */
function itExportExcel() {
  const filtered = _itGetFiltered();
  if (!filtered.length) { toast('Không có dữ liệu để xuất.', 'warning'); return; }

  const header = [
    'ID','Ngày phát sinh','Tiêu đề','Hệ thống','Loại issue',
    'Mức độ','Loại xử lý','Trạng thái','Phòng ban',
    'Nguyên nhân','Đề xuất','Deadline xử lý','Ngày giải quyết',
    'Ticket ngoài','Ảnh hưởng NV','Người log','Người xử lý','Ghi chú'
  ];
  const rows = filtered.map(issueToRow);
  const colWidths = [14,18,50,16,16,12,14,18,12,60,60,18,18,20,40,18,18,40];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  XLSX.utils.book_append_sheet(wb, ws, 'Issue_Tracker');
  XLSX.writeFile(wb, `Issue_Tracker_${_itDateISO(new Date())}.xlsx`);
  toast('✅ Đã xuất Excel ' + filtered.length + ' issue.', 'success');
}

/* ══════════════════════
   TREND MODE TOGGLE
══════════════════════ */
function itSetTrendMode(mode) {
  _itTrendMode = mode;
  document.querySelectorAll('.it-trend-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.it-trend-btn[data-mode="${mode}"]`)?.classList.add('active');
  _itRenderTrendChart();
}
