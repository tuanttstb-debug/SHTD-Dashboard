/* ===== EXECUTIVE SUMMARY VIEW ===== */
let esChartInst = null;

function renderExecutiveSummary() {
  const tasks = db.tasks;
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let done = 0, overdue = 0, totalProg = 0;
  const rag = { Green: 0, Amber: 0, Red: 0 };
  const initSummary = {};
  const attention = [];

  tasks.forEach(t => {
    const prog = parseInt(t.progress) || 0;
    const isDone = prog >= 100 || t.state === 'Hoàn thành';

    if (isDone) done++;
    let isOv = false;
    if (!isDone && t.endDate) {
      const endD = parseVNDate(t.endDate);
      if (endD && !isNaN(endD) && endD < today) { overdue++; isOv = true; }
    }
    totalProg += prog;
    if (rag[t.status] !== undefined) rag[t.status]++;

    const ik = t.initiative || 'BAU';
    if (!initSummary[ik]) initSummary[ik] = { total: 0, done: 0, totProg: 0, rags: { Green: 0, Amber: 0, Red: 0 } };
    initSummary[ik].total++;
    if (isDone) initSummary[ik].done++;
    initSummary[ik].totProg += prog;
    if (initSummary[ik].rags[t.status] !== undefined) initSummary[ik].rags[t.status]++;

    if (!isDone && t.canBLD === 'Y') {
      attention.push({ t, priority: 1, type: 'bld' });
    } else if (t.state === 'Blocked') {
      attention.push({ t, priority: 2, type: 'blocked' });
    } else if (isOv) {
      attention.push({ t, priority: 3, type: 'overdue' });
    }
  });

  const total = tasks.length;
  const inProg = total - done;
  const avgProg = total ? Math.round(totalProg / total) : 0;
  const completionPct = total ? Math.round(done / total * 100) : 0;
  const bldCount = attention.filter(a => a.type === 'bld').length;
  const blockedCount = attention.filter(a => a.type === 'blocked').length;

  // Zone 1: Headline numbers
  _esSet('esTotal', total);
  _esSet('esInProg', inProg);
  _esSet('esOverdue', overdue);
  _esSet('esBld', bldCount + blockedCount);

  const pctEl = document.getElementById('esCompletionPct');
  if (pctEl) {
    pctEl.textContent = completionPct + '%';
    pctEl.style.color = completionPct >= 70 ? 'var(--success)' : completionPct >= 40 ? 'var(--warning)' : 'var(--danger)';
  }

  const overdueNumEl = document.getElementById('esOverdue');
  if (overdueNumEl) overdueNumEl.style.color = overdue > 0 ? 'var(--danger)' : 'var(--text)';
  const overduePulse = document.querySelector('#esOverdueCard .es-alert-pulse');
  if (overduePulse) overduePulse.style.display = overdue > 0 ? 'inline-block' : 'none';

  const bldNum = bldCount + blockedCount;
  const bldNumEl = document.getElementById('esBld');
  if (bldNumEl) bldNumEl.style.color = bldNum > 0 ? 'var(--accent)' : 'var(--text)';
  const bldPulse = document.querySelector('#esBldCard .es-alert-pulse');
  if (bldPulse) bldPulse.style.display = bldNum > 0 ? 'inline-block' : 'none';

  _esSet('esAvgProg', `${t('es.avg-prog')} ${avgProg}%`);

  // Zone 2A: RAG donut
  _esRenderRagChart(rag, total);
  _esRenderRagLegend(rag, total);

  // Zone 2B: Attention list
  _esRenderAttentionList(attention);

  // Zone 3: Initiative health
  _esRenderInitTable(initSummary);

  // Timestamp
  const tsEl = document.getElementById('esTimestamp');
  if (tsEl) tsEl.textContent = new Date().toLocaleString('vi-VN');
}

function _esSet(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function _esRenderRagChart(rag, total) {
  const canvas = document.getElementById('esRagChart');
  if (!canvas || typeof Chart === 'undefined') return;
  if (esChartInst) { esChartInst.destroy(); esChartInst = null; }

  const empty = total === 0;
  esChartInst = new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: empty ? [t('db.no-data')] : ['Green', 'Amber', 'Red'],
      datasets: [{
        data: empty ? [1] : [rag.Green, rag.Amber, rag.Red],
        backgroundColor: empty ? ['#E2E8F0'] : ['#22C55E', '#F59E0B', '#EF4444'],
        borderWidth: 0,
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => {
            if (empty) return t('db.no-data');
            const pct = total ? Math.round(ctx.raw / total * 100) : 0;
            return ` ${ctx.raw} task (${pct}%)`;
          }
        }}
      }
    }
  });
}

