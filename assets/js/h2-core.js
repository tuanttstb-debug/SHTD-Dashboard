'use strict';
/* ══════════════════════════════════════════════════════════════
   H2 TEAM MANAGEMENT — CLIENT CORE  (domain "Quản trị H2")
   Cô lập hoàn toàn khỏi entity cũ. Chứa:
   - dbH2 (in-memory store) + header/entity metadata
   - readH2() (đọc gộp h2-read-all) + parser generic
   - _gasH2Upsert/_gasH2Delete (atomic, optimistic — clone _gasDev*)
   - compute helpers: RAG / achievement / score / capacity / validate
   Action = Task_Master (soft-link qua Milestone.TaskRef) — không đổi schema Task.
   ══════════════════════════════════════════════════════════════ */

// Header mirror server (H2Service.gs) — cột theo đúng thứ tự để build row khi ghi.
const H2_HEADERS = {
  objectives: ['ID', 'Type', 'ParentID', 'Pillar', 'ObjectiveName', 'Why', 'Owner', 'Priority', 'Weight', 'Category', 'Status', 'StartDate', 'DueDate', 'CreatedBy'],
  kpis:       ['ID', 'ObjectiveID', 'KpiName', 'KpiType', 'Baseline', 'Target', 'Unit', 'Weight', 'Deadline', 'Status', 'Evidence', 'Owner'],
  milestones: ['ID', 'KpiID', 'Month', 'Quarter', 'MilestoneName', 'DueDate', 'Owner', 'Status', 'RAG', 'TaskRef'],
  tracking:   ['ID', 'Month', 'KpiID', 'Member', 'Target', 'Actual', 'Progress', 'RAG', 'Issue', 'NextAction', 'SupportNeeded', 'UpdatedAt'],
  risks:      ['ID', 'KpiID', 'Risk', 'Impact', 'Probability', 'Mitigation', 'Owner', 'Status'],
  deps:       ['ID', 'KpiID', 'DependencyType', 'DependencyOwner', 'RequiredDate', 'Status', 'Note'],
  reviews:    ['ID', 'Member', 'ReviewType', 'Period', 'Q_commit', 'Q_actual', 'Q_pct', 'Q_impact', 'Q_gap', 'Q_rootcause', 'Q_lesson', 'Q_adjust', 'Cap_Goal', 'Cap_Plan', 'Cap_Prior', 'Cap_Own', 'Cap_Risk', 'Cap_Dep', 'Cap_Track', 'Cap_Exec', 'CreatedAt'],
  config:     ['Key', 'Value', 'Group', 'Note']
};

// entity → {action upsert/delete, header key, name field cho audit}
const H2_ENTITY = {
  objective: { up: 'h2-objective-upsert', del: 'h2-objective-delete', hk: 'objectives', name: 'ObjectiveName' },
  kpi:       { up: 'h2-kpi-upsert',       del: 'h2-kpi-delete',       hk: 'kpis',       name: 'KpiName' },
  milestone: { up: 'h2-milestone-upsert', del: 'h2-milestone-delete', hk: 'milestones', name: 'MilestoneName' },
  tracking:  { up: 'h2-tracking-upsert',  del: null,                  hk: 'tracking',   name: 'KpiID' },
  risk:      { up: 'h2-risk-upsert',      del: 'h2-risk-delete',      hk: 'risks',      name: 'Risk' },
  dep:       { up: 'h2-dep-upsert',       del: 'h2-dep-delete',       hk: 'deps',       name: 'DependencyType' },
  review:    { up: 'h2-review-upsert',    del: null,                  hk: 'reviews',    name: 'ReviewType' },
  config:    { up: 'h2-config-upsert',    del: null,                  hk: 'config',     name: 'Key' }
};

let dbH2 = { config: [], objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] };

/* ── Parse 2D grid (row0 = header từ server) → mảng object keyed theo header ── */
function _h2Parse(grid) {
  if (!Array.isArray(grid) || grid.length < 2) return [];
  const header = grid[0].map(h => String(h).trim());
  return grid.slice(1)
    .map(r => { const o = {}; header.forEach((h, i) => o[h] = r[i] != null ? r[i] : ''); return o; })
    .filter(o => String(o[header[0]] || '').trim() !== '');   // bỏ dòng không có ID/Key
}

