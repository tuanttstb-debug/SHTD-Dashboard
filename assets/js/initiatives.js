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

  const cId   = ci('id');
  const cName = ci('tên');
  const cCat  = ci('category');
  const cAcc  = ci('accountable');
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

  db.initiatives = [];
  for (let i = 1; i < values.length; i++) {
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
  try {
    const res = await fetch(GS_WEBAPP_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'initiative-read' }),
    });
    const json = await res.json();
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
  const res = await fetch(GS_WEBAPP_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'initiative-write', values: rows }),
  });
  const json = await res.json();
  if (json.status !== 'ok') throw new Error(json.error || 'initiative-write lỗi');
}

/* ── CRUD helpers ── */
function syncInitiativeAdd(ini) {
  db.initiatives.push(ini);
  persist();
  writeInitiatives().catch(e => toast('⚠️ Lưu GG Sheets lỗi: ' + e.message, 'warning', 5000));
}

function syncInitiativeEdit(ini) {
  const idx = db.initiatives.findIndex(x => x.id === ini.id);
  if (idx === -1) return;
  db.initiatives[idx] = ini;
  persist();
  writeInitiatives().catch(e => toast('⚠️ Lưu GG Sheets lỗi: ' + e.message, 'warning', 5000));
}

async function syncInitiativeDelete(id) {
  db.initiatives = db.initiatives.filter(x => x.id !== id);
  persist();
  try {
    await writeInitiatives();
  } catch (e) {
    toast('⚠️ Xóa GG Sheets lỗi: ' + e.message, 'warning', 5000);
  }
}
