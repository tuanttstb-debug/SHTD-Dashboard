'use strict';

/* ── Column map – khớp với header "File raw.xlsx" ── */
const _KPI_COL = {
  kenh:  'Kênh',   // 'BIZ' | 'BPM'
  ptkd:  'PTKD',
  owner: 'Owner',  // 'QuangNN3' | 'DungLQ1'
};
const _KPI_QUANG = 'QuangNN3';
const _KPI_DUNG  = 'DungLQ1';

/* ── Parse xlsx file → {quangPTKD, dungPTKD, agg} ── */
function kpiParseXlsx(file) {
  return new Promise(function(resolve, reject) {
    var reader = new FileReader();
    reader.onload = function(e) {
      try {
        var wb   = XLSX.read(e.target.result, { type: 'binary' });
        var ws   = wb.Sheets[wb.SheetNames[0]];
        var rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        resolve(_kpiBuildSummary(rows));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}

function _kpiBuildSummary(rows) {
  var qMap = {}, dMap = {};
  var totalGD = 0, bizTotal = 0, bpmTotal = 0;
  var qTotal = 0, qBiz = 0, qBpm = 0;
  var dTotal = 0, dBiz = 0, dBpm = 0;

  rows.forEach(function(r) {
    var owner = String(r[_KPI_COL.owner] || '').trim();
    var ptkd  = String(r[_KPI_COL.ptkd]  || '').trim();
    var kenh  = String(r[_KPI_COL.kenh]  || '').trim().toUpperCase();
    if (!owner || !ptkd || !kenh) return;

    var isBiz = (kenh === 'BIZ');
    totalGD++;
    if (isBiz) bizTotal++; else bpmTotal++;

    if (owner === _KPI_QUANG) {
      if (!qMap[ptkd]) qMap[ptkd] = { biz: 0, bpm: 0 };
      if (isBiz) { qMap[ptkd].biz++; qBiz++; } else { qMap[ptkd].bpm++; qBpm++; }
      qTotal++;
    } else if (owner === _KPI_DUNG) {
      if (!dMap[ptkd]) dMap[ptkd] = { biz: 0, bpm: 0 };
      if (isBiz) { dMap[ptkd].biz++; dBiz++; } else { dMap[ptkd].bpm++; dBpm++; }
      dTotal++;
    }
  });

  var _r1 = function(v) { return Math.round(v * 10) / 10; };
  var prevDung = getKpiData().dungPTKD;

  var quangPTKD = Object.entries(qMap).map(function(entry) {
    var ptkd = entry[0], c = entry[1];
    var total = c.biz + c.bpm;
    var rate  = total > 0 ? _r1(c.biz / total * 100) : 0;
    return { ptkd: ptkd, biz: c.biz, bpm: c.bpm, total: total, rate: rate };
  }).sort(function(a, b) { return b.total - a.total; });

  var dungPTKD = Object.entries(dMap).map(function(entry) {
    var ptkd = entry[0], c = entry[1];
    var total  = c.biz + c.bpm;
    var rate   = total > 0 ? _r1(c.biz / total * 100) : 0;
    var prev   = prevDung.find(function(x) { return x.ptkd === ptkd; }) || {};
    return { ptkd: ptkd, biz: c.biz, bpm: c.bpm, total: total, rate: rate,
             oldBiz: prev.biz || 0, oldRate: prev.rate || 0 };
  }).sort(function(a, b) { return b.total - a.total; });

  var base        = KPI_DATA.agg;
  var kpi21Actual = qBiz;
  var kpi22Actual = qTotal > 0 ? _r1(qBiz / qTotal * 100) : 0;
  var ytdMonth    = (KPI_DATA.kpis[0] && KPI_DATA.kpis[0].ytdMonth) || 5;
  var kpi21Forecast = ytdMonth > 0 ? Math.round(kpi21Actual / ytdMonth * 12) : base.kpi21Forecast;

  var agg = Object.assign({}, base, {
    totalGD: totalGD, bizTotal: bizTotal, bpmTotal: bpmTotal,
    quangTotal: qTotal, quangBiz: qBiz, quangBpm: qBpm,
    dungTotal:  dTotal, dungBiz:  dBiz, dungBpm:  dBpm,
    kpi21Actual: kpi21Actual, kpi21Forecast: kpi21Forecast, kpi22Actual: kpi22Actual,
  });

  return { quangPTKD: quangPTKD, dungPTKD: dungPTKD, agg: agg };
}

/* ── GG Sheet: ghi summary vào tab "KPI_Summary" ── */
function kpiWriteToSheet(payload) {
  var rows = [
    ['SECTION', 'quangPTKD'],
    ['ptkd', 'biz', 'bpm', 'total', 'rate'],
  ];
  payload.quangPTKD.forEach(function(x) {
    rows.push([x.ptkd, x.biz, x.bpm, x.total, x.rate]);
  });
  rows.push(['SECTION', 'dungPTKD']);
  rows.push(['ptkd', 'biz', 'bpm', 'total', 'rate', 'oldBiz', 'oldRate']);
  payload.dungPTKD.forEach(function(x) {
    rows.push([x.ptkd, x.biz, x.bpm, x.total, x.rate, x.oldBiz || 0, x.oldRate || 0]);
  });
  rows.push(['SECTION', 'agg']);
  Object.keys(payload.agg).forEach(function(k) {
    rows.push([k, payload.agg[k]]);
  });

  return fetch(GS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'kpi-write', values: rows }),
  }).then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(json) {
    if (json.status !== 'ok') throw new Error(json.error || 'kpi-write failed');
  });
}

/* ── GG Sheet: đọc từ tab "KPI_Summary" ── */
function kpiReadFromSheet() {
  return fetch(GS_WEBAPP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action: 'kpi-read' }),
  }).then(function(res) {
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }).then(function(json) {
    if (json.status !== 'ok') throw new Error(json.error || 'kpi-read failed');
    return _kpiParseSheetPayload(json.values);
  });
}

function _kpiParseSheetPayload(rows) {
  var section = null;
  var quangPTKD = [], dungPTKD = [], aggKV = {};
  var qHeader = [], dHeader = [];

  (rows || []).forEach(function(r) {
    if (!r || !r.length) return;
    if (r[0] === 'SECTION') { section = r[1]; return; }
    if (section === 'quangPTKD') {
      if (r[0] === 'ptkd') { qHeader = r; return; }
      var o = {};
      qHeader.forEach(function(h, i) { o[h] = isNaN(r[i]) || r[i] === '' ? r[i] : Number(r[i]); });
      if (o.ptkd) quangPTKD.push(o);
    } else if (section === 'dungPTKD') {
      if (r[0] === 'ptkd') { dHeader = r; return; }
      var o2 = {};
      dHeader.forEach(function(h, i) { o2[h] = isNaN(r[i]) || r[i] === '' ? r[i] : Number(r[i]); });
      if (o2.ptkd) dungPTKD.push(o2);
    } else if (section === 'agg') {
      if (r[0] && r[1] !== undefined) {
        aggKV[r[0]] = isNaN(r[1]) || r[1] === '' ? r[1] : Number(r[1]);
      }
    }
  });

  return { quangPTKD: quangPTKD, dungPTKD: dungPTKD,
           agg: Object.assign({}, KPI_DATA.agg, aggKV) };
}
