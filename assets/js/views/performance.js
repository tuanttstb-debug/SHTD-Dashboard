function openPerfTaskPopup(key) {
  const labelMap = { initiative: t('perf.label.project'), picRes: t('perf.label.pic'), team: 'Team' };
  const _unassigned = t('perf.unassigned');
  const tasks = db.tasks.filter(task => {
    const v = perfTab === 'picRes' ? (task.picRes || _unassigned)
            : perfTab === 'initiative' ? (task.initiative || 'BAU')
            : (task.team || 'N/A');
    return (v || '').trim() === key;
  });

  const titleEl = document.getElementById('detailTitle');
  if (titleEl) titleEl.textContent = `${labelMap[perfTab] || perfTab}: ${key}`;

  const body = document.getElementById('detailTbody');
  if (body) {
    body.innerHTML = tasks.length === 0
      ? `<tr><td colspan="12" style="text-align:center;padding:24px;color:var(--text-3);">${t('perf.empty')}</td></tr>`
      : tasks.map(t => `<tr onclick="editTask('${esc(t.id)}')" style="cursor:pointer;">
          <td><span style="font-family:var(--mono);color:var(--primary);font-weight:700;">${esc(t.id)}</span></td>
          <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;" title="${esc(t.name)}">${esc(t.name)}</td>
          <td>${esc(t.initiative||'–')}</td>
          <td><span style="font-size:11px;background:var(--info-bg);color:var(--info);padding:2px 6px;border-radius:4px;font-weight:600;">${esc(t.category||'–')}</span></td>
          <td>${t.milestone?`<span style="font-size:11px;background:var(--primary-xlight);padding:2px 6px;border-radius:3px;color:var(--primary);font-weight:700;">${esc(t.milestone)}</span>`:'–'}</td>
          <td>${esc(t.team||'–')}</td><td>${esc(t.picRes||'–')}</td>
          <td ${isOverdue(t.endDate,t.progress)?'class="text-danger-bold"':''}>${fmtDate(t.endDate)}</td>
          <td><span style="font-size:11px;color:var(--text-2);font-family:var(--mono);" title="${esc(taskReportWeeks(t).join('; '))}">${esc(taskWeeksBadge(t))}</span></td>
          <td><div class="prog-wrap"><div class="prog-bar"><div class="prog-fill" style="width:${t.progress}%;"></div></div><span class="prog-pct">${t.progress}%</span></div></td>
          <td>${stateChip(t.state)}</td><td>${ragBadge(t.status)}</td>
        </tr>`).join('');
  }
  document.getElementById('detailOverlay').classList.add('open');
}

function switchPerfTab(key) {
  perfTab = key;
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-perf="${key}"]`).classList.add('active');
  renderPerfTable();
}

function renderPerfTable() {
  const labels = { initiative: t('perf.group.project'), picRes: t('perf.group.pic'), team: t('perf.group.team') };
  document.getElementById('perfHead').textContent = labels[perfTab]||'';
  const _perfUnassigned = t('perf.unassigned');
  const summary = {};
  db.tasks.forEach(task => {
    let k = perfTab === 'picRes' ? (task.picRes||_perfUnassigned) : perfTab === 'initiative' ? (task.initiative||'BAU') : (task.team||'N/A');
    k = (k||'').trim() || _perfUnassigned;
    if (!summary[k]) summary[k] = { total:0, done:0, totProg:0, green:0, amber:0, red:0, overdue:0 };
    summary[k].total++;
    if (parseInt(task.progress) >= 100 || task.state === 'Hoàn thành') summary[k].done++;
    summary[k].totProg += parseInt(task.progress)||0;
    if (task.status === 'Green') summary[k].green++;
    else if (task.status === 'Amber') summary[k].amber++;
    else summary[k].red++;
    if (isOverdue(task.endDate, task.progress)) summary[k].overdue++;
  });

  const tbody = document.getElementById('perfTbody');
  if (!Object.keys(summary).length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--text-3);">${t('perf.no-data')}</td></tr>`;
    return;
  }
  tbody.innerHTML = Object.entries(summary).sort((a,b) => b[1].total - a[1].total).map(([k,v]) => {
    const avg = Math.round(v.totProg/v.total);
    return `<tr onclick="openPerfTaskPopup('${esc(k)}')" style="cursor:pointer;" title="${t('perf.row-hint')}">
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
