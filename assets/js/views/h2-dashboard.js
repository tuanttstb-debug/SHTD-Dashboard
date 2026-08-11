'use strict';
/* ══════════════════════════════════════════════════════════════
   H2 DASHBOARD VIEW  (Quản trị H2 — Executive dashboard)
   Executive-first (≤3 phút): Exec Summary → Team Objectives → Member
   → Pillar → Monthly Trend → Top Risks → Top Dependencies → Capacity
   → AI Impact → Management Actions. + Xuất báo cáo BLĐ (B8).
   Reuse h2-core.js compute helpers + Chart.js (đã load CDN).
   ══════════════════════════════════════════════════════════════ */

const _h2Charts = {};

function _h2AllObjs() { return (dbH2.objectives || []).filter(o => o.Type !== 'team'); }
function _h2AllKpis() { return (dbH2.kpis || []); }
function _h2Members() {
  const s = new Map();
  _h2AllObjs().forEach(o => { if (o.Owner) s.set(String(o.Owner).toLowerCase(), o.Owner); });
  return [...s.values()].sort((a, b) => a.localeCompare(b));
}

// Đếm RAG toàn bộ KPI
function _h2RagCounts(kpis) {
  let g = 0, a = 0, r = 0;
  (kpis || _h2AllKpis()).forEach(k => { const x = h2ComputeRag(k); if (x === 'GREEN') g++; else if (x === 'AMBER') a++; else r++; });
  return { g, a, r };
}

// Điểm team = trung bình điểm các member
function _h2TeamScore() {
  const ms = _h2Members();
  if (!ms.length) return 0;
  return Math.round(ms.reduce((s, m) => s + h2Score(m).score, 0) / ms.length * 10) / 10;
}

/* ══════════════════════ render ══════════════════════ */
function renderH2Dashboard() {
  const root = document.getElementById('view-h2-dashboard');
  if (!root) return;

  const objs = _h2AllObjs();
  const kpis = _h2AllKpis();
  const { g, a, r } = _h2RagCounts(kpis);
  const completed = kpis.filter(k => h2Achievement(k) >= 100).length;
  const atRisk = a + r;
  const teamScore = _h2TeamScore();

  if (!objs.length) {
    root.innerHTML = `<div class="h2-page"><div class="h2-empty"><i class="fa-solid fa-gauge-high"></i>
      Chưa có dữ liệu H2. Vào <b>Quản trị H2 · KPI</b> để thêm Objective, hoặc chạy seed pilot (H2SeedPilot.gs).</div></div>`;
    return;
  }

  const card = (num, label, cls, sub) =>
    `<div class="h2-kpi-card ${cls || ''}"><div class="h2-kpi-card-num">${num}</div><div class="h2-kpi-card-lbl">${label}</div>${sub ? `<div class="h2-kpi-card-sub">${sub}</div>` : ''}</div>`;

  root.innerHTML = `
<div class="h2-page">
  <div class="h2-page-header">
    <div>
      <div class="h2-title"><i class="fa-solid fa-gauge-high"></i> Quản trị H2 · Dashboard điều hành</div>
      <div class="h2-sub">H2/2026 · ${_h2Members().length} thành viên · ${objs.length} objective · ${kpis.length} KPI</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="h2OpenReport()"><i class="fa-solid fa-file-lines"></i> Xuất báo cáo BLĐ</button>
  </div>

  <!-- EXEC SUMMARY -->
  <div class="h2-kpi-cards">
    ${card(teamScore + '%', 'Điểm KPI team', 'accent')}
    ${card(g, '🟢 Green', 'green')}
    ${card(a, '🟠 Amber', a > 0 ? 'amber' : '')}
    ${card(r, '🔴 Red', r > 0 ? 'red' : '')}
    ${card(completed, 'KPI hoàn thành', '')}
    ${card(atRisk, 'KPI cần chú ý', atRisk > 0 ? 'amber' : '')}
  </div>

  <!-- CHARTS -->
  <div class="h2-dash-grid">
    <div class="h2-panel"><div class="h2-panel-head">Tiến độ theo tháng (T8→T12)</div><div class="h2-chart-box"><canvas id="h2TrendChart"></canvas></div></div>
    <div class="h2-panel"><div class="h2-panel-head">Phân bố RAG</div><div class="h2-chart-box"><canvas id="h2RagChart"></canvas></div></div>
  </div>

  <!-- BY MEMBER + BY PILLAR -->
  <div class="h2-dash-grid">
    <div class="h2-panel"><div class="h2-panel-head">Theo thành viên</div><div id="h2ByMember"></div></div>
    <div class="h2-panel"><div class="h2-panel-head">Theo trụ cột</div><div id="h2ByPillar"></div></div>
  </div>

  <!-- TEAM OBJECTIVES -->
  <div class="h2-panel"><div class="h2-panel-head">Tiến độ Objectives</div><div id="h2ObjProgress"></div></div>

  <!-- RISK + DEP -->
  <div class="h2-dash-grid">
    <div class="h2-panel"><div class="h2-panel-head">🚨 Top Risks</div><div id="h2TopRisks"></div></div>
    <div class="h2-panel"><div class="h2-panel-head">🔗 Top Dependencies</div><div id="h2TopDeps"></div></div>
  </div>

  <!-- CAPACITY + AI -->
  <div class="h2-dash-grid">
    <div class="h2-panel"><div class="h2-panel-head">⚖️ Capacity</div><div id="h2Capacity"></div></div>
    <div class="h2-panel"><div class="h2-panel-head">🤖 AI Impact (P3-AI)</div><div id="h2AiImpact"></div></div>
  </div>

  <!-- MANAGEMENT ACTIONS -->
  <div class="h2-panel h2-panel-action"><div class="h2-panel-head">📌 Management Actions — KPI cần Teamlead can thiệp</div><div id="h2MgmtActions"></div></div>
</div>`;

  _h2RenderByMember();
  _h2RenderByPillar();
  _h2RenderObjProgress();
  _h2RenderRisks();
  _h2RenderDeps();
  _h2RenderCapacity();
  _h2RenderAi();
  _h2RenderMgmtActions();
  _h2RenderCharts();
}

