'use strict';
let _branchZone = '';

function renderBranchAnalysis(zone) {
  if (zone !== undefined) _branchZone = zone;
  const root = document.getElementById('branchAnalysisRoot');
  if (!root) return;

  const { branches } = KPI_DATA;
  const zones = [
    { key: '',        label: t('common.all'),            count: branches.length },
    { key: 'north',   label: t('branch.zone.north'),     count: branches.filter(b => b.zone === 'north').length },
    { key: 'south',   label: t('branch.zone.south'),     count: branches.filter(b => b.zone === 'south').length },
    { key: 'central', label: t('branch.zone.central'),   count: branches.filter(b => b.zone === 'central').length },
  ];
  const filtered = _branchZone ? branches.filter(b => b.zone === _branchZone) : [...branches];
  filtered.sort((a, b) => b.biz - a.biz);

  const meet  = filtered.filter(b => b.rate >= b.kpi).length;
  const below = filtered.length - meet;

  root.innerHTML = `
    <div class="toolbar"><div class="toolbar-left">
      <div style="font-size:17px;font-weight:800;">Branch Analysis</div>
      <div style="font-size:12px;color:var(--text-3);">Top chi nhánh theo GD Biz Online · KPI tỷ lệ Digital ${filtered[0]?.kpi ?? 40}%</div>
    </div></div>

    <div style="display:flex;gap:8px;margin:16px 0;flex-wrap:wrap;">
      ${zones.map(z => `<button class="btn ${_branchZone === z.key ? 'btn-secondary' : 'btn-outline'} btn-sm"
        onclick="renderBranchAnalysis('${z.key}')">${z.label} <span style="opacity:.7;">(${z.count})</span></button>`).join('')}
    </div>

    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;">
      <div class="kpi-accent-card accent-success" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">${t('branch.stat.meet')} (≥${filtered[0]?.kpi ?? 40}%)</div>
        <div style="font-size:28px;font-weight:800;color:var(--success);">${meet}</div>
      </div>
      <div class="kpi-accent-card accent-danger" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">${t('branch.stat.below')}</div>
        <div style="font-size:28px;font-weight:800;color:var(--danger);">${below}</div>
      </div>
      <div class="kpi-accent-card" style="text-align:center;">
        <div style="font-size:10px;color:var(--text-3);">${t('branch.stat.total')}</div>
        <div style="font-size:28px;font-weight:800;">${filtered.length}</div>
      </div>
    </div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:36px;">#</th>
              <th>${t('branch.col.code')}</th>
              <th>${t('branch.col.name')}</th>
              <th>${t('branch.col.zone')}</th>
              <th style="text-align:right;">GD Biz</th>
              <th style="text-align:right;">GD BPM</th>
              <th style="text-align:right;">${t('branch.col.total-gd')}</th>
              <th style="text-align:center;">Tỷ lệ Digital</th>
              <th style="text-align:center;">KPI</th>
              <th style="text-align:center;">${t('branch.col.status')}</th>
            </tr>
          </thead>
          <tbody>
            ${filtered.map((b, i) => {
              const status = b.rate >= b.kpi ? 'ahead' : b.rate >= b.kpi * 0.75 ? 'on-track' : b.rate >= b.kpi * 0.5 ? 'behind' : 'critical';
              const zoneLabel = { north: t('branch.zone.north-short'), south: t('branch.zone.south-short'), central: t('branch.zone.central-short') }[b.zone] || b.zone;
              return `<tr>
                <td style="color:var(--text-3);font-size:11px;">${i + 1}</td>
                <td><span class="type-pill">${b.code}</span></td>
                <td style="font-weight:600;font-size:12px;">${b.name}</td>
                <td><span class="type-pill">${zoneLabel}</span></td>
                <td style="text-align:right;font-family:var(--mono);">${b.biz.toLocaleString('vi-VN')}</td>
                <td style="text-align:right;font-family:var(--mono);color:var(--text-2);">${b.bpm.toLocaleString('vi-VN')}</td>
                <td style="text-align:right;font-family:var(--mono);font-weight:700;">${(b.biz + b.bpm).toLocaleString('vi-VN')}</td>
                <td style="text-align:center;">
                  <span style="font-weight:700;color:${_kpProgColor(status)};">${b.rate}%</span>
                </td>
                <td style="text-align:center;color:var(--text-3);">${b.kpi}%</td>
                <td style="text-align:center;"><span class="badge ${status}">${_sLabel(status)}</span></td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}
