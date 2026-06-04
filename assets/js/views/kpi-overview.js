'use strict';
let _kpiOvChart = null;

function renderKpiOverview() {
  const root = document.getElementById('kpiOverviewRoot');
  if (!root) return;

  const { kpis, summary, months, products } = KPI_DATA;

  const monthRates = months.map((_, m) => {
    const biz = products.BL_Auto.biz[m] + products.BL_E2E.biz[m];
    const total = biz + products.BL_E2E.bpm[m];
    return total > 0 ? +(biz / total * 100).toFixed(1) : 0;
  });

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">KPI Digital Overview</div>
      <div style="font-size:12px;color:var(--text-3);">Kỳ: T1–T6/2026 &nbsp;·&nbsp; Cập nhật 03/06/2026</div>
    </div></div>

    <div class="section-header" style="margin-top:20px;">
      <span class="section-header-title">Chỉ tiêu cam kết 2026</span>
      <div class="section-header-line"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-bottom:24px;">
      ${kpis.map(_kpiOvCard).join('')}
    </div>

    <div class="section-header">
      <span class="section-header-title">Tổng hợp nghiệp vụ</span>
      <div class="section-header-line"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-bottom:24px;">
      <div class="kpi-accent-card accent-purple">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;">
          <i class="fa-solid fa-shield-halved" style="color:var(--purple);margin-right:6px;"></i>Bảo lãnh (BL)
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${_tile('Khách hàng', summary.BL.totalKH.toLocaleString('vi-VN'), '')}
          ${_tile('Tỷ lệ Digital', summary.BL.rate + '%', 'color:var(--purple);')}
          ${_tile('GD Biz Online', summary.BL.bizGD.toLocaleString('vi-VN'), '')}
          ${_tile('KPI 2026', '40% &nbsp;<span class="badge ' + kpiStatusClass(summary.BL.rate, 40) + '">' + _sLabel(kpiStatusClass(summary.BL.rate, 40)) + '</span>', '')}
        </div>
      </div>
      <div class="kpi-accent-card accent-cyan">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;">
          <i class="fa-solid fa-money-bill-wave" style="color:var(--cyan);margin-right:6px;"></i>Giải ngân (GN)
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${_tile('Khách hàng', summary.GN.totalKH.toLocaleString('vi-VN'), '')}
          ${_tile('Tỷ lệ Digital', summary.GN.rate + '%', 'color:var(--cyan);')}
          ${_tile('GD Biz Online', summary.GN.bizGD.toLocaleString('vi-VN'), '')}
          ${_tile('Tham khảo', '15% &nbsp;<span class="badge ' + kpiStatusClass(summary.GN.rate, 15) + '">' + _sLabel(kpiStatusClass(summary.GN.rate, 15)) + '</span>', '')}
        </div>
      </div>
      <div class="kpi-accent-card accent-gold">
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;">
          <i class="fa-solid fa-file-contract" style="color:var(--gold);margin-right:6px;"></i>IDNES
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          ${_tile('Tổng GD', summary.IDNES.totalGD, '')}
          ${_tile('CIF', summary.IDNES.uniqueCIF, 'color:var(--gold);')}
          ${_tile('Chi nhánh', summary.IDNES.branches, '')}
          ${_tile('Trạng thái', '<span class="badge on-track">Đang triển khai</span>', '')}
        </div>
      </div>
    </div>

    <div class="section-header">
      <span class="section-header-title">Xu hướng tỷ lệ Digital BL theo tháng</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card">
      <div style="position:relative;height:240px;"><canvas id="kpiOvCanvas"></canvas></div>
    </div>`;

  if (_kpiOvChart) { _kpiOvChart.destroy(); _kpiOvChart = null; }
  const ctx = document.getElementById('kpiOvCanvas');
  if (!ctx) return;
  _kpiOvChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [
        { label: 'Tỷ lệ Digital BL (%)', data: monthRates,
          borderColor: '#4B1FAF', backgroundColor: 'rgba(75,31,175,0.08)',
          borderWidth: 2, pointRadius: 5, tension: 0.3, fill: true },
        { label: 'KPI 40%', data: months.map(() => 40),
          borderColor: '#DC2626', borderWidth: 1.5, borderDash: [6, 3],
          pointRadius: 0, fill: false },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { min: 0, max: 60, ticks: { callback: v => v + '%' } } },
    },
  });
}

function _kpiOvCard(kpi) {
  const pct = +(kpi.actual / kpi.kpi2026 * 100).toFixed(1);
  const status = kpiStatusClass(kpi.actual, kpi.kpi2026);
  const fmt = v => kpi.unit === '%' ? v + '%' : v.toLocaleString('vi-VN');
  const colorMap = { ahead: 'var(--success)', 'on-track': 'var(--info)', behind: 'var(--gold)', critical: 'var(--danger)' };
  return `
    <div class="exec-summary">
      <div class="exec-summary-header">
        <div class="exec-summary-icon" style="background:var(--primary-xlight);color:var(--primary);">
          <i class="fa-solid fa-bullseye"></i>
        </div>
        <div>
          <div class="exec-summary-title">${kpi.name}</div>
          <div class="exec-summary-subtitle">Trọng số: ${kpi.weight} &nbsp;·&nbsp; Đơn vị: ${kpi.unit}</div>
        </div>
        <span class="badge ${status}" style="margin-left:auto;">${_sLabel(status)}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px;text-align:center;">
        ${_tile('Thực tế YTD', fmt(kpi.actual), 'font-size:20px;font-weight:800;')}
        ${_tile('Chỉ tiêu 2026', fmt(kpi.kpi2026), 'font-size:20px;font-weight:800;color:var(--text-2);')}
        ${_tile('Đạt %', pct + '%', 'font-size:20px;font-weight:800;color:' + colorMap[status] + ';')}
        ${_tile('Dự báo', fmt(kpi.forecast), 'font-size:20px;font-weight:800;color:var(--text-2);')}
      </div>
      <div class="bullet-track" style="height:18px;">
        <div class="bullet-fill fill-${status}" style="width:${Math.min(pct, 100)}%;height:100%;"></div>
        <div class="bullet-target" style="left:100%;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:5px;">
        <span style="font-size:10px;color:var(--text-3);">0</span>
        <span style="font-size:10px;color:var(--text-3);">${fmt(kpi.kpi2026)}</span>
      </div>
      <div style="font-size:11px;color:var(--text-3);margin-top:8px;line-height:1.5;">${kpi.note}</div>
    </div>`;
}

function _tile(label, value, style) {
  return `<div><div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">${label}</div>
    <div style="font-size:15px;font-weight:700;${style}">${value}</div></div>`;
}

function _sLabel(s) {
  return { ahead: 'Vượt KPI', 'on-track': 'Đạt KPI', behind: 'Cần theo dõi', critical: 'Nguy hiểm' }[s] || s;
}
