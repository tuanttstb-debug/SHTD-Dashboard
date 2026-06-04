function exportWeeklyReport(weekLabel) {
  if (!db.tasks.length) { toast('Không có dữ liệu để xuất báo cáo.', 'warning'); return; }
  if (!weekLabel) { toast('Vui lòng chọn tuần báo cáo.', 'warning'); return; }

  const weekTasks  = db.tasks.filter(t => (t.tuanBC||'').trim() === weekLabel);
  const inProgress = db.tasks.filter(t => parseInt(t.progress) < 100 && t.state !== 'Hoàn thành');

  const wb = XLSX.utils.book_new();
  _rptSummary(wb, weekLabel, weekTasks);
  _rptResults(wb, weekLabel, weekTasks);
  _rptNextPlan(wb, inProgress);
  _rptIssues(wb, inProgress);

  const safe = weekLabel.replace(/[\\/:\s]/g, '_');
  XLSX.writeFile(wb, `SHTD_BaoCaoTuan_${safe}_${new Date().toISOString().split('T')[0]}.xlsx`);
  closeReportModal();
  toast('Đã xuất báo cáo tuần!', 'success');
}

function _rptSummary(wb, weekLabel, tasks) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let done = 0, overdue = 0, totalProg = 0;
  const rag = { Green:0, Amber:0, Red:0 };
  const initMap = {};

  tasks.forEach(t => {
    const prog = parseInt(t.progress) || 0;
    const isDone = prog >= 100 || t.state === 'Hoàn thành';
    if (isDone) done++;
    if (!isDone && t.endDate) {
      const d = parseVNDate(t.endDate);
      if (d && !isNaN(d) && d < today) overdue++;
    }
    totalProg += prog;
    if (rag[t.status] !== undefined) rag[t.status]++;
    const k = t.initiative || 'BAU';
    if (!initMap[k]) initMap[k] = { total:0, done:0, totProg:0, green:0, amber:0, red:0 };
    initMap[k].total++;
    if (isDone) initMap[k].done++;
    initMap[k].totProg += prog;
    if (t.status === 'Green') initMap[k].green++;
    else if (t.status === 'Amber') initMap[k].amber++;
    else initMap[k].red++;
  });

  const total = tasks.length;
  const avgProg = total ? Math.round(totalProg / total) : 0;

  const aoa = [
    [`BÁO CÁO TUẦN — ${weekLabel}`],
    [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
    [],
    ['KPI TỔNG QUAN'],
    ['Tổng task', 'Hoàn thành', 'Đang thực hiện', 'Quá hạn', 'Tiến độ TB'],
    [total, done, total - done, overdue, `${avgProg}%`],
    [],
    ['RAG SUMMARY'],
    ['Green', 'Amber', 'Red'],
    [rag.Green, rag.Amber, rag.Red],
    [],
    ['THEO INITIATIVE'],
    ['Initiative', 'Tổng', 'Hoàn thành', 'TB Tiến độ', 'Green', 'Amber', 'Red'],
    ...Object.entries(initMap)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([k, v]) => [k, v.total, v.done, `${Math.round(v.totProg / v.total)}%`, v.green, v.amber, v.red])
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:30},{wch:12},{wch:16},{wch:16},{wch:12},{wch:10},{wch:10}];
  XLSX.utils.book_append_sheet(wb, ws, '1. Tóm tắt');
}

function _rptResults(wb, weekLabel, tasks) {
  const headers = ['ID','Task / Deliverable','Initiative','Category','Team','PIC Responsible','Start Date','Deadline','% HT','Trạng thái','RAG','Kết quả tuần qua'];
  const rows = tasks
    .sort((a, b) => (a.initiative||'').localeCompare(b.initiative||''))
    .map(t => [
      t.id, t.name, t.initiative||'BAU', t.category||'',
      t.team||'', t.picRes||'',
      fmtDateExport(t.startDate), fmtDateExport(t.endDate),
      `${t.progress||0}%`, t.state||'', t.status||'',
      t.result||''
    ]);

  const aoa = [
    [`Kết quả tuần — ${weekLabel}`],
    [`${tasks.length} task`],
    [],
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:14},{wch:50},{wch:16},{wch:16},{wch:10},{wch:18},{wch:12},{wch:12},{wch:8},{wch:20},{wch:8},{wch:50}];
  XLSX.utils.book_append_sheet(wb, ws, '2. Kết quả tuần');
}

function _rptNextPlan(wb, inProgress) {
  const tasks = inProgress
    .filter(t => (t.nextPlan||'').trim())
    .sort((a, b) => (a.endDate||'').localeCompare(b.endDate||''));

  const headers = ['ID','Task / Deliverable','Initiative','Team','PIC Responsible','Deadline','% HT','RAG','Kế hoạch tuần tới'];
  const rows = tasks.map(t => [
    t.id, t.name, t.initiative||'BAU',
    t.team||'', t.picRes||'',
    fmtDateExport(t.endDate),
    `${t.progress||0}%`, t.status||'',
    t.nextPlan||''
  ]);

  const aoa = [
    ['Kế hoạch tuần tới'],
    [`${tasks.length} task có kế hoạch`],
    [],
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:14},{wch:50},{wch:16},{wch:10},{wch:18},{wch:12},{wch:8},{wch:8},{wch:60}];
  XLSX.utils.book_append_sheet(wb, ws, '3. Kế hoạch tuần tới');
}

function _rptIssues(wb, inProgress) {
  const tasks = inProgress
    .filter(t => t.state === 'Blocked' || t.canBLD === 'Y' || (t.vuongMac||'').trim())
    .sort((a, b) => {
      const score = x => x.state === 'Blocked' ? 0 : x.canBLD === 'Y' ? 1 : 2;
      return score(a) - score(b);
    });

  const headers = ['ID','Task / Deliverable','Initiative','Team','PIC Responsible','Trạng thái','RAG','Cần BLĐ','Vướng mắc / Rủi ro','Nội dung cần BLĐ quyết'];
  const rows = tasks.map(t => [
    t.id, t.name, t.initiative||'BAU',
    t.team||'', t.picRes||'',
    t.state||'', t.status||'',
    t.canBLD||'N',
    t.vuongMac||'',
    t.noiDungBLD||''
  ]);

  const aoa = [
    ['Vướng mắc & Cần BLĐ quyết'],
    [`${tasks.length} vấn đề cần xử lý`],
    [],
    headers,
    ...rows
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{wch:14},{wch:50},{wch:16},{wch:10},{wch:18},{wch:20},{wch:8},{wch:10},{wch:50},{wch:50}];
  XLSX.utils.book_append_sheet(wb, ws, '4. Vướng mắc & BLĐ');
}
