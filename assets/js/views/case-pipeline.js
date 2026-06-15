/* ===== CASE PIPELINE VIEW ===== */

let _cpFilterTeam  = '';
let _cpFilterRag   = '';
let _cpFilterLoai  = '';
let _cpFilterStage = '';
let _cpEditId      = null;  // null = new, string = editing existing

/* ══════════════════════════════════════════
   MAIN RENDER
══════════════════════════════════════════ */
function renderCasePipeline() {
  _cpPopulateFilters();
  _cpRenderSummary();
  _cpRenderBoard();
  const ts = document.getElementById('cpTimestamp');
  if (ts) ts.textContent = 'Cập nhật: ' + new Date().toLocaleTimeString('vi-VN');
}

/* ──────────────────────────────────────────
   FILTER helpers
────────────────────────────────────────── */
function _cpApplyFilters(cases) {
  return cases.filter(c => {
    if (_cpFilterTeam  && c.team     !== _cpFilterTeam)  return false;
    if (_cpFilterLoai  && c.loaiHinh !== _cpFilterLoai)  return false;
    if (_cpFilterStage && c.stage    !== _cpFilterStage) return false;
    if (_cpFilterRag) {
      const ragActual = _cpCalcRagLabel(c);
      if (ragActual !== _cpFilterRag) return false;
    }
    return true;
  });
}

function _cpPopulateFilters() {
  const cases = dbCases || [];

  const teamSel  = document.getElementById('cpFilterTeam');
  const loaiSel  = document.getElementById('cpFilterLoai');
  const stageSel = document.getElementById('cpFilterStage');

  if (teamSel) {
    const teams = [...new Set(cases.map(c => c.team).filter(Boolean))].sort();
    const prev  = teamSel.value;
    teamSel.innerHTML = '<option value="">Tất cả đội</option>' +
      teams.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
    teamSel.value = teams.includes(prev) ? prev : '';
    _cpFilterTeam = teamSel.value;
  }

  if (loaiSel) {
    const prev = loaiSel.value;
    loaiSel.innerHTML = '<option value="">Tất cả loại</option>' +
      CASE_LOAI_HINH.map(l => `<option value="${esc(l)}">${esc(l)}</option>`).join('');
    loaiSel.value = CASE_LOAI_HINH.includes(prev) ? prev : '';
    _cpFilterLoai = loaiSel.value;
  }

  if (stageSel) {
    const prev = stageSel.value;
    stageSel.innerHTML = '<option value="">Tất cả stage</option>' +
      CASE_STAGES.map(s => `<option value="${esc(s)}">${esc(s)}</option>`).join('');
    stageSel.value = CASE_STAGES.includes(prev) ? prev : '';
    _cpFilterStage = stageSel.value;
  }
}

/* ──────────────────────────────────────────
   RAG computed label (Vietnamese)
────────────────────────────────────────── */
function _cpCalcRagLabel(c) {
  if (c.rag) return c.rag;
  return calcCaseRag(c);
}

function _cpRagClass(rag) {
  if (!rag) return 'none';
  const m = { 'Đỏ': 'red', 'Vàng': 'amber', 'Xanh': 'green' };
  return m[rag] || 'none';
}

/* ──────────────────────────────────────────
   SUMMARY CARDS
────────────────────────────────────────── */
function _cpRenderSummary() {
  const cases    = dbCases || [];
  const filtered = _cpApplyFilters(cases);

  const totalVal    = filtered.reduce((s, c) => s + (c.giaTriTy || 0), 0);
  const overdueList = filtered.filter(c => {
    const d = parseVNDate(c.deadline);
    if (!d) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const done  = ['Đã phê duyệt','Đang triển khai'];
    return d < today && !done.includes(c.stage);
  });
  const bldList = filtered.filter(c => c.canBLD === 'Y');

  const el = id => document.getElementById(id);

  const fmt = n => n.toLocaleString('vi-VN', { maximumFractionDigits: 1 });

  if (el('cpStatTotal'))    el('cpStatTotal').textContent   = filtered.length;
  if (el('cpStatValue'))    el('cpStatValue').textContent   = fmt(totalVal) + ' tỷ';
  if (el('cpStatOverdue'))  el('cpStatOverdue').textContent = overdueList.length;
  if (el('cpStatBld'))      el('cpStatBld').textContent     = bldList.length;
}

