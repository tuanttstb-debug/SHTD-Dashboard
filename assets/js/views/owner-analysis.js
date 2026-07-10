'use strict';
const _oaCharts = {};
let _oaActiveTab = 'quang';

function renderOwnerAnalysis() {
  const root = document.getElementById('ownerAnalysisRoot');
  if (!root) return;

  const { agg, quangPTKD, dungPTKD, sheet2PTKD } = getKpiData();

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">Owner Analysis</div>
      <div style="font-size:12px;color:var(--text-3);">Phân tích chi tiết theo chủ sở hữu sản phẩm · T1–T6/2026</div>
    </div></div>

    <!-- Owner tabs -->
    <div class="owner-tabs-kpi" style="margin-top:20px;">
      <div class="owner-tab-kpi active" id="oaTab-quang" onclick="_oaSwitch('quang')">
        <i class="fa-solid fa-shield-halved" style="margin-right:5px;color:var(--primary);"></i>QuangNN3 – Bảo lãnh (KPI 2.1/2.2)
      </div>
      <div class="owner-tab-kpi" id="oaTab-dung" onclick="_oaSwitch('dung')">
        <i class="fa-solid fa-money-bill-wave" style="margin-right:5px;color:var(--cyan);"></i>DungLQ1 – Giải ngân (Theo dõi)
      </div>
      <div class="owner-tab-kpi" id="oaTab-rank" onclick="_oaSwitch('rank')">
        <i class="fa-solid fa-ranking-star" style="margin-right:5px;color:var(--gold);"></i>${t('oa.tab.ranking')}
      </div>
    </div>

    <!-- Tab: QuangNN3 -->
    <div id="oaPane-quang">
      <div class="owner-block">
        <div class="owner-block-header quang">
          <i class="fa-solid fa-shield-halved" style="font-size:22px;color:var(--primary);"></i>
          <div>
            <div class="owner-block-title" style="color:var(--primary);">QuangNN3 – Quản lý sản phẩm Bảo lãnh</div>
            <div style="font-size:12px;color:var(--text-2);">Phụ trách KPI 2.1 + KPI 2.2</div>
          </div>
          <div class="owner-block-meta">
            <div class="owner-stat"><div class="owner-stat-val">${fmtKN(agg.quangTotal)}</div><div class="owner-stat-label">Tổng GD</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--primary);">${fmtKN(agg.quangBiz)}</div><div class="owner-stat-label">BIZ (Digital)</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--gold);">${fmtKN(agg.quangBpm)}</div><div class="owner-stat-label">BPM (Quầy)</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--danger);">${agg.kpi22Actual}%</div><div class="owner-stat-label">Digital Rate</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--text-3);">${quangPTKD.length}</div><div class="owner-stat-label">PTKD</div></div>
          </div>
        </div>
        <div class="owner-block-kpi-bar">
          <strong style="color:var(--gold);">KPI 2.1:</strong> ${fmtKN(agg.kpi21Actual)}/${fmtKN(agg.kpi21Target)} GD BIZ (${(agg.kpi21Actual/agg.kpi21Target*100).toFixed(1)}%) &nbsp;|&nbsp;
          <strong style="color:var(--danger);">KPI 2.2:</strong> ${agg.kpi22Actual}% vs target ${agg.kpi22Target}% (GAP -${(agg.kpi22Target-agg.kpi22Actual).toFixed(1)}pp) &nbsp;|&nbsp;
          <strong>Forecast 2026:</strong> ~${fmtKN(agg.kpi21Forecast)} GD &nbsp;|&nbsp;
          <strong>Cần push:</strong> 1,756 GD/tháng H2/2026
        </div>
        <div class="ptkd-grid" id="oaGridQuang"></div>
      </div>

      <div class="kpi-chart-grid">
        <div class="card">
          <div class="card-header"><div><div class="card-title">Digital Rate từng PTKD – QuangNN3</div><div class="card-subtitle">vs KPI 40% target</div></div></div>
          <div class="card-body"><div style="position:relative;height:260px;"><canvas id="oaChartQuangRate"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">GD BIZ vs BPM theo PTKD</div><div class="card-subtitle">Stacked bar</div></div></div>
          <div class="card-body"><div style="position:relative;height:260px;"><canvas id="oaChartQuangStack"></canvas></div></div>
        </div>
      </div>

      <div class="section-header">
        <span class="section-header-title">Adoption Alert – PTKD QuangNN3</span>
        <div class="section-header-line"></div>
      </div>
      <div class="kpi-alert-grid" id="oaAlertsQuang"></div>
    </div>

    <!-- Tab: DungLQ1 -->
    <div id="oaPane-dung" style="display:none;">
      <div class="owner-block">
        <div class="owner-block-header dung">
          <i class="fa-solid fa-money-bill-wave" style="font-size:22px;color:var(--cyan);"></i>
          <div>
            <div class="owner-block-title" style="color:var(--cyan);">DungLQ1 – Quản lý sản phẩm Giải ngân</div>
            <div style="font-size:12px;color:var(--text-2);">Theo dõi BIZ Rate – chưa phải chỉ tiêu KPI 2026</div>
          </div>
          <div class="owner-block-meta">
            <div class="owner-stat"><div class="owner-stat-val">${fmtKN(agg.dungTotal)}</div><div class="owner-stat-label">Tổng GD</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--cyan);">${fmtKN(agg.dungBiz)}</div><div class="owner-stat-label">BIZ (Digital)</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--gold);">${fmtKN(agg.dungBpm)}</div><div class="owner-stat-label">BPM (Quầy)</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--danger);">${(agg.dungBiz/agg.dungTotal*100).toFixed(1)}%</div><div class="owner-stat-label">BIZ Rate</div></div>
            <div class="owner-stat"><div class="owner-stat-val" style="color:var(--text-3);">${dungPTKD.length}</div><div class="owner-stat-label">PTKD</div></div>
          </div>
        </div>
        <div class="owner-block-kpi-bar">
          <strong style="color:var(--cyan);">Ghi chú:</strong> GN không thuộc chỉ tiêu KPI 2.1/2.2. Theo dõi BIZ rate để push chuyển đổi digital. &nbsp;|&nbsp;
          <strong>Sheet2 hoàn thành:</strong> ${fmtKN(agg.gnHT1+agg.gnHT2)}/${fmtKN(agg.dungTotal)} (${((agg.gnHT1+agg.gnHT2)/agg.dungTotal*100).toFixed(2)}%) &nbsp;|&nbsp;
          <strong style="color:var(--danger);">⚠ BPM rate ${(agg.dungBpm/agg.dungTotal*100).toFixed(1)}%</strong> – cần tăng cường onboarding Biz Online
        </div>
        <div class="ptkd-grid" id="oaGridDung"></div>
      </div>

      <div class="kpi-chart-grid">
        <div class="card">
          <div class="card-header"><div><div class="card-title">GD theo PTKD – DungLQ1</div><div class="card-subtitle">BIZ vs BPM stacked</div></div></div>
          <div class="card-body"><div style="position:relative;height:260px;"><canvas id="oaChartDungStack"></canvas></div></div>
        </div>
        <div class="card">
          <div class="card-header"><div><div class="card-title">BIZ Rate từng PTKD</div><div class="card-subtitle">% giao dịch qua kênh digital</div></div></div>
          <div class="card-body"><div style="position:relative;height:260px;"><canvas id="oaChartDungRate"></canvas></div></div>
        </div>
      </div>

      <div class="section-header">
        <span class="section-header-title">Adoption Alert – PTKD DungLQ1</span>
        <div class="section-header-line"></div>
      </div>
      <div class="kpi-alert-grid" id="oaAlertsDung"></div>
    </div>

    <!-- Tab: Rankings -->
    <div id="oaPane-rank" style="display:none;">
      <div class="rank-tabs" id="oaRankTabs">
        <div class="rank-tab active" onclick="_oaRankSwitch('quang',this)">🔵 QuangNN3 – Bảo lãnh (KPI 2.1/2.2)</div>
        <div class="rank-tab" onclick="_oaRankSwitch('dung',this)">🟢 DungLQ1 – Giải ngân (Theo dõi)</div>
        <div class="rank-tab" onclick="_oaRankSwitch('sheet2',this)">📋 Sheet2 – GN Hoàn thành</div>
      </div>
      <div id="oaRankPane-quang">
        <div class="card">
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="kpi-table">
                <thead><tr><th>#</th><th>PTKD</th><th class="td-right">BIZ (Digital)</th><th class="td-right">BPM (Quầy)</th><th class="td-right">Tổng GD</th><th class="td-right">Digital Rate</th><th class="td-right">vs KPI 40%</th><th class="td-center">Xếp loại</th></tr></thead>
                <tbody id="oaRankTbody-quang"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div id="oaRankPane-dung" style="display:none;">
        <div class="card">
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="kpi-table">
                <thead><tr><th>#</th><th>PTKD</th><th class="td-right">BIZ (Digital)</th><th class="td-right">BPM (Quầy)</th><th class="td-right">Tổng GD</th><th class="td-right">BIZ Rate</th><th class="td-center">Adoption Level</th></tr></thead>
                <tbody id="oaRankTbody-dung"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div id="oaRankPane-sheet2" style="display:none;">
        <div class="card">
          <div class="card-body" style="padding:0;">
            <div class="table-wrap">
              <table class="kpi-table">
                <thead><tr><th>#</th><th>PTKD</th><th class="td-right">Tổng GD (Sheet2)</th><th class="td-right">GN Hoàn thành</th><th class="td-right">Tỷ lệ HT</th></tr></thead>
                <tbody id="oaRankTbody-sheet2"></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>`;

  _renderOaQuangPane(quangPTKD, KPI_DATA.agg.kpi22Target);
  _renderOaAlerts(quangPTKD, dungPTKD);
  _renderRankTables(quangPTKD, dungPTKD, sheet2PTKD, KPI_DATA.agg.kpi22Target);
}

/* ---- Tab switcher ---- */
function _oaSwitch(tab) {
  _oaActiveTab = tab;
  ['quang','dung','rank'].forEach(t => {
    document.getElementById('oaPane-'+t).style.display = t === tab ? '' : 'none';
    const el = document.getElementById('oaTab-'+t);
    if (el) el.classList.toggle('active', t === tab);
  });
  if (tab === 'dung' && !document.getElementById('oaGridDung').dataset.rendered) {
    _renderOaDungPane(KPI_DATA.dungPTKD);
  }
}

function _oaRankSwitch(id, el) {
  document.querySelectorAll('#oaRankTabs .rank-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  ['quang','dung','sheet2'].forEach(t => {
    document.getElementById('oaRankPane-'+t).style.display = t === id ? '' : 'none';
  });
}

/* ---- QuangNN3 pane ---- */
function _renderOaQuangPane(quangPTKD, kpiTarget) {
  const grid = document.getElementById('oaGridQuang');
  if (grid) {
    grid.innerHTML = quangPTKD.map(x => {
      const ac = kpiAlertClass(x.rate, kpiTarget);
      const rateColor = x.rate >= kpiTarget ? 'var(--success)' : x.rate >= 30 ? 'var(--gold)' : 'var(--danger)';
      const pct = Math.min(100, (x.rate / kpiTarget * 100)).toFixed(0);
      return `<div class="ptkd-card ${ac}">
        <div class="ptkd-name">${x.ptkd}</div>
        <div class="ptkd-total">${fmtKN(x.total)}</div>
        <div class="ptkd-detail">BIZ: <strong style="color:var(--primary);">${fmtKN(x.biz)}</strong> | BPM: ${fmtKN(x.bpm)}</div>
        <div class="ptkd-rate-bar">
          <div class="ptkd-rate-track"><div class="ptkd-rate-fill" style="width:${pct}%;background:${rateColor};"></div></div>
          <div class="ptkd-rate-val" style="color:${rateColor};">${x.rate}% Digital Rate ${x.rate >= kpiTarget ? '✅' : x.rate >= 30 ? '⚠️' : '🔴'}</div>
        </div>
      </div>`;
    }).join('');
  }

  // Charts
  Object.keys(_oaCharts).filter(k => k.startsWith('q')).forEach(k => { try { _oaCharts[k].destroy(); } catch(_) {} });

  const c1 = document.getElementById('oaChartQuangRate');
  if (c1) _oaCharts.qRate = new Chart(c1, {
    type: 'bar',
    data: {
      labels: quangPTKD.map(x => x.ptkd),
      datasets: [
        {
          label: 'Digital Rate %',
          data: quangPTKD.map(x => x.rate),
          backgroundColor: quangPTKD.map(x => x.rate >= kpiTarget ? 'rgba(22,163,74,.85)' : x.rate >= 30 ? 'rgba(245,158,11,.85)' : 'rgba(220,38,38,.85)'),
          borderRadius: 3, order: 1,
        },
        {
          label: `KPI ${kpiTarget}%`,
          data: quangPTKD.map(() => kpiTarget),
          type: 'line', borderColor: 'rgba(75,31,175,.9)',
          borderDash: [5, 3], borderWidth: 2, pointRadius: 0, fill: false, order: 0,
        },
      ],
    },
    options: _oaBarOpts('%', false, 70),
  });

  const c2 = document.getElementById('oaChartQuangStack');
  if (c2) _oaCharts.qStack = new Chart(c2, {
    type: 'bar',
    data: {
      labels: quangPTKD.map(x => x.ptkd),
      datasets: [
        {label:'BIZ', data:quangPTKD.map(x=>x.biz), backgroundColor:'rgba(75,31,175,.85)',  borderRadius:3},
        {label:'BPM', data:quangPTKD.map(x=>x.bpm), backgroundColor:'rgba(245,158,11,.6)',  borderRadius:3},
      ],
    },
    options: _oaBarOpts('GD', true),
  });
}

/* ---- DungLQ1 pane ---- */
function _renderOaDungPane(dungPTKD) {
  const grid = document.getElementById('oaGridDung');
  if (!grid) return;
  grid.dataset.rendered = '1';
  grid.innerHTML = dungPTKD.map(x => {
    const ac = dungAlertClass(x.rate);
    const rateColor = x.rate >= 10 ? 'var(--success)' : x.rate >= 3 ? 'var(--gold)' : 'var(--danger)';
    const pct = Math.min(100, (x.rate / 20 * 100)).toFixed(0);
    return `<div class="ptkd-card ${ac}">
      <div class="ptkd-name">${x.ptkd}</div>
      <div class="ptkd-total">${fmtKN(x.total)}</div>
      <div class="ptkd-detail">BIZ: <strong style="color:var(--cyan);">${fmtKN(x.biz)}</strong> | BPM: ${fmtKN(x.bpm)}</div>
      <div class="ptkd-rate-bar">
        <div class="ptkd-rate-track"><div class="ptkd-rate-fill" style="width:${pct}%;background:${rateColor};"></div></div>
        <div class="ptkd-rate-val" style="color:${rateColor};">${x.rate}% BIZ Rate ${x.rate >= 10 ? '✅' : x.rate >= 3 ? '⚠️' : '🔴'}</div>
      </div>
    </div>`;
  }).join('');

  Object.keys(_oaCharts).filter(k => k.startsWith('d')).forEach(k => { try { _oaCharts[k].destroy(); } catch(_) {} });

  const c1 = document.getElementById('oaChartDungStack');
  if (c1) _oaCharts.dStack = new Chart(c1, {
    type: 'bar',
    data: {
      labels: dungPTKD.map(x => x.ptkd),
      datasets: [
        {label:'BIZ', data:dungPTKD.map(x=>x.biz), backgroundColor:'rgba(8,145,178,.85)',  borderRadius:3},
        {label:'BPM', data:dungPTKD.map(x=>x.bpm), backgroundColor:'rgba(124,58,237,.45)', borderRadius:3},
      ],
    },
    options: _oaBarOpts('GD', true),
  });

  const c2 = document.getElementById('oaChartDungRate');
  if (c2) _oaCharts.dRate = new Chart(c2, {
    type: 'bar',
    data: {
      labels: dungPTKD.map(x => x.ptkd),
      datasets: [{
        label: 'BIZ Rate %',
        data: dungPTKD.map(x => x.rate),
        backgroundColor: dungPTKD.map(x => x.rate >= 10 ? 'rgba(22,163,74,.85)' : x.rate >= 3 ? 'rgba(245,158,11,.85)' : 'rgba(220,38,38,.85)'),
        borderRadius: 3,
      }],
    },
    options: _oaBarOpts('%', false, 20),
  });
}

/* ---- Alert grids ---- */
function _renderOaAlerts(quangPTKD, dungPTKD) {
  const qAlerts = document.getElementById('oaAlertsQuang');
  if (qAlerts) {
    let html = '';
    const critical = quangPTKD.filter(x => x.rate < 30);
    const warning  = quangPTKD.filter(x => x.rate >= 30 && x.rate < 40);
    const ok       = quangPTKD.filter(x => x.rate >= 40);
    critical.forEach(x => {
      html += `<div class="kpi-alert-item alert-critical"><div class="kpi-alert-dot alert-critical"></div><div class="kpi-alert-msg"><strong>${x.ptkd} – Digital Rate ${x.rate}%</strong> (KPI 40%). Cần tăng thêm ${Math.round(0.4 * x.total - x.biz)} GD BIZ để đạt KPI 2.2. GAP: ${(x.rate - 40).toFixed(1)}pp<div class="kpi-alert-meta">🔴 Dưới KPI | Cần hành động ngay</div></div></div>`;
    });
    warning.forEach(x => {
      html += `<div class="kpi-alert-item alert-warning"><div class="kpi-alert-dot alert-warning"></div><div class="kpi-alert-msg"><strong>${x.ptkd} – Digital Rate ${x.rate}%</strong> – Gần KPI 40%, thiếu ${(x.rate - 40).toFixed(1)}pp. Cần thêm ~${Math.abs(Math.round(0.4 * x.total - x.biz))} GD BIZ.<div class="kpi-alert-meta">⚠️ Cảnh báo | Theo dõi sát</div></div></div>`;
    });
    ok.forEach(x => {
      html += `<div class="kpi-alert-item alert-ok"><div class="kpi-alert-dot alert-ok"></div><div class="kpi-alert-msg"><strong>${x.ptkd} – Digital Rate ${x.rate}%</strong> ✅ Đạt KPI 2.2. Vượt target ${(x.rate - 40).toFixed(1)}pp. Tiếp tục duy trì.<div class="kpi-alert-meta">✅ Đạt KPI | Duy trì momentum</div></div></div>`;
    });
    qAlerts.innerHTML = html;
  }

  const dAlerts = document.getElementById('oaAlertsDung');
  if (dAlerts) {
    dAlerts.innerHTML = dungPTKD.map(x => {
      const ac  = dungAlertClass(x.rate);
      const msg = x.rate < 3
        ? `Chỉ ${fmtKN(x.biz)} GD qua BIZ trong tổng ${fmtKN(x.total)} GD. Cần onboarding Biz Online cho khách GN.`
        : x.rate < 10
          ? `BIZ Rate ${x.rate}% – có tiến triển, cần đẩy thêm. BPM: ${fmtKN(x.bpm)} GD.`
          : `BIZ Rate tốt ${x.rate}% – duy trì và tăng cường.`;
      return `<div class="kpi-alert-item ${ac}"><div class="kpi-alert-dot ${ac.replace('alert-','')}"></div><div class="kpi-alert-msg"><strong>${x.ptkd}</strong> – BIZ: ${fmtKN(x.biz)} | BPM: ${fmtKN(x.bpm)} | Rate: ${x.rate}%<br>${msg}<div class="kpi-alert-meta">${ac === 'alert-critical' ? '⚡ Ưu tiên cao' : ac === 'alert-warning' ? '⚠️ Theo dõi' : '✅ Tốt'} | DungLQ1 GN</div></div></div>`;
    }).join('');
  }
}

/* ---- Rank tables ---- */
function _renderRankTables(quangPTKD, dungPTKD, sheet2PTKD, kpiTarget) {
  const qb = document.getElementById('oaRankTbody-quang');
  if (qb) {
    const sorted = [...quangPTKD].sort((a, b) => b.biz - a.biz);
    qb.innerHTML = sorted.map((x, i) => {
      const rk = i < 3 ? `<strong style="color:var(--gold);">#${i+1}</strong>` : `#${i+1}`;
      const gap = (x.rate - kpiTarget).toFixed(1);
      const rateColor = x.rate >= kpiTarget ? 'var(--success)' : x.rate >= 30 ? 'var(--gold)' : 'var(--danger)';
      return `<tr>
        <td>${rk}</td>
        <td class="td-bold">${x.ptkd}</td>
        <td class="td-right td-mono" style="color:var(--primary);font-weight:700;">${fmtKN(x.biz)}</td>
        <td class="td-right td-mono">${fmtKN(x.bpm)}</td>
        <td class="td-right td-mono td-bold">${fmtKN(x.total)}</td>
        <td class="td-right" style="font-weight:700;color:${rateColor};">${x.rate}%</td>
        <td class="td-right" style="color:${gap > 0 ? 'var(--success)' : 'var(--danger)'};">${gap > 0 ? '+' : ''}${gap}pp</td>
        <td class="td-center">${kpiChip(x.rate, kpiTarget)}</td>
      </tr>`;
    }).join('');
  }

  const db = document.getElementById('oaRankTbody-dung');
  if (db) {
    const sorted = [...dungPTKD].sort((a, b) => b.total - a.total);
    db.innerHTML = sorted.map((x, i) => {
      const rk = i < 3 ? `<strong style="color:var(--gold);">#${i+1}</strong>` : `#${i+1}`;
      const rateColor = x.rate >= 10 ? 'var(--success)' : x.rate >= 3 ? 'var(--gold)' : 'var(--danger)';
      return `<tr>
        <td>${rk}</td>
        <td class="td-bold">${x.ptkd}</td>
        <td class="td-right td-mono" style="color:var(--cyan);font-weight:700;">${fmtKN(x.biz)}</td>
        <td class="td-right td-mono">${fmtKN(x.bpm)}</td>
        <td class="td-right td-mono td-bold">${fmtKN(x.total)}</td>
        <td class="td-right" style="font-weight:700;color:${rateColor};">${x.rate}%</td>
        <td class="td-center">${dungChip(x.rate)}</td>
      </tr>`;
    }).join('');
  }

  const s2b = document.getElementById('oaRankTbody-sheet2');
  if (s2b) {
    s2b.innerHTML = sheet2PTKD.map((x, i) => {
      const htRate = (x.ht / x.count * 100).toFixed(1);
      return `<tr>
        <td>#${i+1}</td>
        <td class="td-bold">${x.ptkd}</td>
        <td class="td-right td-mono">${fmtKN(x.count)}</td>
        <td class="td-right td-mono">${fmtKN(x.ht)}</td>
        <td class="td-right" style="color:var(--success);font-weight:700;">${htRate}%</td>
      </tr>`;
    }).join('');
  }
}

/* ---- Chart options helper ---- */
function _oaBarOpts(unit, stacked, yMax) {
  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#8fa3c8', font: { size: 11 } } } },
    scales: {
      x: { stacked: !!stacked, ticks: { color: '#8fa3c8', font: { size: 10 } }, grid: { color: 'rgba(100,120,160,.15)' } },
      y: { stacked: !!stacked, ticks: { color: '#8fa3c8', callback: v => unit === '%' ? v + '%' : v.toLocaleString('vi-VN') }, grid: { color: 'rgba(100,120,160,.15)' } },
    },
  };
  if (yMax) opts.scales.y.max = yMax;
  return opts;
}
