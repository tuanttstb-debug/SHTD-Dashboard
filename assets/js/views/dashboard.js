function currentWeekLabel() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const wk = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `Tuần ${String(wk).padStart(2,'0')}/${now.getFullYear()}`;
}

function populateDashFilter() {
  const el = document.getElementById('dashFilterTuan');
  if (!el) return;
  const cur = el.value;
  const tuanSet = new Set();
  db.tasks.forEach(t => { if (t.tuanBC && t.tuanBC.trim()) tuanSet.add(t.tuanBC.trim()); });
  const sorted = [...tuanSet].sort((a, b) => {
    const parse = s => { const m = s.match(/(\d+)\/(\d+)/); return m ? parseInt(m[2])*100+parseInt(m[1]) : 0; };
    return parse(a) - parse(b);
  });
  el.innerHTML = '<option value="">📊 Tất cả task</option><option value="__thisweek__">📅 Tuần này</option>'
    + sorted.map(v => `<option value="${v}">${v}</option>`).join('');
  if (cur) el.value = cur;
}

function renderDashboard() {
  populateDashFilter();

  const dashTuan = document.getElementById('dashFilterTuan')?.value || '';
  const thisWeek = currentWeekLabel();
  const activeWeek = dashTuan === '__thisweek__' ? thisWeek : dashTuan;
  const tasks = dashTuan
    ? db.tasks.filter(t => (t.tuanBC||'').trim() === activeWeek)
    : db.tasks;

  const lbl = document.getElementById('dashFilterLabel');
  if (lbl) lbl.textContent = dashTuan
    ? `Đang xem: ${activeWeek} · ${tasks.length} task`
    : `Tổng cộng: ${db.tasks.length} task`;

  const total = tasks.length;
  const done = tasks.filter(t => parseInt(t.progress) >= 100 || t.state === 'Hoàn thành').length;
  const inProg = total - done;
  const overdue = tasks.filter(t => isOverdue(t.endDate, t.progress)).length;
  const avgProg = total ? Math.round(tasks.reduce((s,t) => s + (parseInt(t.progress)||0), 0) / total) : 0;

  document.getElementById('kpiTotal').textContent = total;
  document.getElementById('kpiDone').textContent = done;
  document.getElementById('kpiInProgress').textContent = inProg;
  document.getElementById('kpiOverdue').textContent = overdue;
  document.getElementById('kpiAvgProg').textContent = `TB tiến độ ${avgProg}%`;

  const allFilter  = dashTuan ? `tuan-${activeWeek}` : 'all';
  const doneFilter = dashTuan ? `tuandone-${activeWeek}` : 'done';
  const inpFilter  = dashTuan ? `tuaninprog-${activeWeek}` : 'inprogress';
  const ovFilter   = dashTuan ? `tuanoverdue-${activeWeek}` : 'overdue';
  document.querySelector('.kpi-card.kpi-total').onclick = () => showDetailModal(allFilter, dashTuan ? `Task ${activeWeek}` : 'Tất cả Task');
  document.querySelector('.kpi-card.kpi-done').onclick  = () => showDetailModal(doneFilter, 'Hoàn thành');
  document.querySelector('.kpi-card.kpi-progress').onclick = () => showDetailModal(inpFilter, 'Đang thực hiện');
  document.querySelector('.kpi-card.kpi-overdue').onclick  = () => showDetailModal(ovFilter, 'Quá hạn');

  const bw = document.getElementById('overdueBannerWrap');
  if (overdue > 0) {
    bw.innerHTML = `<div class="overdue-banner">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <div><div class="overdue-banner-title">⚠️ ${overdue} task đang quá hạn!</div>
      <div class="overdue-banner-sub">Cần rà soát và cập nhật tiến độ ngay.</div></div>
      <button class="overdue-banner-btn" onclick="showDetailModal('${ovFilter}','Task Quá hạn')">Xem danh sách →</button>
    </div>`;
  } else { bw.innerHTML = ''; }

  const rag = { Green:0, Amber:0, Red:0 };
  tasks.forEach(t => { if (rag[t.status] !== undefined) rag[t.status]++; });
  const ctx = document.getElementById('ragChart').getContext('2d');
  if (chartInst) chartInst.destroy();
  const empty = total === 0;
  chartInst = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: empty ? ['Chưa có dữ liệu'] : ['Green','Amber','Red'],
      datasets: [{
        data: empty ? [1] : [rag.Green, rag.Amber, rag.Red],
        backgroundColor: empty ? ['#E2E8F0'] : ['#22C55E','#F59E0B','#EF4444'],
        borderWidth: 0, hoverOffset: 6
      }]
    },
    options: {
      responsive:true, maintainAspectRatio:false, cutout:'72%',
      onClick: (ev, els) => { if (!empty && els.length) { const l = ['Green','Amber','Red'][els[0].index]; showDetailModal((dashTuan?`tuanstatus-${activeWeek}-`:'status-')+l,'Task ' + l); } },
      onHover: (ev,els) => { ev.native.target.style.cursor = !empty && els.length ? 'pointer' : 'default'; },
      plugins: { legend:{display:false} }
    }
  });

  const leg = document.getElementById('ragLegend');
  if (!empty) {
    leg.innerHTML = [['Green','#22C55E'],['Amber','#F59E0B'],['Red','#EF4444']].map(([l,c]) =>
      `<div style="display:flex;align-items:center;gap:5px;font-size:12px;">
        <div style="width:10px;height:10px;border-radius:50%;background:${c};"></div>
        <span style="font-weight:600;">${l}</span>
        <span style="color:var(--text-3);">${rag[l]}</span>
      </div>`).join('');
  } else leg.innerHTML = '';

  const initSummary = {};
  tasks.forEach(t => {
    const k = t.initiative || 'BAU';
    if (!initSummary[k]) initSummary[k] = { total:0, done:0, totProg:0, rags:{Green:0,Amber:0,Red:0} };
    initSummary[k].total++;
    if (parseInt(t.progress) >= 100 || t.state === 'Hoàn thành') initSummary[k].done++;
    initSummary[k].totProg += parseInt(t.progress)||0;
    if (initSummary[k].rags[t.status] !== undefined) initSummary[k].rags[t.status]++;
  });
  const initBody = document.getElementById('initTableBody');
  if (Object.keys(initSummary).length === 0) {
    initBody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-3);">Chưa có dữ liệu. Upload file Excel hoặc kết nối DB.</td></tr>`;
  } else {
    initBody.innerHTML = Object.entries(initSummary).sort((a,b) => b[1].total - a[1].total).map(([k,v]) => {
      const avg = Math.round(v.totProg/v.total);
      const domRag = v.rags.Red > 0 ? 'Red' : v.rags.Amber > 0 ? 'Amber' : 'Green';
      return `<tr onclick="showDetailModal('${dashTuan ? 'tuaninit-'+activeWeek+'-' : 'initiative-'}${k.replace(/'/g,"\\'")}','Dự án: ${k}')" style="cursor:pointer;">
        <td style="font-weight:600;max-width:180px;overflow:hidden;text-overflow:ellipsis;" title="${k}">${k}</td>
        <td>${v.total}</td><td>${v.done}</td>
        <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${avg}%;"></div></div><span class="prog-pct">${avg}%</span></div></td>
        <td>${ragBadge(domRag)}</td>
      </tr>`;
    }).join('');
  }

  const teamSt = {};
  tasks.forEach(t => { const k = t.team||'N/A'; if(!teamSt[k]) teamSt[k]=0; teamSt[k]++; });
  const maxT = Math.max(...Object.values(teamSt), 1);
  document.getElementById('teamStatList').innerHTML = Object.entries(teamSt).sort((a,b)=>b[1]-a[1]).map(([k,v]) =>
    `<div class="stat-row">
      <span class="stat-name">${k}</span>
      <div class="stat-bar-wrap"><div class="stat-bar"><div class="stat-fill" style="width:${v/maxT*100}%;"></div></div></div>
      <span class="stat-count">${v}</span>
    </div>`).join('') || '<div style="color:var(--text-3);font-size:13px;padding:8px 0;">Chưa có dữ liệu</div>';

  const blocked = tasks.filter(t => t.state === 'Blocked' || t.canBLD === 'Y');
  document.getElementById('blockedList').innerHTML = blocked.length === 0
    ? '<div style="color:var(--text-3);font-size:13px;padding:8px 0;">Không có task nào bị block hoặc cần BLĐ 🎉</div>'
    : blocked.slice(0,8).map(t => `<div class="stat-row" style="cursor:pointer;" onclick="editTask('${t.id}')">
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${t.name}">${t.name}</div>
          <div style="font-size:11px;color:var(--text-3);">${t.id} · ${t.picRes||'–'}</div>
        </div>
        ${t.state === 'Blocked' ? '<span class="state-chip s5">Blocked</span>' : '<span class="badge badge-red">Cần BLĐ</span>'}
      </div>`).join('');
}