/* ──────────────────────────────────────────
   KANBAN BOARD
────────────────────────────────────────── */
function _cpRenderBoard() {
  const board    = document.getElementById('cpBoard');
  if (!board) return;

  const filtered = _cpApplyFilters(dbCases || []);
  const byStage  = {};
  CASE_STAGES.forEach(s => { byStage[s] = []; });
  filtered.forEach(c => {
    const s = c.stage || '';
    if (byStage[s] !== undefined) byStage[s].push(c);
    else { byStage[s] = [c]; }
  });

  board.innerHTML = CASE_STAGES.map(stage => {
    const items  = byStage[stage] || [];
    const group  = CASE_STAGE_GROUP[stage] || 'active';
    const cards  = items.length
      ? items.map(c => _cpCardHtml(c)).join('')
      : `<div class="cp-col-empty">Không có case</div>`;

    return `
      <div class="cp-col">
        <div class="cp-col-header group-${group}">
          <span class="cp-col-title" title="${esc(stage)}">${esc(stage)}</span>
          <span class="cp-col-count">${items.length}</span>
        </div>
        <div class="cp-col-body">${cards}</div>
      </div>`;
  }).join('');
}

function _cpCardHtml(c) {
  const rag    = _cpCalcRagLabel(c);
  const rc     = _cpRagClass(rag);
  const val    = c.giaTriTy ? `${Number(c.giaTriTy).toLocaleString('vi-VN')} tỷ` : '–';

  let chips = `<span class="cp-chip cp-chip-loai">${esc(c.loaiHinh || '–')}</span>`;
  if (c.complexity) {
    const cxClass = { 'Cao': 'cao', 'Trung bình': 'tb', 'Thấp': 'thap' }[c.complexity] || 'tb';
    chips += ` <span class="cp-chip cp-chip-complex-${cxClass}">${esc(c.complexity)}</span>`;
  }
  if (c.canBLD === 'Y')    chips += ` <span class="cp-chip cp-chip-bld">Cần BLĐ</span>`;
  if (c.highlight === 'Y') chips += ` <span class="cp-chip cp-chip-hl">★ Highlight</span>`;

  return `
    <div class="cp-card rag-${rc}" onclick="cpOpenDetail('${esc(c.id)}')" title="Click để xem / sửa">
      <div class="cp-card-top">
        <div class="cp-card-name">${esc(c.caseName || c.id)}</div>
        <div class="cp-card-rag ${rc}"></div>
      </div>
      <div class="cp-card-sub"><i class="fa-solid fa-user" style="margin-right:3px;opacity:.6;"></i>${esc(c.pic || '–')}</div>
      ${c.phuongAn ? `<div class="cp-card-sub" style="margin-top:2px;">${esc(c.phuongAn.length > 50 ? c.phuongAn.slice(0,50) + '…' : c.phuongAn)}</div>` : ''}
      <div class="cp-card-value">${val}</div>
      <div class="cp-card-chips">${chips}</div>
      ${c.deadline ? `<div class="cp-card-sub" style="margin-top:5px;"><i class="fa-solid fa-calendar-xmark" style="margin-right:3px;opacity:.6;"></i>${esc(fmtDate(c.deadline))}</div>` : ''}
    </div>`;
}

/* ──────────────────────────────────────────
   FILTER EVENTS (called from HTML onchange)
────────────────────────────────────────── */
function cpFilterChange() {
  _cpFilterTeam  = (document.getElementById('cpFilterTeam')  || {}).value || '';
  _cpFilterLoai  = (document.getElementById('cpFilterLoai')  || {}).value || '';
  _cpFilterStage = (document.getElementById('cpFilterStage') || {}).value || '';
  _cpFilterRag   = (document.getElementById('cpFilterRag')   || {}).value || '';
  _cpRenderSummary();
  _cpRenderBoard();
}

