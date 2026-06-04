function uiConfirm(title, body, type = 'warn', okLabel = 'Xác nhận') {
  return new Promise(resolve => {
    confirmResolve = resolve;
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmBody').innerHTML = body;
    const icon = document.getElementById('confirmIcon');
    const btn = document.getElementById('confirmOkBtn');
    icon.className = `confirm-icon ${type}`;
    const icons = { warn:'fa-triangle-exclamation', danger:'fa-trash', info:'fa-circle-info' };
    icon.innerHTML = `<i class="fa-solid ${icons[type]||'fa-question'}"></i>`;
    btn.textContent = okLabel;
    btn.className = type === 'danger' ? 'btn btn-danger' : 'btn btn-primary';
    document.getElementById('confirmOverlay').classList.add('open');
  });
}

function resolveConfirm(val) {
  document.getElementById('confirmOverlay').classList.remove('open');
  if (confirmResolve) { confirmResolve(val); confirmResolve = null; }
}

function showLoading(msg = 'Đang xử lý…') {
  document.getElementById('loadingText').textContent = msg;
  document.getElementById('loadingOverlay').classList.add('visible');
}

function hideLoading() {
  document.getElementById('loadingOverlay').classList.remove('visible');
}
