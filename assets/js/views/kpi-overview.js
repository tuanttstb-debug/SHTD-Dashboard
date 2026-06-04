'use strict';
const _ovCharts = {};

function renderKpiOverview() {
  const root = document.getElementById('kpiOverviewRoot');
  if (!root) return;

  const { agg, quangPTKD, dungPTKD } = getKpiData();
  const sortedByRate = [...quangPTKD].sort((a, b) => b.rate - a.rate);
  const topPTKD      = sortedByRate.slice(0, 2);
  const worstPTKD    = [...sortedByRate].reverse().slice(0, 2);
  const monthsLeft   = 12 - ((KPI_DATA.kpis[0] && KPI_DATA.kpis[0].ytdMonth) || 5);
  const needPerMonth = monthsLeft > 0 ? Math.round((agg.kpi21Target - agg.kpi21Actual) / monthsLeft) : 0;
  const bizGapFor22  = Math.max(0, Math.round(agg.quangTotal * agg.kpi22Target / 100 - agg.quangBiz));

  root.innerHTML = `
    <div class="toolbar">
      <div class="toolbar-left">
        <div style="font-size:17px;font-weight:800;">KPI Digital Overview</div>
        <div style="font-size:12px;color:var(--text-3);">${KPI_LIVE_TS ? 'File raw · ' + _kpiFmtTs(KPI_LIVE_TS) : 'Kỳ: T1–T6/2026 · Dữ liệu cứng 03/06/2026'}</div>
      </div>
      <div class="toolbar-right">
        <input type="file" id="ovRawInput" accept=".xlsx,.xls" style="display:none;" onchange="kpiLoadRawFile(event)">
        <button class="btn btn-outline btn-sm" onclick="document.getElementById('ovRawInput').click()"><i class="fa-solid fa-file-arrow-up"></i> Load File Raw</button>
        <button class="btn btn-outline btn-sm" id="ovSyncBtn" style="${KPI_LIVE_TS ? '' : 'display:none;'}" onclick="kpiSyncToSheet()"><i class="fa-solid fa-cloud-arrow-up"></i> Sync GG Sheet</button>
        <button class="btn btn-outline btn-sm" onclick="kpiLoadFromSheet()"><i class="fa-solid fa-cloud-arrow-down"></i> Từ GG Sheet</button>
      </div>
    </div>

    <!-- 6 KPI cards -->
    <div class="kpi-ov-grid" style="margin-top:20px;">
      ${_ovCard('Tổng Giao dịch','blue', fmtKN(agg.totalGD),
        `BIZ: ${fmtKN(agg.bizTotal)} | BPM: ${fmtKN(agg.bpmTotal)}`,
        'Sheet1 – tất cả sản phẩm','fa-solid fa-chart-bar','var(--primary)')}
      ${_ovCard('KPI 2.1 – BL Biz Online','gold', fmtKN(agg.kpi21Actual),
        `▼ ${(agg.kpi21Actual/agg.kpi21Target*100).toFixed(1)}% vs target ${fmtKN(agg.kpi21Target)} GD`,
        `GAP: -${fmtKN(agg.kpi21Target-agg.kpi21Actual)} GD | Forecast: ~${fmtKN(agg.kpi21Forecast)}/năm`,
        'fa-solid fa-bullseye','var(--gold)','neg')}
      ${_ovCard('KPI 2.2 – Digital Rate BL','red', agg.kpi22Actual + '%',
        `▼ -${(agg.kpi22Target-agg.kpi22Actual).toFixed(1)}pp vs KPI ${agg.kpi22Target}%`,
        `${fmtKN(agg.quangBiz)} BL Biz / ${fmtKN(agg.quangTotal)} BL tổng`,
        'fa-solid fa-percent','var(--danger)','neg')}
      ${_ovCard('QuangNN3 – Bảo lãnh','green', fmtKN(agg.quangTotal),
        `BIZ: ${fmtKN(agg.quangBiz)} | BPM: ${fmtKN(agg.quangBpm)}`,
        `${quangPTKD.length} PTKD phụ trách | KPI 2.1 + 2.2`,
        'fa-solid fa-shield-halved','var(--success)','pos')}
      ${_ovCard('DungLQ1 – Giải ngân','cyan', fmtKN(agg.dungTotal),
        `BIZ: ${fmtKN(agg.dungBiz)} | BPM: ${fmtKN(agg.dungBpm)}`,
        `${dungPTKD.length} PTKD phụ trách | Theo dõi, chưa KPI`,
        'fa-solid fa-money-bill-wave','var(--cyan)','neu')}
      ${_ovCard('GN Hoàn thành (Sheet2)','purple', fmtKN(agg.gnHT1+agg.gnHT2),
        `✓ HT Chuyển tiền: ${fmtKN(agg.gnHT1)} | HT: ${fmtKN(agg.gnHT2)}`,
        `Pending: ${agg.gnPending} (DXGN Chờ bổ sung)`,
        'fa-solid fa-circle-check','var(--purple)','pos')}
    </div>

    <!-- Exec insights -->
    <div class="kpi-insight-panel">
      <div class="kpi-insight-title"><i class="fa-solid fa-bolt" style="margin-right:6px;"></i>Executive Insight – Số liệu thực tế từ File_cấu_trúc_chung.xlsx</div>
      <div class="kpi-insight-grid">
        <div class="kpi-insight-item"><span class="kpi-insight-bullet" style="color:var(--gold);">⚠</span><span><strong>KPI 2.1 – SLGD BL Biz:</strong> Thực tế ${fmtKN(agg.kpi21Actual)} GD (${(agg.kpi21Actual/agg.kpi21Target*100).toFixed(1)}% target ${fmtKN(agg.kpi21Target)}). Forecast cuối năm ~${fmtKN(agg.kpi21Forecast)} GD – không đạt KPI. Cần tăng ~${fmtKN(needPerMonth)} GD/tháng trong ${monthsLeft} tháng còn lại.</span></div>
        <div class="kpi-insight-item"><span class="kpi-insight-bullet" style="color:var(--danger);">▼</span><span><strong>KPI 2.2 – Digital Rate BL:</strong> ${agg.kpi22Actual}% vs KPI ${agg.kpi22Target}% (GAP -${(agg.kpi22Target-agg.kpi22Actual).toFixed(1)}pp). QuangNN3 cần chuyển thêm ~${fmtKN(bizGapFor22)} GD từ BPM sang BIZ để đạt ${agg.kpi22Target}%.</span></div>
        <div class="kpi-insight-item"><span class="kpi-insight-bullet" style="color:var(--success);">▲</span><span><strong>PTKD tốt nhất (QuangNN3):</strong> ${topPTKD[0]?.ptkd} dẫn đầu digital rate ${topPTKD[0]?.rate}%, ${topPTKD[1]?.ptkd} ${topPTKD[1]?.rate}%. Các PTKD yếu: ${worstPTKD[0]?.ptkd} ${worstPTKD[0]?.rate}%, ${worstPTKD[1]?.ptkd} ${worstPTKD[1]?.rate}%.</span></div>
        <div class="kpi-insight-item"><span class="kpi-insight-bullet" style="color:var(--cyan);">ℹ</span><span><strong>DungLQ1 (GN):</strong> ${fmtKN(agg.dungTotal)} GD – BIZ chỉ ${(agg.dungBiz/agg.dungTotal*100).toFixed(1)}% (${fmtKN(agg.dungBiz)}/${fmtKN(agg.dungTotal)}). ${fmtKN(agg.dungBpm)} GD vẫn qua BPM (quầy). Cần push chuyển đổi BPM→BIZ.</span></div>
        <div class="kpi-insight-item"><span class="kpi-insight-bullet" style="color:var(--purple);">★</span><span><strong>Kênh BPM vs BIZ:</strong> BPM chiếm ${(agg.bpmTotal/agg.totalGD*100).toFixed(1)}% tổng GD (${fmtKN(agg.bpmTotal)}/${fmtKN(agg.totalGD)}). DungLQ1 BPM=${(agg.dungBpm/agg.dungTotal*100).toFixed(1)}%, QuangNN3 BPM=${(agg.quangBpm/agg.quangTotal*100).toFixed(1)}% – cần đẩy digital hóa.</span></div>
        <div class="kpi-insight-item"><span class="kpi-insight-bullet" style="color:var(--gold);">◆</span><span><strong>Sheet2 GN Hoàn thành:</strong> ${fmtKN(agg.gnHT1+agg.gnHT2)}/${fmtKN(agg.dungTotal)} GD hoàn thành (${((agg.gnHT1+agg.gnHT2)/agg.dungTotal*100).toFixed(2)}%). "HT Chuyển tiền" ${(agg.gnHT1/(agg.gnHT1+agg.gnHT2)*100).toFixed(1)}% vs "HT" thông thường ${(agg.gnHT2/(agg.gnHT1+agg.gnHT2)*100).toFixed(1)}%.</span></div>
      </div>
    </div>

    <!-- Charts row -->
    <div class="section-header">
      <span class="section-header-title">Biểu đồ phân tích</span>
      <div class="section-header-line"></div>
    </div>
    <div class="kpi-chart-grid">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Phân bổ GD theo Kênh &amp; Owner</div><div class="card-subtitle">BIZ vs BPM – tổng thực tế từ xlsx</div></div></div>
        <div class="card-body"><div style="position:relative;height:220px;"><canvas id="ovChartChannel"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Tiến độ KPI 2.1 &amp; 2.2</div><div class="card-subtitle">Actual vs Target</div></div></div>
        <div class="card-body"><div style="position:relative;height:220px;"><canvas id="ovChartKPI"></canvas></div></div>
      </div>
    </div>
    <div class="kpi-chart-grid">
      <div class="card">
        <div class="card-header"><div><div class="card-title">Top PTKD – Bảo lãnh (QuangNN3)</div><div class="card-subtitle">Số GD BIZ digital theo PTKD</div></div></div>
        <div class="card-body"><div style="position:relative;height:220px;"><canvas id="ovChartQuang"></canvas></div></div>
      </div>
      <div class="card">
        <div class="card-header"><div><div class="card-title">Top PTKD – Giải ngân (DungLQ1)</div><div class="card-subtitle">Số GD theo PTKD</div></div></div>
        <div class="card-body"><div style="position:relative;height:220px;"><canvas id="ovChartDung"></canvas></div></div>
      </div>
    </div>

    <!-- Alert grid -->
    <div class="section-header">
      <span class="section-header-title">Cảnh báo KPI Tự động</span>
      <div class="section-header-line"></div>
    </div>
    <div class="kpi-alert-grid">
      <div class="kpi-alert-item alert-critical">
        <div class="kpi-alert-dot alert-critical"></div>
        <div class="kpi-alert-msg"><strong>KPI 2.1 chỉ đạt ${(agg.kpi21Actual/agg.kpi21Target*100).toFixed(1)}% target</strong> – ${fmtKN(agg.kpi21Actual)}/${fmtKN(agg.kpi21Target)} GD BL Biz. Forecast cuối năm ~${fmtKN(agg.kpi21Forecast)} GD. Cần tăng tốc ${fmtKN(needPerMonth)} GD/tháng trong ${monthsLeft} tháng còn lại.<div class="kpi-alert-meta">⚡ Critical | KPI 2.1 | 03/06/2026</div></div>
      </div>
      <div class="kpi-alert-item alert-warning">
        <div class="kpi-alert-dot alert-warning"></div>
        <div class="kpi-alert-msg"><strong>KPI 2.2 thấp hơn target ${(agg.kpi22Target-agg.kpi22Actual).toFixed(1)}pp</strong> – Digital Rate ${agg.kpi22Actual}% vs KPI ${agg.kpi22Target}%. QuangNN3 cần push thêm ~${fmtKN(bizGapFor22)} GD BIZ. PTKD yếu: ${worstPTKD[0]?.ptkd} (${worstPTKD[0]?.rate}%), ${worstPTKD[1]?.ptkd} (${worstPTKD[1]?.rate}%).<div class="kpi-alert-meta">⚠️ Warning | KPI 2.2 | 03/06/2026</div></div>
      </div>
      <div class="kpi-alert-item alert-critical">
        <div class="kpi-alert-dot alert-critical"></div>
        <div class="kpi-alert-msg"><strong>DungLQ1 BIZ Rate cực thấp</strong> – Chỉ ${(agg.dungBiz/agg.dungTotal*100).toFixed(1)}% GN được xử lý qua kênh digital (${fmtKN(agg.dungBiz)}/${fmtKN(agg.dungTotal)} GD). ${fmtKN(agg.dungBpm)} GD vẫn qua quầy. Cần onboarding Biz Online cho khách GN.<div class="kpi-alert-meta">⚡ Critical | DungLQ1 Digital | 03/06/2026</div></div>
      </div>
      <div class="kpi-alert-item alert-warning">
        <div class="kpi-alert-dot alert-warning"></div>
        <div class="kpi-alert-msg"><strong>${quangPTKD.filter(x=>x.rate<30).length} PTKD QuangNN3 dưới KPI Rate 30%</strong> – ${quangPTKD.filter(x=>x.rate<30).map(x=>x.ptkd+' ('+x.rate+'%)').join(', ')}. Cần hỗ trợ adoption BIZ Online.<div class="kpi-alert-meta">⚠️ Warning | PTKD Alert | 03/06/2026</div></div>
      </div>
    </div>`;

  _renderOvCharts(agg, quangPTKD, dungPTKD);
}