/* ── Đọc gộp toàn domain H2 (1 round-trip) ── */
async function readH2() {
  if (!GS_WEBAPP_URL || typeof getAuthSession === 'function' && !getAuthSession()) return;
  try {
    const json = await gasPost({ action: 'h2-read-all' });
    if (json.status !== 'ok') return;
    const d = json.data || {};
    dbH2.config     = _h2Parse(d.config);
    dbH2.objectives = _h2Parse(d.objectives);
    dbH2.kpis       = _h2Parse(d.kpis);
    dbH2.milestones = _h2Parse(d.milestones);
    dbH2.tracking   = _h2Parse(d.tracking);
    dbH2.risks      = _h2Parse(d.risks);
    dbH2.deps       = _h2Parse(d.deps);
    dbH2.reviews    = _h2Parse(d.reviews);
    persistH2();
    if (typeof renderH2Dashboard === 'function' && _h2ViewVisible('h2-dashboard')) renderH2Dashboard();
    if (typeof renderH2Tracker === 'function' && _h2ViewVisible('h2-tracker')) renderH2Tracker();
    if (typeof renderH2Review === 'function' && _h2ViewVisible('h2-review')) renderH2Review();
  } catch (e) {
    console.warn('readH2 error:', e.message);
  }
}

function persistH2() { try { localStorage.setItem('shtd_h2_v1', JSON.stringify(dbH2)); } catch (e) {} }
function loadH2FromCache() {
  try { const c = localStorage.getItem('shtd_h2_v1'); if (c) dbH2 = Object.assign(dbH2, JSON.parse(c)); } catch (e) {}
}
function _h2ViewVisible(view) {
  const sec = document.getElementById('view-' + view);
  return sec && sec.style.display !== 'none';
}

/* ── Atomic upsert (optimistic; clone _gasDevUpsert) ──
   entity: key trong H2_ENTITY; obj: object keyed theo header; isNew: boolean.
   Mutate dbH2 do caller làm TRƯỚC (optimistic); hàm này chỉ ghi GAS nền. */
async function _gasH2Upsert(entity, obj, isNew) {
  if (!GS_WEBAPP_URL) return;
  const meta = H2_ENTITY[entity];
  if (!meta) throw new Error('H2 entity không hợp lệ: ' + entity);
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const row = H2_HEADERS[meta.hk].map(h => (obj[h] != null ? obj[h] : ''));
    const json = await gasPost({ action: meta.up, id: obj.ID, name: obj[meta.name] || '', row, isNew: !!isNew });
    if (json.status !== 'ok') throw new Error(json.error || meta.up + ' lỗi');
    if (json.id && json.id !== obj.ID) { obj.ID = json.id; persistH2(); }   // adopt reassigned id
    if (dot) dot.className = 'status-dot connected';
    return json.id || obj.ID;
  } catch (e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — đã lưu cục bộ. Nhớ đồng bộ khi online.', 'warning', 6000);
  }
}

/* ── Link Task ↔ Milestone (owner-gated action riêng; chỉ ghi cột TaskRef) ──
   Optimistic: caller đã mutate dbH2.milestones[*].TaskRef TRƯỚC; hàm này ghi GAS nền. */
async function _gasH2TaskLink(milestoneId, taskRef, name) {
  if (!GS_WEBAPP_URL) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: 'h2-milestone-tasklink', id: milestoneId, taskRef: taskRef || '', name: name || '' });
    if (json.status !== 'ok') throw new Error(json.error || 'h2-milestone-tasklink lỗi');
    if (dot) dot.className = 'status-dot connected';
    return json.id || milestoneId;
  } catch (e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS lỗi: ' + e.message + ' — đã lưu cục bộ. Nhớ đồng bộ khi online.', 'warning', 6000);
  }
}