function _h2Bar(pct, cls) {
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return `<div class="h2-bar"><div class="h2-bar-fill ${cls || ''}" style="width:${p}%"></div></div>`;
}

function _h2RenderByMember() {
  const el = document.getElementById('h2ByMember'); if (!el) return;
  const rows = _h2Members().map(m => {
    const sc = h2Score(m).score;
    const objs = _h2AllObjs().filter(o => String(o.Owner).toLowerCase() === m.toLowerCase());
    const kpis = objs.flatMap(o => _h2KpisOf(o.ID));
    const { g, a, r } = _h2RagCounts(kpis);
    return `<div class="h2-mrow">
      <div class="h2-mrow-top"><span class="h2-mrow-name">${esc(m)}</span><span class="h2-mrow-score">${sc}%</span></div>
      ${_h2Bar(sc, 'accent')}
      <div class="h2-mrow-meta">${objs.length} obj · ${kpis.length} KPI · 🟢${g} 🟠${a} 🔴${r}</div>
    </div>`;
  }).join('');
  el.innerHTML = rows || '<div class="h2-empty-sm">—</div>';
}

function _h2RenderByPillar() {
  const el = document.getElementById('h2ByPillar'); if (!el) return;
  const rows = H2_PILLARS.map(p => {
    const objs = _h2AllObjs().filter(o => o.Pillar === p);
    const kpis = objs.flatMap(o => _h2KpisOf(o.ID));
    const ach = kpis.length ? Math.round(kpis.reduce((s, k) => s + h2Achievement(k), 0) / kpis.length) : 0;
    const w = objs.reduce((s, o) => s + (_h2Num(o.Weight) || 0), 0);
    return `<div class="h2-mrow">
      <div class="h2-mrow-top"><span class="h2-mrow-name">${_h2PillarBadge(p)} ${esc(H2_PILLAR_LABEL[p] || p)}</span><span class="h2-mrow-score">${ach}%</span></div>
      ${_h2Bar(ach)}
      <div class="h2-mrow-meta">${objs.length} obj · ${kpis.length} KPI · trọng số Σ${Math.round(w)}%</div>
    </div>`;
  }).join('');
  el.innerHTML = rows;
}