function _ovCard(label, colorKey, value, delta, sub, icon, color, deltaClass) {
  return `
    <div class="kpi-ov-card">
      <div class="koi-bar" style="background:${color};"></div>
      <i class="${icon} koi-icon" style="color:${color};"></i>
      <div class="koi-label">${label}</div>
      <div class="koi-value" style="color:${color};">${value}</div>
      <div class="koi-delta ${deltaClass||'neu'}">${delta}</div>
      <div class="koi-sub">${sub}</div>
    </div>`;
}

function _renderOvCharts(agg, quangPTKD, dungPTKD) {
  Object.values(_ovCharts).forEach(c => { try { c.destroy(); } catch(_) {} });

  const bOpts = (unit, stacked) => ({
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{labels:{color:'#8fa3c8',font:{size:11}}}},
    scales:{
      x:{stacked:!!stacked,ticks:{color:'#8fa3c8',font:{size:10}},grid:{color:'rgba(100,120,160,.15)'}},
      y:{stacked:!!stacked,ticks:{color:'#8fa3c8',font:{size:10}},grid:{color:'rgba(100,120,160,.15)'}},
    },
  });

  const c1 = document.getElementById('ovChartChannel');
  if (c1) _ovCharts.ch = new Chart(c1, {
    type:'bar',
    data:{
      labels:['QuangNN3 (BL)','DungLQ1 (GN)'],
      datasets:[
        {label:'BIZ (Digital)',data:[agg.quangBiz,agg.dungBiz],backgroundColor:'rgba(75,31,175,.8)',borderRadius:4},
        {label:'BPM (Quầy)',   data:[agg.quangBpm,agg.dungBpm],backgroundColor:'rgba(245,158,11,.7)',borderRadius:4},
      ],
    },
    options:bOpts('GD',true),
  });

  const c2 = document.getElementById('ovChartKPI');
  if (c2) _ovCharts.kpi = new Chart(c2, {
    type:'bar',
    data:{
      labels:['KPI 2.1 – BL Biz\n(target 20K GD)','KPI 2.2 – Digital Rate\n(target 40%)'],
      datasets:[
        {label:'Actual', data:[agg.kpi21Actual, agg.kpi22Actual], backgroundColor:['rgba(245,158,11,.85)','rgba(220,38,38,.85)'],borderRadius:4},
        {label:'Target', data:[agg.kpi21Target, agg.kpi22Target], backgroundColor:['rgba(75,31,175,.25)','rgba(22,163,74,.25)'],borderRadius:4},
      ],
    },
    options:bOpts('GD'),
  });

  const d3 = quangPTKD.slice(0,10);
  const c3 = document.getElementById('ovChartQuang');
  if (c3) _ovCharts.q = new Chart(c3, {
    type:'bar',
    data:{
      labels:d3.map(x=>x.ptkd),
      datasets:[{
        label:'BIZ Digital',
        data:d3.map(x=>x.biz),
        backgroundColor:d3.map(x=>x.rate>=40?'rgba(22,163,74,.85)':x.rate>=30?'rgba(245,158,11,.85)':'rgba(220,38,38,.85)'),
        borderRadius:3,
      }],
    },
    options:{...bOpts('GD'),indexAxis:'y'},
  });

  const d4 = dungPTKD.slice(0,10);
  const c4 = document.getElementById('ovChartDung');
  if (c4) _ovCharts.d = new Chart(c4, {
    type:'bar',
    data:{
      labels:d4.map(x=>x.ptkd),
      datasets:[
        {label:'BIZ', data:d4.map(x=>x.biz), backgroundColor:'rgba(8,145,178,.85)', borderRadius:3},
        {label:'BPM', data:d4.map(x=>x.bpm), backgroundColor:'rgba(124,58,237,.45)', borderRadius:3},
      ],
    },
    options:{...bOpts('GD',true),indexAxis:'y'},
  });
}

