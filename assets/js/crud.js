function fmtTuanBC(el) {
  let v = el.value.replace(/[^\d]/g, '');
  if (!v) return;
  const yr = new Date().getFullYear();
  if (v.length <= 2) {
    const wk = parseInt(v, 10);
    if (wk >= 1 && wk <= 53) {
      el.value = `Tuần ${String(wk).padStart(2,'0')}/${yr}`;
    }
  }
}

function autoGenId() {
  const id = genId(
    document.getElementById('fInit').value,
    document.getElementById('fTeam').value,
    document.getElementById('fMs').value
  );
  document.getElementById('fId').value = id;
  checkDupId(id);
}

function checkDupId(id) {
  const orig   = document.getElementById('origId').value;
  const isAdd  = !orig;
  const exists = id && db.tasks.some(t =>
    t.id.trim().toLowerCase() === id.trim().toLowerCase() &&
    (isAdd || t.id !== orig)
  );
  const err = document.getElementById('errId');
  const inp = document.getElementById('fId');
  if (exists) {
    err.classList.add('visible');
    inp.classList.add('error');
    err.innerHTML = isAdd
      ? '<i class="fa-solid fa-ban"></i> ID đã tồn tại – Không thể thêm mới với mã này!'
      : '<i class="fa-solid fa-triangle-exclamation"></i> ID đã được dùng bởi task khác!';
  } else {
    err.classList.remove('visible');
    inp.classList.remove('error');
  }
  return exists;
}

function autoProgress() {
  const state = document.getElementById('fState').value;
  const progEl = document.getElementById('fProg');
  if (state === 'Hoàn thành') { progEl.value = 100; document.getElementById('progPreview').style.width = '100%'; }
  if (state === 'Chưa bắt đầu' && progEl.value === '0') { /* keep */ }
}

function openTaskModal(task = null) {
  document.getElementById('taskForm').reset();
  document.getElementById('errId').classList.remove('visible');
  document.getElementById('fId').classList.remove('error');
  document.getElementById('errProg').classList.remove('visible');
  document.getElementById('fProg').classList.remove('error');
  document.getElementById('progPreview').style.width = '0%';
  document.getElementById('btnDelete').style.display = 'none';
  document.getElementById('btnClone').style.display = 'none';
  document.getElementById('fYKien').value = '';
  document.getElementById('fYKienGroup').style.display = 'none';

  updateFilterDropdowns();

  if (task) {
    document.getElementById('modalTitle').textContent = 'Chỉnh sửa Task';
    document.getElementById('modalSubtitle').textContent = `ID: ${task.id}`;
    document.getElementById('origId').value = task.id;
    document.getElementById('fId').value = task.id;
    document.getElementById('fType').value = task.type || 'Task';
    document.getElementById('fName').value = task.name;
    const fi = document.getElementById('fInit');
    fi.value = task.initiative || 'BAU';
    _populateMilestoneSelect(task.milestone || '');
    const _team = task.team || 'Số';
    _populateTeamSelect('fTeam', _team);
    document.getElementById('fTeamPh').value = task.teamPhoiHop || '';
    _populateUserSelect('fPicAcc', _team, task.picAcc || '');
    _populateUserSelect('fPicRes', _team, task.picRes || '');
    document.getElementById('fStart').value = task.startDate || '';
    document.getElementById('fEnd').value = task.endDate || '';
    document.getElementById('fProg').value = task.progress || 0;
    document.getElementById('progPreview').style.width = (task.progress||0) + '%';
    document.getElementById('fState').value = task.state || 'Chưa bắt đầu';
    document.getElementById('fRag').value = task.status || 'Green';
    document.getElementById('fCross').value = task.crossTeam || 'N';
    document.getElementById('fHl').value = task.highlight || 'N';
    document.getElementById('fResult').value = task.result || '';
    document.getElementById('fNext').value = task.nextPlan || '';
    document.getElementById('fIssue').value = task.vuongMac || '';
    document.getElementById('fBLD').value = task.canBLD || 'N';
    document.getElementById('fBLDTxt').value = task.noiDungBLD || '';
    document.getElementById('fYKien').value = task.yKienBLD || '';
    // Hiển thị ý kiến BLĐ cho task đang/đã xin ý kiến
    document.getElementById('fYKienGroup').style.display =
      ((task.yKienBLD || '').trim() || task.canBLD === 'Y') ? '' : 'none';
    document.getElementById('fTuanBC').value = task.tuanBC || '';
    document.getElementById('fCat').value = task.category || '';
    document.getElementById('fPicSup').value = task.picSupport || '';
    document.getElementById('btnDelete').style.display = 'inline-flex';
    document.getElementById('btnClone').style.display = 'inline-flex';
  } else {
    document.getElementById('modalTitle').textContent = 'Thêm Task mới';
    document.getElementById('modalSubtitle').textContent = 'Điền thông tin công việc';
    document.getElementById('origId').value = '';
    const _cu = getCurrentUser();
    const _defTeam = (_cu && _cu.team) || '';
    const _defUser = (_cu && _cu.username) || '';
    _populateTeamSelect('fTeam', _defTeam);
    document.getElementById('fType').value = 'Task';
    document.getElementById('fState').value = 'Chưa bắt đầu';
    document.getElementById('fRag').value = 'Green';
    _populateUserSelect('fPicAcc', _defTeam, _defUser);
    _populateUserSelect('fPicRes', _defTeam, _defUser);
    const _td=new Date();document.getElementById('fStart').value=`${_td.getFullYear()}-${String(_td.getMonth()+1).padStart(2,'0')}-${String(_td.getDate()).padStart(2,'0')}`;
    autoGenId();
    _populateMilestoneSelect('');
  }
  document.getElementById('taskOverlay').classList.add('open');
  setTimeout(() => document.getElementById('fName').focus(), 120);
}

