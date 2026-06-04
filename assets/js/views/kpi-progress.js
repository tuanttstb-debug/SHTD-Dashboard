'use strict';
const _progCharts = {};

function renderKpiProgress() {
  const root = document.getElementById('kpiProgressRoot');
  if (!root) return;

  const { agg, quangPTKD, dungPTKD } = KPI_DATA;
  const pct21 = (agg.kpi21Actual / agg.kpi21Target * 100).toFixed(1);
  const pct22 = (agg.kpi22Actual / agg.kpi22Target * 100).toFixed(1);

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">KPI Progress</div>
      <div style="font-size:12px;color:var(--text-3);">Phân tích chi tiết KPI 2.1 &amp; 2.2 · Kỳ T1–T6/2026</div>
    </div></div>

    <!-- KPI 2.1 + 2.2 comparison cards -->
    <div class="kpi-compare-grid" style="margin-top:20px;">
      <div class="kpi-compare-card">
        <div class="kpi-compare-title" style="color:var(--gold);">
          <i class="fa-solid fa-bullseye" style="margin-right:6px;"></i>KPI 2.1 – Số lượng GD Bảo lãnh Biz Online
        </div>
        <div class="kpi-meter">
          <div class="kpi-meter-row">
            <span class="kpi-meter-actual" style="color:var(--gold);">${fmtKN(agg.kpi21Actual)}</span>
            <span class="kpi-meter-target">Target: ${fmtKN(agg.kpi21Target)} GD</span>
          </div>
          <div class="kpi-meter-track"><div class="kpi-meter-fill fill-gold" style="width:${pct21}%;"></div></div>
          <div class="kpi-meter-pct">Đạt <strong style="color:var(--gold);">${pct21}%</strong> &nbsp;·&nbsp; GAP: <strong style="color:var(--danger);">-${fmtKN(agg.kpi21Target-agg.kpi21Actual)} GD</strong> &nbsp;·&nbsp; Forecast 2026: <strong>~${fmtKN(agg.kpi21Forecast)} GD</strong></div>
        </div>
        <div class="channel-split">
          <div class="channel-pill">
            <div class="channel-pill-val" style="color:var(--primary);">${fmtKN(agg.quangBiz)}</div>
            <div class="channel-pill-label">BIZ (Digital)</div>
          </div>
          <div class="channel-pill">
            <div class="channel-pill-val" style="color:var(--gold);">${fmtKN(agg.quangBpm)}</div>
            <div class="channel-pill-label">BPM (Quầy)</div>
          </div>
          <div class="channel-pill">
            <div class="channel-pill-val">${fmtKN(agg.quangTotal)}</div>
            <div class="channel-pill-label">Tổng BL</div>
          </div>
        </div>
      </div>

      <div class="kpi-compare-card">
        <div class="kpi-compare-title" style="color:var(--danger);">
          <i class="fa-solid fa-percent" style="margin-right:6px;"></i>KPI 2.2 – Tỷ lệ Bảo lãnh Digital
        </div>
        <div class="kpi-meter">
          <div class="kpi-meter-row">
            <span class="kpi-meter-actual" style="color:var(--danger);">${agg.kpi22Actual}%</span>
            <span class="kpi-meter-target">Target: ${agg.kpi22Target}%</span>
          </div>
          <div class="kpi-meter-track"><div class="kpi-meter-fill fill-red" style="width:${pct22}%;"></div></div>
          <div class="kpi-meter-pct">Đạt <strong style="color:var(--danger);">${pct22}%</strong> của KPI &nbsp;·&nbsp; GAP: <strong style="color:var(--danger);">-${(agg.kpi22Target-agg.kpi22Actual).toFixed(1)}pp</strong> &nbsp;·&nbsp; Cần thêm 489 GD BIZ để đạt ${agg.kpi22Target}%</div>
        </div>
        <div class="kpi-meter" style="margin-top:6px;">
          <div style="font-size:11px;color:var(--text-2);margin-bottom:8px;">Phân tích GAP: Để đạt KPI 2.2 = ${agg.kpi22Target}%</div>
          <div style="font-size:12px;color:var(--text-2);line-height:1.8;">
            • Cần tổng BL BIZ = <strong style="color:var(--primary);">5,953</strong> (thêm 488 GD)<br>
            • Hoặc giảm BL BPM xuống còn <strong style="color:var(--gold);">8,194</strong> (chuyển 1,224 GD)
          </div>
        </div>
      </div>
    </div>

    <!-- PTKD table QuangNN3 -->
    <div class="section-header">
      <span class="section-header-title">PTKD vs KPI 2.1/2.2 – QuangNN3 (Bảo lãnh)</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <div class="card-body" style="padding:0;overflow:hidden;">
        <div class="table-wrap">
          <table class="kpi-table">
            <thead><tr>
              <th>PTKD</th>
              <th class="td-right">GD BIZ (Digital)</th>
              <th class="td-right">GD BPM (Quầy)</th>
              <th class="td-right">Tổng GD</th>
              <th class="td-right">Digital Rate</th>
              <th class="td-right">vs KPI 2.2 (${agg.kpi22Target}%)</th>
              <th class="td-right">Đóng góp KPI 2.1</th>
              <th class="td-center">Adoption</th>
            </tr></thead>
            <tbody>
              ${quangPTKD.map(x => {
                const gap = (x.rate - agg.kpi22Target).toFixed(1);
                const contrib = (x.biz / agg.kpi21Actual * 100).toFixed(1);
                const rateColor = x.rate >= agg.kpi22Target ? 'var(--success)' : x.rate >= 30 ? 'var(--gold)' : 'var(--danger)';
                return `<tr>
                  <td class="td-bold">${x.ptkd}</td>
                  <td class="td-right td-bold td-mono">${fmtKN(x.biz)}</td>
                  <td class="td-right td-mono">${fmtKN(x.bpm)}</td>
                  <td class="td-right td-bold td-mono">${fmtKN(x.total)}</td>
                  <td class="td-right" style="font-weight:700;color:${rateColor};">${x.rate}%</td>
                  <td class="td-right" style="color:${gap > 0 ? 'var(--success)' : 'var(--danger)'};">${gap > 0 ? '+' : ''}${gap}pp</td>
                  <td class="td-right">${contrib}%</td>
                  <td class="td-center">${kpiChip(x.rate, agg.kpi22Target)}</td>
                </tr>`;
              }).join('')}
              <tr style="background:var(--surface2);font-weight:700;">
                <td class="td-bold">TỔNG / TB</td>
                <td class="td-right td-mono" style="color:var(--primary);">${fmtKN(agg.quangBiz)}</td>
                <td class="td-right td-mono">${fmtKN(agg.quangBpm)}</td>
                <td class="td-right td-mono">${fmtKN(agg.quangTotal)}</td>
                <td class="td-right" style="color:var(--danger);">${agg.kpi22Actual}%</td>
                <td class="td-right" style="color:var(--danger);">-${(agg.kpi22Target-agg.kpi22Actual).toFixed(1)}pp</td>
                <td class="td-right">100%</td>
                <td class="td-center">${kpiChip(agg.kpi22Actual)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Digital rate chart -->
    <div class="section-header">
      <span class="section-header-title">So sánh Digital Rate theo PTKD (QuangNN3)</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <div class="card-body"><div style="position:relative;height:280px;"><canvas id="progChartRate"></canvas></div></div>
    </div>

    <!-- DungLQ1 table -->
    <div class="section-header">
      <span class="section-header-title">GD theo Kênh – DungLQ1 (Giải ngân, không thuộc KPI 2.1/2.2)</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card" style="margin-bottom:20px;">
      <div class="card-body" style="padding:0;overflow:hidden;">
        <div class="table-wrap">
          <table class="kpi-table">
            <thead><tr>
              <th>PTKD</th>
              <th class="td-right">GD BIZ</th>
              <th class="td-right">GD BPM</th>
              <th class="td-right">Tổng GD</th>
              <th class="td-right">BIZ Rate</th>
              <th class="td-center">Adoption Level</th>
            </tr></thead>
            <tbody>
              ${dungPTKD.map(x => {
                const rateColor = x.rate >= 10 ? 'var(--success)' : x.rate >= 3 ? 'var(--gold)' : 'var(--danger)';
                return `<tr>
                  <td class="td-bold">${x.ptkd}</td>
                  <td class="td-right td-bold td-mono" style="color:var(--cyan);">${fmtKN(x.biz)}</td>
                  <td class="td-right td-mono">${fmtKN(x.bpm)}</td>
                  <td class="td-right td-bold td-mono">${fmtKN(x.total)}</td>
                  <td class="td-right" style="color:${rateColor};font-weight:700;">${x.rate}%</td>
                  <td class="td-center">${dungChip(x.rate)}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;

  _renderProgCharts(quangPTKD, agg.kpi22Target);
}

function _renderProgCharts(quangPTKD, kpiTarget) {
  Object.values(_progCharts).forEach(c => { try { c.destroy(); } catch(_) {} });

  const ctx = document.getElementById('progChartRate');
  if (!ctx) return;
  _progCharts.rate = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: quangPTKD.map(x => x.ptkd),
      datasets: [
        {
          label: 'Digital Rate (%)',
          data: quangPTKD.map(x => x.rate),
          backgroundColor: quangPTKD.map(x => x.rate >= kpiTarget ? 'rgba(22,163,74,.85)' : x.rate >= 30 ? 'rgba(245,158,11,.85)' : 'rgba(220,38,38,.85)'),
          borderRadius: 3,
          order: 1,
        },
        {
          label: `KPI Target ${kpiTarget}%`,
          data: quangPTKD.map(() => kpiTarget),
          type: 'line',
          borderColor: 'rgba(75,31,175,.9)',
          borderDash: [5, 3],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          order: 0,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#8fa3c8', font: { size: 11 } } } },
      scales: {
        x: { ticks: { color: '#8fa3c8', font: { size: 10 } }, grid: { color: 'rgba(100,120,160,.15)' } },
        y: { max: 70, ticks: { color: '#8fa3c8', callback: v => v + '%' }, grid: { color: 'rgba(100,120,160,.15)' } },
      },
    },
  });
}

function _kpProgColor(s) {
  return { ahead: 'var(--success)', 'on-track': 'var(--info)', behind: 'var(--gold)', critical: 'var(--danger)' }[s] || 'var(--text)';
}