function _sLabel(s) {
  return { ahead: 'Vượt KPI', 'on-track': 'Đạt KPI', behind: 'Cần theo dõi', critical: 'Nguy hiểm' }[s] || s;
}
function _tile(label, value, style) {
  return `<div><div style="font-size:10px;color:var(--text-3);margin-bottom:3px;">${label}</div>
    <div style="font-size:15px;font-weight:700;${style}">${value}</div></div>`;
}

/* ── KPI Raw Data Load Handlers ── */

function _kpiFmtTs(d) {
  if (!d) return '';
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
    ' ' + d.toLocaleDateString('vi-VN');
}

function _kpiReRender() {
  Object.values(_ovCharts).forEach(c => { try { c.destroy(); } catch(_) {} });
  Object.values(_progCharts).forEach(c => { try { c.destroy(); } catch(_) {} });
  Object.values(_oaCharts).forEach(c => { try { c.destroy(); } catch(_) {} });
  const ov = document.getElementById('kpiOverviewRoot');
  if (ov && ov.innerHTML) { ov.innerHTML = ''; renderKpiOverview(); }
  const pr = document.getElementById('kpiProgressRoot');
  if (pr && pr.innerHTML) { pr.innerHTML = ''; renderKpiProgress(); }
  const oa = document.getElementById('ownerAnalysisRoot');
  if (oa && oa.innerHTML) { oa.innerHTML = ''; renderOwnerAnalysis(); }
}

