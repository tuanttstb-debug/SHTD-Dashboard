'use strict';
let _ownerChart = null;

function renderOwnerAnalysis() {
  const root = document.getElementById('ownerAnalysisRoot');
  if (!root) return;

  const { products, months } = KPI_DATA;
  const prods = Object.values(products);

  const owners = [
    { name: 'QuangNN3', label: 'Bảo lãnh (BL)', color: '#4B1FAF', bgVar: 'var(--primary-xlight)', icon: 'fa-shield-halved' },
    { name: 'DungLQ1',  label: 'Giải ngân (GN)', color: '#0891B2', bgVar: 'var(--cyan-bg)',        icon: 'fa-money-bill-wave' },
  ];

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">Owner Analysis</div>
      <div style="font-size:12px;color:var(--text-3);">Phân tích theo chủ sở hữu sản phẩm · Kỳ T1–T6/2026</div>
    </div></div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:20px;margin-top:20px;margin-bottom:24px;">
      ${owners.map(o => _ownerPanel(o, prods)).join('')}
    </div>

    <div class="section-header">
      <span class="section-header-title">So sánh GD Biz Online theo tháng</span>
      <div class="section-header-line"></div>
    </div>
    <div class="card">
      <div style="position:relative;height:260px;"><canvas id="ownerCanvas"></canvas></div>
    </div>`;

  if (_ownerChart) { _ownerChart.destroy(); _ownerChart = null; }
  const ctx = document.getElementById('ownerCanvas');
  if (!ctx) return;

  const blMonthly = months.map((_, m) =>
    prods.filter(p => p.owner === 'QuangNN3').reduce((s, p) => s + p.biz[m], 0));
  const gnMonthly = months.map((_, m) =>
    prods.filter(p => p.owner === 'DungLQ1').reduce((s, p) => s + p.biz[m], 0));

  _ownerChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: months,
      datasets: [
        { label: 'BL – QuangNN3', data: blMonthly, backgroundColor: 'rgba(75,31,175,0.7)', borderRadius: 4 },
        { label: 'GN – DungLQ1',  data: gnMonthly, backgroundColor: 'rgba(8,145,178,0.7)',  borderRadius: 4 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { x: { stacked: false }, y: { ticks: { callback: v => v.toLocaleString('vi-VN') } } },
    },
  });
}

function _ownerPanel(o, prods) {
  const myProds = prods.filter(p => p.owner === o.name);
  const totalBiz = myProds.reduce((s, p) => s + kpiTotalBiz(p.id), 0);
  const totalBpm = myProds.reduce((s, p) => s + kpiTotalBpm(p.id), 0);
  const total    = totalBiz + totalBpm;
  const rate     = total > 0 ? +(totalBiz / total * 100).toFixed(1) : 0;
  const totalCust = myProds.reduce((s, p) => s + p.cust.reduce((a, b) => a + b, 0), 0);

  return `
    <div class="exec-summary">
      <div class="exec-summary-header">
        <div class="exec-summary-icon" style="background:${o.bgVar};color:${o.color};">
          <i class="fa-solid ${o.icon}"></i>
        </div>
        <div>
          <div class="exec-summary-title">${o.name}</div>
          <div class="exec-summary-subtitle">${o.label} · ${myProds.length} sản phẩm</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
        <div style="text-align:center;">
          <div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">GD Biz Online</div>
          <div style="font-size:22px;font-weight:800;">${totalBiz.toLocaleString('vi-VN')}</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">Tỷ lệ Digital</div>
          <div style="font-size:22px;font-weight:800;color:${o.color};">${rate}%</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">Khách hàng</div>
          <div style="font-size:22px;font-weight:800;">${totalCust.toLocaleString('vi-VN')}</div>
        </div>
      </div>
      <div class="section-header" style="margin-bottom:10px;">
        <span class="section-header-title">Chi tiết sản phẩm</span>
        <div class="section-header-line"></div>
      </div>
      ${myProds.map(p => {
        const b = kpiTotalBiz(p.id), pm = kpiTotalBpm(p.id), tot = b + pm;
        const r = tot > 0 ? +(b / tot * 100).toFixed(1) : null;
        const s = p.hasRateKPI && r !== null ? kpiStatusClass(r, p.kpiRate) : null;
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;">${p.name}</div>
            <div style="font-size:11px;color:var(--text-3);">BIZ: ${b.toLocaleString('vi-VN')} &nbsp;·&nbsp; BPM: ${pm.toLocaleString('vi-VN')}</div>
          </div>
          ${r !== null ? `<div style="font-weight:700;font-size:14px;color:${s ? _kpProgColor(s) : 'var(--text)'};">${r}%</div>` : '<div style="color:var(--text-3);">–</div>'}
          ${s ? `<span class="badge ${s}">${_sLabel(s)}</span>` : ''}
        </div>`;
      }).join('')}
    </div>`;
}
