'use strict';
/* ══════════════════════════════════════════════════════════════
   H2 REVIEW VIEW  (Quản trị H2 — Self-review H1/T7 + Quarterly + Capability)
   Member submit review của mình; Teamlead/Admin xem & chấm capability.
   Ownership: member sở hữu review của mình (cột Member) — gate ở GAS + client.
   ══════════════════════════════════════════════════════════════ */

const H2_REVIEW_TYPES = ['H1', 'Q3', 'Q4'];
const H2_CAP_DIMS = [
  ['Cap_Goal', 'Goal Setting'], ['Cap_Plan', 'Planning'], ['Cap_Prior', 'Prioritization'], ['Cap_Own', 'Ownership'],
  ['Cap_Risk', 'Risk Mgmt'], ['Cap_Dep', 'Dependency Mgmt'], ['Cap_Track', 'Tracking'], ['Cap_Exec', 'Execution']
];
const H2_REVIEW_Q = [
  ['Q_commit', 'Cam kết H1/kỳ trước'], ['Q_actual', 'Kết quả thực tế'], ['Q_pct', '% hoàn thành'], ['Q_impact', 'Business impact'],
  ['Q_gap', 'Gap chưa đạt'], ['Q_rootcause', 'Root cause'], ['Q_lesson', 'Lesson learned'], ['Q_adjust', 'Điều chỉnh H2/kỳ tới']
];

let _h2rEditId = null;

function _h2rMe() { const u = typeof getCurrentUser === 'function' ? getCurrentUser() : null; return u ? u.username : ''; }
function _h2rLead() { return typeof canImport === 'function' && canImport(); }
function _h2rFind(id) { return (dbH2.reviews || []).find(r => String(r.ID) === String(id)); }
function _h2rCanEdit(r) { return _h2rLead() || (r && String(r.Member).toLowerCase() === _h2rMe().toLowerCase()); }

function renderH2Review() {
  const root = document.getElementById('view-h2-review');
  if (!root) return;
  const me = _h2rMe();
  const lead = _h2rLead();
  // member thấy review của mình; lead thấy tất cả
  let list = (dbH2.reviews || []).slice();
  if (!lead) list = list.filter(r => String(r.Member).toLowerCase() === me.toLowerCase());

  root.innerHTML = `
<div class="h2-page">
  <div class="h2-page-header">
    <div>
      <div class="h2-title"><i class="fa-solid fa-clipboard-check"></i> Quản trị H2 · Tự đánh giá</div>
      <div class="h2-sub">Tự tổng kết H1/T7 · Review quý (Q3/Q4) · Năng lực quản trị</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openH2ReviewModal(null)"><i class="fa-solid fa-plus"></i> Thêm review</button>
  </div>
  <div id="h2ReviewList"></div>
</div>`;

  const wrap = document.getElementById('h2ReviewList');
  if (!list.length) { wrap.innerHTML = `<div class="h2-empty"><i class="fa-solid fa-clipboard"></i> Chưa có review. Bấm “Thêm review”.</div>`; return; }
  wrap.innerHTML = list.map(_h2rCard).join('');
}

