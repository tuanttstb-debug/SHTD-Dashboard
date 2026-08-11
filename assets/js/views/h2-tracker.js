'use strict';
/* ══════════════════════════════════════════════════════════════
   H2 TRACKER VIEW  (Quản trị H2 — Objective → KPI → Milestone)
   Hierarchy: Member → Objective → KPI → Milestone (RAG).
   Edit gate: Admin/Teamlead (canImport). Member xem read-only.
   Reuse: h2-core.js (dbH2, _gasH2Upsert/Delete, compute helpers),
          _populateUserSelect, esc/fmtDate/toast/uiConfirm.
   ══════════════════════════════════════════════════════════════ */

const H2_PILLARS    = ['P1-BIZ', 'P2-CAP', 'P3-AI'];
const H2_PRIORITIES = ['P1', 'P2', 'P3'];
const H2_CATEGORIES = ['A', 'B', 'C', 'D'];
const H2_STATUSES   = ['Chưa bắt đầu', 'Đang thực hiện', 'Hoàn thành', 'Tạm dừng', 'Blocked'];
const H2_MONTHS     = ['T8', 'T9', 'T10', 'T11', 'T12'];

const H2_PILLAR_LABEL = { 'P1-BIZ': 'Tài chính / Business', 'P2-CAP': 'Phát triển bản thân', 'P3-AI': 'AI Transformation' };
const H2_CAT_LABEL    = { A: 'A · Business', B: 'B · Delivery', C: 'C · AI/Improve', D: 'D · Capability' };

let _h2FilterMember = '';
let _h2FilterPillar = '';
let _h2FilterPrio   = '';
let _h2Search       = '';
let _h2ViewObjId    = null;

/* ══════════════════════ helpers ══════════════════════ */
function _h2Lead() { return typeof canImport === 'function' && canImport(); }
function _h2Me()   { const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null; return u ? u.username : ''; }
function _h2FindObj(id) { return (dbH2.objectives || []).find(o => String(o.ID) === String(id)); }
function _h2FindKpi(id) { return (dbH2.kpis || []).find(k => String(k.ID) === String(id)); }
function _h2FindMs(id)  { return (dbH2.milestones || []).find(m => String(m.ID) === String(id)); }
function _h2KpisOf(objId) { return (dbH2.kpis || []).filter(k => String(k.ObjectiveID) === String(objId)); }
function _h2MsOf(kpiId)   { return (dbH2.milestones || []).filter(m => String(m.KpiID) === String(kpiId)); }
function _h2RisksOf(kpiId){ return (dbH2.risks || []).filter(r => String(r.KpiID) === String(kpiId)); }
function _h2DepsOf(kpiId) { return (dbH2.deps || []).filter(d => String(d.KpiID) === String(kpiId)); }

