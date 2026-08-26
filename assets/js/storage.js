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
        if (Array.isArray(parsed.deletedIds)) db.deletedIds = parsed.deletedIds;
        // (Phase 3) Khôi phục version để lần batch-read đầu sau reload gửi đúng ver (→ notModified nếu chưa đổi).
        if (parsed._dataVer)  db._dataVer  = parsed._dataVer;
        if (parsed._vers)     db._vers     = parsed._vers;   // (Pha B) version theo domain
        if (parsed._serverTs) db._serverTs = parsed._serverTs;
      }
    }
  } catch(e) {}
}