function _h2RenderObjProgress() {
  const el = document.getElementById('h2ObjProgress'); if (!el) return;
  const rows = _h2AllObjs().map(o => {
    const ach = Math.round(h2ObjectiveAchievement(o.ID));
    const rag = _h2RagCounts(_h2KpisOf(o.ID));
    const cls = rag.r > 0 ? 'red' : (rag.a > 0 ? 'amber' : 'green');
    return `<div class="h2-mrow">
      <div class="h2-mrow-top"><span class="h2-mrow-name">${_h2PrioBadge(o.Priority)} ${esc(o.ObjectiveName)} <span class="h2-obj-meta">· ${esc(o.Owner)}</span></span><span class="h2-mrow-score">${ach}%</span></div>
      ${_h2Bar(ach, cls)}
    </div>`;
  }).join('');
  el.innerHTML = rows || '<div class="h2-empty-sm">—</div>';
}

function _h2RenderRisks() {
  const el = document.getElementById('h2TopRisks'); if (!el) return;
  const risks = (dbH2.risks || []).filter(r => String(r.Status || '').toLowerCase() !== 'closed');
  if (!risks.length) { el.innerHTML = '<div class="h2-empty-sm">Không có risk đang mở.</div>'; return; }
  el.innerHTML = risks.slice(0, 8).map(r => {
    const k = _h2FindKpi(r.KpiID);
    return `<div class="h2-listrow"><span class="h2-listrow-main">${esc(r.Risk)}</span>
      <span class="h2-listrow-side">${esc(r.Impact || '')} · ${esc(r.Owner || '')}${k ? ' · ' + esc(k.KpiName) : ''}</span></div>`;
  }).join('');
}

function _h2RenderDeps() {
  const el = document.getElementById('h2TopDeps'); if (!el) return;
  const deps = (dbH2.deps || []).filter(d => String(d.Status || '').toLowerCase() !== 'done');
  if (!deps.length) { el.innerHTML = '<div class="h2-empty-sm">Không có dependency đang chờ.</div>'; return; }
  el.innerHTML = deps.slice(0, 8).map(d =>
    `<div class="h2-listrow"><span class="h2-listrow-main">${esc(d.DependencyType || '')} — ${esc(d.DependencyOwner || '')}</span>
      <span class="h2-listrow-side">${d.RequiredDate ? fmtDate(d.RequiredDate) : ''} · ${esc(d.Status || '')}</span></div>`).join('');
}

function _h2RenderCapacity() {
  const el = document.getElementById('h2Capacity'); if (!el) return;
  const cap = h2Capacity();
  if (!cap.length) { el.innerHTML = '<div class="h2-empty-sm">—</div>'; return; }
  el.innerHTML = `<table class="h2-cap-table"><thead><tr><th>Thành viên</th><th>Obj</th><th>KPI</th><th>P1</th><th></th></tr></thead>
    <tbody>${cap.map(c => `<tr class="${c.overload ? 'is-overload' : ''}"><td>${esc(c.member)}</td><td>${c.objectives}</td><td>${c.kpis}</td><td>${c.p1}</td>
      <td>${c.overload ? '<span class="h2-overload">⚠ Quá tải</span>' : ''}</td></tr>`).join('')}</tbody></table>`;
}

function _h2RenderAi() {
  const el = document.getElementById('h2AiImpact'); if (!el) return;
  const aiObjs = _h2AllObjs().filter(o => o.Pillar === 'P3-AI');
  const aiKpis = aiObjs.flatMap(o => _h2KpisOf(o.ID));
  if (!aiKpis.length) { el.innerHTML = '<div class="h2-empty-sm">Chưa có KPI AI.</div>'; return; }
  const ach = Math.round(aiKpis.reduce((s, k) => s + h2Achievement(k), 0) / aiKpis.length);
  el.innerHTML = `<div class="h2-ai-head">${aiObjs.length} objective AI · ${aiKpis.length} KPI · đạt TB <b>${ach}%</b></div>
    ${aiKpis.slice(0, 6).map(k => `<div class="h2-listrow"><span class="h2-listrow-main">${_h2RagBadge(h2ComputeRag(k))} ${esc(k.KpiName)}</span>
      <span class="h2-listrow-side">${Math.round(h2Achievement(k))}% · ${esc(k.Owner || '')}</span></div>`).join('')}`;
}

