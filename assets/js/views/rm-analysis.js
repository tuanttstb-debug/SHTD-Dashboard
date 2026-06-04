'use strict';
const RM_KPI_RATE = 15; // % KPI tham khảo cho RM

function renderRmAnalysis() {
  const root = document.getElementById('rmAnalysisRoot');
  if (!root) return;

  const { rms } = KPI_DATA;
  const sorted = [...rms]
    .map(r => ({ ...r, rate: r.customers > 0 ? +(r.digital / r.customers * 100).toFixed(1) : 0 }))
    .sort((a, b) => b.rate - a.rate);

  const meet  = sorted.filter(r => r.rate >= RM_KPI_RATE).length;
  const below = sorted.length - meet;
  const avgRate = sorted.length ? +(sorted.reduce((s, r) => s + r.rate, 0) / sorted.length).toFixed(1) : 0;

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">RM Analysis</div>
      <div style="font-size:12px;color:var(--text-3);">Relationship Manager · KPI tham khảo: Digital/KH ≥ ${RM_KPI_RATE}%</div>
    </div></div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:16px 0 20px;">
      <div class="kpi-accent-card accent-success" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">Đạt KPI (≥${RM_KPI_RATE}%)</div>
        <div style="font-size:28px;font-weight:800;color:var(--success);">${meet}</div>
      </div>
      <div class="kpi-accent-card accent-danger" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">Chưa đạt KPI</div>
        <div style="font-size:28px;font-weight:800;color:var(--danger);">${below}</div>
      </div>
      <div class="kpi-accent-card" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">Tỷ lệ TB</div>
        <div style="font-size:28px;font-weight:800;">${avgRate}%</div>
      </div>
      <div class="kpi-accent-card" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">Tổng RM</div>
        <div style="font-size:28px;font-weight:800;">${sorted.length}</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:36px;">#</th>
              <th>RM</th>
              <th style="text-align:right;">Khách hàng</th>
              <th style="text-align:right;">BL Online</th>
              <th style="text-align:right;">GN Online</th>
              <th style="text-align:right;">EGP</th>
              <th style="text-align:right;">Tổng Digital</th>
              <th style="text-align:center;">Tỷ lệ Digital</th>
              <th style="text-align:center;">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map((r, i) => {
              const status = r.rate >= RM_KPI_RATE ? 'ahead'
                : r.rate >= RM_KPI_RATE * 0.7 ? 'on-track'
                : r.rate >= RM_KPI_RATE * 0.5 ? 'behind' : 'critical';
              const isTop3 = i < 3;
              return `<tr ${isTop3 ? 'style="background:var(--success-bg);"' : ''}>
                <td style="color:var(--text-3);font-size:11px;">${isTop3 ? '🏆' : i + 1}</td>
                <td style="font-weight:${isTop3 ? '700' : '500'};">${r.name}</td>
                <td style="text-align:right;font-family:var(--mono);">${r.customers.toLocaleString('vi-VN')}</td>
                <td style="text-align:right;font-family:var(--mono);">${r.blol}</td>
                <td style="text-align:right;font-family:var(--mono);">${r.gnol}</td>
                <td style="text-align:right;font-family:var(--mono);">${r.egp}</td>
                <td style="text-align:right;font-family:var(--mono);font-weight:700;">${r.digital}</td>
                <td style="text-align:center;">
                  <div class="prog-wrap">
                    <div class="prog-bar"><div class="prog-fill" style="width:${Math.min(r.rate / RM_KPI_RATE * 100, 100)}%;background:${_kpProgColor(status)};"></div></div>
                    <span class="prog-pct" style="color:${_kpProgColor(status)};font-weight:700;">${r.rate}%</span>
                  </div>
                </td>
                <td style="text-align:center;"><span class="badge ${status}">${_sLabel(status)}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
