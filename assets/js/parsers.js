function extractWorkbook(wb) {
  const norm = s => (s||'').toString().toLowerCase().replace(/[\n\s\t_\-\/]+/g,'');
  const findSheet = kw => wb.SheetNames.find(n => norm(n).includes(norm(kw)));

  const colIdxExact = (hdrs, kws, excludeIdx = -1) => {
    for (const kw of (Array.isArray(kws) ? kws : [kws])) {
      const nkw = norm(kw);
      let i = hdrs.findIndex((h, idx) => idx !== excludeIdx && norm(h) === nkw);
      if (i !== -1) return i;
      i = hdrs.findIndex((h, idx) => idx !== excludeIdx && norm(h).includes(nkw));
      if (i !== -1) return i;
    }
    return -1;
  };

  // ── Initiatives ──
  let initMap = {};
  let initList = [];
  const initSh = findSheet('initiative_master');
  if (initSh) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[initSh], {header:1, defval:''});
    let hi = rows.findIndex((r,i) => i < 20 && norm(r.join('')).includes('initiativeid'));
    if (hi !== -1) {
      const H = rows[hi];
      const iId = colIdxExact(H,['initiativeid','mãinitiative']);
      const iNm = colIdxExact(H,['têninitiative','name']);
      for (let i = hi+1; i < rows.length; i++) {
        const id = (rows[i][iId]||'').toString().trim();
        if (!id || /^M\d{1,2}$/i.test(id)) continue;
        const nm = iNm !== -1 ? (rows[i][iNm]||'').toString().trim() : id;
        initMap[id] = nm;
        if (!initList.some(x=>x.id===id)) initList.push({id, name: nm});
      }
    }
  }

  // ── Task_Master sheet ──
  const tSh = findSheet('task_master') || findSheet('task') || wb.SheetNames[0];
  if (!tSh) return null;
  const tRows = XLSX.utils.sheet_to_json(wb.Sheets[tSh], {header:1, defval:'', cellDates:true});

  let hi = -1;
  for (let i = 0; i < Math.min(30, tRows.length); i++) {
    const s = norm(tRows[i].join(''));
    if (s.includes('picresponsible') || s.includes('taskname') ||
        (s.includes('id') && (s.includes('deliverable') || s.includes('tasktên')))) {
      hi = i; break;
    }
  }
  if (hi === -1) return null;
  const H = tRows[hi];

  const cId      = colIdxExact(H, ['id','taskid','mãtask']);
  const cTuanBC  = colIdxExact(H, ['tuầnbc','tuanbc']);
  const cInit    = colIdxExact(H, ['initiativeid','initiative','mãinitiative']);
  const cCat     = colIdxExact(H, ['category','danh mục','danhmục','phânloại2']);

  const cName = (() => {
    for (const kw of ['task/deliverable(1dòng','task/deliverable','taskname','têncôngviệc','deliverable']) {
      const nkw = norm(kw);
      let i = H.findIndex(h => norm(h) === nkw); if (i !== -1) return i;
      i = H.findIndex(h => norm(h).startsWith(nkw)); if (i !== -1) return i;
    }
    return H.findIndex(h => norm(h).includes('deliverable') && !norm(h).startsWith('loại'));
  })();

  const cType = (() => {
    for (const kw of ['loại(task','loại','type']) {
      const nkw = norm(kw);
      let i = H.findIndex((h,idx) => idx !== cName && norm(h) === nkw); if (i !== -1) return i;
      i = H.findIndex((h,idx) => {
        if (idx === cName) return false;
        const nh = norm(h);
        return nh.includes(nkw) && !nh.startsWith('task') && !nh.startsWith('deliverable');
      }); if (i !== -1) return i;
    }
    return -1;
  })();

  const cMs    = colIdxExact(H, ['tênmilestone','milestone','m1/m2']);
  const cTeam  = colIdxExact(H, ['teamchính','team']);
  const cTPh   = colIdxExact(H, ['teamphốihợp','phốihợp']);
  const cAcc   = colIdxExact(H, ['picaccountable','accountable','teamlead']);
  const cRes   = colIdxExact(H, ['picresponsible','responsible']);
  const cSup   = colIdxExact(H, ['picsupport','support','hỗtrợ']);
  const cSt    = colIdxExact(H, ['startdate','ngàybắtđầu']);
  const cEnd   = colIdxExact(H, ['deadline','ngàykếtthúc']);
  const cProg  = colIdxExact(H, ['%ht','progress','tiếnđộ']);
  const cState = colIdxExact(H, ['trạngthái','state']);
  const cRagM  = colIdxExact(H, ['ragmanual','rag','status']);
  const cRagA  = colIdxExact(H, ['ragtựđộng','ragauto']);
  const cRes2  = colIdxExact(H, ['kếtquảthựchiện','kếtquả','result']);
  const cNext  = colIdxExact(H, ['kếhoạchtuầntới','kếhoạch','nextplan']);
  const cIss   = colIdxExact(H, ['vướngmắc','issue']);
  const cBLD   = colIdxExact(H, ['cầnblđ']);
  const cBLDT  = colIdxExact(H, ['nộidungcầnblđ','nộidungblđ']);
  const cYK    = colIdxExact(H, ['ýkiếnblđ','ykienbld']);
  const cCr    = colIdxExact(H, ['cross-team','crossteam']);
  const cHl    = colIdxExact(H, ['highlightbáocáo','highlight','báocáo']);
  const cRecur2= colIdxExact(H, ['địnhkỳ','dinhky','recurrence']);
  const cDone2 = colIdxExact(H, ['kỳđãxong','kydaxong','doneperiods']);
  if (cName === -1) return null;

  const parseDate = v => toISODate(v);   // unified: any format → ISO 'YYYY-MM-DD'
  const parseRAG = (a, b) => {
    const s = ((a||b||'').toString().toLowerCase());
    if (s.includes('red') || s.includes('đỏ')) return 'Red';
    if (s.includes('amber') || s.includes('cam')) return 'Amber';
    return 'Green';
  };
  const parseState = v => {
    if (!v) return 'Chưa bắt đầu';
    const s = v.toString().toLowerCase();
    if (s.includes('chưa')) return 'Chưa bắt đầu';
    if (s.includes('đang')) return 'Đang thực hiện';
    if (s.includes('chuẩn bị')) return 'Hoàn thành chuẩn bị';
    if (s.includes('hoàn thành') || s.includes('done')) return 'Hoàn thành';
    if (s.includes('tạm')) return 'Tạm dừng';
    if (s.includes('block')) return 'Blocked';
    return 'Chưa bắt đầu';
  };
  const parseYN = v => {
    const s = (v||'').toString().toUpperCase().trim();
    return (s === 'Y' || s === 'YES' || s === 'CÓ') ? 'Y' : 'N';
  };
  const parseMs = v => {
    const m = (v||'').toString().toUpperCase().match(/M\d{1,2}/);
    return m ? m[0] : '';
  };

  let tasks = [];
  for (let i = hi + 1; i < tRows.length; i++) {
    const r = tRows[i];
    const name = cName !== -1 ? (r[cName]||'') : '';
    if (!name || String(name).trim() === '') continue;

    const initId = String(cInit !== -1 ? (r[cInit]||'BAU') : 'BAU').trim();
    const team   = cTeam !== -1 ? (r[cTeam]||'') : '';
    let prog = 0;
    const pRaw = cProg !== -1 ? r[cProg] : 0;
    if (typeof pRaw === 'number')
      prog = pRaw <= 1 ? Math.round(pRaw * 100) : Math.round(pRaw);
    else if (typeof pRaw === 'string') {
      const cv = parseFloat(pRaw.replace('%',''));
      prog = (!pRaw.includes('%') && pRaw.includes('.') && cv <= 1)
        ? Math.round(cv * 100) : Math.round(cv) || 0;
    }
    prog = Math.min(100, Math.max(0, prog));

    let id = cId !== -1 && r[cId] ? String(r[cId]).trim() : '';
    if (!id) id = genId(initId, team, tasks);

    const initName = initMap[initId] || initId;
    // Chỉ thêm vào initList nếu chưa có trong db.initiatives (rich data from Initiative_Master)
    const hasRichInit = db.initiatives && db.initiatives.some(x => x.id === initId && x.status !== undefined);
    if (initId && initId !== 'BAU' && !initList.some(x => x.id === initId) && !hasRichInit) {
      initList.push({ id: initId, name: initName });
    }

    tasks.push({
      id,
      tuanBC:      cTuanBC !== -1 ? (r[cTuanBC]||'').toString().trim() : '',
      initiative:  initId,
      category:    cCat   !== -1 ? (r[cCat]||'').toString().trim() : '',
      name:        String(name).trim(),
      type:        cType  !== -1 ? (String(r[cType]||'Task').trim() || 'Task') : 'Task',
      milestone:   parseMs(cMs !== -1 ? r[cMs] : ''),
      team,
      teamPhoiHop: cTPh   !== -1 ? (r[cTPh]||'')  : '',
      picAcc:      cAcc   !== -1 ? (r[cAcc]||'Tuantt4') : 'Tuantt4',
      picRes:      picNorm(cRes !== -1 ? r[cRes] : ''),
      picSupport:  cSup   !== -1 ? (r[cSup]||'').toString().trim() : '',
      startDate:   parseDate(cSt  !== -1 ? r[cSt]  : ''),
      endDate:     parseDate(cEnd !== -1 ? r[cEnd] : ''),
      progress:    prog,
      state:       parseState(cState !== -1 ? r[cState] : ''),
      status:      parseRAG(cRagM !== -1 ? r[cRagM] : '', cRagA !== -1 ? r[cRagA] : ''),
      result:      cRes2  !== -1 ? (r[cRes2]||'')  : '',
      nextPlan:    cNext  !== -1 ? (r[cNext]||'')  : '',
      vuongMac:    cIss   !== -1 ? (r[cIss]||'')   : '',
      canBLD:      parseYN(cBLD  !== -1 ? r[cBLD]  : ''),
      noiDungBLD:  cBLDT  !== -1 ? (r[cBLDT]||'') : '',
      yKienBLD:    cYK    !== -1 ? (r[cYK]||'')   : '',
      crossTeam:   parseYN(cCr   !== -1 ? r[cCr]   : ''),
      highlight:   parseYN(cHl   !== -1 ? r[cHl]   : ''),
      recurrence:  normRecurrence(cRecur2 !== -1 ? r[cRecur2] : ''),
      donePeriods: cDone2 !== -1 ? (r[cDone2]||'').toString().trim() : '',
    });
  }
  return { tasks, initiatives: initList };
}

