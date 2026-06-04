function toast(msg, type = 'info', duration = 3500) {
  const icons = { success:'fa-circle-check', error:'fa-circle-xmark', warning:'fa-triangle-exclamation', info:'fa-circle-info' };
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `<i class="fa-solid ${icons[type]} toast-icon"></i><span class="toast-msg">${msg}</span><i class="fa-solid fa-xmark toast-close" onclick="this.parentElement.remove()"></i>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('hiding');
    setTimeout(() => el.remove(), 280);
  }, duration);
}
