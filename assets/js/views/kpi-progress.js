'use strict';
let _kpiProdChart = null;

function renderKpiProgress() {
  const root = document.getElementById('kpiProgressRoot');
  if (!root) return;

  const { products, months } = KPI_DATA;
  const prods = Object.values(products);

  const rows = prods.map(p => {
    const ytdBiz = kpiTotalBiz(p.id);
    const ytdBpm = kpiTotalBpm(p.id);
    const total  = ytdBiz + ytdBpm;
    const rate   = total > 0 ? +(ytdBiz / total * 100).toFixed(1) : null;
    const status = p.hasRateKPI && rate !== null ? kpiStatusClass(rate, p.kpiRate) : null;
    return { ...p, ytdBiz, ytdBpm, total, rate, status };
  });

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">KPI Progress</div>
      <div style="font-size:12px;color:var(--text-3);">Tiến độ từng sản phẩm Digital · Kỳ T1–T6/2026</div>
    </div></div>

    <div class="section-header" style="margin-top:20px;">
      <span class="section-header-title">Tổng hợp YTD</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card" style="margin-bottom:20px;padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sản phẩm</th><th>Nhóm</th><th>Owner</th>
              <th style="text-align:right;">GD Biz</th>
              <th style="text-align:right;">GD BPM</th>
              <th style="text-align:right;">Tổng GD</th>
              <th style="text-align:right;">Tỷ lệ Digital</th>
              <th style="text-align:center;">KPI</th>
              <th style="text-align:center;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>
              <td style="font-weight:600;">${r.name}</td>
              <td><span class="type-pill">${r.group}</span></td>
              <td style="color:var(--text-2);">${r.owner}</td>
              <td style="text-align:right;font-family:var(--mono);">${r.ytdBiz.toLocaleString('vi-VN')}</td>
              <td style="text-align:right;font-family:var(--mono);">${r.ytdBpm.toLocaleString('vi-VN')}</td>
              <td style="text-align:right;font-family:var(--mono);font-weight:700;">${r.total.toLocaleString('vi-VN')}</td>
              <td style="text-align:right;">
                ${r.rate !== null
                  ? `<span style="font-weight:700;color:${r.status ? _kpProgColor(r.status) : 'var(--text)'};">${r.rate}%</span>`
                  : '<span style="color:var(--text-3);">–</span>'}
              </td>
              <td style="text-align:center;">
                ${r.hasRateKPI && r.kpiRate ? r.kpiRate + '%' : '<span style="color:var(--text-3);">–</span>'}
              </td>
              <td style="text-align:center;">
                ${r.status ? `<span class="badge ${r.status}">${_sLabel(r.status)}</span>` : '–'}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="section-header">
      <span class="section-header-title">Tỷ lệ Digital theo tháng</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card">
      <div style="position:relative;height:280px;"><canvas id="kpiProdCanvas"></canvas></div>
    </div>`;

  if (_kpiProdChart) { _kpiProdChart.destroy(); _kpiProdChart = null; }
  const ctx = document.getElementById('kpiProdCanvas');
  if (!ctx) return;

  const palette = ['#4B1FAF', '#0891B2', '#F59E0B', '#16A34A', '#DC2626'];
  const datasets = prods
    .filter(p => p.hasRateKPI)
    .map((p, i) => ({
      label: p.name,
      data: months.map((_, m) => +(kpiMonthlyRate(p.id, m)).toFixed(1)),
      borderColor: palette[i % palette.length],
      borderWidth: 2, pointRadius: 4, tension: 0.3, fill: false,
    }));
  datasets.push({
    label: 'KPI 40%',
    data: months.map(() => 40),
    borderColor: '#DC2626', borderWidth: 1.5, borderDash: [6, 3], pointRadius: 0, fill: false,
  });

  _kpiProdChart = new Chart(ctx, {
    type: 'line',
    data: { labels: months, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { min: 0, max: 120, ticks: { callback: v => v + '%' } } },
    },
  });
}

function _kpProgColor(s) {
  return { ahead: 'var(--success)', 'on-track': 'var(--info)', behind: 'var(--gold)', critical: 'var(--danger)' }[s] || 'var(--text)';
}
