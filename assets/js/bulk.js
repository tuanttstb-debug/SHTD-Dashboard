function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id); else selectedIds.delete(id);
  updateBulkBar();
  renderFilterChips();
}

function toggleSelectAll(cb) {
  getFiltered().slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE).forEach(t => {
    if (cb.checked) selectedIds.add(t.id); else selectedIds.delete(t.id);
  });
  renderTaskTable();
}

function clearSelection() { selectedIds.clear(); renderTaskTable(); }

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  if (selectedIds.size > 0) { bar.classList.add('visible'); document.getElementById('bulkCount').textContent = `${selectedIds.size} task đã chọn`; }
  else bar.classList.remove('visible');
}

async function bulkSetRag(rag) {
  const ok = await uiConfirm('Cập nhật RAG', `Đặt RAG = <strong>${rag}</strong> cho <strong>${selectedIds.size}</strong> task đã chọn?`, 'info', 'Cập nhật');
  if (!ok) return;
  await syncAction(() => { selectedIds.forEach(id => { const t = db.tasks.find(x=>x.id===id); if(t) t.status = rag; }); });
  selectedIds.clear(); renderAll(); toast(`Đã cập nhật RAG → ${rag}`, 'success');
}

async function bulkSetState(state) {
  const ok = await uiConfirm('Cập nhật trạng thái', `Đánh dấu <strong>${selectedIds.size}</strong> task là <strong>${state}</strong> (progress = 100%)?`, 'info', 'Cập nhật');
  if (!ok) return;
  await syncAction(() => { selectedIds.forEach(id => { const t = db.tasks.find(x=>x.id===id); if(t) { t.state=state; if(state==='Hoàn thành') t.progress=100; } }); });
  selectedIds.clear(); renderAll(); toast(`Đã cập nhật ${selectedIds.size} task.`, 'success');
}

async function bulkDelete() {
  const ok = await uiConfirm('Xóa task', `Bạn sắp xóa <strong>${selectedIds.size} task</strong>. Hành động này không thể hoàn tác!`, 'danger', 'Xóa');
  if (!ok) return;
  await syncAction(() => { db.tasks = db.tasks.filter(t => !selectedIds.has(t.id)); });
  selectedIds.clear(); renderAll(); toast(`Đã xóa ${selectedIds.size} task.`, 'success');
}
