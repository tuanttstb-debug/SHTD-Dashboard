function switchPerfTab(key) {
  perfTab = key;
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-perf="${key}"]`).classList.add('active');
  renderPerfTable();
}

function renderPerfTable() {
  const labels = { initiative:'Dự án (Initiative)', picRes:'Nhân sự (PIC Responsible)', team:'Team chính' };
  document.getElementById('perfHead').textContent = labels[perfTab]||'';
  const summary = {};
  db.tasks.forEach(t => {
    let k = perfTab === 'picRes' ? (t.picRes||'Chưa gán') : perfTab === 'initiative' ? (t.initiative||'BAU') : (t.team||'N/A');
    k = (k||'').trim() || 'Chưa gán';
    if (!summary[k]) summary[k] = { total:0, done:0, totProg:0, green:0, amber:0, red:0, overdue:0 };
    summary[k].total++;
    if (parseInt(t.progress) >= 100 || t.state === 'Hoàn thành') summary[k].done++;
    summary[k].totProg += parseInt(t.progress)||0;
    if (t.status === 'Green') summary[k].green++;
    else if (t.status === 'Amber') summary[k].amber++;
    else summary[k].red++;
    if (isOverdue(t.endDate, t.progress)) summary[k].overdue++;
  });

  const tbody = document.getElementById('perfTbody');
  if (!Object.keys(summary).length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-3);">Chưa có dữ liệu</td></tr>`;
    return;
  }
  tbody.innerHTML = Object.entries(summary).sort((a,b) => b[1].total - a[1].total).map(([k,v]) => {
    const avg = Math.round(v.totProg/v.total);
    return `<tr>
      <td style="font-weight:600;">${k}</td>
      <td>${v.total}</td>
      <td>${v.done}</td>
      <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${avg}%;"></div></div><span class="prog-pct">${avg}%</span></div></td>
      <td><span class="badge badge-green">${v.green}</span></td>
      <td><span class="badge badge-amber">${v.amber}</span></td>
      <td><span class="badge badge-red">${v.red}</span></td>
      <td class="${v.overdue>0?'text-danger-bold':''}">${v.overdue}</td>
    </tr>`;
  }).join('');
}