function _h2GenId(prefix, list) {
  const yy = String(new Date().getFullYear()).slice(-2);
  const p = prefix + '-' + yy + '-';
  const nums = (list || []).map(x => parseInt(String(x.ID).split('-')[2] || '0', 10)).filter(n => !isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return p + String(max + 1).padStart(3, '0');
}

function _h2Opts(arr, sel, labelMap) {
  return arr.map(v => `<option value="${esc(v)}"${String(sel) === String(v) ? ' selected' : ''}>${esc(labelMap ? (labelMap[v] || v) : v)}</option>`).join('');
}

function _h2RagBadge(rag) {
  const m = { GREEN: ['🟢', 'Đúng KH', 'green'], AMBER: ['🟠', 'Nguy cơ', 'amber'], RED: ['🔴', 'Trễ', 'red'] };
  const x = m[rag] || m.GREEN;
  return `<span class="h2-rag h2-rag-${x[2]}" title="${x[1]}">${x[0]}</span>`;
}
function _h2PrioBadge(p) {
  const cls = p === 'P1' ? 'p1' : (p === 'P2' ? 'p2' : 'p3');
  return `<span class="h2-prio h2-prio-${cls}">${esc(p || 'P3')}</span>`;
}
function _h2PillarBadge(p) { return `<span class="h2-pillar h2-pillar-${(p || '').replace(/[^a-zA-Z0-9]/g, '')}">${esc(p || '—')}</span>`; }

/* ══════════════════════ data ══════════════════════ */
function _h2Objectives() {
  let list = (dbH2.objectives || []).filter(o => o.Type !== 'team');
  if (_h2FilterMember) list = list.filter(o => String(o.Owner).toLowerCase() === _h2FilterMember.toLowerCase());
  if (_h2FilterPillar) list = list.filter(o => o.Pillar === _h2FilterPillar);
  if (_h2FilterPrio)   list = list.filter(o => o.Priority === _h2FilterPrio);
  if (_h2Search) {
    const q = _h2Search.toLowerCase();
    list = list.filter(o => (o.ObjectiveName || '').toLowerCase().includes(q) || (o.ID || '').toLowerCase().includes(q));
  }
  return list;
}
function _h2DistinctMembers() {
  const s = new Map();
  (dbH2.objectives || []).filter(o => o.Type !== 'team').forEach(o => { if (o.Owner) s.set(String(o.Owner).toLowerCase(), o.Owner); });
  return [...s.values()].sort((a, b) => a.localeCompare(b));
}

/* ══════════════════════ render ══════════════════════ */
function renderH2Tracker() {
  const root = document.getElementById('view-h2-tracker');
  if (!root) return;
  const lead = _h2Lead();

  const memberOpts = [`<option value="">Tất cả thành viên</option>`]
    .concat(_h2DistinctMembers().map(m => `<option value="${esc(m)}"${_h2FilterMember.toLowerCase() === m.toLowerCase() ? ' selected' : ''}>${esc(m)}</option>`)).join('');
  const pillarOpts = [`<option value="">Tất cả trụ cột</option>`].concat(H2_PILLARS.map(p => `<option value="${esc(p)}"${_h2FilterPillar === p ? ' selected' : ''}>${esc(p)}</option>`)).join('');
  const prioOpts   = [`<option value="">Tất cả ưu tiên</option>`].concat(H2_PRIORITIES.map(p => `<option value="${esc(p)}"${_h2FilterPrio === p ? ' selected' : ''}>${esc(p)}</option>`)).join('');

  root.innerHTML = `
<div class="h2-page">
  <div class="h2-page-header">
    <div>
      <div class="h2-title"><i class="fa-solid fa-bullseye"></i> Quản trị H2 · Theo dõi KPI</div>
      <div class="h2-sub">Objective → KPI → Milestone · 3 trụ cột · H2/2026</div>
    </div>
    ${lead ? `<button class="btn btn-primary btn-sm" onclick="openH2ObjModal(null)"><i class="fa-solid fa-plus"></i> Thêm Objective</button>` : ''}
  </div>

  <div id="h2StatBar" class="h2-stat-bar"></div>

  <div class="h2-toolbar">
    <div class="h2-filter-group"><label class="h2-filter-label">Thành viên</label>
      <select class="form-control form-control-sm" onchange="_h2SetFilter('member', this.value)">${memberOpts}</select></div>
    <div class="h2-filter-group"><label class="h2-filter-label">Trụ cột</label>
      <select class="form-control form-control-sm" onchange="_h2SetFilter('pillar', this.value)">${pillarOpts}</select></div>
    <div class="h2-filter-group"><label class="h2-filter-label">Ưu tiên</label>
      <select class="form-control form-control-sm" onchange="_h2SetFilter('prio', this.value)">${prioOpts}</select></div>
    <div class="h2-filter-group h2-filter-search"><label class="h2-filter-label">Tìm kiếm</label>
      <input type="text" class="form-control form-control-sm" placeholder="Tên / mã objective…" value="${esc(_h2Search)}" oninput="_h2SetFilter('search', this.value)"></div>
  </div>

  <div id="h2ObjList"></div>
</div>`;

  _h2RenderStat();
  _h2RenderList();
}

function _h2RenderStat() {
  const el = document.getElementById('h2StatBar');
  if (!el) return;
  const objs = _h2Objectives();
  const kpis = objs.flatMap(o => _h2KpisOf(o.ID));
  const p1 = objs.filter(o => o.Priority === 'P1').length;
  let g = 0, a = 0, r = 0;
  kpis.forEach(k => { const rag = h2ComputeRag(k); if (rag === 'GREEN') g++; else if (rag === 'AMBER') a++; else r++; });
  const card = (val, label, cls) => `<div class="h2-stat ${cls || ''}"><div class="h2-stat-num">${val}</div><div class="h2-stat-lbl">${label}</div></div>`;
  el.innerHTML =
    card(objs.length, 'Objectives', '') +
    card(kpis.length, 'KPIs', '') +
    card(p1, 'P1 Must-win', p1 > 0 ? 'is-p1' : '') +
    card(g, '🟢 Green', 'is-green') +
    card(a, '🟠 Amber', a > 0 ? 'is-amber' : '') +
    card(r, '🔴 Red', r > 0 ? 'is-red' : '');
}

function _h2RenderList() {
  const wrap = document.getElementById('h2ObjList');
  if (!wrap) return;
  const objs = _h2Objectives();
  if (!objs.length) {
    wrap.innerHTML = `<div class="h2-empty"><i class="fa-solid fa-bullseye"></i> Chưa có Objective. ${_h2Lead() ? 'Bấm “Thêm Objective” để bắt đầu.' : ''}</div>`;
    return;
  }
  // group by member
  const groups = new Map();
  objs.forEach(o => { const k = o.Owner || '—'; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(o); });

  let html = '';
  for (const [member, items] of groups) {
    const sc = h2Score(member);
    const wv = h2WeightValidate().find(x => x.member.toLowerCase() === String(member).toLowerCase());
    const wBadge = wv ? `<span class="h2-wbadge ${wv.ok ? 'ok' : 'warn'}" title="Tổng trọng số">Σ ${wv.total}%${wv.ok ? '' : ' ⚠'}</span>` : '';
    html += `<div class="h2-member-group">
      <div class="h2-member-head">
        <span class="h2-member-name"><i class="fa-solid fa-user"></i> ${esc(member)}</span>
        <span class="h2-member-meta">${items.length} objective · Điểm ${sc.score}% ${wBadge}</span>
      </div>
      ${items.map(_h2ObjCard).join('')}
    </div>`;
  }
  wrap.innerHTML = html;
}

function _h2ObjCard(o) {
  const lead = _h2Lead();
  const kpis = _h2KpisOf(o.ID);
  const oid = esc(o.ID);
  const actions = lead ? `
    <div class="h2-card-actions">
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openH2KpiModal(null,'${oid}')" title="Thêm KPI"><i class="fa-solid fa-plus"></i> KPI</button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openH2ObjModal('${oid}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();h2DeleteObj('${oid}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
    </div>` : '';

  return `<div class="h2-obj-card">
    <div class="h2-obj-head" onclick="openH2ObjView('${oid}')" style="cursor:pointer;">
      <div class="h2-obj-badges">${_h2PillarBadge(o.Pillar)} ${_h2PrioBadge(o.Priority)} <span class="h2-weight">${_h2Num(o.Weight) || 0}%</span></div>
      <div class="h2-obj-name">${esc(o.ObjectiveName || '(chưa đặt tên)')}</div>
      <div class="h2-obj-meta">${esc(o.ID)} · ${esc(o.Status || '—')}</div>
      ${actions}
    </div>
    <div class="h2-kpi-list">
      ${kpis.length ? kpis.map(_h2KpiRow).join('') : `<div class="h2-kpi-empty">Chưa có KPI${lead ? ' — bấm “+ KPI”' : ''}</div>`}
    </div>
  </div>`;
}

function _h2KpiRow(k) {
  const lead = _h2Lead();
  const kid = esc(k.ID);
  const ms = _h2MsOf(k.ID);
  const ach = Math.round(h2Achievement(k));
  const rag = h2ComputeRag(k);
  const flags = h2FlagBadKpi(k);
  const tgt = [k.Baseline, k.Target].filter(x => String(x).trim() !== '').join(' → ');
  const actions = lead ? `
    <span class="h2-kpi-actions">
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openH2MsModal(null,'${kid}')" title="Thêm mốc"><i class="fa-solid fa-flag"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openH2KpiModal('${kid}',null)" title="Sửa"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();h2DeleteKpi('${kid}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
    </span>` : '';

  return `<div class="h2-kpi-row">
    <div class="h2-kpi-main">
      ${_h2RagBadge(rag)}
      <span class="h2-kpi-cat" title="${esc(H2_CAT_LABEL[k.KpiType] || '')}">${esc(k.KpiType || '?')}</span>
      <span class="h2-kpi-name">${esc(k.KpiName || '(KPI)')}</span>
      ${flags.length ? `<span class="h2-flag" title="${esc(flags.join('; '))}"><i class="fa-solid fa-triangle-exclamation"></i></span>` : ''}
    </div>
    <div class="h2-kpi-side">
      <span class="h2-kpi-target" title="baseline → target">${esc(tgt || '—')} ${esc(k.Unit || '')}</span>
      <span class="h2-kpi-w">${_h2Num(k.Weight) || 0}%</span>
      <span class="h2-kpi-ach">${ach}%</span>
      ${actions}
    </div>
    ${ms.length ? `<div class="h2-ms-list">${ms.map(_h2MsRow).join('')}</div>` : ''}
  </div>`;
}

function _h2MsRow(m) {
  const lead = _h2Lead();
  const mid = esc(m.ID);
  const actions = lead ? `
    <span class="h2-ms-actions">
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();openH2MsModal('${mid}',null)" title="Sửa"><i class="fa-solid fa-pen"></i></button>
      <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();h2DeleteMs('${mid}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
    </span>` : '';
  return `<div class="h2-ms-row">
    <span class="h2-ms-month">${esc(m.Month || '—')}</span>
    ${m.RAG ? _h2RagBadge(String(m.RAG).toUpperCase()) : ''}
    <span class="h2-ms-name">${esc(m.MilestoneName || '(mốc)')}</span>
    <span class="h2-ms-due">${m.DueDate ? fmtDate(m.DueDate) : ''}</span>
    <span class="h2-ms-status">${esc(m.Status || '')}</span>
    ${m.TaskRef ? `<span class="h2-ms-task" title="Task liên kết">🔗 ${esc(m.TaskRef)}</span>` : ''}
    ${actions}
  </div>`;
}

/* ══════════════════════ filters ══════════════════════ */
function _h2SetFilter(type, val) {
  if (type === 'member') _h2FilterMember = val || '';
  else if (type === 'pillar') _h2FilterPillar = val || '';
  else if (type === 'prio') _h2FilterPrio = val || '';
  else if (type === 'search') _h2Search = val || '';
  _h2RenderStat();
  _h2RenderList();
}

/* ══════════════════════ CRUD: Objective ══════════════════════ */
function openH2ObjModal(id) {
  if (!_h2Lead()) { toast('Chỉ Teamlead/Admin được sửa Objective.', 'warning'); return; }
  const o = id ? _h2FindObj(id) : null;
  document.getElementById('h2ObjModalTitle').textContent = o ? 'Sửa Objective' : 'Thêm Objective';
  document.getElementById('h2ObjOrigId').value = o?.ID || '';
  const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v != null ? v : ''; };
  set('h2ofName', o?.ObjectiveName);
  set('h2ofWhy', o?.Why);
  set('h2ofWeight', o?.Weight != null ? String(_h2Num(o.Weight) || '') : '');
  document.getElementById('h2ofPillar').innerHTML = _h2Opts(H2_PILLARS, o?.Pillar || 'P1-BIZ');
  document.getElementById('h2ofPriority').innerHTML = _h2Opts(H2_PRIORITIES, o?.Priority || 'P2');
  document.getElementById('h2ofCategory').innerHTML = _h2Opts(H2_CATEGORIES, o?.Category || 'A', H2_CAT_LABEL);
  document.getElementById('h2ofStatus').innerHTML = _h2Opts(H2_STATUSES, o?.Status || 'Chưa bắt đầu');
  set('h2ofStart', o?.StartDate);
  set('h2ofDue', o?.DueDate);
  if (typeof _populateUserSelect === 'function') _populateUserSelect('h2ofOwner', null, o?.Owner || _h2Me());
  document.getElementById('h2ObjModal').style.display = 'flex';
  setTimeout(() => document.getElementById('h2ofName')?.focus(), 50);
}
function closeH2ObjModal() { const m = document.getElementById('h2ObjModal'); if (m) m.style.display = 'none'; }

