// ── State ──
let _qvActiveTab = 'done';
let _qvIsOpen    = false;

function openQuickView() {
  _qvIsOpen = true;
  document.getElementById('quickViewPanel').classList.add('open');
  document.getElementById('qvOverlay').classList.add('open');
  document.getElementById('qvFabBtn')?.classList.add('active');
  _qvPopulateFilters();
  renderQuickView();
  _qvUpdateTime();
}

function closeQuickView() {
  _qvIsOpen = false;
  document.getElementById('quickViewPanel').classList.remove('open');
  document.getElementById('qvOverlay').classList.remove('open');
  document.getElementById('qvFabBtn')?.classList.remove('active');
}

function refreshQuickView() {
  const btn = document.getElementById('qvRefreshBtn');
  btn.classList.add('spinning');
  setTimeout(() => {
    renderQuickView();
    _qvUpdateTime();
    btn.classList.remove('spinning');
  }, 400);
}

function switchQvTab(tab) {
  _qvActiveTab = tab;
  document.querySelectorAll('.qvp-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[data-qvtab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.qvp-pane').forEach(p => p.classList.remove('active'));
  document.getElementById(`qvPane-${tab}`)?.classList.add('active');
}

function _qvPopulateFilters() {
  if (typeof db === 'undefined' || !db.tasks) return;

  const initSel = document.getElementById('qvFilterInit');
  const tuanSel = document.getElementById('qvFilterTuan');
  const curInit = initSel.value;
  const curTuan = tuanSel.value;

  const initMap = new Map();
  db.tasks.forEach(t => {
    if (t.initiative) initMap.set(t.initiative, t.initiative);
  });
  initSel.innerHTML = '<option value="">Tất cả</option>'
    + [...initMap.keys()].sort().map(id =>
        `<option value="${id}">${id}</option>`
      ).join('');
  if (curInit) initSel.value = curInit;

  const tuanSet = new Set();
  db.tasks.forEach(t => { if (t.tuanBC?.trim()) tuanSet.add(t.tuanBC.trim()); });
  const sortedTuan = [...tuanSet].sort((a, b) => {
    const parse = s => { const m = s.match(/(\d+)\/(\d+)/); return m ? parseInt(m[2])*100+parseInt(m[1]) : 0; };
    return parse(a) - parse(b);
  });
  tuanSel.innerHTML = '<option value="">Tất cả tuần</option><option value="__thisweek__">📅 Tuần này</option>'
    + sortedTuan.map(v => `<option value="${v}">${v}</option>`).join('');
  if (curTuan) tuanSel.value = curTuan;
}

function renderQuickView() {
  if (!_qvIsOpen) return;
  if (typeof db === 'undefined' || !db.tasks) {
    _qvRenderEmpty();
    return;
  }

  const filterInit = document.getElementById('qvFilterInit')?.value || '';
  const filterTuan = document.getElementById('qvFilterTuan')?.value || '';
  const thisWeek   = typeof currentWeekLabel === 'function' ? currentWeekLabel() : _qvCurrentWeek();
  const activeWeek = filterTuan === '__thisweek__' ? thisWeek : filterTuan;

  let tasks = db.tasks.filter(t => {
    if (filterInit && t.initiative !== filterInit) return false;
    if (activeWeek && (t.tuanBC||'').trim() !== activeWeek) return false;
    return true;
  });

  const subParts = [];
  if (filterInit) subParts.push(filterInit);
  if (activeWeek) subParts.push(activeWeek);
  document.getElementById('qvpSubtitle').textContent = subParts.length
    ? subParts.join(' · ') + ` · ${tasks.length} task`
    : `${db.tasks.length} task · Tất cả`;

  _qvRenderDone(tasks);
  _qvRenderPlan(tasks);
  _qvRenderInitiative(tasks, filterInit);
  _qvRenderIssue(tasks);

  const hasIssue = tasks.some(t => t.state === 'Blocked' || t.canBLD === 'Y' || (t.vuongMac||'').trim());
  document.getElementById('qvDot').style.display = hasIssue ? '' : 'none';
}

function _qvRenderEmpty() {
  const msg = `<div class="qvp-empty">
    <i class="fa-solid fa-database"></i>
    <div class="qvp-empty-title">Chưa có dữ liệu</div>
    <div class="qvp-empty-sub">Kết nối Google Sheets hoặc Import Excel để xem Quick View</div>
  </div>`;
  document.getElementById('qvDoneList').innerHTML = msg;
  document.getElementById('qvPlanList').innerHTML = msg;
  document.getElementById('qvInitList').innerHTML = msg;
  document.getElementById('qvIssueList').innerHTML = msg;
}

