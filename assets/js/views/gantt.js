function renderGantt() {
  const el = document.getElementById('ganttSubtitle');
  if (el) el.textContent = `Hiển thị tiến độ theo thời gian — ${new Date().getFullYear()}`;
  const wrap = document.getElementById('ganttWrap');
  const filterT = document.getElementById('ganttFilterTeam')?.value||'';
  const filterI = document.getElementById('ganttFilterInit')?.value||'';
  let tasks = db.tasks.filter(t => t.startDate && t.endDate);
  if (filterT) tasks = tasks.filter(t => t.team === filterT);
  if (filterI) tasks = tasks.filter(t => t.initiative === filterI);
  tasks = tasks.sort((a,b) => a.startDate > b.startDate ? 1 : -1).slice(0, 50);

  if (!tasks.length) { wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-3);">Không có task nào có đủ Start Date & Deadline</div>'; return; }

  const allDates = tasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
  let minD = new Date(Math.min(...allDates)); minD.setDate(1);
  let maxD = new Date(Math.max(...allDates)); maxD.setMonth(maxD.getMonth()+1); maxD.setDate(0);
  const totalDays = (maxD - minD) / 86400000 + 1;

  const months = [];
  let cur = new Date(minD);
  while (cur <= maxD) {
    const start = new Date(cur);
    cur.setMonth(cur.getMonth()+1);
    const end = new Date(Math.min(cur-1, maxD));
    months.push({ label: start.toLocaleDateString('vi-VN',{month:'short',year:'2-digit'}), days: (end-start)/86400000+1 });
  }

  const today = new Date();
  const todayOffset = (today - minD) / 86400000;
  const todayPct = (todayOffset / totalDays * 100).toFixed(2);

  const posOf = d => ((new Date(d) - minD) / 86400000 / totalDays * 100).toFixed(2);
  const widOf = (s,e) => Math.max(0.3, ((new Date(e) - new Date(s)) / 86400000 / totalDays * 100)).toFixed(2);

  wrap.innerHTML = `
    <div class="gantt-header">
      <div class="gantt-header-label">Task</div>
      <div class="gantt-months">${months.map(m=>`<div class="gantt-month" style="flex:${m.days};">${m.label}</div>`).join('')}</div>
    </div>
    ${tasks.map(t => {
      const cl = t.status === 'Red' ? 'red' : t.status === 'Amber' ? 'amber' : isOverdue(t.endDate,t.progress) ? 'red' : 'green';
      const startPct = posOf(t.startDate);
      const widPct   = widOf(t.startDate, t.endDate);
      const label    = t.name.length > 30 ? t.name.slice(0,28)+'…' : t.name;
      return `<div class="gantt-row" onclick="editTask('${t.id}')" title="${t.name} | ${fmtDate(t.startDate)} → ${fmtDate(t.endDate)} | ${t.progress}%">
        <div class="gantt-label">
          ${stateChip(t.state).replace('class="state-chip','style="font-size:10px;" class="state-chip')}
          <span class="gantt-label-text" title="${t.name}">${t.id} – ${label}</span>
        </div>
        <div class="gantt-timeline">
          ${todayOffset >= 0 && todayOffset <= totalDays ? `<div class="gantt-today" style="left:${todayPct}%;"></div>` : ''}
          <div class="gantt-bar ${cl}" style="left:${startPct}%;width:${widPct}%;">${t.progress}%</div>
        </div>
      </div>`;
    }).join('')}
  `;
}