async function h2SaveObj() {
  const name = (document.getElementById('h2ofName')?.value || '').trim();
  if (!name) { toast('Nhập tên Objective.', 'warning'); return; }
  const origId = document.getElementById('h2ObjOrigId')?.value || '';
  const isNew = !origId;
  const o = {
    ID: isNew ? _h2GenId('OBJ', dbH2.objectives) : origId,
    Type: 'member', ParentID: (isNew ? '' : (_h2FindObj(origId)?.ParentID || '')),
    Pillar: document.getElementById('h2ofPillar').value,
    ObjectiveName: name,
    Why: (document.getElementById('h2ofWhy')?.value || '').trim(),
    Owner: document.getElementById('h2ofOwner')?.value || _h2Me(),
    Priority: document.getElementById('h2ofPriority').value,
    Weight: document.getElementById('h2ofWeight')?.value || '',
    Category: document.getElementById('h2ofCategory').value,
    Status: document.getElementById('h2ofStatus').value,
    StartDate: (typeof toISODate === 'function' ? toISODate(document.getElementById('h2ofStart')?.value) : document.getElementById('h2ofStart')?.value) || '',
    DueDate: (typeof toISODate === 'function' ? toISODate(document.getElementById('h2ofDue')?.value) : document.getElementById('h2ofDue')?.value) || '',
    CreatedBy: isNew ? _h2Me() : (_h2FindObj(origId)?.CreatedBy || _h2Me())
  };
  const idx = (dbH2.objectives || []).findIndex(x => String(x.ID) === String(o.ID));
  if (idx >= 0) dbH2.objectives[idx] = o; else dbH2.objectives.push(o);
  persistH2(); closeH2ObjModal(); renderH2Tracker();
  await _gasH2Upsert('objective', o, isNew);
  renderH2Tracker();   // re-render nếu id được cấp lại
}

