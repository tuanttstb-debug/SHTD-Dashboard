/**
 * verify_send_report.mjs — Gửi báo cáo tuần qua email (ReportEmailService.gs)
 *
 * Nạp NGUYÊN VĂN backend/ReportEmailService.gs vào sandbox Node (stub SpreadsheetApp +
 * MailApp), chạy hàm GAS THẬT — không port tay (tránh drift giữa test và GAS).
 *
 *  SR1 – _reportRecipients_: To=CuongVM1; Cc = teamlead active có email; loại inactive/no-mail/non-lead
 *  SR2 – To cũng là Teamlead → loại khỏi Cc (đã ở To)
 *  SR3 – email teamlead trùng (khác hoa) → dedup 1 địa chỉ
 *  SR4 – To không có trong User_Master → sendWeeklyReport_ (thật) NÉM lỗi, KHÔNG gửi
 *  SR5 – dryRun → trả người nhận, sent=false, MailApp KHÔNG được gọi
 *  SR6 – gửi thật → MailApp gọi 1 lần đúng {to, cc, subject, htmlBody}; sent=true
 *  SR7 – html rỗng → NÉM lỗi
 *
 * Run: node verify_send_report.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(__dirname, 'backend', 'ReportEmailService.gs'), 'utf8');

let passed = 0, failed = 0;
function log(id, ok, msg) { console.log(`${ok ? '✅' : '❌'} ${id}: ${msg}`); ok ? passed++ : failed++; }
function throws(fn) { try { fn(); return false; } catch (e) { return true; } }

/* ── Fake Sheets (chỉ cần getDataRange cho reader này) ── */
function makeSheet(rows) {
  return { getDataRange() { return { getValues() { return rows.map(r => r.slice()); } }; } };
}
function buildEnv(userRows) {
  const registry = { User_Master: makeSheet(userRows) };
  const fakeSS = { getSheetByName(n) { return registry[n] || null; } };
  const mails = [];
  const factory = new Function(
    'SpreadsheetApp', 'MailApp', 'SPREADSHEET_ID', 'USER_SHEET_NAME',
    SRC + '\n;return { _reportRecipients_:_reportRecipients_, sendWeeklyReport_:sendWeeklyReport_ };'
  );
  const api = factory(
    { openById: () => fakeSS },
    { sendEmail: (o) => { mails.push(o); } },
    'fake', 'User_Master'
  );
  return { api, mails };
}

const HDR = ['Username', 'Display_Name', 'Email', 'Role', 'Active'];

/* ── SR1: chuẩn ── */
{
  const { api } = buildEnv([HDR,
    ['cuongvm1', 'Cường VM', 'cuong@bank.vn', 'User', true],
    ['leadA', 'Lead A', 'a@bank.vn', 'Teamlead', true],
    ['leadB', 'Lead B', 'b@bank.vn', 'Teamlead', true],
    ['leadOff', 'Off', 'off@bank.vn', 'Teamlead', false],   // inactive → loại
    ['leadNoMail', 'NoMail', '', 'Teamlead', true],          // no email → loại
    ['mem', 'Mem', 'm@bank.vn', 'User', true],               // non-lead → loại
  ]);
  const r = api._reportRecipients_();
  log('SR1', r.toEmail === 'cuong@bank.vn' && JSON.stringify(r.cc) === JSON.stringify(['a@bank.vn', 'b@bank.vn']) && r.warnings.length === 0,
    `To=${r.toEmail} Cc=${JSON.stringify(r.cc)} warn=${r.warnings.length}`);
}

/* ── SR2: To cũng là teamlead → loại khỏi Cc ── */
{
  const { api } = buildEnv([HDR,
    ['CuongVM1', 'Cường', 'cuong@bank.vn', 'Teamlead', true],
    ['leadA', 'A', 'a@bank.vn', 'Teamlead', true],
  ]);
  const r = api._reportRecipients_();
  log('SR2', r.toEmail === 'cuong@bank.vn' && JSON.stringify(r.cc) === JSON.stringify(['a@bank.vn']),
    `To=${r.toEmail} Cc=${JSON.stringify(r.cc)}`);
}

/* ── SR3: dedup email trùng ── */
{
  const { api } = buildEnv([HDR,
    ['CuongVM1', 'C', 'cuong@bank.vn', 'User', true],
    ['leadA', 'A', 'shared@bank.vn', 'Teamlead', true],
    ['leadA2', 'A2', 'SHARED@bank.vn', 'Teamlead', true],
  ]);
  const r = api._reportRecipients_();
  log('SR3', r.cc.length === 1 && r.cc[0].toLowerCase() === 'shared@bank.vn', `Cc=${JSON.stringify(r.cc)}`);
}

/* ── SR4: To không tồn tại → gửi thật NÉM lỗi ── */
{
  const { api, mails } = buildEnv([HDR, ['leadA', 'A', 'a@bank.vn', 'Teamlead', true]]);
  const threw = throws(() => api.sendWeeklyReport_('<b>hi</b>', 'Tiêu đề', {}));
  log('SR4', threw && mails.length === 0, `threw=${threw} mails=${mails.length}`);
}

/* ── SR5: dryRun không gửi ── */
{
  const { api, mails } = buildEnv([HDR,
    ['CuongVM1', 'C', 'cuong@bank.vn', 'User', true],
    ['leadA', 'A', 'a@bank.vn', 'Teamlead', true],
  ]);
  const r = api.sendWeeklyReport_('<b>hi</b>', 'Tiêu đề', { dryRun: true });
  log('SR5', r.sent === false && mails.length === 0 && r.to === 'cuong@bank.vn' && r.count === 1,
    `sent=${r.sent} mails=${mails.length} to=${r.to} count=${r.count}`);
}

/* ── SR6: gửi thật → MailApp đúng payload ── */
{
  const { api, mails } = buildEnv([HDR,
    ['CuongVM1', 'C', 'cuong@bank.vn', 'User', true],
    ['leadA', 'A', 'a@bank.vn', 'Teamlead', true],
    ['leadB', 'B', 'b@bank.vn', 'Teamlead', true],
  ]);
  const r = api.sendWeeklyReport_('<h1>Báo cáo</h1>', 'BC tuần 34', {});
  const m = mails[0] || {};
  log('SR6', r.sent === true && mails.length === 1 && m.to === 'cuong@bank.vn' &&
    m.cc === 'a@bank.vn,b@bank.vn' && m.subject === 'BC tuần 34' && /Báo cáo/.test(m.htmlBody),
    `sent=${r.sent} to=${m.to} cc=${m.cc} subj=${m.subject}`);
}

/* ── SR7: html rỗng → NÉM ── */
{
  const { api, mails } = buildEnv([HDR, ['CuongVM1', 'C', 'cuong@bank.vn', 'User', true]]);
  const threw = throws(() => api.sendWeeklyReport_('   ', 'x', {}));
  log('SR7', threw && mails.length === 0, `threw=${threw}`);
}

console.log(`\n${failed ? '❌ FAIL' : '✅ PASS'} — ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
