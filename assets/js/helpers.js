const esc  = s => (s == null ? '' : String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'));
const _esc = esc;

const picNorm = n => { const s = (n||'').toString().trim(); return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : ''; };

const fmtDate = d => { if (!d) return '–'; const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : d; };

function parseVNDate(s) {
  if (!s) return null;
  s = String(s).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y,m,d] = s.split('-'); return new Date(+y, +m-1, +d);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [d,m,y] = s.split('/'); return new Date(+y, +m-1, +d);
  }
  return null;
}

function isOverdue(endDateString, progress) {
  if (progress >= 100 || !endDateString) return false;
  const endDateObj = parseVNDate(endDateString);
  if (!endDateObj || isNaN(endDateObj)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return endDateObj < today;
}

const ragBadge = s => { const c = {Green:'badge-green',Amber:'badge-amber',Red:'badge-red'}[s]||'badge-gray'; return `<span class="badge ${c}">${s||'–'}</span>`; };

const stateChip = s => {
  const map = { 'Chưa bắt đầu':'s0','Đang thực hiện':'s1','Hoàn thành chuẩn bị':'s2','Hoàn thành':'s3','Tạm dừng':'s4','Blocked':'s5' };
  return `<span class="state-chip ${map[s]||'s0'}">${s||'–'}</span>`;
};

function genId(init, team, ms, extra = []) {
  let pfx;
  if (!init || init === 'BAU') {
    pfx = (team ? team.replace(/\s+/g, '') : 'SO') + '-';
  } else if (ms) {
    const msShort = (ms.match(/-?(M\d+)$/i) || [])[1] || ms;
    pfx = init + '-' + msShort + '-';
  } else {
    pfx = init + '-';
  }
  let max = 0;
  [...db.tasks, ...extra].forEach(t => {
    if (t.id && t.id.toUpperCase().startsWith(pfx.toUpperCase())) {
      const n = parseInt(t.id.substring(pfx.length));
      if (!isNaN(n) && n > max) max = n;
    }
  });
  return pfx + String(max + 1).padStart(3, '0');
}

function fmtDateExport(d) {
  if (!d) return '';
  d = String(d).trim();
  let day, month0based, year4;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const parts = d.split('-');
    year4       = parseInt(parts[0], 10);
    month0based = parseInt(parts[1], 10) - 1;
    day         = parseInt(parts[2], 10);
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(d)) {
    const parts = d.split('/');
    day         = parseInt(parts[0], 10);
    month0based = parseInt(parts[1], 10) - 1;
    year4       = parseInt(parts[2], 10);
  } else {
    return d;
  }
  if (month0based < 0 || month0based > 11) return d;
  const dd  = String(day).padStart(2, '0');
  const mmm = _MMM[month0based];
  const yy  = String(year4).slice(-2);
  return `${dd}-${mmm}-${yy}`;
}
