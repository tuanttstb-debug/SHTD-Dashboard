// ── App state ──
let db = { tasks: [], initiatives: [], _serverTs: null };
let sort = { key: 'endDate', dir: 'asc' };
let perfTab = 'initiative';
let fileHandle = null;
let chartInst = null;
let selectedIds = new Set();
let currentPage = 1;
const PAGE_SIZE = 20;
let confirmResolve = null;
const DEFAULT_PICS = ['Tuantt4', 'Dunglq1', 'Quangnn3'];
let gKeyBuffer = '';
let debounceTimer = null;
let activePreset = localStorage.getItem('shtd_preset') || 'active';

// ── Google Apps Script config ──
// GS_WEBAPP_URL is defined in assets/js/config.js — update that file on each GAS redeploy
const GS_SHEET_ID   = '1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk';
const GS_RANGE      = 'Task_Master!A1:W';

// ── Sheet column schema (23 cols) ──
const DB_COLS = [
  'ID','Tuần BC','Initiative ID','Category',
  'Team chính','Team phối hợp',
  'Loại (Task/BAU/DA/SK)',
  'Task / Deliverable (1 dòng = 1 deliverable cụ thể)',
  'PIC Accountable (Teamlead – chịu trách nhiệm)',
  'PIC Responsible (Member – người thực thi)',
  'PIC Support (Member – người hỗ trợ)',
  'Start Date','Deadline','% HT',
  'Trạng thái','Milestone hiện tại',
  'Kết quả tuần qua','Kế hoạch tuần tới','Vướng mắc',
  'Cần BLĐ (Y/N)','Nội dung cần BLĐ quyết',
  'Cross-team? (Y/N)','Highlight báo cáo lên dashboard? (Y/N)'
];

const _MMM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