async function h2DeleteObj(id) {
  if (!_h2Lead()) return;
  const o = _h2FindObj(id); if (!o) return;
  const kpis = _h2KpisOf(id);
  const ok = await uiConfirm('Xóa Objective', `Xóa <strong>${esc(o.ObjectiveName)}</strong>?${kpis.length ? ` (${kpis.length} KPI con vẫn giữ nhưng mất liên kết)` : ''}`, 'danger', 'Xóa');
  if (!ok) return;
  dbH2.objectives = dbH2.objectives.filter(x => String(x.ID) !== String(id));
  persistH2(); renderH2Tracker();
  _gasH2Delete('objective', id, o.ObjectiveName);
}

/* ══════════════════════ CRUD: KPI ══════════════════════ */
function openH2KpiModal(id, objId) {
  if (!_h2Lead()) { toast('Chỉ Teamlead/Admin được sửa KPI.', 'warning'); return; }
  const k = id ? _h2FindKpi(id) : null;
  document.getElementById('h2KpiModalTitle').textContent = k ? 'Sửa KPI' : 'Thêm KPI';
  document.getElementById('h2KpiOrigId').value = k?.ID || '';
  const objSel = document.getElementById('h2kfObjective');
  objSel.innerHTML = (dbH2.objectives || []).filter(o => o.Type !== 'team')
    .map(o => `<option value="${esc(o.ID)}"${String(k?.ObjectiveID || objId) === String(o.ID) ? ' selected' : ''}>${esc(o.ObjectiveName)} (${esc(o.ID)})</option>`).join('');
  const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v != null ? v : ''; };
  set('h2kfName', k?.KpiName);
  set('h2kfBaseline', k?.Baseline);
  set('h2kfTarget', k?.Target);
  set('h2kfUnit', k?.Unit);
  set('h2kfWeight', k?.Weight != null ? String(_h2Num(k.Weight) || '') : '');
  set('h2kfDeadline', k?.Deadline);
  set('h2kfEvidence', k?.Evidence);
  document.getElementById('h2kfType').innerHTML = _h2Opts(H2_CATEGORIES, k?.KpiType || 'A', H2_CAT_LABEL);
  document.getElementById('h2kfStatus').innerHTML = _h2Opts(H2_STATUSES, k?.Status || 'Chưa bắt đầu');
  if (typeof _populateUserSelect === 'function') _populateUserSelect('h2kfOwner', null, k?.Owner || _h2Me());
  document.getElementById('h2KpiModal').style.display = 'flex';
  setTimeout(() => document.getElementById('h2kfName')?.focus(), 50);
}
function closeH2KpiModal() { const m = document.getElementById('h2KpiModal'); if (m) m.style.display = 'none'; }