async function kpiLoadRawFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  event.target.value = '';
  showLoading('Đang đọc ' + file.name + '…');
  try {
    const parsed = await kpiParseXlsx(file);
    setKpiLive(parsed);
    _kpiReRender();
    toast('✅ Đã load ' + fmtKN(parsed.agg.totalGD) + ' GD từ ' + file.name, 'success', 5000);
  } catch (err) {
    toast('❌ Lỗi đọc file: ' + err.message, 'error', 6000);
  } finally {
    hideLoading();
  }
}

async function kpiSyncToSheet() {
  const live = KPI_LIVE;
  if (!live) { toast('Chưa có dữ liệu để sync.', 'warning'); return; }
  showLoading('Đang sync KPI data lên GG Sheet…');
  try {
    await kpiWriteToSheet(live);
    toast('☁ Đã sync KPI data lên tab "KPI_Summary".', 'success', 5000);
  } catch (err) {
    toast('❌ Sync thất bại (không block): ' + err.message, 'error', 6000);
  } finally {
    hideLoading();
  }
}

async function kpiLoadFromSheet() {
  showLoading('Đang load KPI data từ GG Sheet…');
  try {
    const parsed = await kpiReadFromSheet();
    if (!parsed.quangPTKD.length) throw new Error('Sheet chưa có dữ liệu KPI. Hãy Sync trước.');
    setKpiLive(parsed);
    _kpiReRender();
    toast('✅ Đã load ' + (parsed.quangPTKD.length + parsed.dungPTKD.length) + ' PTKD từ GG Sheet.', 'success', 5000);
  } catch (err) {
    toast('❌ Load từ Sheet thất bại (không block): ' + err.message, 'error', 6000);
  } finally {
    hideLoading();
  }
}
