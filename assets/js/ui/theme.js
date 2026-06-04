function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('darkModeBtn').innerHTML = isDark ? '<i class="fa-solid fa-moon"></i>' : '<i class="fa-solid fa-sun"></i>';
  localStorage.setItem('shtd_theme', isDark ? 'light' : 'dark');
}

function applySavedTheme() {
  const t = localStorage.getItem('shtd_theme');
  if (t) {
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      const b = document.getElementById('darkModeBtn');
      if (b) b.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }
  }
}

applySavedTheme();