function _populateMilestoneSelect(currentValue) {
  const sel = document.getElementById('fMs');
  if (!sel) return;
  const initId = (document.getElementById('fInit') || {}).value || '';
  const milestones = (db.initiatives || []).filter(i => i.parentId === initId);

  if (milestones.length === 0) {
    // Fallback: generic M1–M8 options when no milestones defined in Initiative_Master
    sel.innerHTML = '<option value="">– Không –</option>'
      + ['M1','M2','M3','M4','M5','M6','M7','M8'].map(m => `<option value="${m}">${m}</option>`).join('');
  } else {
    sel.innerHTML = '<option value="">– Không –</option>'
      + milestones.map(m => {
          const label = m.name.replace(/^↳\s*/, '');
          return `<option value="${m.id}">${m.id} – ${label}</option>`;
        }).join('');
  }
  if (currentValue) sel.value = currentValue;
}

function onTaskTeamChange() {
  const team = (document.getElementById('fTeam') || {}).value || '';
  _populateUserSelect('fPicAcc', team, '');
  _populateUserSelect('fPicRes', team, '');
  autoGenId();
}

function populatePicDropdown(selected) {
  /* Legacy — kept for filter bar (filterPic). Modal PIC fields now use _populateUserSelect. */
  const sel = document.getElementById('fPicRes');
  if (!sel) return;
  const pics = new Set(DEFAULT_PICS);
  db.tasks.forEach(t => { if (t.picRes) pics.add(picNorm(t.picRes)); });
  if (selected) pics.add(picNorm(selected));
  sel.innerHTML = [...pics].map(p => `<option value="${p}">${p}</option>`).join('');
  sel.value = selected ? picNorm(selected) : DEFAULT_PICS[0];
}

function closeTaskModal() {
  document.getElementById('taskOverlay').classList.remove('open');
  _taskEditReturnId = null;
}

function editTask(id) {
  const t = db.tasks.find(x => x.id === id);
  if (t) openTaskModal(t);
  closeDetailModal();
}