async function _gasH2Delete(entity, id, name) {
  if (!GS_WEBAPP_URL) return;
  const meta = H2_ENTITY[entity];
  if (!meta || !meta.del) return;
  const dot = document.getElementById('syncDot');
  if (dot) dot.className = 'status-dot syncing';
  try {
    const json = await gasPost({ action: meta.del, id, name: name || '' });
    if (json.status !== 'ok') throw new Error(json.error || meta.del + ' lỗi');
    if (dot) dot.className = 'status-dot connected';
  } catch (e) {
    if (dot) dot.className = 'status-dot';
    toast('⚠️ GAS không phản hồi — đã xóa cục bộ. Nhớ đồng bộ khi online.', 'warning', 5000);
  }
}

/* ══════════════════════════════════════════
   COMPUTE HELPERS (RAG / achievement / score / capacity / validate)
   ══════════════════════════════════════════ */

// Config đọc từ dbH2.config (key/value); có default an toàn.
function h2Cfg(key, dflt) {
  const r = (dbH2.config || []).find(c => String(c.Key).trim() === key);
  return r && r.Value !== '' && r.Value != null ? r.Value : dflt;
}

// Chuẩn hoá số weight/percent: "45%" | "45" | "0.45" → 45
function _h2Num(v) {
  if (v == null || v === '') return NaN;
  let s = String(v).replace('%', '').replace(',', '.').trim();
  let n = parseFloat(s);
  if (isNaN(n)) return NaN;
  if (n > 0 && n <= 1) n = n * 100;   // dạng phân số → phần trăm
  return n;
}

// Tracking mới nhất của 1 KPI (theo thứ tự tháng T8..T12)
function h2LatestTracking(kpiId) {
  const order = { T8: 8, T9: 9, T10: 10, T11: 11, T12: 12 };
  const rows = (dbH2.tracking || []).filter(t => String(t.KpiID) === String(kpiId));
  if (!rows.length) return null;
  return rows.sort((a, b) => (order[a.Month] || 0) - (order[b.Month] || 0))[rows.length - 1];
}

// Achievement % của 1 KPI [0..100]. Suy hướng từ baseline/target; fallback nhị phân theo Status.
function h2Achievement(kpi) {
  const trk = h2LatestTracking(kpi.ID);
  const base = _h2Num(kpi.Baseline), tgt = _h2Num(kpi.Target);
  const act = trk ? _h2Num(trk.Actual) : NaN;
  if (!isNaN(base) && !isNaN(tgt) && !isNaN(act)) {
    if (tgt < base) {   // hướng giảm tốt (TAT, thời gian, effort)
      const denom = (base - tgt) || 1;
      return Math.max(0, Math.min(100, ((base - act) / denom) * 100));
    }
    const denom = (tgt - base) || 1;   // hướng tăng tốt
    return Math.max(0, Math.min(100, ((act - base) / denom) * 100));
  }
  if (!isNaN(tgt) && !isNaN(act)) return Math.max(0, Math.min(100, (act / (tgt || 1)) * 100));
  if (trk && !isNaN(_h2Num(trk.Progress))) return Math.max(0, Math.min(100, _h2Num(trk.Progress)));
  // nhị phân theo trạng thái
  const st = String(kpi.Status || '').toLowerCase();
  if (st.indexOf('done') >= 0 || st.indexOf('hoàn thành') >= 0 || st.indexOf('đạt') >= 0) return 100;
  return 0;
}

// RAG của 1 KPI: ưu tiên RAG do member ghi ở tracking; else suy từ progress + deadline.
function h2ComputeRag(kpi) {
  const trk = h2LatestTracking(kpi.ID);
  if (trk && trk.RAG) {
    const g = String(trk.RAG).toUpperCase();
    if (g.indexOf('RED') >= 0 || g.indexOf('🔴') >= 0) return 'RED';
    if (g.indexOf('AMBER') >= 0 || g.indexOf('🟠') >= 0) return 'AMBER';
    if (g.indexOf('GREEN') >= 0 || g.indexOf('🟢') >= 0) return 'GREEN';
  }
  const prog = trk ? _h2Num(trk.Progress) : NaN;
  const ach  = !isNaN(prog) ? prog : h2Achievement(kpi);
  const amberDays = _h2Num(h2Cfg('rag_deadline_amber_days', 14));
  const dl = kpi.Deadline ? (typeof toISODate === 'function' ? toISODate(kpi.Deadline) : kpi.Deadline) : '';
  if (dl) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dl);
    if (!isNaN(d)) {
      const days = Math.round((d - today) / 86400000);
      if (days < 0 && ach < 100) return 'RED';
      if (days <= amberDays && ach < 100) return 'AMBER';
    }
  }
  const amberPct = _h2Num(h2Cfg('rag_amber_pct', 20));
  if (ach >= 100) return 'GREEN';
  if (ach < (100 - amberPct)) return 'AMBER';
  return 'GREEN';
}