function _h2RenderMgmtActions() {
  const el = document.getElementById('h2MgmtActions'); if (!el) return;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const items = [];
  _h2AllKpis().forEach(k => {
    const rag = h2ComputeRag(k);
    if (rag === 'RED' || rag === 'AMBER') {
      const trk = h2LatestTracking(k.ID);
      items.push({ rag, kpi: k.KpiName, owner: k.Owner, note: trk && trk.Issue ? trk.Issue : (trk && trk.SupportNeeded ? 'Cần hỗ trợ: ' + trk.SupportNeeded : '') });
    }
  });
  // overdue milestones
  (dbH2.milestones || []).forEach(m => {
    if (!m.DueDate) return;
    const d = new Date(typeof toISODate === 'function' ? toISODate(m.DueDate) : m.DueDate);
    const st = String(m.Status || '').toLowerCase();
    if (!isNaN(d) && d < today && st.indexOf('hoàn thành') < 0 && st.indexOf('done') < 0) {
      items.push({ rag: 'RED', kpi: 'Mốc quá hạn: ' + m.MilestoneName, owner: m.Owner, note: 'Hạn ' + fmtDate(m.DueDate) });
    }
  });
  items.sort((x, y) => (x.rag === 'RED' ? 0 : 1) - (y.rag === 'RED' ? 0 : 1));
  if (!items.length) { el.innerHTML = '<div class="h2-empty-sm">🟢 Không có mục cần can thiệp.</div>'; return; }
  el.innerHTML = items.slice(0, 12).map(it =>
    `<div class="h2-listrow"><span class="h2-listrow-main">${_h2RagBadge(it.rag)} ${esc(it.kpi)}</span>
      <span class="h2-listrow-side">${esc(it.owner || '')}${it.note ? ' · ' + esc(it.note) : ''}</span></div>`).join('');
}