async function handleSubmit(e) {
  e.preventDefault();
  const prog = parseInt(document.getElementById('fProg').value)||0;
  if (prog > 100) { toast('Tiến độ không được vượt quá 100%!','error'); return; }

  if (checkDupId(document.getElementById('fId').value)) {
    toast(`❌ Mã Task "<strong>${document.getElementById('fId').value}</strong>" đã tồn tại. Vui lòng tìm task này trong danh sách và chỉnh sửa trực tiếp.`, 'error', 6000);
    return;
  }

  const task = {
    id: document.getElementById('fId').value.trim(),
    tuanBC: document.getElementById('fTuanBC').value.trim(),
    initiative: document.getElementById('fInit').value,
    category: document.getElementById('fCat').value,
    type: document.getElementById('fType').value,
    name: document.getElementById('fName').value,
    milestone: document.getElementById('fMs').value,
    team: document.getElementById('fTeam').value,
    teamPhoiHop: document.getElementById('fTeamPh').value,
    picAcc: document.getElementById('fPicAcc').value,
    picRes: picNorm(document.getElementById('fPicRes').value),
    picSupport: document.getElementById('fPicSup').value.trim(),
    startDate: document.getElementById('fStart').value,
    endDate: document.getElementById('fEnd').value,
    progress: prog,
    state: document.getElementById('fState').value,
    status: document.getElementById('fRag').value,
    crossTeam: document.getElementById('fCross').value,
    highlight: document.getElementById('fHl').value,
    result: document.getElementById('fResult').value,
    nextPlan: document.getElementById('fNext').value,
    vuongMac: document.getElementById('fIssue').value,
    canBLD: document.getElementById('fBLD').value,
    noiDungBLD: document.getElementById('fBLDTxt').value,
    yKienBLD: document.getElementById('fYKien').value,
  };
  const ok = await uiConfirm('Xác nhận lưu Task',
    `<strong>${task.id}</strong> – ${task.name}<br><small style="color:var(--text-3);">Deadline: ${fmtDate(task.endDate)} · PIC: ${task.picRes} · ${task.state}</small>`,
    'info', 'Lưu');
  if (!ok) return;
  localAction(() => {
    const origId = document.getElementById('origId').value;
    const lookupId = (origId && origId !== task.id) ? origId : task.id;
    const idx = db.tasks.findIndex(x => x.id === lookupId);
    if (idx > -1) db.tasks[idx] = task; else db.tasks.push(task);
  });
  const shouldReturn = !!_taskEditReturnId;
  closeTaskModal();
  if (shouldReturn) openTaskViewPopup(task.id);
  toast(`Đã lưu task <strong>${task.id}</strong>!`, 'success');
}

async function deleteTask() {
  const id = document.getElementById('origId').value;
  if (!id) return;
  const ok = await uiConfirm('Xóa Task', `Bạn có chắc chắn muốn xóa task <strong>${id}</strong>? Hành động này không thể hoàn tác.`, 'danger', 'Xóa');
  if (!ok) return;
  localAction(() => { db.tasks = db.tasks.filter(t => t.id !== id); });
  closeTaskModal();
  toast(`Đã xóa task ${id}.`, 'info');
}

function cloneTask() {
  const id = document.getElementById('fId').value.trim();
  const match = id.match(/(.*?)(\d+)$/);
  let newId;
  if (match) {
    const pfx = match[1]; const len = match[2].length;
    let max = parseInt(match[2]);
    db.tasks.forEach(t => { if (t.id?.startsWith(pfx)) { const n = parseInt(t.id.substring(pfx.length)); if (!isNaN(n) && n > max) max = n; } });
    newId = pfx + String(max+1).padStart(len,'0');
  } else { newId = genId(document.getElementById('fInit').value, document.getElementById('fTeam').value, document.getElementById('fMs').value); }
  document.getElementById('origId').value = '';
  document.getElementById('fId').value = newId;
  document.getElementById('fName').value = '';
  document.getElementById('fStart').value = '';
  document.getElementById('fEnd').value = '';
  document.getElementById('btnDelete').style.display = 'none';
  document.getElementById('btnClone').style.display = 'none';
  document.getElementById('modalTitle').textContent = 'Nhân bản Task mới';
  checkDupId(newId);
  document.getElementById('fName').focus();
  toast('Đã nhân bản. Điền tên & deadline mới rồi lưu.','info');
}