function _esRenderRagLegend(rag, total) {
  const el = document.getElementById('esRagLegend');
  if (!el) return;
  if (total === 0) { el.innerHTML = ''; return; }

  const rows = [
    { label: 'Green', color: '#22C55E', count: rag.Green },
    { label: 'Amber', color: '#F59E0B', count: rag.Amber },
    { label: 'Red',   color: '#EF4444', count: rag.Red   }
  ];
  el.innerHTML = rows.map(r => {
    const pct = total ? Math.round(r.count / total * 100) : 0;
    return `<div class="es-rag-legend-item">
      <div class="es-rag-dot" style="background:${r.color};"></div>
      <div class="es-rag-legend-label">${r.label}</div>
      <div class="es-rag-legend-count" style="color:${r.color};">${r.count}</div>
      <div class="es-rag-legend-pct">${pct}%</div>
    </div>`;
  }).join('');
}

function _esRenderAttentionList(attention) {
  const el = document.getElementById('esAttentionList');
  if (!el) return;

  if (attention.length === 0) {
    el.innerHTML = `<div class="es-empty-state">
      <i class="fa-solid fa-circle-check"></i>
      ${t('es.no-urgent')}
    </div>`;
    return;
  }

  attention.sort((a, b) => a.priority - b.priority);

  const cfg = {
    bld:     { cls: 'es-att-bld',      tag: 'tag-bld',     icon: 'fa-solid fa-circle-exclamation', color: 'var(--warning)', label: t('es.label.bld') },
    blocked: { cls: 'es-att-blocked',  tag: 'tag-blocked', icon: 'fa-solid fa-ban',                color: 'var(--accent)',  label: 'Blocked' },
    overdue: { cls: 'es-att-critical', tag: 'tag-overdue', icon: 'fa-solid fa-clock',              color: 'var(--danger)',  label: t('es.label.overdue') }
  };

  const maxShow = 8;
  const shown = attention.slice(0, maxShow);
  const rest = attention.length - maxShow;

  let html = shown.map(({ t, type }) => {
    const c = cfg[type];
    const safeId = (t.id || '').replace(/'/g, "\\'");
    return `<div class="es-attention-item ${c.cls}" onclick="editTask('${safeId}')">
      <i class="${c.icon} es-att-icon" style="color:${c.color};"></i>
      <div class="es-att-body">
        <div class="es-att-name" title="${esc(t.name || '')}">${esc(t.name || '–')}</div>
        <div class="es-att-meta">${esc(t.id || '')} · ${esc(t.picRes || t.picAcc || '–')} · ${esc(t.team || '–')}</div>
      </div>
      <span class="es-att-tag ${c.tag}">${c.label}</span>
    </div>`;
  }).join('');

  if (rest > 0) {
    html += `<div class="es-more-link" onclick="navigateTo('tasks')">+ ${rest} ${t('es.more-items')}</div>`;
  }

  el.innerHTML = html;
}

function _esRenderInitTable(initSummary) {
  const tbody = document.getElementById('esInitTableBody');
  if (!tbody) return;

  const entries = Object.entries(initSummary);
  if (entries.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-3);">
      ${t('es.no-data-upload')}
    </td></tr>`;
    return;
  }

  // Red first → Amber → Green; within same RAG: worst completion first
  const ragRank = v => v.rags.Red > 0 ? 0 : v.rags.Amber > 0 ? 1 : 2;
  entries.sort((a, b) => {
    const rr = ragRank(a[1]) - ragRank(b[1]);
    if (rr !== 0) return rr;
    const pA = a[1].total ? a[1].done / a[1].total : 0;
    const pB = b[1].total ? b[1].done / b[1].total : 0;
    return pA - pB;
  });

  tbody.innerHTML = entries.map(([k, v]) => {
    const avg = v.total ? Math.round(v.totProg / v.total) : 0;
    const donePct = v.total ? Math.round(v.done / v.total * 100) : 0;
    const domRag = v.rags.Red > 0 ? 'Red' : v.rags.Amber > 0 ? 'Amber' : 'Green';
    const pfCls = avg >= 70 ? 'pf-green' : avg >= 30 ? 'pf-amber' : 'pf-red';

    let stTag, stCls;
    if (domRag === 'Red') { stTag = t('es.risk.high'); stCls = 'st-risk'; }
    else if (domRag === 'Amber') { stTag = t('es.risk.watch'); stCls = 'st-watch'; }
    else { stTag = t('es.risk.good'); stCls = 'st-good'; }

    return `<tr>
      <td><div class="es-init-name" title="${esc(k)}">${esc(k)}</div></td>
      <td style="text-align:center;font-weight:700;font-family:var(--mono);">${v.total}</td>
      <td style="text-align:center;font-weight:700;font-family:var(--mono);color:var(--success);">${v.done}</td>
      <td style="text-align:center;font-family:var(--mono);font-weight:700;">${donePct}%</td>
      <td>
        <div class="es-prog-wide">
          <div class="es-prog-bar"><div class="es-prog-fill ${pfCls}" style="width:${avg}%;"></div></div>
          <span class="es-prog-pct">${avg}%</span>
        </div>
      </td>
      <td>${ragBadge(domRag)}</td>
      <td><span class="es-status-tag ${stCls}">${stTag}</span></td>
    </tr>`;
  }).join('');
}
