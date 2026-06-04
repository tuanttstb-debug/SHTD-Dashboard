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
  ];
}

async function readFromHandle() {
  if (!GS_WEBAPP_URL) throw new Error('Chưa cấu hình GS_WEBAPP_URL.');
  const res = await fetch(GS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'read' }),
  });
  if (!res.ok) throw new Error('Apps Script lỗi HTTP: ' + res.status);
  const json = await res.json();
  if (json.status !== 'ok') throw new Error('Lỗi đọc: ' + (json.error || 'unknown'));
  _parseArrayIntoDb(json.values);
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
  const res = await fetch(GS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'write', values }),
  });
  if (!res.ok) throw new Error('Apps Script lỗi HTTP: ' + res.status);
  const json = await res.json();
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
        const res = await fetch(GS_WEBAPP_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'read' }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.status === 'ok' && json.values) {
            const tempDb = { tasks: [], initiatives: [] };
            const savedDb = db;
            db = tempDb;
            _parseArrayIntoDb(json.values);
            serverTasks = tempDb.tasks;
            db = savedDb;
          }
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
      const values = [DB_COLS, ...merged.map(taskToRow)];

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

      const res = await fetch(GS_WEBAPP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'write', values }),
      });
      if (!res.ok) throw new Error('Apps Script lỗi HTTP: ' + res.status);
      const json = await res.json();
      if (json.status !== 'ok') throw new Error('Lỗi ghi: ' + (json.error || 'unknown'));

      db.tasks = merged;
      const iMap = new Map();
      db.tasks.forEach(t => { if (t.initiative && !iMap.has(t.initiative)) iMap.set(t.initiative, t.initiative); });
      db.initiatives = [...iMap.entries()].map(([id]) => ({ id, name: id }));

    } else {
      if (db.tasks.length === 0) throw new Error('BLOCKED: Từ chối ghi dữ liệu rỗng (0 task).');
      await writeToHandle();
    }

    persist(); renderAll();
    document.getElementById('syncDot').className = 'status-dot connected';
    return true;

  } catch(e) {
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
