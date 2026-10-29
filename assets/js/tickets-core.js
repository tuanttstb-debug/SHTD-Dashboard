// ── SHTD Dashboard – Backlog IT core (ticket Jira DCB) ──
// Hub AIOS D22 (2026-10-29): Jira là nơi nhập duy nhất, thông tin quản trị ghi bằng LABEL chuẩn.
// File này: schema Ticket_Master + đọc file xuất Jira + suy ra line/PO/sẵn sàng/trôi (thuần, test được).
//
// Label chuẩn:
//   Line      GNOL · BLOL · HSTD (Ký số) · ThauChi · SCF      Nhãn phụ  CKTC · IDNES · TT134 · GNOL_TuDong
//   DCB_Task  đã chốt yêu cầu          UI_Can / UI_Xong   (không gắn = không cần UI)
//   TLPT_Xong TLPT/SRS xong            Expect_Golive_YYYYMM
//   OKR_<KR>  gắn OKR NPL              DXCT_QLCT · Dep_BPM · Dep_FCC · Dep_CCP

let dbTickets = [];

const TICKET_COLS = [
  'Key', 'Issue Type', 'Summary', 'Description', 'Status', 'Resolution', 'Priority',
  'Assignee', 'Reporter', 'Created', 'Updated', 'Labels', 'Epic Link', 'Linked Issues',
  'UI', 'TLPT', 'Loại backlog',
  'Ưu tiên team', 'Quyết định planning', 'Kỳ planning', 'Initiative ID', 'Ghi chú',
  'Import lúc', 'Import bởi'
];
const TK_FIELDS = [
  'key', 'type', 'summary', 'desc', 'status', 'resolution', 'priority',
  'assignee', 'reporter', 'created', 'updated', 'labels', 'epic', 'links',
  'ui', 'tlpt', 'loai',
  'uuTien', 'quyetDinh', 'ky', 'initId', 'note',
  'importedAt', 'importedBy'
];
// Chỉ số cột ghi được trên SHTD (khớp TicketService.gs)
const TK_COL = Object.fromEntries(TK_FIELDS.map((f, i) => [f, i]));
const TK_LEAD_FIELDS = ['uuTien', 'quyetDinh', 'ky'];

const TK_JIRA_BROWSE = 'https://ebit.tpb.vn/jira/browse/';
const TK_TEAM = 'Số';
const TK_LINES = ['GNOL', 'BLOL', 'HSTD', 'ThauChi', 'SCF'];
const TK_LINE_LABEL = { GNOL: 'GNOL', BLOL: 'BLOL', HSTD: 'Ký số', ThauChi: 'Thấu chi', SCF: 'SCF' };
const TK_SUBS = ['CKTC', 'IDNES', 'TT134', 'GNOL_TuDong'];
// Người Làm theo line (04_Knowledge/people/TEAM_SO_HOA.md — Lead mọi line = TuanTT4)
const TK_LINE_PO = { GNOL: 'DungLQ1', SCF: 'DungLQ1', BLOL: 'QuangNN3', ThauChi: 'QuangNN3', HSTD: 'TuanTT4' };
const TK_UI_VALUES = ['Không cần', 'Cần', 'Đang', 'Xong'];
const TK_TLPT_VALUES = ['Chưa', 'Đang', 'Xong'];
const TK_LOAI_VALUES = ['Lỗi', 'Sửa nhỏ', 'Cần UI', 'Cần tài liệu', 'Tính năng'];
const TK_DECISIONS = ['Đưa vào kỳ', 'Giữ backlog', 'Bỏ'];
const TK_DONE_STATUS = ['done', 'closed', 'cancelled', 'canceled', 'rejected'];
const TK_STALE_RED = 60;
const TK_STALE_AMBER = 30;

/* ══════════════ row ⇄ object ══════════════ */