// Achievement của 1 objective = trung bình có trọng số các KPI (theo weight KPI; không có → chia đều).
function h2ObjectiveAchievement(objId) {
  const kpis = (dbH2.kpis || []).filter(k => String(k.ObjectiveID) === String(objId));
  if (!kpis.length) return 0;
  let wsum = 0, acc = 0;
  kpis.forEach(k => { const w = _h2Num(k.Weight) || 0; wsum += w; acc += w * h2Achievement(k); });
  if (wsum > 0) return acc / wsum;                                   // weighted avg
  return kpis.reduce((s, k) => s + h2Achievement(k), 0) / kpis.length; // simple avg
}

// Điểm 1 member [0..100] = Σ (objectiveWeight% × objectiveAchievement%) / 100.
function h2Score(member) {
  const meObjs = (dbH2.objectives || []).filter(o => String(o.Owner).toLowerCase() === String(member).toLowerCase() && o.Type !== 'team');
  let total = 0; const detail = [];
  meObjs.forEach(o => {
    const ow  = _h2Num(o.Weight) || 0;
    const ach = h2ObjectiveAchievement(o.ID);
    total += (ow * ach) / 100;
    detail.push({ objective: o, weight: ow, achievement: Math.round(ach * 10) / 10 });
  });
  return { score: Math.round(total * 10) / 10, objectives: detail };
}

// Capacity: đếm objective/kpi/P1 theo member + cờ overload.
function h2Capacity() {
  const byMember = {};
  (dbH2.objectives || []).filter(o => o.Type !== 'team').forEach(o => {
    const m = String(o.Owner || '—');
    byMember[m] = byMember[m] || { member: m, objectives: 0, kpis: 0, p1: 0, overload: false };
    byMember[m].objectives++;
    if (String(o.Priority).toUpperCase() === 'P1') byMember[m].p1++;
  });
  (dbH2.kpis || []).forEach(k => {
    const m = String(k.Owner || '—');
    if (byMember[m]) byMember[m].kpis++;
  });
  const maxP1 = _h2Num(h2Cfg('max_p1', 3)), maxObj = _h2Num(h2Cfg('max_objectives', 5));
  Object.values(byMember).forEach(r => { r.overload = (r.p1 > maxP1) || (r.objectives > maxObj); });
  return Object.values(byMember);
}

// Validate weight tổng theo member (=100%). Trả {member, total, ok}[]
function h2WeightValidate() {
  const byMember = {};
  (dbH2.objectives || []).filter(o => o.Type !== 'team').forEach(o => {
    const m = String(o.Owner || '—');
    byMember[m] = (byMember[m] || 0) + (_h2Num(o.Weight) || 0);
  });
  return Object.keys(byMember).map(m => ({ member: m, total: Math.round(byMember[m] * 10) / 10, ok: Math.abs(byMember[m] - 100) < 0.5 }));
}

// Flag KPI chưa đạt chuẩn (thiếu target/unit/weight/owner/priority; target nhị phân). Trả mảng lý do.
function h2FlagBadKpi(kpi) {
  const flags = [];
  if (!kpi.Target || String(kpi.Target).trim() === '') flags.push('thiếu Target');
  else if (isNaN(_h2Num(kpi.Target)) && !/\d/.test(String(kpi.Target))) flags.push('Target không có số (nhị phân?)');
  if (!kpi.Unit || String(kpi.Unit).trim() === '') flags.push('thiếu Unit');
  if (isNaN(_h2Num(kpi.Weight))) flags.push('thiếu Weight');
  if (!kpi.Owner || String(kpi.Owner).trim() === '') flags.push('thiếu Owner');
  if (!kpi.KpiType || String(kpi.KpiType).trim() === '') flags.push('thiếu Category');
  return flags;
}
