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
  const toUpdate = [...selectedIds].map(id => db.tasks.find(x => x.id === id)).filter(Boolean);
  toUpdate.forEach(t => { t.status = rag; });
  persist();
  selectedIds.clear(); renderAll();
  toast(`Đã cập nhật RAG → ${rag} cho ${toUpdate.length} task`, 'success');
  toUpdate.forEach(t => _gasTaskUpsert(t));
}

async function bulkSetState(state) {
  const ok = await uiConfirm('Cập nhật trạng thái', `Đánh dấu <strong>${selectedIds.size}</strong> task là <strong>${state}</strong>?`, 'info', 'Cập nhật');
  if (!ok) return;
  const count = selectedIds.size;
  const toUpdate = [...selectedIds].map(id => db.tasks.find(x => x.id === id)).filter(Boolean);
  toUpdate.forEach(t => { t.state = state; if (state === 'Hoàn thành') t.progress = 100; });
  persist();
  selectedIds.clear(); renderAll();
  toast(`Đã cập nhật ${count} task.`, 'success');
  toUpdate.forEach(t => _gasTaskUpsert(t));
}

async function bulkDelete() {
  const ok = await uiConfirm('Xóa task', `Bạn sắp xóa <strong>${selectedIds.size} task</strong>. Hành động này không thể hoàn tác!`, 'danger', 'Xóa');
  if (!ok) return;
  const toDelete = [...selectedIds].map(id => {
    const t = db.tasks.find(x => x.id === id);
    return { id, name: t ? (t.name || '') : '' };
  });
  const count = toDelete.length;
  db.tasks = db.tasks.filter(t => !selectedIds.has(t.id));
  persist();
  selectedIds.clear(); renderAll();
  toast(`Đã xóa ${count} task.`, 'success');
  toDelete.forEach(({ id, name }) => _gasTaskDelete(id, name));
}