function rowToTicket(r) {
  const o = {};
  TK_FIELDS.forEach((f, i) => { o[f] = String(r[i] == null ? '' : r[i]).trim(); });
  o.key = o.key.toUpperCase();
  o.created = tkParseDate(o.created);
  o.updated = tkParseDate(o.updated);
  return o;
}

function ticketToRow(t) {
  return TK_FIELDS.map(f => t[f] == null ? '' : String(t[f]));
}

/* ══════════════ parse helpers ══════════════ */

const _TK_MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

function _tkIso(y, m, d) {
  if (!y || !m || !d || m > 12 || d > 31) return '';
  if (y < 100) y += 2000;
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Date | ISO | dd/MM/yyyy | dd/Mon/yy h:mm AM (CSV Jira) | M/d/yyyy h:mm (bảng copy Jira) | serial Excel → 'YYYY-MM-DD'
function tkParseDate(v) {
  if (v == null || v === '') return '';
  if (v instanceof Date) return isNaN(v) ? '' : _tkIso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return isNaN(d) ? '' : _tkIso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = String(v).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return _tkIso(+m[1], +m[2], +m[3]);
  m = s.match(/^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})/);
  if (m) return _tkIso(+m[3], _TK_MON[m[2].toLowerCase()], +m[1]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+\d{1,2}:\d{2}/);   // bảng copy Jira (Outlook/Excel US): M/d/yyyy h:mm
  if (m) return _tkIso(+m[3], +m[1], +m[2]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);                 // ngày VN thuần: dd/MM/yyyy
  if (m) return _tkIso(+m[3], +m[2], +m[1]);
  return '';
}

function tkLabels(t) {
  return String(t.labels || '').split(/[,;\s]+/).map(x => x.trim()).filter(Boolean);
}

function _tkHas(labels, name) {
  const n = name.toLowerCase();
  return labels.some(l => l.toLowerCase() === n);
}