const _qvFmtDate = d => {
  if (!d) return '–';
  const p = d.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d;
};
const _qvRagCls = s => s === 'Green' ? 'rag-green' : s === 'Amber' ? 'rag-amber' : s === 'Red' ? 'rag-red' : '';
const _qvRagBadge = s => {
  const cls = { Green:'badge-green', Amber:'badge-amber', Red:'badge-red' }[s] || 'badge-gray';
  return `<span class="badge ${cls}">${s||'–'}</span>`;
};
const _qvStateChip = s => {
  const map = { 'Chưa bắt đầu':'s0','Đang thực hiện':'s1','Hoàn thành chuẩn bị':'s2','Hoàn thành':'s3','Tạm dừng':'s4','Blocked':'s5' };
  return `<span class="state-chip ${map[s]||'s0'}">${s||'–'}</span>`;
};
function _qvCurrentWeek() {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const wk = Math.ceil(((now - jan4) / 86400000 + jan4.getDay() + 1) / 7);
  return `Tuần ${String(wk).padStart(2,'0')}/${now.getFullYear()}`;
}
function _qvOpenTask(id) {
  if (typeof editTask === 'function') {
    closeQuickView();
    editTask(id);
  }
}
function _qvUpdateTime() {
  const el = document.getElementById('qvpTime');
  if (el) el.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
}