async function h2SaveKpi() {
  const name = (document.getElementById('h2kfName')?.value || '').trim();
  if (!name) { toast('Nhập tên KPI.', 'warning'); return; }
  const origId = document.getElementById('h2KpiOrigId')?.value || '';
  const isNew = !origId;
  const k = {
    ID: isNew ? _h2GenId('KPI', dbH2.kpis) : origId,
    ObjectiveID: document.getElementById('h2kfObjective').value,
    KpiName: name,
    KpiType: document.getElementById('h2kfType').value,
    Baseline: (document.getElementById('h2kfBaseline')?.value || '').trim(),
    Target: (document.getElementById('h2kfTarget')?.value || '').trim(),
    Unit: (document.getElementById('h2kfUnit')?.value || '').trim(),
    Weight: document.getElementById('h2kfWeight')?.value || '',
    Deadline: (typeof toISODate === 'function' ? toISODate(document.getElementById('h2kfDeadline')?.value) : document.getElementById('h2kfDeadline')?.value) || '',
    Status: document.getElementById('h2kfStatus').value,
    Evidence: (document.getElementById('h2kfEvidence')?.value || '').trim(),
    Owner: document.getElementById('h2kfOwner')?.value || _h2Me()
  };
  const idx = (dbH2.kpis || []).findIndex(x => String(x.ID) === String(k.ID));
  if (idx >= 0) dbH2.kpis[idx] = k; else dbH2.kpis.push(k);
  persistH2(); closeH2KpiModal(); renderH2Tracker();
  await _gasH2Upsert('kpi', k, isNew);
  renderH2Tracker();
}

