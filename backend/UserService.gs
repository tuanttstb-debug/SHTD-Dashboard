// ── SHTD Dashboard – User Management Service (Admin only) ──

/**
 * Return all users from User_Master, excluding Password_Hash column.
 * Returns { header: [...], rows: [[...], ...] }
 */
function userList(ss) {
  ss = ss || SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet User_Master.');

  var data = sheet.getDataRange().getValues();
  if (data.length < 1) return { header: [], rows: [] };

  var H     = data[0].map(function(h) { return String(h).trim(); });
  var iHash = H.indexOf('Password_Hash');

  var header = H.filter(function(_, ci) { return ci !== iHash; });
  var rows   = [];
  for (var i = 1; i < data.length; i++) {
    rows.push(data[i].filter(function(_, ci) { return ci !== iHash; }));
  }
  return { header: header, rows: rows };
}

/**
 * Create a new user in User_Master.
 * data: { username, displayName, role, team, email, password, active }
 * Password is SHA-256 hashed before storing.
 */
function userCreate(data) {
  if (!data.username)    throw new Error('Username là bắt buộc.');
  if (!data.displayName) throw new Error('Tên hiển thị là bắt buộc.');
  if (!data.password)    throw new Error('Mật khẩu là bắt buộc.');
  if (data.password.length < 6) throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
  if (['Admin', 'User', 'Teamlead'].indexOf(data.role) === -1) {
    throw new Error('Role không hợp lệ. Chọn Admin, User hoặc Teamlead.');
  }

  var username = String(data.username).trim();
  if (!username) throw new Error('Username không được để trống.');

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet User_Master.');

  var existing = sheet.getDataRange().getValues();
  var H     = existing[0].map(function(h) { return String(h).trim(); });
  var iUser = H.indexOf('Username');

  for (var i = 1; i < existing.length; i++) {
    if (String(existing[i][iUser]).toLowerCase() === username.toLowerCase()) {
      throw new Error('Username "' + username + '" đã tồn tại trong hệ thống.');
    }
  }

  var now     = new Date().toISOString();
  var active  = data.active === false ? false : true;
  var newRow  = [
    username,
    String(data.displayName).trim(),
    data.role,
    data.team  ? String(data.team).trim()  : '',
    data.email ? String(data.email).trim() : '',
    active,
    now,
    '',
    _sha256Hex(data.password)
  ];

  sheet.appendRow(newRow);
  SpreadsheetApp.flush();
  return true;
}

/**
 * Update editable fields of an existing user.
 * data: { username, displayName?, role?, team?, email?, active? }
 * Cannot update Username or Password_Hash via this function.
 */
function userUpdate(data) {
  if (!data.username) throw new Error('Thiếu username.');

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet User_Master.');

  var rows   = sheet.getDataRange().getValues();
  var H      = rows[0].map(function(h) { return String(h).trim(); });
  var iUser  = H.indexOf('Username');
  var iDisp  = H.indexOf('Display_Name');
  var iRole  = H.indexOf('Role');
  var iTeam  = H.indexOf('Team');
  var iEmail = H.indexOf('Email');
  var iActive= H.indexOf('Active');

  var target = String(data.username).toLowerCase();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][iUser]).toLowerCase() !== target) continue;

    if (data.displayName !== undefined)
      sheet.getRange(i + 1, iDisp + 1).setValue(String(data.displayName).trim());
    if (data.role !== undefined) {
      if (['Admin', 'User', 'Teamlead'].indexOf(data.role) === -1)
        throw new Error('Role không hợp lệ.');
      sheet.getRange(i + 1, iRole + 1).setValue(data.role);
    }
    if (data.team  !== undefined) sheet.getRange(i + 1, iTeam  + 1).setValue(String(data.team).trim());
    if (data.email !== undefined) sheet.getRange(i + 1, iEmail + 1).setValue(String(data.email).trim());
    if (data.active !== undefined) sheet.getRange(i + 1, iActive + 1).setValue(!!data.active);

    SpreadsheetApp.flush();
    return true;
  }

  throw new Error('Không tìm thấy user "' + data.username + '".');
}

/**
 * Admin resets a user's password without knowing the old one.
 */
function userResetPassword(username, newPassword) {
  if (!username || !newPassword) throw new Error('Thiếu username hoặc mật khẩu mới.');
  if (newPassword.length < 6)    throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');

  var ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(USER_SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet User_Master.');

  var rows  = sheet.getDataRange().getValues();
  var H     = rows[0].map(function(h) { return String(h).trim(); });
  var iUser = H.indexOf('Username');
  var iHash = H.indexOf('Password_Hash');

  var target = String(username).toLowerCase();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][iUser]).toLowerCase() !== target) continue;
    sheet.getRange(i + 1, iHash + 1).setValue(_sha256Hex(newPassword));
    SpreadsheetApp.flush();
    return true;
  }

  throw new Error('Không tìm thấy user "' + username + '".');
}