// Line theo tiền tố summary — dùng khi ticket chưa gắn label line
function _tkLineFromSummary(s) {
  const x = String(s || '').toLowerCase();
  if (/^\s*\[\s*(kyso|ký số|hstd)/.test(x)) return 'HSTD';
  if (/^\s*\[\s*gnol/.test(x)) return 'GNOL';
  if (/^\s*\[\s*(blol|cktc|idnes|tt134)/.test(x)) return 'BLOL';
  if (/^\s*\[\s*(thấu chi|thau chi|thauchi)/.test(x)) return 'ThauChi';
  if (/^\s*\[\s*scf/.test(x)) return 'SCF';
  return '';
}

/* ══════════════ suy ra (derive) ══════════════ */

function tkIsOpen(t) {
  return TK_DONE_STATUS.indexOf(String(t.status || '').trim().toLowerCase()) === -1;
}

function tkJiraPrioLevel(p) {
  const x = String(p || '').trim().toLowerCase();
  if (x === 'highest' || x === 'high' || x === 'critical' || x === 'blocker') return 1;
  if (x === 'medium' || x === 'major') return 2;
  if (x === 'low' || x === 'lowest' || x === 'minor' || x === 'trivial') return 3;
  return 0;
}

function _tkDays(fromIso, today) {
  if (!fromIso) return null;
  const d = new Date(fromIso + 'T00:00:00');
  if (isNaN(d)) return null;
  const t0 = new Date(today); t0.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((t0 - d) / 86400000));
}

/**
 * Suy ra các trường quản trị từ label (ưu tiên) → cột chuyển tiếp → tiền tố summary.
 * Không sửa `t`; trả object mới.
 */
function tkDerive(t, today) {
  today = today || new Date();
  const labels = tkLabels(t);
  const lineLabels = TK_LINES.filter(l => _tkHas(labels, l));
  const fromSum = _tkLineFromSummary(t.summary);
  let line = '';
  if (lineLabels.length === 1) line = lineLabels[0];
  else if (lineLabels.length > 1) line = lineLabels.indexOf(fromSum) !== -1 ? fromSum : lineLabels[0];
  else line = fromSum;

  const subs = TK_SUBS.filter(s => _tkHas(labels, s));
  if (!subs.length && /^\s*\[\s*gnol\s*(tự động|tu dong|tudong)/i.test(t.summary || '')) subs.push('GNOL_TuDong');

  let ui = _tkHas(labels, 'UI_Xong') ? 'Xong' : _tkHas(labels, 'UI_Can') ? 'Cần' : (t.ui || 'Không cần');
  let tlpt = _tkHas(labels, 'TLPT_Xong') ? 'Xong' : (t.tlpt || 'Chưa');
  const dcbTask = _tkHas(labels, 'DCB_Task');
  const golives = labels.map(l => (l.match(/^Expect_Golive_(\d{6})$/i) || [])[1]).filter(Boolean).sort();
  const golive = golives.length ? golives[golives.length - 1] : '';
  // GOLIVE_YYYYMMDD = ngày đã golive thật (label Jira đang dùng)
  const goned = labels.map(l => (l.match(/^GOLIVE_(\d{8})$/i) || [])[1]).filter(Boolean).sort();
  const golivedOn = goned.length ? `${goned[goned.length - 1].slice(0, 4)}-${goned[goned.length - 1].slice(4, 6)}-${goned[goned.length - 1].slice(6)}` : '';
  const okr = labels.filter(l => /^OKR_/i.test(l));
  const deps = labels.filter(l => /^Dep_/i.test(l));
  const dxct = _tkHas(labels, 'DXCT_QLCT');

  const missing = [];
  if (!dcbTask) missing.push('Chưa chốt YC (DCB_Task)');
  if (ui === 'Cần' || ui === 'Đang') missing.push('UI chưa xong');
  if (tlpt !== 'Xong') missing.push('TLPT chưa xong');
  if (!golive) missing.push('Thiếu tháng golive');

  const staleDays = _tkDays(t.updated, today);
  const staleLevel = staleDays == null ? '' : staleDays >= TK_STALE_RED ? 'red' : staleDays >= TK_STALE_AMBER ? 'amber' : '';
  const prioJira = tkJiraPrioLevel(t.priority);
  const prioTeam = parseInt(t.uuTien, 10) || 0;

  const warn = [];
  if (!line) warn.push('Chưa có label line');
  if (lineLabels.length > 1) warn.push('Gắn nhiều line: ' + lineLabels.join(', '));
  if (!okr.length) warn.push('Chưa gắn OKR');
  if (prioTeam && prioJira && prioTeam !== prioJira) warn.push(`Lệch ưu tiên (Jira ${t.priority} ↔ team ${prioTeam})`);

  return {
    labels, line, subs, ui, tlpt, dcbTask, golive, golivedOn, okr, deps, dxct,
    open: tkIsOpen(t), ready: missing.length === 0, missing,
    staleDays, staleLevel, prioJira, prioTeam,
    prioMismatch: !!(prioTeam && prioJira && prioTeam !== prioJira),
    po: TK_LINE_PO[line] || '', team: TK_TEAM, warn,
    // Kỳ hiệu lực: kỳ đã chốt ở planning, chưa chốt thì theo tháng golive dự kiến
    kyEff: (t.ky || golive || '').replace(/\D/g, '').slice(0, 6),
  };
}

/* ══════════════ đọc file xuất Jira ══════════════ */

function _tkNorm(s) {
  return String(s == null ? '' : s).toLowerCase().normalize('NFC').replace(/[\s_\-\/\(\)\.:]+/g, '');
}

// Header (đã chuẩn hóa) → trường. Jira xuất trường nhiều giá trị thành NHIỀU cột cùng tên (Labels…).
const _TK_HDR = [
  ['key', ['key', 'issuekey']],
  ['type', ['issuetype', 'loạiissue']],
  ['summary', ['summary', 'tómtắt']],
  ['desc', ['description', 'môtả']],
  ['status', ['status', 'trạngthái']],
  ['resolution', ['resolution']],
  ['priority', ['priority']],
  ['assignee', ['assignee']],
  ['reporter', ['reporter']],
  ['created', ['created']],
  ['updated', ['updated']],
  ['labels', ['labels']],
  ['epic', ['epiclink', 'customfieldepiclink', 'parent', 'parentsummary']],
  ['links', ['linkedissues', 'inwardissuelink', 'outwardissuelink']],
  // bảng tay của PO (chuyển tiếp)
  ['_uiCan', ['cóyêucầuuiuxkhông', 'cóyêucầuui']],
  ['_uiXong', ['đãxonguiuxchưa', 'đãxongui']],
  ['ui', ['ui']],
  ['tlpt', ['đãxongtlpt', 'tlpt']],
  ['loai', ['loạibacklog']],
];

function _tkFieldOf(h) {
  const n = _tkNorm(h);
  if (!n) return '';
  for (const [f, keys] of _TK_HDR) {
    if (keys.some(k => n === k)) return f;
  }
  for (const [f, keys] of _TK_HDR) {
    if (f === 'links' && keys.some(k => n.indexOf(k) === 0)) return f;   // "Inward issue link (Blocks)"
  }
  return '';
}

function _tkUiFromManual(can, xong) {
  const c = _tkNorm(can), x = _tkNorm(xong);
  if (!c && !x) return '';
  if (c === 'không' || c === 'khong' || c === 'no') return 'Không cần';
  if (x === 'xong' || x === 'done' || x === '1' || x === '100%') return 'Xong';
  if (x === 'chưa' || x === 'chua' || x === 'không' || x === '' || x === '0') return 'Cần';
  return 'Đang';   // 0.5 / 50% / đang làm
}

function _tkTlptFromManual(v) {
  const x = _tkNorm(v);
  if (!x) return '';
  if (x === 'done' || x === 'xong' || x === 'có' || x === '1') return 'Xong';
  if (x === 'chưa' || x === 'chua' || x === 'không' || x === '0') return 'Chưa';
  return 'Đang';
}

/**
 * Đọc workbook (SheetJS) — mọi sheet có dòng header chứa "Key" + "Summary".
 * Gộp theo Key: sheet xuất Jira cấp cột Jira, bảng tay PO cấp UI/TLPT/Loại.
 * @returns {{tickets: object[], sheets: string[], skipped: number}}
 */
function tkParseWorkbook(wb) {
  const byKey = new Map();
  const sheets = [];
  let skipped = 0;
  wb.SheetNames.forEach(name => {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: true });
    let hi = -1;
    for (let i = 0; i < Math.min(rows.length, 25); i++) {
      const fs = rows[i].map(_tkFieldOf);
      if (fs.indexOf('key') !== -1 && fs.indexOf('summary') !== -1) { hi = i; break; }
    }
    if (hi === -1) return;
    sheets.push(name);
    const fields = rows[hi].map(_tkFieldOf);
    for (let r = hi + 1; r < rows.length; r++) {
      const row = rows[r];
      const rec = {};
      fields.forEach((f, c) => {
        if (!f) return;
        const v = row[c];
        if (v === '' || v == null) return;
        if (f === 'labels' || f === 'links') rec[f] = rec[f] ? rec[f] + ', ' + String(v).trim() : String(v).trim();
        else if (rec[f] == null) rec[f] = v;
      });
      const key = String(rec.key || '').trim().toUpperCase();
      if (!/^[A-Z][A-Z0-9]+-\d+$/.test(key)) { if (Object.keys(rec).length) skipped++; continue; }
      const cur = byKey.get(key) || { key };
      ['type', 'summary', 'desc', 'status', 'resolution', 'priority', 'assignee', 'reporter', 'epic', 'links']
        .forEach(f => { if (rec[f] != null && cur[f] == null) cur[f] = String(rec[f]).trim(); });
      if (rec.labels != null) cur.labels = cur.labels ? cur.labels + ', ' + rec.labels : rec.labels;
      if (rec.created != null && !cur.created) cur.created = tkParseDate(rec.created);
      if (rec.updated != null && !cur.updated) cur.updated = tkParseDate(rec.updated);
      const ui = rec.ui != null ? String(rec.ui).trim() : _tkUiFromManual(rec._uiCan, rec._uiXong);
      if (ui && !cur.ui) cur.ui = ui;
      const tl = rec.tlpt != null ? _tkTlptFromManual(rec.tlpt) : '';
      if (tl && !cur.tlpt) cur.tlpt = tl;
      if (rec.loai != null && !cur.loai) cur.loai = String(rec.loai).trim();
      byKey.set(key, cur);
    }
  });
  const tickets = [...byKey.values()].map(t => {
    if (t.labels) t.labels = [...new Set(tkLabels(t))].join(', ');
    TK_FIELDS.forEach(f => { if (t[f] == null) t[f] = ''; });
    return t;
  });
  return { tickets, sheets, skipped };
}

/* ══════════════ đọc file HTML xuất Jira (Jira cơ quan chỉ cho xuất HTML) ══════════════ */

// Ô bảng → chữ: <br> giữ xuống dòng, gom khoảng trắng mỗi dòng (ô Description nhiều dòng).
function _tkCellText(cell) {
  const c = cell.cloneNode(true);
  c.querySelectorAll('br').forEach(b => b.replaceWith('\n'));
  c.querySelectorAll('p,div,li').forEach(b => b.append('\n'));
  return String(c.textContent || '')
    .split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

/**
 * HTML "Export → HTML report" của Jira → workbook SheetJS (mỗi <table> 1 sheet),
 * để dùng chung tkParseWorkbook (dò header Key + Summary, gộp theo Key).
 * Bảng đầu (logo/filter/"Displaying N issues") tự bị bỏ vì không có header Key.
 */
function tkHtmlToWorkbook(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const wb = XLSX.utils.book_new();
  doc.querySelectorAll('table').forEach((tbl, i) => {
    const aoa = [];
    tbl.querySelectorAll('tr').forEach(tr => {
      if (tr.closest('table') !== tbl) return;   // bỏ dòng của bảng lồng
      aoa.push([...tr.children].filter(c => c.tagName === 'TD' || c.tagName === 'TH').map(_tkCellText));
    });
    if (aoa.length > 1) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), (tbl.id || 'table') + '_' + (i + 1));
  });
  return wb;
}

function tkLooksHtml(name, text) {
  return /\.html?$/i.test(name || '') || /^\s*</.test(String(text || '').slice(0, 200));
}

/* ══════════════ bảng planning xuất Excel (gửi DCB) ══════════════ */

function tkExportRows(list, today) {
  const head = ['Line', 'Nhãn phụ', 'Key', 'Loại issue', 'Summary', 'PO', 'Dev (Assignee)', 'Status',
    'Priority Jira', 'Ưu tiên team', 'UI', 'TLPT', 'DCB_Task', 'Tháng golive', 'Kỳ planning', 'Quyết định',
    'Sẵn sàng chuyển IT', 'Thiếu', 'OKR', 'Phụ thuộc', 'Updated', 'Số ngày không nhích', 'Ghi chú'];
  const rows = list.map(t => {
    const d = tkDerive(t, today);
    return [TK_LINE_LABEL[d.line] || '', d.subs.join(', '), t.key, t.type, t.summary, d.po, t.assignee, t.status,
      t.priority, t.uuTien, d.ui, d.tlpt, d.dcbTask ? 'Có' : 'Chưa', d.golive, t.ky, t.quyetDinh,
      d.ready ? 'Đạt' : 'Chưa', d.missing.join('; '), d.okr.join(', '), d.deps.join(', '), t.updated,
      d.staleDays == null ? '' : d.staleDays, t.note];
  });
  return [head].concat(rows);
}