/* ══════════════════════════════════════════
   CRUD MODAL
══════════════════════════════════════════ */
function openCaseModal(id) {
  _cpEditId = id || null;
  const c   = id ? (dbCases || []).find(x => x.id === id) : null;

  document.getElementById('cpModalTitle').textContent = c ? 'Sửa Case' : 'Thêm Case mới';

  const fv = (fId, val) => {
    const el = document.getElementById(fId);
    if (el) el.value = val != null ? val : '';
  };

  const newId = c ? c.id : genCaseId();
  fv('cpfId',         c ? c.id          : newId);
  fv('cpfTuanBC',     c ? c.tuanBC      : _cpCurrentWeek());
  fv('cpfTeam',       c ? c.team        : '');
  fv('cpfPic',        c ? c.pic         : '');
  fv('cpfDvkd',       c ? c.dvkd        : '');
  fv('cpfCaseName',   c ? c.caseName    : '');
  fv('cpfLoaiHinh',   c ? c.loaiHinh    : '');
  fv('cpfComplexity', c ? c.complexity  : '');
  fv('cpfPhuongAn',   c ? c.phuongAn    : '');
  fv('cpfGiaTri',     c ? (c.giaTriTy || '') : '');
  fv('cpfStage',      c ? c.stage       : CASE_STAGES[0]);
  fv('cpfVuongMac',   c ? c.vuongMac    : '');
  fv('cpfNextStep',   c ? c.nextStep    : '');
  fv('cpfStartDate',  c ? c.startDate   : '');
  fv('cpfDeadline',   c ? c.deadline    : '');
  fv('cpfRag',        c ? c.rag         : '');
  fv('cpfCanBLD',     c ? c.canBLD      : 'N');
  fv('cpfHighlight',  c ? c.highlight   : 'N');
  fv('cpfGhiChu',     c ? c.ghiChu      : '');

  const delBtn = document.getElementById('cpModalDeleteBtn');
  if (delBtn) delBtn.style.display = c ? 'inline-flex' : 'none';

  document.getElementById('cpModal').style.display = 'flex';
}

function closeCaseModal() {
  document.getElementById('cpModal').style.display = 'none';
  _cpEditId = null;
}

function handleCaseSubmit() {
  const fv = id => (document.getElementById(id) || {}).value?.trim() || '';

  const caseName = fv('cpfCaseName');
  if (!caseName) { toast('Vui lòng nhập Khách hàng / Case.', 'warning'); return; }
  const stage = fv('cpfStage');
  if (!stage) { toast('Vui lòng chọn Stage.', 'warning'); return; }

  const newCase = {
    id:         _cpEditId || fv('cpfId') || genCaseId(),
    tuanBC:     fv('cpfTuanBC'),
    team:       fv('cpfTeam'),
    pic:        fv('cpfPic'),
    dvkd:       fv('cpfDvkd'),
    caseName,
    loaiHinh:   fv('cpfLoaiHinh'),
    complexity: fv('cpfComplexity'),
    phuongAn:   fv('cpfPhuongAn'),
    giaTriTy:   parseFloat(fv('cpfGiaTri')) || 0,
    stage,
    vuongMac:   fv('cpfVuongMac'),
    nextStep:   fv('cpfNextStep'),
    startDate:  fv('cpfStartDate'),
    deadline:   fv('cpfDeadline'),
    rag:        fv('cpfRag'),
    canBLD:     fv('cpfCanBLD')    || 'N',
    highlight:  fv('cpfHighlight') || 'N',
    ghiChu:     fv('cpfGhiChu'),
    yKienBLD:   _cpEditId ? ((dbCases || []).find(x => x.id === _cpEditId)?.yKienBLD || '') : '',
  };

  closeCaseModal();

  syncCaseAction(() => {
    if (_cpEditId) {
      const idx = dbCases.findIndex(x => x.id === _cpEditId);
      if (idx !== -1) dbCases[idx] = newCase;
      else dbCases.push(newCase);
      toast('Đã cập nhật case.', 'success');
    } else {
      dbCases.push(newCase);
      toast('Đã thêm case mới.', 'success');
    }
  });
}

