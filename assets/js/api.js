// ── Case Pipeline helpers ──

function calcCaseRag(c) {
  if (!c.deadline) return '';
  const d = parseVNDate(c.deadline);
  if (!d) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const diff  = Math.ceil((d - today) / 86400000);
  if (diff <= 0)  return 'Đỏ';
  if (diff <= 7)  return 'Vàng';
  return 'Xanh';
}

function genCaseId() {
  const pfx = 'CP-';
  let max = 0;
  (dbCases || []).forEach(c => {
    if (c.id && c.id.toUpperCase().startsWith('CP-')) {
      const n = parseInt(c.id.slice(3));
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return pfx + String(max + 1).padStart(3, '0');
}

function caseToRow(c) {
  return [
    /* 0  ID                  */ c.id             || '',
    /* 1  Tuần BC             */ c.tuanBC          || '',
    /* 2  Team                */ c.team            || '',
    /* 3  PIC                 */ c.pic             || '',
    /* 4  ĐVKD                */ c.dvkd            || '',
    /* 5  Khách hàng / Case   */ c.caseName        || '',
    /* 6  Loại hình           */ c.loaiHinh        || '',
    /* 7  Mức độ phức tạp     */ c.complexity      || '',
    /* 8  Phương án           */ c.phuongAn        || '',
    /* 9  Giá trị (tỷ đồng)  */ c.giaTriTy != null ? String(c.giaTriTy) : '',
    /* 10 Stage               */ c.stage           || '',
    /* 11 Vướng mắc chính     */ c.vuongMac        || '',
    /* 12 Next step           */ c.nextStep        || '',
    /* 13 Start Date          */ fmtDateExport(c.startDate),
    /* 14 Deadline            */ fmtDateExport(c.deadline),
    /* 15 RAG                 */ c.rag             || '',
    /* 16 Cần BLĐ?            */ c.canBLD          || 'N',
    /* 17 Highlight dashboard?*/ c.highlight       || 'N',
    /* 18 Ghi chú             */ c.ghiChu          || '',
    /* 19 Ý kiến BLĐ          */ c.yKienBLD        || '',
  ];
}

function rowToCase(header, row) {
  const idx = k => header.indexOf(k);
  const v   = i => (row[i] || '').toString().trim();

  const rawDate = s => {
    if (!s) return '';
    // dd-MMM-yy → yyyy-MM-dd
    const mmmMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
    const m = s.match(/^(\d{1,2})-([a-zA-Z]{3})-(\d{2,4})$/);
    if (m) {
      const mo = mmmMap[m[2].toLowerCase()];
      if (mo !== undefined) {
        const yr = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
        return `${yr}-${String(mo+1).padStart(2,'0')}-${m[1].padStart(2,'0')}`;
      }
    }
    // dd/MM/yyyy
    const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m2) return `${m2[3]}-${m2[2].padStart(2,'0')}-${m2[1].padStart(2,'0')}`;
    return s;
  };

  return {
    id:          v(idx('ID')),
    tuanBC:      v(idx('Tuần BC')),
    team:        v(idx('Team')),
    pic:         v(idx('PIC')),
    dvkd:        v(idx('ĐVKD')),
    caseName:    v(idx('Khách hàng / Case')),
    loaiHinh:    v(idx('Loại hình')),
    complexity:  v(idx('Mức độ phức tạp')),
    phuongAn:    v(idx('Phương án')),
    giaTriTy:    parseFloat(v(idx('Giá trị (tỷ đồng)'))) || 0,
    stage:       v(idx('Stage')),
    vuongMac:    v(idx('Vướng mắc chính')),
    nextStep:    v(idx('Next step')),
    startDate:   rawDate(v(idx('Start Date'))),
    deadline:    rawDate(v(idx('Deadline'))),
    rag:         v(idx('RAG')),
    canBLD:      v(idx('Cần BLĐ?'))       || 'N',
    highlight:   v(idx('Highlight dashboard?')) || 'N',
    ghiChu:      v(idx('Ghi chú')),
    yKienBLD:    v(idx('Ý kiến BLĐ')),
  };
}

function _parseCaseArray(values) {
  if (!values || values.length < 2) { dbCases = []; return; }
  const header = values[0];
  dbCases = values.slice(1)
    .filter(r => r.some(cell => cell !== ''))
    .map(r => rowToCase(header, r));
}

async function readCases() {
  if (!GS_WEBAPP_URL) return false;
  try {
    const json = await gasPost({ action: 'case-pipeline-read' });
    if (json.status !== 'ok') throw new Error(json.error || 'unknown');
    _parseCaseArray(json.values);
    persistCases();
    return true;
  } catch(e) {
    console.warn('readCases error:', e.message);
    return false;
  }
}

async function writeCases() {
  if (!GS_WEBAPP_URL) return false;
  const values = [CASE_COLS, ...dbCases.map(caseToRow)];
  const json   = await gasPost({ action: 'case-pipeline-write', values });
  if (json.status !== 'ok') throw new Error(json.error || 'unknown');
  return true;
}

function persistCases() {
  try {
    const raw = localStorage.getItem('shtd_v2') || '{}';
    const obj = JSON.parse(raw);
    obj.cases  = dbCases;
    localStorage.setItem('shtd_v2', JSON.stringify(obj));
  } catch(e) {}
}

function loadCasesFromCache() {
  try {
    const raw = localStorage.getItem('shtd_v2');
    if (!raw) return;
    const obj = JSON.parse(raw);
    if (Array.isArray(obj.cases)) dbCases = obj.cases;
  } catch(e) {}
}

async function syncCaseAction(mutateFn) {
  showLoading('Đang đồng bộ Case Pipeline…');
  document.getElementById('syncDot').className = 'status-dot syncing';
  try {
    if (typeof mutateFn === 'function') mutateFn();

    if (GS_WEBAPP_URL) {
      try {
        await writeCases();
        document.getElementById('syncDot').className = 'status-dot connected';
      } catch(gasErr) {
        // GAS offline — save locally, warn user
        console.warn('syncCaseAction: GAS offline, local save only:', gasErr.message);
        persistCases();
        renderCasePipeline();
        document.getElementById('syncDot').className = 'status-dot';
        toast('⚠️ GAS không phản hồi — đã lưu Case cục bộ. Nhớ đồng bộ khi kết nối lại.', 'warning', 5000);
        return true;
      }
    }

    persistCases();
    renderCasePipeline();
    return true;
  } catch(e) {
    console.error('syncCaseAction error:', e);
    toast('❌ Lỗi đồng bộ Case: ' + e.message, 'error', 6000);
    document.getElementById('syncDot').className = 'status-dot';
    return false;
  } finally {
    hideLoading();
  }
}

function taskToRow(t) {
  return [
    /* 0  ID                */ t.id            || '',
    /* 1  Tuần BC           */ t.tuanBC         || '',
    /* 2  Initiative ID     */ t.initiative     || '',
    /* 3  Category          */ t.category       || '',
    /* 4  Team chính        */ t.team           || '',
    /* 5  Team phối hợp     */ t.teamPhoiHop    || '',
    /* 6  Loại              */ t.type           || 'Task',
    /* 7  Task/Deliverable  */ t.name           || '',
    /* 8  PIC Accountable   */ t.picAcc         || '',
    /* 9  PIC Responsible   */ t.picRes         || '',
    /* 10 PIC Support       */ t.picSupport     || '',
    /* 11 Start Date        */ fmtDateExport(t.startDate),
    /* 12 Deadline          */ fmtDateExport(t.endDate),
    /* 13 % HT              */ (t.progress != null ? t.progress + '%' : '0%'),
    /* 14 Trạng thái        */ t.state          || 'Chưa bắt đầu',
    /* 15 Milestone         */ t.milestone      || '',
    /* 16 Kết quả tuần qua  */ t.result         || '',
    /* 17 Kế hoạch tuần tới */ t.nextPlan       || '',
    /* 18 Vướng mắc         */ t.vuongMac       || '',
    /* 19 Cần BLĐ           */ t.canBLD         || 'N',
    /* 20 Nội dung BLĐ      */ t.noiDungBLD     || '',
    /* 21 Cross-team        */ t.crossTeam      || 'N',
    /* 22 Highlight         */ t.highlight      || 'N',
    /* 23 Ý kiến BLĐ        */ t.yKienBLD       || '',
  ];
}

async function readFromHandle() {
  if (!GS_WEBAPP_URL) throw new Error('Chưa cấu hình GS_WEBAPP_URL.');
  const json = await gasPost({ action: 'read' });
  if (json.status !== 'ok') throw new Error('Lỗi đọc: ' + (json.error || 'unknown'));
  _parseArrayIntoDb(json.values);
  if (json.serverTs) db._serverTs = json.serverTs;
  persist();
  return true;
}

async function writeToHandle() {
  if (!GS_WEBAPP_URL) {
    throw new Error('Chưa cấu hình GS_WEBAPP_URL. Xem hướng dẫn triển khai Apps Script.');
  }
  if (db.tasks.length === 0) {
    throw new Error('BLOCKED: Từ chối ghi dữ liệu rỗng lên Sheet (0 task). Thao tác đã bị hủy để bảo vệ dữ liệu.');
  }
  const values = [DB_COLS, ...db.tasks.map(taskToRow)];
  const body   = { action: 'write', values };
  if (db._serverTs) body.clientTs = db._serverTs;
  const json = await gasPost(body);
  if (json.status !== 'ok') throw new Error('Lỗi ghi: ' + (json.error || 'unknown'));
}

async function syncAction(action) {
  showLoading('Đang đồng bộ Google Sheets…');
  document.getElementById('syncDot').className = 'status-dot syncing';

  const snapshotBefore = db.tasks.map(t => t.id);

  try {
    if (typeof action === 'function') action();

    const localTasks = db.tasks;

    let serverTasks = null;
    if (GS_WEBAPP_URL) {
      try {
        showLoading('Đang đọc dữ liệu mới nhất từ Sheet…');
        const json = await gasPost({ action: 'read' });
        if (json.status === 'ok' && json.values) {
          const tempDb = { tasks: [], initiatives: [] };
          const savedDb = db;
          db = tempDb;
          _parseArrayIntoDb(json.values);
          serverTasks = tempDb.tasks;
          db = savedDb;
          if (json.serverTs) db._serverTs = json.serverTs;
        }
      } catch (readErr) {
        console.warn('syncAction: không đọc được Sheet, fallback full-write:', readErr.message);
      }
    }

    if (serverTasks !== null) {
      const serverMap = new Map(serverTasks.map(t => [t.id, t]));
      const localIds = new Set(localTasks.map(t => t.id));
      const deletedIds = new Set(snapshotBefore.filter(id => !localIds.has(id)));
      const localMap = new Map(localTasks.map(t => [t.id, t]));

      const merged = [];
      serverMap.forEach((t, id) => {
        if (deletedIds.has(id)) return;
        if (localMap.has(id)) {
          merged.push(localMap.get(id));
        } else {
          merged.push(t);
        }
      });
      localMap.forEach((t, id) => {
        if (!serverMap.has(id) && !deletedIds.has(id)) {
          merged.push(t);
        }
      });

      showLoading('Đang ghi dữ liệu lên Sheet…');
      const values    = [DB_COLS, ...merged.map(taskToRow)];
      const writeBody = { action: 'write', values };
      if (db._serverTs) writeBody.clientTs = db._serverTs;

      if (merged.length === 0 && serverTasks.length > 0) {
        const ok = await uiConfirm(
          '⚠️ Cảnh báo mất dữ liệu',
          `Thao tác này sẽ xóa toàn bộ ${serverTasks.length} task trên Google Sheets. Bạn có chắc chắn?`,
          'danger', 'Xóa tất cả'
        );
        if (!ok) {
          db.tasks = serverTasks;
          persist(); renderAll();
          toast('Đã hủy thao tác.', 'info');
          hideLoading();
          document.getElementById('syncDot').className = 'status-dot connected';
          return false;
        }
      }

      const json = await gasPost(writeBody);
      if (json.status !== 'ok') throw new Error('Lỗi ghi: ' + (json.error || 'unknown'));

      db.tasks = merged;

    } else {
      if (db.tasks.length === 0) throw new Error('BLOCKED: Từ chối ghi dữ liệu rỗng (0 task).');
      // GAS không kết nối được (URL chưa cấu hình hoặc mạng lỗi) — lưu cục bộ
      persist(); renderAll();
      document.getElementById('syncDot').className = 'status-dot';
      toast('⚠️ GAS không phản hồi — đã lưu cục bộ. Nhớ đồng bộ Sheets khi kết nối lại.', 'warning', 5000);
      return true;
    }

    persist(); renderAll();
    document.getElementById('syncDot').className = 'status-dot connected';
    return true;

  } catch(e) {
    if (e.message === 'VERSION_CONFLICT' || (e.message && e.message.includes('VERSION_CONFLICT'))) {
      toast('⚠️ Dữ liệu vừa được cập nhật bởi người khác. Đang tải lại dữ liệu mới nhất…', 'warning', 6000);
      try { await readFromHandle(); renderAll(); } catch(_) {}
      hideLoading();
      document.getElementById('syncDot').className = 'status-dot connected';
      return false;
    }
    try {
      const cached = localStorage.getItem('shtd_v2');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.tasks) { db.tasks = parsed.tasks; db.initiatives = parsed.initiatives || []; }
      }
    } catch(_) {}
    renderAll();
    console.error('syncAction error:', e);
    toast('❌ Lỗi đồng bộ: ' + e.message + ' — Dữ liệu local đã được khôi phục.', 'error', 8000);
    document.getElementById('syncDot').className = 'status-dot';
    return false;
  } finally {
    hideLoading();
  }
}
/* ══════════════════════════════════════════
   USER MASTER — global cache for Team/PIC dropdowns
══════════════════════════════════════════ */
let _appUsers = [];