async function h2DeleteKpi(id) {
  if (!_h2Lead()) return;
  const k = _h2FindKpi(id); if (!k) return;
  const ok = await uiConfirm('Xóa KPI', `Xóa <strong>${esc(k.KpiName)}</strong>?`, 'danger', 'Xóa');
  if (!ok) return;
  dbH2.kpis = dbH2.kpis.filter(x => String(x.ID) !== String(id));
  persistH2(); renderH2Tracker();
  _gasH2Delete('kpi', id, k.KpiName);
}

/* ══════════════════════ CRUD: Milestone ══════════════════════ */
function openH2MsModal(id, kpiId) {
  if (!_h2Lead()) { toast('Chỉ Teamlead/Admin được sửa mốc.', 'warning'); return; }
  const m = id ? _h2FindMs(id) : null;
  document.getElementById('h2MsModalTitle').textContent = m ? 'Sửa Milestone' : 'Thêm Milestone';
  document.getElementById('h2MsOrigId').value = m?.ID || '';
  const kSel = document.getElementById('h2mfKpi');
  kSel.innerHTML = (dbH2.kpis || []).map(k => `<option value="${esc(k.ID)}"${String(m?.KpiID || kpiId) === String(k.ID) ? ' selected' : ''}>${esc(k.KpiName)} (${esc(k.ID)})</option>`).join('');
  const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v != null ? v : ''; };
  set('h2mfName', m?.MilestoneName);
  set('h2mfDue', m?.DueDate);
  set('h2mfTaskRef', m?.TaskRef);
  document.getElementById('h2mfMonth').innerHTML = _h2Opts(H2_MONTHS, m?.Month || 'T8');
  document.getElementById('h2mfStatus').innerHTML = _h2Opts(H2_STATUSES, m?.Status || 'Chưa bắt đầu');
  document.getElementById('h2mfRag').innerHTML = _h2Opts(['', 'GREEN', 'AMBER', 'RED'], m?.RAG || '');
  if (typeof _populateUserSelect === 'function') _populateUserSelect('h2mfOwner', null, m?.Owner || _h2Me());
  document.getElementById('h2MsModal').style.display = 'flex';
  setTimeout(() => document.getElementById('h2mfName')?.focus(), 50);
}
function closeH2MsModal() { const m = document.getElementById('h2MsModal'); if (m) m.style.display = 'none'; }

