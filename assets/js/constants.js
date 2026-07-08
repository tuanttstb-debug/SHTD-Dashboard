// ── App state ──
let db = { tasks: [], initiatives: [], _serverTs: null, deletedIds: [] };
let sort = { key: 'endDate', dir: 'asc' };
let perfTab = 'initiative';
let fileHandle = null;
let chartInst = null;
let selectedIds = new Set();
let currentPage = 1;
const PAGE_SIZE = 20;
let confirmResolve = null;
const DEFAULT_PICS = ['Tuantt4', 'Dunglq1', 'Quangnn3'];
const TEAM_LIST = ['BL', 'CV1', 'CV2', 'PTKD MB', 'PTKD MN', 'QLDM', 'Số'];
let gKeyBuffer = '';
let debounceTimer = null;
let activePreset = localStorage.getItem('shtd_preset') || 'active';

// ── Google Apps Script config ──
// GS_WEBAPP_URL is defined in assets/js/config.js — update that file on each GAS redeploy
const GS_SHEET_ID   = '1cpg1p_8TGGbvZNNWZmjsKANqHW1tQijbiQBFLYn56Hk';
const GS_RANGE      = 'Task_Master!A1:X';

// ── Sheet column schema (24 cols) ──
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
  'Cross-team? (Y/N)','Highlight báo cáo lên dashboard? (Y/N)',
  'Ý kiến BLĐ'
];

const _MMM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── Case Pipeline ──
let dbCases = [];

const CASE_STAGES = [
  'Tiếp nhận',
  'Đã gặp KH/đang bổ sung thông tin',
  'Chờ dữ liệu/ĐVKD',
  'Chờ bổ sung hồ sơ',
  'Đang phân tích',
  'Chờ TTĐ/Thẩm định',
  'Trình nội bộ',
  'Đã xong phương án',
  'Đã trình TTV BĐS, đang phối hợp để báo cáo lại',
  'Trình phê duyệt',
  'Chờ giải ngân/triển khai',
  'Đã phê duyệt',
  'Đang triển khai',
  'Tạm dừng/Blocked',
];

const CASE_STAGE_GROUP = {
  'Tiếp nhận':                                          'new',
  'Đã gặp KH/đang bổ sung thông tin':                  'active',
  'Chờ dữ liệu/ĐVKD':                                  'active',
  'Chờ bổ sung hồ sơ':                                 'active',
  'Đang phân tích':                                     'active',
  'Chờ TTĐ/Thẩm định':                                 'pending',
  'Trình nội bộ':                                       'pending',
  'Đã xong phương án':                                  'pending',
  'Đã trình TTV BĐS, đang phối hợp để báo cáo lại':   'pending',
  'Trình phê duyệt':                                    'pending',
  'Chờ giải ngân/triển khai':                          'done',
  'Đã phê duyệt':                                      'done',
  'Đang triển khai':                                    'done',
  'Tạm dừng/Blocked':                                   'blocked',
};

const CASE_LOAI_HINH   = ['Món', 'Dự án', 'HMTD', 'Rà soát'];
const CASE_COMPLEXITY  = ['Cao', 'Trung bình', 'Thấp'];

// ── Issue Tracker ──
let dbIssues = [];

const ISSUE_SYSTEMS  = ['BIZ', 'BPM DXGN', 'BPM QTGN', 'Khác'];
const ISSUE_TYPES    = ['Bug', 'Performance', 'Data', 'Config', 'Other'];
const ISSUE_SEVERITY = ['Critical', 'High', 'Medium', 'Low'];
const ISSUE_DEPTS    = ['BIZ', 'Dev1', 'Dev3', 'Other'];

const ISSUE_STATUS_SIMPLE  = ['Mới', 'Đang xử lý', 'Đã xử lý', 'Tạm dừng'];
const ISSUE_STATUS_COMPLEX = ['Mới', 'Dev xử lý', 'Testing', 'UAT', 'Đã xử lý', 'Tạm dừng'];

const ISSUE_SLA_DAYS = { 'Critical': 1, 'High': 3, 'Medium': 7, 'Low': 14 };

const CASE_COLS = [
  'ID', 'Tuần BC', 'Team', 'PIC', 'ĐVKD', 'Khách hàng / Case',
  'Loại hình', 'Mức độ phức tạp', 'Phương án', 'Giá trị (tỷ đồng)',
  'Stage', 'Vướng mắc chính', 'Next step',
  'Start Date', 'Deadline', 'RAG',
  'Cần BLĐ?', 'Highlight dashboard?', 'Ghi chú', 'Ý kiến BLĐ'
];