function _h2rCard(r) {
  const canEdit = _h2rCanEdit(r);
  const caps = H2_CAP_DIMS.map(([k, label]) => r[k] ? `${label}: ${esc(r[k])}` : null).filter(Boolean);
  const avgCap = (() => { const v = H2_CAP_DIMS.map(([k]) => _h2Num(r[k])).filter(n => !isNaN(n)); return v.length ? Math.round(v.reduce((s, n) => s + n, 0) / v.length * 10) / 10 : null; })();
  return `<div class="h2-obj-card">
    <div class="h2-obj-head">
      <div class="h2-obj-badges">
        <span class="h2-prio h2-prio-p2">${esc(r.ReviewType || '—')}</span>
        <span class="h2-weight">${esc(r.Member || '')}</span>
        ${r.Period ? `<span class="h2-obj-meta">${esc(r.Period)}</span>` : ''}
        ${avgCap != null ? `<span class="h2-wbadge ok" title="Năng lực TB">Năng lực ${avgCap}/5</span>` : ''}
      </div>
      <div class="h2-obj-name">${esc(r.Q_actual || r.Q_commit || '(review)')}</div>
      ${canEdit ? `<div class="h2-card-actions">
        <button class="btn btn-ghost btn-sm" onclick="openH2ReviewModal('${esc(r.ID)}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
      </div>` : ''}
    </div>
    <div class="h2-kpi-list" style="padding:8px 14px;">
      ${r.Q_pct ? `<div class="h2-listrow"><span class="h2-listrow-main">% hoàn thành</span><span class="h2-listrow-side">${esc(r.Q_pct)}</span></div>` : ''}
      ${r.Q_impact ? `<div class="h2-listrow"><span class="h2-listrow-main">Impact</span><span class="h2-listrow-side">${esc(r.Q_impact)}</span></div>` : ''}
      ${r.Q_gap ? `<div class="h2-listrow"><span class="h2-listrow-main">Gap</span><span class="h2-listrow-side">${esc(r.Q_gap)}</span></div>` : ''}
      ${r.Q_lesson ? `<div class="h2-listrow"><span class="h2-listrow-main">Lesson</span><span class="h2-listrow-side">${esc(r.Q_lesson)}</span></div>` : ''}
      ${caps.length ? `<div class="h2-view-sub">Năng lực: ${caps.join(' · ')}</div>` : ''}
    </div>
  </div>`;
}

function openH2ReviewModal(id) {
  const r = id ? _h2rFind(id) : null;
  if (r && !_h2rCanEdit(r)) { toast('Chỉ chủ review hoặc Teamlead được sửa.', 'warning'); return; }
  _h2rEditId = id || null;
  document.getElementById('h2ReviewModalTitle').textContent = r ? 'Sửa review' : 'Thêm review';
  document.getElementById('h2rOrigId').value = r?.ID || '';

  document.getElementById('h2rType').innerHTML = _h2Opts(H2_REVIEW_TYPES, r?.ReviewType || 'H1');
  const set = (fid, v) => { const el = document.getElementById(fid); if (el) el.value = v != null ? v : ''; };
  set('h2rPeriod', r?.Period || 'H1/2026');
  H2_REVIEW_Q.forEach(([k]) => set('h2r_' + k, r?.[k]));
  H2_CAP_DIMS.forEach(([k]) => { const el = document.getElementById('h2r_' + k); if (el) el.innerHTML = _h2Opts(['', '1', '2', '3', '4', '5'], r?.[k] || ''); });

  // Member select — lead chọn được; member khóa vào mình
  const memSel = document.getElementById('h2rMember');
  if (memSel) {
    if (typeof _populateUserSelect === 'function') _populateUserSelect('h2rMember', null, r?.Member || _h2rMe());
    memSel.disabled = !_h2rLead();
    if (!_h2rLead()) memSel.value = _h2rMe();
  }
  document.getElementById('h2ReviewModal').style.display = 'flex';
}
function closeH2ReviewModal() { const m = document.getElementById('h2ReviewModal'); if (m) m.style.display = 'none'; _h2rEditId = null; }

async function h2SaveReview() {
  const origId = document.getElementById('h2rOrigId')?.value || '';
  const isNew = !origId;
  const member = _h2rLead() ? (document.getElementById('h2rMember')?.value || _h2rMe()) : _h2rMe();
  const r = {
    ID: isNew ? _h2GenId('REV', dbH2.reviews) : origId,
    Member: member,
    ReviewType: document.getElementById('h2rType').value,
    Period: (document.getElementById('h2rPeriod')?.value || '').trim(),
    CreatedAt: new Date().toISOString()
  };
  H2_REVIEW_Q.forEach(([k]) => { r[k] = (document.getElementById('h2r_' + k)?.value || '').trim(); });
  H2_CAP_DIMS.forEach(([k]) => { r[k] = document.getElementById('h2r_' + k)?.value || ''; });

  const idx = (dbH2.reviews || []).findIndex(x => String(x.ID) === String(r.ID));
  if (idx >= 0) dbH2.reviews[idx] = r; else dbH2.reviews.push(r);
  persistH2(); closeH2ReviewModal(); renderH2Review();
  await _gasH2Upsert('review', r, isNew);
  renderH2Review();
}

function _h2rEscClose() { try { closeH2ReviewModal(); } catch (e) {} }