function _qvRenderDone(tasks) {
  const done = tasks.filter(t =>
    parseInt(t.progress) >= 100 || t.state === 'Hoàn thành'
  ).sort((a, b) => (b.endDate||'').localeCompare(a.endDate||''));

  document.getElementById('qvCntDone').textContent = done.length;

  if (!done.length) {
    document.getElementById('qvDoneList').innerHTML = `<div class="qvp-empty">
      <i class="fa-solid fa-check-circle"></i>
      <div class="qvp-empty-title">Chưa có task hoàn thành</div>
      <div class="qvp-empty-sub">Các task đạt 100% hoặc trạng thái "Hoàn thành" sẽ xuất hiện tại đây</div>
    </div>`;
    return;
  }

  document.getElementById('qvDoneList').innerHTML = done.map(t => `
    <div class="qvp-card qvp-done-card ${_qvRagCls(t.status)}" onclick="_qvOpenTask('${t.id}')">
      <div class="qvp-card-top">
        <div style="display:flex;align-items:flex-start;gap:8px;flex:1;min-width:0;">
          <div class="qvp-done-check"><i class="fa-solid fa-check"></i></div>
          <div style="flex:1;min-width:0;">
            <div class="qvp-card-id">${esc(t.id)}</div>
            <div class="qvp-card-name">${esc(t.name)}</div>
          </div>
        </div>
        <div class="qvp-card-badges">${_qvRagBadge(t.status)}</div>
      </div>
      <div class="qvp-card-meta">
        ${t.initiative ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-layer-group"></i>${esc(t.initiative)}</span>` : ''}
        ${t.team ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-users"></i>${esc(t.team)}</span>` : ''}
        ${t.picRes ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-user"></i>${esc(t.picRes)}</span>` : ''}
        ${t.endDate ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-calendar-check"></i>Xong: ${_qvFmtDate(t.endDate)}</span>` : ''}
        ${t.tuanBC ? `<span class="qvp-card-meta-item" style="background:var(--primary-xlight);padding:1px 6px;border-radius:4px;color:var(--primary);font-weight:600;">${esc(t.tuanBC)}</span>` : ''}
      </div>
      ${(t.result||'').trim() ? `
        <div style="margin-top:8px;padding-top:8px;border-top:1px dashed var(--border);font-size:12px;color:var(--text-2);line-height:1.5;">
          <i class="fa-solid fa-quote-left" style="opacity:.3;margin-right:4px;font-size:10px;"></i>${esc(t.result)}
        </div>` : ''}
      <div class="qvp-prog">
        <div class="qvp-prog-bar"><div class="qvp-prog-fill" style="width:100%;background:var(--success);"></div></div>
        <span class="qvp-prog-pct" style="color:var(--success);">100%</span>
      </div>
    </div>`).join('');
}

function _qvRenderPlan(tasks) {
  const now   = new Date();
  const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);

  const plan = tasks.filter(t => {
    const hasNext = (t.nextPlan||'').trim();
    const inNextMonth = t.endDate && (() => {
      const d = new Date(t.endDate);
      return d >= nextM && d <= nextMEnd;
    })();
    const isInProg = parseInt(t.progress) < 100 && t.state !== 'Hoàn thành';
    return (hasNext || inNextMonth) && isInProg;
  }).sort((a, b) => (a.endDate||'').localeCompare(b.endDate||''));

  document.getElementById('qvCntPlan').textContent = plan.length;

  if (!plan.length) {
    document.getElementById('qvPlanList').innerHTML = `<div class="qvp-empty">
      <i class="fa-solid fa-calendar-days"></i>
      <div class="qvp-empty-title">Không có kế hoạch tháng tới</div>
      <div class="qvp-empty-sub">Nhập "Kế hoạch tuần tới" khi chỉnh sửa task để thông tin xuất hiện tại đây</div>
    </div>`;
    return;
  }

  const nextMonthLabel = nextM.toLocaleDateString('vi-VN', {month:'long', year:'numeric'});

  document.getElementById('qvPlanList').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
      <div style="background:var(--accent-light);border:1px solid rgba(255,122,0,.25);color:var(--accent);padding:5px 12px;border-radius:var(--radius-sm);font-size:12px;font-weight:700;">
        <i class="fa-solid fa-calendar-days" style="margin-right:5px;"></i>${nextMonthLabel}
      </div>
      <span style="font-size:12px;color:var(--text-3);">${plan.length} công việc cần thực hiện</span>
    </div>
    ${plan.map(t => {
      const inNextMonth = t.endDate && (() => {
        const d = new Date(t.endDate);
        return d >= nextM && d <= nextMEnd;
      })();
      return `
      <div class="qvp-card qvp-plan-card ${_qvRagCls(t.status)}" onclick="_qvOpenTask('${t.id}')">
        <div class="qvp-card-top">
          <div style="flex:1;min-width:0;">
            <div class="qvp-card-id">${esc(t.id)}</div>
            <div class="qvp-card-name">${esc(t.name)}</div>
          </div>
          <div class="qvp-card-badges" style="flex-direction:column;align-items:flex-end;gap:4px;">
            ${_qvStateChip(t.state)}
            ${inNextMonth ? `<span class="qvp-deadline-tag"><i class="fa-solid fa-flag"></i>Deadline tháng tới</span>` : ''}
          </div>
        </div>
        <div class="qvp-card-meta">
          ${t.initiative ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-layer-group"></i>${esc(t.initiative)}</span>` : ''}
          ${t.team ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-users"></i>${esc(t.team)}</span>` : ''}
          ${t.picRes ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-user"></i>${esc(t.picRes)}</span>` : ''}
          ${t.endDate ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-calendar"></i>Deadline: ${_qvFmtDate(t.endDate)}</span>` : ''}
        </div>
        ${(t.nextPlan||'').trim() ? `
          <div class="qvp-plan-content">
            <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--accent);display:block;margin-bottom:4px;">Kế hoạch tuần tới</span>
            ${esc(t.nextPlan)}
          </div>` : ''}
        <div class="qvp-prog">
          <div class="qvp-prog-bar">
            <div class="qvp-prog-fill" style="width:${t.progress}%;"></div>
          </div>
          <span class="qvp-prog-pct">${t.progress}%</span>
        </div>
      </div>`;
    }).join('')}`;
}

function _qvRenderInitiative(tasks, filterInit) {
  const inProg = tasks.filter(t =>
    parseInt(t.progress) < 100 && t.state !== 'Hoàn thành'
  );

  document.getElementById('qvCntInit').textContent = inProg.length;

  if (!inProg.length) {
    document.getElementById('qvInitList').innerHTML = `<div class="qvp-empty">
      <i class="fa-solid fa-layer-group"></i>
      <div class="qvp-empty-title">Không có task đang thực hiện</div>
      <div class="qvp-empty-sub">Các task đang xử lý sẽ được nhóm theo Initiative tại đây</div>
    </div>`;
    return;
  }

  const groups = {};
  inProg.forEach(t => {
    const k = t.initiative || 'BAU';
    if (!groups[k]) groups[k] = [];
    groups[k].push(t);
  });

  const sorted = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  const singleMode = filterInit && sorted.length <= 1;

  let html = '';

  if (!singleMode) {
    html += `<div class="qvp-section-title" style="margin-bottom:0;">
      <i class="fa-solid fa-layer-group" style="color:var(--primary);"></i> Nhóm theo Initiative
    </div>`;
  }

  sorted.forEach(([initId, initTasks]) => {
    const avg = Math.round(initTasks.reduce((s,t)=>s+(parseInt(t.progress)||0),0) / initTasks.length);
    const redCnt   = initTasks.filter(t=>t.status==='Red').length;
    const amberCnt = initTasks.filter(t=>t.status==='Amber').length;

    if (!singleMode) {
      html += `
      <div class="qvp-init-group-header" onclick="_qvToggleInitGroup('${initId}')">
        <div class="qvp-init-group-name">
          <i class="fa-solid fa-folder-open" style="opacity:.5;margin-right:5px;font-size:11px;"></i>${initId}
        </div>
        <div class="qvp-init-group-meta">
          <span>${initTasks.length} task</span>
          ${redCnt > 0 ? `<span style="color:var(--danger);font-weight:700;">🔴 ${redCnt}</span>` : ''}
          ${amberCnt > 0 ? `<span style="color:var(--warning);font-weight:700;">🟡 ${amberCnt}</span>` : ''}
        </div>
        <div class="qvp-init-avg-bar"><div class="qvp-init-avg-fill" style="width:${avg}%;"></div></div>
        <span style="font-size:11px;font-weight:700;color:var(--primary);font-family:var(--mono);">${avg}%</span>
        <i class="fa-solid fa-chevron-down" id="qvInitChev-${initId.replace(/[^a-z0-9]/gi,'_')}" style="font-size:10px;color:var(--text-3);transition:var(--transition);"></i>
      </div>
      <div class="qvp-init-group-body" id="qvInitBody-${initId.replace(/[^a-z0-9]/gi,'_')}">`;
    }

    html += initTasks
      .sort((a,b) => (a.endDate||'').localeCompare(b.endDate||''))
      .map(t => {
        const isOverdueTask = typeof isOverdue === 'function'
          ? isOverdue(t.endDate, t.progress) : false;
        return `
        <div class="qvp-card ${_qvRagCls(t.status)}" onclick="_qvOpenTask('${t.id}')" style="margin-left:${singleMode?0:12}px;">
          <div class="qvp-card-top">
            <div style="flex:1;min-width:0;">
              <div class="qvp-card-id">${esc(t.id)}</div>
              <div class="qvp-card-name">${esc(t.name)}</div>
            </div>
            <div class="qvp-card-badges" style="flex-direction:column;align-items:flex-end;gap:3px;">
              ${_qvStateChip(t.state)}
              ${_qvRagBadge(t.status)}
            </div>
          </div>
          <div class="qvp-card-meta">
            ${t.team ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-users"></i>${esc(t.team)}</span>` : ''}
            ${t.picRes ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-user"></i>${esc(t.picRes)}</span>` : ''}
            <span class="qvp-card-meta-item" ${isOverdueTask?'style="color:var(--danger);font-weight:700;"':''}>
              <i class="fa-solid fa-${isOverdueTask?'triangle-exclamation':'calendar'}"></i>
              ${isOverdueTask?'⚠️ Quá hạn: ':'Deadline: '}${_qvFmtDate(t.endDate)}
            </span>
            ${t.milestone ? `<span class="qvp-card-meta-item" style="background:var(--primary-xlight);padding:1px 6px;border-radius:3px;color:var(--primary);font-weight:700;"><i class="fa-solid fa-flag-checkered"></i>${esc(t.milestone)}</span>` : ''}
          </div>
          <div class="qvp-prog">
            <div class="qvp-prog-bar"><div class="qvp-prog-fill" style="width:${t.progress}%;"></div></div>
            <span class="qvp-prog-pct">${t.progress}%</span>
          </div>
        </div>`;
      }).join('');

    if (!singleMode) {
      html += `</div>`;
    }
  });

  document.getElementById('qvInitList').innerHTML = html;
}

function _qvToggleInitGroup(initId) {
  const safeId = initId.replace(/[^a-z0-9]/gi,'_');
  const body = document.getElementById(`qvInitBody-${safeId}`);
  const chev = document.getElementById(`qvInitChev-${safeId}`);
  if (!body) return;
  const isHidden = body.style.display === 'none';
  body.style.display = isHidden ? '' : 'none';
  if (chev) chev.style.transform = isHidden ? '' : 'rotate(-90deg)';
}

function _qvRenderIssue(tasks) {
  const issues = tasks.filter(t =>
    t.state === 'Blocked' ||
    t.canBLD === 'Y' ||
    (t.vuongMac||'').trim()
  ).sort((a,b) => {
    const score = t => t.state==='Blocked' ? 0 : t.canBLD==='Y' ? 1 : 2;
    return score(a) - score(b);
  });

  document.getElementById('qvCntIssue').textContent = issues.length;

  if (!issues.length) {
    document.getElementById('qvIssueList').innerHTML = `<div class="qvp-empty">
      <i class="fa-solid fa-party-horn"></i>
      <div class="qvp-empty-title">Không có vướng mắc nào 🎉</div>
      <div class="qvp-empty-sub">Tất cả task đang chạy suôn sẻ</div>
    </div>`;
    return;
  }

  document.getElementById('qvIssueList').innerHTML = issues.map(t => {
    const flags = [];
    if (t.state === 'Blocked') flags.push(`<span class="qvp-issue-flag blocked"><i class="fa-solid fa-ban"></i> Blocked</span>`);
    if (t.canBLD === 'Y')      flags.push(`<span class="qvp-issue-flag bld"><i class="fa-solid fa-bell"></i> Cần BLĐ</span>`);
    if ((t.vuongMac||'').trim() && t.state !== 'Blocked') flags.push(`<span class="qvp-issue-flag vuong"><i class="fa-solid fa-circle-exclamation"></i> Vướng mắc</span>`);

    return `
    <div class="qvp-card qvp-issue-card rag-issue" onclick="_qvOpenTask('${t.id}')">
      <div class="qvp-card-top">
        <div style="flex:1;min-width:0;">
          <div class="qvp-card-id">${esc(t.id)}</div>
          <div class="qvp-card-name">${esc(t.name)}</div>
        </div>
        <div class="qvp-card-badges" style="flex-direction:column;align-items:flex-end;gap:3px;">
          ${flags.join('')}
        </div>
      </div>
      <div class="qvp-card-meta">
        ${t.initiative ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-layer-group"></i>${esc(t.initiative)}</span>` : ''}
        ${t.team ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-users"></i>${esc(t.team)}</span>` : ''}
        ${t.picRes ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-user"></i>${esc(t.picRes)}</span>` : ''}
        ${t.endDate ? `<span class="qvp-card-meta-item"><i class="fa-solid fa-calendar"></i>${_qvFmtDate(t.endDate)}</span>` : ''}
        ${t.tuanBC  ? `<span class="qvp-card-meta-item" style="background:var(--primary-xlight);padding:1px 6px;border-radius:4px;color:var(--primary);font-weight:600;">${esc(t.tuanBC)}</span>` : ''}
      </div>
      ${(t.vuongMac||'').trim() ? `
        <div class="qvp-issue-text">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--info);display:block;margin-bottom:4px;">
            <i class="fa-solid fa-triangle-exclamation" style="margin-right:3px;"></i>Vướng mắc / Rủi ro
          </span>
          ${esc(t.vuongMac)}
        </div>` : ''}
      ${(t.noiDungBLD||'').trim() ? `
        <div class="qvp-issue-text" style="border-top-color:var(--warning);margin-top:${(t.vuongMac||'').trim()?'8px':'0'};">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--warning);display:block;margin-bottom:4px;">
            <i class="fa-solid fa-bell" style="margin-right:3px;"></i>Nội dung cần BLĐ quyết
          </span>
          ${esc(t.noiDungBLD)}
        </div>` : ''}
      ${(t.yKienBLD||'').trim() ? `
        <div class="qvp-issue-text" style="border-top-color:var(--info);margin-top:8px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--info);display:block;margin-bottom:4px;">
            <i class="fa-solid fa-comment-dots" style="margin-right:3px;"></i>Ý kiến Ban lãnh đạo
          </span>
          ${esc(t.yKienBLD)}
        </div>` : ''}
      <div class="qvp-prog" style="margin-top:10px;">
        <div class="qvp-prog-bar"><div class="qvp-prog-fill" style="width:${t.progress}%;background:${t.state==='Blocked'?'var(--danger)':'var(--warning)'};"></div></div>
        <span class="qvp-prog-pct">${t.progress}%</span>
      </div>
    </div>`;
  }).join('');
}

document.addEventListener('keydown', function _qvKeyListener(e) {
  const tag = document.activeElement?.tagName;
  const inInput = ['INPUT','TEXTAREA','SELECT'].includes(tag);
  if (e.key === 'q' && !e.ctrlKey && !e.metaKey && !inInput) {
    if (_qvIsOpen) closeQuickView(); else openQuickView();
  }
  if (e.key === 'Escape' && _qvIsOpen) closeQuickView();
});
