'use strict';

/* ── Initiative_Master – 15 cột (A→O) ── */
const INI_COLS = [
  'ID',
  'Tên Initiative / Milestone',
  'Category',
  'Accountable',
  'Start Date',
  'Deadline / Target',
  '% HT',
  'Milestone Đang track',
  'Deadline Milestone',
  'Trạng thái',
  'Mục tiêu / KPI đầu ra',
  'Ghi chú',
  'Link tài liệu',
  'Parent ID',
  'Type',
];

/* ── Milestone ID helpers ── */
const _isMilestone  = id => /-M\d+$/.test(id || '');
const _msShortLabel = id => { const m = (id||'').match(/-M(\d+)$/); return m ? 'M' + m[1] : (id||''); };
const _msParentId   = id => (id||'').replace(/-M\d+$/, '');

/* ── Serializer: initiative object → 15-phần tử array ── */
function initiativeToRow(ini) {
  return [
    ini.id              || '',
    ini.name            || '',
    ini.category        || '',
    ini.accountable     || '',
    ini.startDate       || '',
    ini.deadline        || '',
    ini.pct !== undefined ? String(ini.pct) : '',
    ini.milestoneTracking || '',
    ini.milestoneDeadline || '',
    ini.status          || 'Active',
    ini.kpiTarget       || '',
    ini.notes           || '',
    ini.docLink         || '',
    ini.parentId        || '',
    ini.type || (_isMilestone(ini.id) ? 'milestone' : 'initiative'),
  ];
}

/* ── Parser: mảng 2D từ GAS → db.initiatives[] ── */
function _parseInitiativeArray(values) {
  if (!values || values.length < 2) return;
  const norm = s => (s || '').toString().toLowerCase().replace(/[\s\n\t_\-\/]+/g, '');
  const H = values[0];
  const ci = kw => H.findIndex(h => norm(h).includes(norm(kw)));

  let cId   = ci('id');
  let cName = ci('tên');
  let cCat  = ci('category');
  let cAcc  = ci('accountable');
  const cSt   = ci('start');
  const cDl   = ci('deadline/target');
  const cPct  = ci('%ht');
  const cMsT  = ci('milestoneđangtrack');
  const cMsDl = ci('deadlinemilestone');
  const cSts  = ci('trạng');
  const cKpi  = ci('mụctiêu');
  const cNote = ci('ghichú');
  const cDoc  = ci('linktài');
  const cPar  = ci('parentid');
  const cType = ci('type');

  const g = (r, c) => c !== -1 ? (r[c] || '').toString().trim() : '';

  // Positional fallback: if the "ID" header wasn't found but row 0 looks like initiative data
  // (e.g. "SCF-001"), treat the sheet as headerless and use column positions A=0, B=1, C=2, D=3.
  let startRow = 1;
  if (cId === -1 && /^[A-Z]{2,}-\d/.test(((values[0] && values[0][0]) || '').toString().trim())) {
    cId = 0;
    if (cName === -1) cName = 1;
    if (cCat  === -1) cCat  = 2;
    if (cAcc  === -1) cAcc  = 3;
    startRow = 0;
  }

  db.initiatives = [];
  for (let i = startRow; i < values.length; i++) {
    const r = values[i];
    const id = g(r, cId);
    if (!id) continue;

    let pct = 0;
    const pRaw = g(r, cPct);
    if (pRaw) {
      const cv = parseFloat(pRaw.replace('%', ''));
      pct = (!pRaw.includes('%') && cv <= 1) ? Math.round(cv * 100) : (Math.round(cv) || 0);
    }

    const isMsRow    = _isMilestone(id);
    const rawMsTrack = g(r, cMsT);
    const rawStatus  = g(r, cSts);

    // Milestone rows: "Milestone Đang track" col stores milestone status ("Xong"/"Đang làm"/"Chưa bắt đầu")
    // Initiative rows: "Milestone Đang track" col stores the name of the currently tracked milestone
    const status             = isMsRow ? (rawStatus || rawMsTrack || 'Chưa bắt đầu') : (rawStatus || 'Active');
    const milestoneTracking  = isMsRow ? '' : rawMsTrack;
    const milestoneDeadline  = isMsRow ? '' : g(r, cMsDl);

    // Type: explicit col → derive from ID pattern
    const type     = g(r, cType) || (isMsRow ? 'milestone' : 'initiative');
    // parentId: explicit col → derive from ID pattern for milestones
    const parentId = g(r, cPar) || (isMsRow ? _msParentId(id) : null) || null;

    db.initiatives.push({
      id,
      name:              g(r, cName),
      category:          g(r, cCat),
      accountable:       g(r, cAcc),
      startDate:         g(r, cSt),
      deadline:          g(r, cDl),
      pct,
      milestoneTracking,
      milestoneDeadline,
      status,
      kpiTarget:         g(r, cKpi),
      notes:             g(r, cNote),
      docLink:           g(r, cDoc),
      parentId,
      type,
    });
  }
}

/* ── GAS sync: đọc Initiative_Master ── */
async function readInitiatives() {
  if (!GS_WEBAPP_URL) return;
  if (!getAuthSession()) return;
  try {
    const json = await gasPost({ action: 'initiative-read' });
    if (json.status !== 'ok') throw new Error(json.error || 'initiative-read lỗi');
    _parseInitiativeArray(json.values);
    persist();
  } catch (e) {
    console.warn('readInitiatives failed:', e.message);
  }
}

/* ── GAS sync: ghi toàn bộ Initiative_Master ── */
async function writeInitiatives() {
  if (!GS_WEBAPP_URL) return;
  const rows = [INI_COLS, ...db.initiatives.map(initiativeToRow)];
  const json = await gasPost({ action: 'initiative-write', values: rows });
  if (json.status !== 'ok') throw new Error(json.error || 'initiative-write lỗi');
}

/* ── Unified GAS sync (Task Manager gold standard pattern) ── */
async function syncInitiativeAction(mutateFn) {
  showLoading('Đang đồng bộ Initiative…');
  document.getElementById('syncDot').className = 'status-dot syncing';
  try {
    if (typeof mutateFn === 'function') mutateFn();
    if (GS_WEBAPP_URL) {
      try {
        await writeInitiatives();
        document.getElementById('syncDot').className = 'status-dot connected';
      } catch(gasErr) {
        document.getElementById('syncDot').className = 'status-dot';
        toast('⚠️ GAS không phản hồi — đã lưu Initiative cục bộ.', 'warning', 5000);
        return true;
      }
    }
    return true;
  } catch(e) {
    toast('❌ Lỗi đồng bộ Initiative: ' + e.message, 'error', 6000);
    document.getElementById('syncDot').className = 'status-dot';
    return false;
  } finally {
    hideLoading();
  }
}

/* ── CRUD helpers ── */
function syncInitiativeAdd(ini) {
  syncInitiativeAction(() => {
    db.initiatives.push(ini);
    persist();
  });
}

function syncInitiativeEdit(ini) {
  syncInitiativeAction(() => {
    const idx = db.initiatives.findIndex(x => x.id === ini.id);
    if (idx === -1) return;
    db.initiatives[idx] = ini;
    persist();
  });
}

async function syncInitiativeDelete(id) {
  await syncInitiativeAction(() => {
    db.initiatives = db.initiatives.filter(x => x.id !== id);
    persist();
  });
}