function _parseArrayIntoDb(values) {
  if (!values || values.length < 2) { db.tasks = []; return; }

  const norm = s => (s||'').toString().toLowerCase().replace(/[\n\s\t_\-\/]+/g,'');
  const H = values[0];
  const ci = kws => { for (const kw of kws) { const i = H.findIndex(h => norm(h).includes(norm(kw))); if (i !== -1) return i; } return -1; };

  const cId    = ci(['id','taskid']);
  const cTuan  = ci(['tuầnbc','tuanbc']);
  const cInit  = ci(['initiativeid','initiative']);
  const cCat   = ci(['category','danh mục']);
  const cTeam  = ci(['team chính','team']);
  const cTPh   = ci(['team phối','phối hợp']);
  const cType  = ci(['loại(task','loại','type']);
  const cName  = ci(['task/deliverable','deliverable','taskname']);
  const cAcc   = ci(['picaccountable','accountable']);
  const cRes   = ci(['picresponsible','responsible']);
  const cSup   = ci(['picsupport','support']);
  const cSt    = ci(['startdate','start']);
  const cEnd   = ci(['deadline']);
  const cProg  = ci(['%ht','progress']);
  const cState = ci(['trạng thái','state']);
  const cMs    = ci(['milestone']);
  const cRagM  = ci(['ragmanual','rag','healthstatus']);
  const cResult= ci(['kết quả','result']);
  const cNext  = ci(['kế hoạch','nextplan']);
  const cIss   = ci(['vướng mắc','issue']);
  const cBLD   = ci(['cầnblđ']);
  const cBLDT  = ci(['nội dung cần blđ','nội dung blđ']);
  const cYK    = ci(['ý kiến blđ','ykienbld']);
  const cCross = ci(['cross-team','crossteam']);
  const cHl    = ci(['highlight','báo cáo']);
  const cRecur = ci(['định kỳ','dinhky','recurrence']);
  const cDone  = ci(['kỳ đã xong','kydaxong','doneperiods']);

  const parseDate = v => toISODate(v);   // unified: any format → ISO 'YYYY-MM-DD'
  const parseRAG   = v => { const s=(v||'').toLowerCase(); if(s.includes('red')||s.includes('đỏ')) return 'Red'; if(s.includes('amber')||s.includes('cam')) return 'Amber'; return 'Green'; };
  const parseState = v => { if(!v) return 'Chưa bắt đầu'; const s=v.toLowerCase(); if(s.includes('đang')) return 'Đang thực hiện'; if(s.includes('chuẩn bị')) return 'Hoàn thành chuẩn bị'; if(s.includes('hoàn thành')||s.includes('done')) return 'Hoàn thành'; if(s.includes('tạm')) return 'Tạm dừng'; if(s.includes('block')) return 'Blocked'; return 'Chưa bắt đầu'; };
  const parseYN    = v => { const s=(v||'').toUpperCase().trim(); return (s==='Y'||s==='YES')?'Y':'N'; };
  const g = (r, c) => c !== -1 ? (r[c]||'').toString().trim() : '';

  db.tasks = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    const name = g(r, cName);
    if (!name) continue;
    let prog = 0;
    const pRaw = g(r, cProg);
    if (pRaw) {
      const cv = parseFloat(pRaw.replace('%',''));
      prog = (!pRaw.includes('%') && cv <= 1) ? Math.round(cv*100) : Math.round(cv)||0;
    }
    prog = Math.min(100, Math.max(0, prog));
    const id = g(r,cId) || genId(g(r,cInit)||'BAU', g(r,cTeam), db.tasks);
    db.tasks.push({
      id, tuanBC: g(r,cTuan), initiative: g(r,cInit)||'BAU', category: g(r,cCat),
      name, type: g(r,cType)||'Task', milestone: g(r,cMs),
      team: g(r,cTeam), teamPhoiHop: g(r,cTPh),
      picAcc: g(r,cAcc)||'Tuantt4', picRes: picNorm(g(r,cRes)), picSupport: g(r,cSup),
      startDate: parseDate(g(r,cSt)),
      endDate:   parseDate(g(r,cEnd)),
      progress: prog,
      state: parseState(g(r,cState)),
      status: parseRAG(g(r,cRagM)||g(r,cState)),
      result: g(r,cResult), nextPlan: g(r,cNext), vuongMac: g(r,cIss),
      canBLD: parseYN(g(r,cBLD)), noiDungBLD: g(r,cBLDT), yKienBLD: g(r,cYK),
      crossTeam: parseYN(g(r,cCross)), highlight: parseYN(g(r,cHl)),
      recurrence: normRecurrence(g(r,cRecur)), donePeriods: g(r,cDone),
    });
  }
  // Chỉ auto-discover initiatives từ task data khi chưa load từ Initiative_Master
  // Dùng .some() thay vì [0] để tránh BAU stub ở đầu mảng qua mặt guard
  const hasRichData = db.initiatives && db.initiatives.some(x => x.status !== undefined);
  if (!hasRichData) {
    const iMap = new Map();
    db.tasks.forEach(t => { if (t.initiative && !iMap.has(t.initiative)) iMap.set(t.initiative, t.initiative); });
    db.initiatives = [...iMap.entries()].map(([id]) => ({ id, name: id }));
  }
  _resolvePickerCase();
}

// Resolve t.picRes → canonical Username từ _appUsers (case-insensitive lookup).
// Gọi sau _parseArrayIntoDb() và sau loadAppUsers() để đảm bảo nhất quán
// dù task load trước hay sau user list.
function _resolvePickerCase() {
  if (!Array.isArray(_appUsers) || !_appUsers.length) return;
  const lookup = new Map(_appUsers.map(u => [u.Username.toLowerCase(), u.Username]));
  db.tasks.forEach(t => {
    if (t.picRes) {
      const canonical = lookup.get(t.picRes.toLowerCase());
      if (canonical) t.picRes = canonical;
    }
    if (t.picAcc) {
      const canonical = lookup.get(t.picAcc.toLowerCase());
      if (canonical) t.picAcc = canonical;
    }
  });
}