function _h2RenderCharts() {
  if (typeof Chart === 'undefined') return;
  Object.values(_h2Charts).forEach(c => { try { c.destroy(); } catch (e) {} });

  // Monthly trend: avg progress từ tracking theo tháng
  const monthOrder = H2_MONTHS;
  const trend = monthOrder.map(mo => {
    const rows = (dbH2.tracking || []).filter(t => t.Month === mo);
    if (!rows.length) return null;
    const vals = rows.map(t => _h2Num(t.Progress)).filter(v => !isNaN(v));
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
  });
  const c1 = document.getElementById('h2TrendChart');
  if (c1) _h2Charts.trend = new Chart(c1, {
    type: 'line',
    data: { labels: monthOrder, datasets: [{ label: 'Tiến độ TB %', data: trend, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,.12)', fill: true, tension: .3, spanGaps: true }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100 } }, plugins: { legend: { display: false } } }
  });

  const { g, a, r } = _h2RagCounts();
  const c2 = document.getElementById('h2RagChart');
  if (c2) _h2Charts.rag = new Chart(c2, {
    type: 'doughnut',
    data: { labels: ['Green', 'Amber', 'Red'], datasets: [{ data: [g, a, r], backgroundColor: ['#10b981', '#f59e0b', '#ef4444'] }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

/* ══════════════════════ B8 — Executive Report generator ══════════════════════ */
function h2BuildReportText() {
  const objs = _h2AllObjs(), kpis = _h2AllKpis(), members = _h2Members();
  const { g, a, r } = _h2RagCounts(kpis);
  const teamScore = _h2TeamScore();
  const L = [];
  L.push('BÁO CÁO BLĐ — MỤC TIÊU / KPI / ACTION PLAN H2/2026');
  L.push('Team Số hóa tín dụng · Kỳ H2/2026 · Ngày ' + fmtDate(new Date().toISOString().slice(0, 10)));
  L.push('');
  L.push('1. OVERALL STATUS');
  L.push(`- Điểm KPI team (TB): ${teamScore}% · ${members.length} thành viên · ${objs.length} objective · ${kpis.length} KPI.`);
  L.push(`- RAG: 🟢 ${g} · 🟠 ${a} · 🔴 ${r}.`);
  L.push('');
  L.push('2. KPI STATUS THEO THÀNH VIÊN');
  members.forEach(m => {
    const sc = h2Score(m).score;
    const mo = objs.filter(o => String(o.Owner).toLowerCase() === m.toLowerCase());
    const p1 = mo.filter(o => o.Priority === 'P1').length;
    L.push(`- ${m}: điểm ${sc}% · ${mo.length} objective (${p1} P1).`);
  });
  L.push('');
  L.push('3. KEY RISKS');
  const risks = (dbH2.risks || []).filter(x => String(x.Status || '').toLowerCase() !== 'closed');
  if (risks.length) risks.slice(0, 8).forEach(x => L.push(`- ${x.Risk} (${x.Impact || ''}) — ${x.Owner || ''}; mitigation: ${x.Mitigation || '—'}`));
  else L.push('- (không có)');
  L.push('');
  L.push('4. KEY DEPENDENCIES');
  const deps = (dbH2.deps || []).filter(x => String(x.Status || '').toLowerCase() !== 'done');
  if (deps.length) deps.slice(0, 8).forEach(x => L.push(`- ${x.DependencyType || ''} — ${x.DependencyOwner || ''} (cần ${x.RequiredDate ? fmtDate(x.RequiredDate) : 'n/a'}); ${x.Status || ''}`));
  else L.push('- (không có)');
  L.push('');
  L.push('5. CAPACITY');
  h2Capacity().forEach(c => L.push(`- ${c.member}: ${c.objectives} obj · ${c.kpis} KPI · ${c.p1} P1${c.overload ? ' ⚠ QUÁ TẢI' : ''}`));
  L.push('');
  L.push('6. AI IMPACT (P3-AI)');
  const aiKpis = objs.filter(o => o.Pillar === 'P3-AI').flatMap(o => _h2KpisOf(o.ID));
  L.push(aiKpis.length ? `- ${aiKpis.length} KPI AI · đạt TB ${Math.round(aiKpis.reduce((s, k) => s + h2Achievement(k), 0) / aiKpis.length)}%.` : '- (chưa có KPI AI)');
  L.push('');
  L.push('7. MANAGEMENT ACTIONS');
  const risky = kpis.filter(k => h2ComputeRag(k) !== 'GREEN');
  if (risky.length) risky.slice(0, 10).forEach(k => L.push(`- [${h2ComputeRag(k)}] ${k.KpiName} — ${k.Owner || ''}`));
  else L.push('- 🟢 Không có KPI Amber/Red.');
  L.push('');
  L.push('8. BLĐ SUPPORT REQUIRED');
  const wv = h2WeightValidate().filter(x => !x.ok);
  if (wv.length) L.push(`- Duyệt/điều chỉnh trọng số: ${wv.map(x => x.member + ' (Σ' + x.total + '%)').join(', ')}.`);
  L.push('- Xác nhận nguồn lực cho các dependency trọng yếu ở mục 4.');
  return L.join('\n');
}

function h2OpenReport() {
  const el = document.getElementById('h2ReportOverlay');
  if (!el) return;
  const text = h2BuildReportText();
  el.innerHTML = `
    <div class="cp-view-modal" style="max-width:820px;">
      <div class="cp-view-header">
        <div style="font-size:16px;font-weight:800;">📄 Báo cáo BLĐ (H2/2026)</div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" onclick="h2CopyReport()"><i class="fa-solid fa-copy"></i> Copy</button>
          <button class="btn btn-ghost btn-sm" onclick="h2CloseReport()"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
      <div class="cp-view-body">
        <textarea id="h2ReportText" class="form-control" style="width:100%;height:52vh;font-family:var(--mono);font-size:12px;white-space:pre;">${esc(text)}</textarea>
        <div style="font-size:11px;color:var(--text-3);margin-top:6px;">Copy sang Word/Email. Số liệu tính realtime từ dữ liệu H2 hiện tại.</div>
      </div>
    </div>`;
  el.style.display = 'flex';
}
function h2CopyReport() {
  const ta = document.getElementById('h2ReportText');
  if (!ta) return;
  ta.select();
  navigator.clipboard?.writeText(ta.value).then(() => toast('Đã copy báo cáo — dán vào Word/Email.', 'success')).catch(() => { try { document.execCommand('copy'); toast('Đã copy.', 'success'); } catch (e) {} });
}
function h2CloseReport() { const el = document.getElementById('h2ReportOverlay'); if (el) el.style.display = 'none'; }
