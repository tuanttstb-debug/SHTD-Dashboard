// ── SHTD Dashboard – Cache Layer (Phase 3 GAS tuning) ──
//
// DATA_VER = "phiên bản dữ liệu", bump SAU KHI mọi write commit (trong auditLog) + notifScan.
// Hai chỗ dùng:
//  (1) VERSION GATE cho batch-read (Code.gs): client gửi ver đã biết; khớp ver hiện tại →
//      server trả {notModified:true} (gần như 0 payload) → hết tải lại toàn bộ sheet khi dữ
//      liệu KHÔNG đổi (thắng lớn nhất về transfer mạng nội bộ). Khi ĐỔI → đọc LIVE (luôn tươi).
//  (2) AI CONTEXT CACHE (AiService.gs): buildContext cache theo DATA_VER (gzip) — câu hỏi liên
//      tiếp khi dữ liệu không đổi dùng lại context, bỏ 3 lần đọc sheet + build 1500-task index.
//
// CHỦ Ý KHÔNG cache từng sheet đọc ở server: version gate đã lo "không đổi = không tải"; khi
// đổi thì đọc live để KHÔNG bao giờ trả dữ liệu cũ (tránh race read-xen-giữa-write). Helper cache
// bên dưới chỉ phục vụ AI context (payload nén > cap → tự bỏ qua, build live như cũ).

var _CACHE_TTL = 21600;   // 6h — an toàn vì key gắn version (write bump → key đổi ngay)
var _CACHE_MAX = 95000;   // < 100KB/key của CacheService; vượt → bỏ cache, dựng live

function _dataVer() {
  return PropertiesService.getScriptProperties().getProperty('SHTD_DATA_VER') || '0';
}

function _bumpDataVer() {
  // Timestamp là đủ để đảm bảo version đổi sau mỗi write (không cần đơn điệu tăng).
  PropertiesService.getScriptProperties().setProperty('SHTD_DATA_VER', String(Date.now()));
}

function _cacheGetJson(key) {
  try {
    var raw = CacheService.getScriptCache().get(key);
    if (!raw) return null;
    var blob = Utilities.newBlob(Utilities.base64Decode(raw), 'application/x-gzip');
    return JSON.parse(Utilities.ungzip(blob).getDataAsString());
  } catch (e) { return null; }
}

function _cachePutJson(key, obj) {
  try {
    var gz  = Utilities.gzip(Utilities.newBlob(JSON.stringify(obj)));
    var b64 = Utilities.base64Encode(gz.getBytes());
    if (b64.length > _CACHE_MAX) return;   // quá lớn → không cache (dựng live lần sau)
    CacheService.getScriptCache().put(key, b64, _CACHE_TTL);
  } catch (e) {}
}

// ── (Pha A) Idempotency dedup cho write ──
// Client sinh reqId ổn định qua các lần retry → nếu 1 request đã commit nhưng client bị
// timeout và thử lại, server nhận ra reqId đã xử lý và TRẢ LẠI mã cũ (không tạo bản ghi trùng).
// Kiểm/ghi trong write-lock để 2 request cùng reqId serialize (request sau thấy cache của trước).
var _REQ_TTL = 300;   // 5 phút — đủ dài cho mọi vòng retry của 1 thao tác

function _reqSeen(reqId) {
  if (!reqId) return null;
  try {
    var v = CacheService.getScriptCache().get('req:' + reqId);
    return v ? JSON.parse(v) : null;   // { id: '<mã đã commit>' }
  } catch (e) { return null; }
}

function _reqRemember(reqId, id) {
  if (!reqId) return;
  try {
    CacheService.getScriptCache().put('req:' + reqId, JSON.stringify({ id: String(id) }), _REQ_TTL);
  } catch (e) {}
}