async function deleteCaseItem() {
  if (!_cpEditId) return;
  const c = (dbCases || []).find(x => x.id === _cpEditId);
  const ok = await uiConfirm(
    'Xóa Case',
    `Bạn có chắc muốn xóa case <strong>${esc(c?.caseName || _cpEditId)}</strong>?`,
    'danger', 'Xóa'
  );
  if (!ok) return;
  closeCaseModal();
  syncCaseAction(() => {
    dbCases = dbCases.filter(x => x.id !== _cpEditId);
    toast('Đã xóa case.', 'success');
  });
}

/* ──────────────────────────────────────────
   DETAIL / Quick-open
────────────────────────────────────────── */
function cpOpenDetail(id) {
  openCaseModal(id);
}

/* ──────────────────────────────────────────
   HELPERS
────────────────────────────────────────── */
function _cpCurrentWeek() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const wk   = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `Tuần ${wk}/${now.getFullYear()}`;
}

/* ══════════════════════════════════════════
   EXCEL EXPORT
══════════════════════════════════════════ */
function exportCasesToExcel() {
  const cases = _cpApplyFilters(dbCases || []);
  if (!cases.length) { toast('Không có case nào để xuất.', 'warning'); return; }

  const rows = [CASE_COLS, ...cases.map(caseToRow)];
  const ws   = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = [
    {wch:10},{wch:14},{wch:12},{wch:12},{wch:10},{wch:30},
    {wch:12},{wch:16},{wch:35},{wch:12},
    {wch:35},{wch:30},{wch:30},
    {wch:12},{wch:12},{wch:8},
    {wch:10},{wch:18},{wch:25},{wch:30},
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Case_Pipeline');
  XLSX.writeFile(wb, `CasePipeline_${new Date().toISOString().slice(0,10)}.xlsx`);
  toast('Đã xuất Excel thành công.', 'success');
}

/* ══════════════════════════════════════════
   EXCEL IMPORT
══════════════════════════════════════════ */
function importCasesFromExcel(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb     = XLSX.read(e.target.result, { type: 'binary', cellDates: false });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const raw    = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (!raw || raw.length < 2) { toast('File không có dữ liệu.', 'warning'); return; }

      const header   = raw[0].map(h => String(h).trim());
      const imported = [];
      const existing = new Set((dbCases || []).map(c => c.id));

      let newCount = 0, updateCount = 0, errCount = 0;

      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (row.every(cell => cell === '')) continue;
        try {
          const c = rowToCase(header, row.map(v => String(v ?? '').trim()));
          if (!c.caseName && !c.id) { errCount++; continue; }
          if (!c.id) c.id = genCaseId() + '_' + i;
          if (!CASE_STAGES.includes(c.stage)) c.stage = CASE_STAGES[0];
          if (existing.has(c.id)) { updateCount++; }
          else { newCount++; }
          imported.push(c);
        } catch(_) { errCount++; }
      }

      if (!imported.length) { toast('Không có dòng hợp lệ nào để import.', 'warning'); return; }

      uiConfirm(
        'Xác nhận import',
        `Tìm thấy <strong>${imported.length}</strong> case (${newCount} mới, ${updateCount} cập nhật${errCount ? ', ' + errCount + ' lỗi' : ''}).<br>Tiếp tục import?`,
        'primary', 'Import'
      ).then(ok => {
        if (!ok) return;
        syncCaseAction(() => {
          const idMap = new Map((dbCases || []).map(c => [c.id, c]));
          imported.forEach(c => { idMap.set(c.id, c); });
          dbCases = [...idMap.values()];
          toast(`Import thành công: ${newCount} mới, ${updateCount} cập nhật.`, 'success');
        });
      });
    } catch(err) {
      toast('Lỗi đọc file Excel: ' + err.message, 'error');
    }
  };
  reader.readAsBinaryString(file);
}
