function persist() {
  localStorage.setItem('shtd_v2', JSON.stringify(db));
}

function loadCache() {
  try {
    const cached = localStorage.getItem('shtd_v2');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && Array.isArray(parsed.tasks)) {
        db.tasks = parsed.tasks;
        db.initiatives = parsed.initiatives || [];
      }
    }
  } catch(e) {}
}
