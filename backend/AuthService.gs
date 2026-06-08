// ── SHTD Dashboard – Authentication Service ──
// Token scheme: base64url(payload) + '.' + HMAC-SHA256-hex(payload, secret)
// Payload: {u, dn, r, t, exp}  — exp = Unix ms, 24 h from issue

var USER_SHEET_NAME = 'User_Master';

function _authSecret() {
  var secret = PropertiesService.getScriptProperties().getProperty('AUTH_SECRET');
  if (!secret) throw new Error('AUTH_SECRET chưa được cấu hình trong Script Properties. Liên hệ Admin.');
  return secret;
}

function _sha256Hex(plain) {
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256, plain, Utilities.Charset.UTF_8);
  return bytes.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function _hmacHex(payload) {
  var sig = Utilities.computeHmacSha256Signature(
    payload, _authSecret(), Utilities.Charset.UTF_8);
  return sig.map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

function _makeToken(u, dn, r, t) {
  var exp     = Date.now() + 24 * 60 * 60 * 1000;
  var payload = JSON.stringify({ u: u, dn: dn, r: r, t: t, exp: exp });
  // Utilities.base64Encode produces MIME base64 with \n every 76 chars.
  // Strip line breaks so the token is a clean single-line string.
  var b64     = Utilities.base64Encode(payload, Utilities.Charset.UTF_8).replace(/[\r\n]/g, '');
  return b64 + '.' + _hmacHex(payload);
}

/**
 * Validate a token string.
 * Returns parsed payload object {u,dn,r,t,exp} or null if invalid/expired.
 */
function validateToken(token) {
  if (!token) return null;
  try {
    var parts = String(token).split('.');
    if (parts.length !== 2) return null;
    // Strip any line breaks that may have been inserted by base64Encode (MIME format)
    // or introduced by older tokens stored in localStorage.
    var payload = Utilities.newBlob(Utilities.base64Decode(parts[0].replace(/[\r\n]/g, ''))).getDataAsString();
    if (_hmacHex(payload) !== parts[1]) return null;
    var data = JSON.parse(payload);
    if (!data.exp || Date.now() > data.exp) return null;
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Validate username + password against User_Master sheet.
 * Returns {token, user} on success; throws Error on failure.
 */
function authLogin(username, password) {
  if (!username || !password) throw new Error('Thiếu thông tin đăng nhập.');

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('Hệ thống chưa được cấu hình. Liên hệ Admin.');

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) throw new Error('Không tìm thấy người dùng trong hệ thống.');

  var H       = data[0].map(function(h) { return String(h).trim(); });
  var iUser   = H.indexOf('Username');
  var iDisp   = H.indexOf('Display_Name');
  var iRole   = H.indexOf('Role');
  var iTeam   = H.indexOf('Team');
  var iActive = H.indexOf('Active');
  var iHash   = H.indexOf('Password_Hash');
  var iLogin  = H.indexOf('Last_Login');

  var inputHash  = _sha256Hex(password);
  var inputLower = username.toLowerCase();

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (String(row[iUser]).toLowerCase() !== inputLower) continue;

    if (row[iActive] === false || String(row[iActive]).toLowerCase() === 'false') {
      throw new Error('Tài khoản đã bị vô hiệu hóa. Liên hệ Admin.');
    }
    if (String(row[iHash]).toLowerCase() !== inputHash) {
      throw new Error('Sai mật khẩu. Vui lòng thử lại.');
    }

    if (iLogin >= 0) {
      sheet.getRange(i + 1, iLogin + 1).setValue(new Date().toISOString());
      SpreadsheetApp.flush();
    }

    var uName = String(row[iUser]);
    var dName = String(row[iDisp]) || uName;
    var role  = String(row[iRole])  || 'User';
    var team  = String(row[iTeam])  || '';

    return {
      token : _makeToken(uName, dName, role, team),
      user  : { username: uName, displayName: dName, role: role, team: team },
    };
  }

  throw new Error('Không tìm thấy tài khoản. Vui lòng kiểm tra lại.');
}

/**
 * Change password for the authenticated user.
 * tokenData must already be validated by the caller (Code.gs).
 * Returns true on success; throws Error on failure.
 */
function changePassword(tokenData, oldPassword, newPassword) {
  if (!oldPassword || !newPassword) throw new Error('Vui lòng nhập đầy đủ mật khẩu cũ và mới.');
  if (newPassword.length < 6)       throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  if (oldPassword === newPassword)  throw new Error('Mật khẩu mới phải khác mật khẩu cũ.');

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy bảng người dùng.');

  var data    = sheet.getDataRange().getValues();
  var H       = data[0].map(function(h) { return String(h).trim(); });
  var iUser   = H.indexOf('Username');
  var iHash   = H.indexOf('Password_Hash');
  var oldHash = _sha256Hex(oldPassword);
  var newHash = _sha256Hex(newPassword);

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][iUser]).toLowerCase() !== tokenData.u.toLowerCase()) continue;
    if (String(data[i][iHash]).toLowerCase() !== oldHash) throw new Error('Mật khẩu cũ không đúng.');
    sheet.getRange(i + 1, iHash + 1).setValue(newHash);
    SpreadsheetApp.flush();
    return true;
  }
  throw new Error('Không tìm thấy tài khoản.');
}

/**
 * Run ONCE from Apps Script editor to seed User_Master.
 * Default password = Username (case-sensitive).
 */
function setupInitialUsers() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  if (ss.getSheetByName(USER_SHEET_NAME)) {
    Logger.log('User_Master đã tồn tại. Xóa sheet trước nếu muốn reset.');
    return;
  }

  var sheet  = ss.insertSheet(USER_SHEET_NAME);
  var header = ['Username','Display_Name','Role','Team','Email',
                'Active','Created_At','Last_Login','Password_Hash'];
  var now    = new Date().toISOString();

  var users = [
    ['TuanTT4',  'TuanTT4',  'Admin', 'Số', '', true, now, '', _sha256Hex('TuanTT4')],
    ['DungLQ1',  'DungLQ1',  'Admin', 'Số', '', true, now, '', _sha256Hex('DungLQ1')],
    ['QuangNN3', 'QuangNN3', 'User',  'Số', '', true, now, '', _sha256Hex('QuangNN3')],
  ];

  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(2, 1, users.length, header.length).setValues(users);
  SpreadsheetApp.flush();
  Logger.log('✅ User_Master đã tạo. Mật khẩu mặc định = Username (case-sensitive).');
}