async function h2SaveMs() {
  const name = (document.getElementById('h2mfName')?.value || '').trim();
  if (!name) { toast('Nhập tên mốc.', 'warning'); return; }
  const origId = document.getElementById('h2MsOrigId')?.value || '';
  const isNew = !origId;
  const month = document.getElementById('h2mfMonth').value;
  const m = {
    ID: isNew ? _h2GenId('MS', dbH2.milestones) : origId,
    KpiID: document.getElementById('h2mfKpi').value,
    Month: month,
    Quarter: (['T8', 'T9'].includes(month) ? 'Q3' : 'Q4'),
    MilestoneName: name,
    DueDate: (typeof toISODate === 'function' ? toISODate(document.getElementById('h2mfDue')?.value) : document.getElementById('h2mfDue')?.value) || '',
    Owner: document.getElementById('h2mfOwner')?.value || _h2Me(),
    Status: document.getElementById('h2mfStatus').value,
    RAG: document.getElementById('h2mfRag').value,
    TaskRef: (document.getElementById('h2mfTaskRef')?.value || '').trim()
  };
  const idx = (dbH2.milestones || []).findIndex(x => String(x.ID) === String(m.ID));
  if (idx >= 0) dbH2.milestones[idx] = m; else dbH2.milestones.push(m);
  persistH2(); closeH2MsModal(); renderH2Tracker();
  await _gasH2Upsert('milestone', m, isNew);
  renderH2Tracker();
}

async function h2DeleteMs(id) {
  if (!_h2Lead()) return;
  const m = _h2FindMs(id); if (!m) return;
  const ok = await uiConfirm('Xóa Milestone', `Xóa <strong>${esc(m.MilestoneName)}</strong>?`, 'danger', 'Xóa');
  if (!ok) return;
  dbH2.milestones = dbH2.milestones.filter(x => String(x.ID) !== String(id));
  persistH2(); renderH2Tracker();
  _gasH2Delete('milestone', id, m.MilestoneName);
}