async function loadAppUsers() {
  if (!GS_WEBAPP_URL || !getAuthSession()) return;
  try {
    const res = await gasPost({ action: 'user-list' });
    if (res.status !== 'ok' || !res.data) return;
    const { header, rows } = res.data;
    _appUsers = rows
      .map(row => {
        const obj = {};
        header.forEach((h, i) => { obj[h] = row[i]; });
        return obj;
      })
      .filter(u => String(u.Active).toLowerCase() !== 'false');
  } catch(e) {
    console.warn('loadAppUsers failed:', e.message);
  }
}

function getAppTeams() {
  if (_appUsers.length) {
    return [...new Set(_appUsers.map(u => u.Team).filter(Boolean))].sort();
  }
  return TEAM_LIST;
}

function getUsersByTeam(team) {
  if (!_appUsers.length) return [];
  return _appUsers.filter(u => !team || u.Team === team);
}

function _populateTeamSelect(selectId, currentVal) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const teams  = getAppTeams();
  const isReq  = el.hasAttribute('required');
  el.innerHTML = (!isReq ? '<option value="">– Chọn team –</option>' : '')
    + teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
  if (currentVal && teams.includes(currentVal)) el.value = currentVal;
  else if (isReq && teams.length) el.value = teams[0];
}

function _populateUserSelect(selectId, team, currentVal) {
  const el = document.getElementById(selectId);
  if (!el) return;
  const isReq = el.hasAttribute('required');

  if (team === '') {
    el.innerHTML = '<option value="">– Chọn team trước –</option>'
      + (currentVal ? `<option value="${esc(currentVal)}">${esc(currentVal)}</option>` : '');
    if (currentVal) el.value = currentVal;
    return;
  }

  // team === null → show all users (no team filter); team string → filter by team
  const users = getUsersByTeam(team || '');

  if (!users.length) {
    el.innerHTML = (!isReq ? '<option value="">– Chọn –</option>' : '')
      + (currentVal ? `<option value="${esc(currentVal)}">${esc(currentVal)}</option>` : '');
    if (currentVal) el.value = currentVal;
    return;
  }

  el.innerHTML = (!isReq ? '<option value="">– Chọn –</option>' : '')
    + users.map(u => {
        const label = u.Display_Name
          ? `${esc(u.Display_Name)} (${esc(u.Username)})`
          : esc(u.Username);
        return `<option value="${esc(u.Username)}">${label}</option>`;
      }).join('');

  if (currentVal) el.value = currentVal;
  else if (isReq && users.length) el.value = users[0].Username;

  if (currentVal && el.value !== currentVal) {
    el.innerHTML += `<option value="${esc(currentVal)}">${esc(currentVal)}</option>`;
    el.value = currentVal;
  }
}