/* ══════════════════════ view popup (read-only) ══════════════════════ */
function openH2ObjView(id) {
  const o = _h2FindObj(id); if (!o) return;
  _h2ViewObjId = id;
  const lead = _h2Lead();
  const kpis = _h2KpisOf(id);
  const el = document.getElementById('h2ViewOverlay');

  const kpiHtml = kpis.map(k => {
    const ms = _h2MsOf(k.ID), risks = _h2RisksOf(k.ID), deps = _h2DepsOf(k.ID);
    return `<div class="h2-view-kpi">
      <div class="h2-view-kpi-head">${_h2RagBadge(h2ComputeRag(k))} <b>${esc(k.KpiName)}</b>
        <span class="h2-kpi-cat">${esc(k.KpiType || '')}</span>
        <span class="h2-kpi-target">${esc([k.Baseline, k.Target].filter(x=>String(x).trim()).join(' → '))} ${esc(k.Unit || '')}</span>
        <span class="h2-kpi-w">${_h2Num(k.Weight) || 0}%</span> · <span>${Math.round(h2Achievement(k))}%</span></div>
      ${ms.length ? `<div class="h2-view-sub">Milestones: ${ms.map(x => `${esc(x.Month)} ${esc(x.MilestoneName)}${x.DueDate ? ' (' + fmtDate(x.DueDate) + ')' : ''}`).join(' · ')}</div>` : ''}
      ${risks.length ? `<div class="h2-view-sub h2-view-risk">Risk: ${risks.map(x => esc(x.Risk)).join(' · ')}</div>` : ''}
      ${deps.length ? `<div class="h2-view-sub h2-view-dep">Dependency: ${deps.map(x => esc((x.DependencyType || '') + (x.DependencyOwner ? ' — ' + x.DependencyOwner : ''))).join(' · ')}</div>` : ''}
    </div>`;
  }).join('') || '<div class="h2-kpi-empty">Chưa có KPI.</div>';

  el.innerHTML = `
    <div class="cp-view-modal" style="max-width:720px;">
      <div class="cp-view-header">
        <div>
          <div style="font-size:11px;font-family:monospace;color:var(--text-3);margin-bottom:4px;">${esc(o.ID)}</div>
          <div style="font-size:17px;font-weight:700;line-height:1.35;">${esc(o.ObjectiveName)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;align-items:center;">
            ${_h2PillarBadge(o.Pillar)} ${_h2PrioBadge(o.Priority)}
            <span class="h2-weight">${_h2Num(o.Weight) || 0}%</span>
            <span class="h2-obj-meta">${esc(o.Owner || '')} · ${esc(o.Status || '')}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:flex-start;flex-shrink:0;">
          ${lead ? `<button class="btn btn-outline btn-sm" onclick="closeH2ObjView();openH2ObjModal('${esc(o.ID)}')"><i class="fa-solid fa-pen"></i> Sửa</button>` : ''}
          <button class="btn btn-ghost btn-sm" onclick="closeH2ObjView()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="cp-view-body">
        ${o.Why ? `<div class="cp-view-section"><div class="cp-view-label">WHY</div><div class="cp-view-val" style="white-space:pre-wrap;">${esc(o.Why)}</div></div>` : ''}
        <div class="cp-view-section"><div class="cp-view-label">KPIs (${kpis.length})</div>${kpiHtml}</div>
      </div>
    </div>`;
  el.style.display = 'flex';
}
function closeH2ObjView() { const el = document.getElementById('h2ViewOverlay'); if (el) el.style.display = 'none'; _h2ViewObjId = null; }

// Đóng mọi modal/overlay H2 (dùng trong ESC chain của navigation.js)
function _h2EscClose() {
  try { closeH2ObjModal(); closeH2KpiModal(); closeH2MsModal(); closeH2ObjView(); } catch (e) {}
}
