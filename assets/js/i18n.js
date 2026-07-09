// ── SHTD Dashboard – i18n (Bilingual VI/EN) ──
// Phase 1: UI chrome — navigation, topbar, login, dashboard KPIs, modal titles, key toasts/confirms.
// Phase 2: View content (tasks, case-pipeline, action-plan, bld-queue).
// Phase 3: Full coverage (form labels, initiative tracker, all toasts).
//
// Data values stored in GAS (task states, RAG, stage names) are NOT translated here.
// Banking domain terms (BLĐ, ĐVKD, Tuần BC) are kept as-is per project convention.

let _lang = localStorage.getItem('shtd_lang') || 'vi';

const TRANSLATIONS = {
  vi: {
    // ── Navigation sections ──
    'nav.section.overview':    'Tổng quan',
    'nav.section.management':  'Quản lý',
    'nav.section.reports':     'Báo cáo',
    'nav.section.kpi':         'KPI Digital',
    'nav.section.assistant':   'Trợ lý',
    'nav.section.admin':       'Quản trị',

    // ── Navigation items ──
    'nav.my-work':             'Công việc của tôi',
    'nav.executive-summary':   'Tổng hợp BLĐ',
    'nav.bld-queue':           'Phê duyệt BLĐ',
    'nav.initiative-tracker':  'Theo dõi Initiative',
    'nav.tasks':               'Quản lý Task',
    'nav.user-management':     'Quản lý User',

    // ── Page titles (topbar) ──
    'page.dashboard':          'Executive Dashboard',
    'page.my-work':            'Công việc của tôi',
    'page.executive-summary':  'Tổng hợp BLĐ',
    'page.bld-queue':          'Phê duyệt BLĐ',
    'page.case-pipeline':      'Case Pipeline – Cơ hội kinh doanh',
    'page.issue-tracker':      'Issue Tracker – Theo dõi lỗi hệ thống',
    'page.tasks':              'Quản lý Công việc',
    'page.gantt':              'Timeline (Gantt)',
    'page.performance':        'Báo cáo Hiệu suất',
    'page.kpi-overview':       'KPI Digital Overview',
    'page.action-plan':        'Action Plan – Kế hoạch hành động',
    'page.kpi-progress':       'KPI Progress – Tiến độ từng sản phẩm',
    'page.owner-analysis':     'Owner Analysis – Theo chủ sở hữu',
    'page.branch-analysis':    'Branch Analysis – Theo chi nhánh',
    'page.rm-analysis':        'RM Analysis – Theo Relationship Manager',
    'page.initiative-tracker': 'Theo dõi Initiative',
    'page.ai-chat':            'AI Assistant – Trợ lý thông minh',
    'page.user-management':    'Quản lý User',

    // ── Topbar ──
    'topbar.overview':        'Tổng quan',
    'topbar.updated':         'Cập nhật',
    'topbar.shortcuts-title': 'Phím tắt (?)',
    'topbar.theme-title':     'Đổi giao diện (Ctrl+D)',
    'topbar.sidebar-title':   'Thu gọn sidebar (Ctrl+B)',
    'topbar.menu-title':      'Menu (mở sidebar)',

    // ── Sidebar footer ──
    'sidebar.db-disconnected': 'Chưa kết nối DB',
    'sidebar.brand-name':      'Web Nội Bộ',
    'sidebar.brand-sub':       'TT Sản Phẩm & Giải Pháp Tín Dụng',

    // ── Login / Auth ──
    'auth.internal-portal':  'Web Nội Bộ',
    'auth.org-sub':          'Trung tâm Sản Phẩm & Giải Pháp Tín Dụng',
    'auth.signin-title':     'Đăng nhập',
    'auth.username-label':   'Tên đăng nhập',
    'auth.password-label':   'Mật khẩu',
    'auth.password-ph':      'Mật khẩu',
    'auth.login-btn':        'Đăng nhập',
    'auth.loading':          'Đang xử lý...',

    // ── Dashboard ──
    'dash.filter.label':         'Xem theo tuần:',
    'dash.filter.all-tasks':     '📊 Tất cả task',
    'dash.filter.this-week':     '📅 Tuần này',
    'dash.total-label':          'Tổng số Task',
    'dash.total-sub':            'Tất cả dự án & BAU',
    'dash.done-label':           'Hoàn thành',
    'dash.inprogress-label':     'Đang thực hiện',
    'dash.overdue-label':        'Quá hạn',
    'dash.overdue-sub':          'Chưa hoàn thành & qua deadline',
    'dash.rag-title':            'Phân bổ Health (RAG)',
    'dash.rag-sub':              'Click vào biểu đồ để xem chi tiết',
    'dash.init-table-title':     'Tổng hợp theo Initiative',
    'dash.init-table-sub':       'Click để xem danh sách task',
    'dash.init-col-total':       'Tổng',
    'dash.init-col-done':        'Xong',
    'dash.init-col-progress':    'Tiến độ',
    'dash.team-dist-title':      'Phân bổ theo Team',
    'dash.blocked-title':        'Blocked & Cần BLĐ',

    // ── Executive Summary ──
    'es.total-label':        'Tổng số Task',
    'es.total-sub':          'Tất cả dự án & BAU',
    'es.completion-label':   'Tỷ lệ hoàn thành',
    'es.overdue-label':      'Quá hạn',
    'es.overdue-sub':        'Chưa HT & qua deadline',
    'es.print-btn':          'In / Xuất PDF',
    'es.updated-label':      'Cập nhật:',

    // ── Common actions ──
    'common.save':      'Lưu',
    'common.cancel':    'Hủy',
    'common.delete':    'Xóa',
    'common.edit':      'Chỉnh sửa',
    'common.add-new':   'Thêm mới',
    'common.close':     'Đóng',
    'common.confirm':   'Xác nhận',
    'common.search':    'Tìm kiếm',
    'common.filter':    'Lọc',
    'common.export':    'Xuất Excel',
    'common.import':    'Import Excel',
    'common.refresh':   'Làm mới',
    'common.print':     'In',
    'common.all':       'Tất cả',
    'common.loading':   'Đang tải...',

    // ── Task modal ──
    'modal.task-add-title':   'Thêm Task mới',
    'modal.task-add-sub':     'Điền thông tin công việc',
    'modal.task-edit-title':  'Chỉnh sửa Task',
    'modal.task-delete-title':'Xóa Task',
    'modal.task-clone-title': 'Nhân bản Task mới',

    // ── Confirm dialogs ──
    'confirm.save-title':    'Xác nhận lưu Task',
    'confirm.save-btn':      'Lưu',
    'confirm.delete-btn':    'Xóa',
    'confirm.conflict-title':'⚠️ Xung đột cập nhật',
    'confirm.conflict-btn':  'Ghi đè và lưu',
    'confirm.overwrite-info':'Nhấn <strong>Ghi đè và lưu</strong> để lưu phiên bản của bạn, hoặc <strong>Hủy</strong> để xem lại dữ liệu mới.',

    // ── Toast messages ──
    'toast.task-saved':        'Đã lưu task',
    'toast.task-deleted':      'Đã xóa task',
    'toast.path-copied':       'Đã copy đường dẫn!',
    'toast.copy-failed':       'Copy không thành công, vui lòng copy thủ công.',
    'toast.conflict-reload':   'Dữ liệu vừa được cập nhật bởi người khác. Đang tải lại dữ liệu mới nhất…',
    'toast.conflict-check-skip': 'conflict check skipped (GAS unavailable)',

    // ── State display (raw GAS values stay Vietnamese; this is display-only) ──
    'state.not-started': 'Chưa bắt đầu',
    'state.in-progress': 'Đang thực hiện',
    'state.prep-done':   'Hoàn thành chuẩn bị',
    'state.completed':   'Hoàn thành',
    'state.on-hold':     'Tạm dừng',
    'state.blocked':     'Blocked',

    // ── Filter bar — Tasks view ──
    'filter.id':          'Mã Task',
    'filter.initiative':  'Initiative',
    'filter.team':        'Team',
    'filter.pic':         'PIC Responsible',
    'filter.state':       'Trạng thái',
    'filter.rag':         'Health (RAG)',
    'filter.tuanbc':      'Tuần BC',
    'filter.thisweek':    '📅 Tuần này',

    // ── Preset bar — Tasks view ──
    'preset.active':  'Đang làm',
    'preset.week':    'Tuần BC này',
    'preset.overdue': 'Quá hạn',
    'preset.all':     'Tất cả',

    // ── Task scope toggle ──
    'task.scope.mine': 'Của tôi',
    'task.scope.all':  'Tất cả',

    // ── Task table UI ──
    'task.count.showing': 'Hiển thị',
    'task.count.of':      '/',
    'task.count.unit':    'task',
    'task.empty':         'Không có task nào. Thêm mới hoặc Import file Excel.',

    // ── Filter chip prefixes ──
    'chip.id':        'ID',
    'chip.initiative':'Initiative',
    'chip.team':      'Team',
    'chip.pic':       'PIC',
    'chip.state':     'Trạng thái',
    'chip.rag':       'RAG',
    'chip.tuanbc':    'Tuần BC',
    'chip.thisweek':  'Tuần này',
  },

  en: {
    // ── Navigation sections ──
    'nav.section.overview':    'Overview',
    'nav.section.management':  'Management',
    'nav.section.reports':     'Reports',
    'nav.section.kpi':         'KPI Digital',
    'nav.section.assistant':   'Assistant',
    'nav.section.admin':       'Administration',

    // ── Navigation items ──
    'nav.my-work':             'My Work',
    'nav.executive-summary':   'Exec Summary',
    'nav.bld-queue':           'BLĐ Approval',
    'nav.initiative-tracker':  'Initiative Tracker',
    'nav.tasks':               'Task Management',
    'nav.user-management':     'User Management',

    // ── Page titles (topbar) ──
    'page.dashboard':          'Executive Dashboard',
    'page.my-work':            'My Work',
    'page.executive-summary':  'Exec Summary',
    'page.bld-queue':          'BLĐ Approval Queue',
    'page.case-pipeline':      'Case Pipeline – Business Opportunities',
    'page.issue-tracker':      'Issue Tracker – System Issues',
    'page.tasks':              'Task Management',
    'page.gantt':              'Timeline (Gantt)',
    'page.performance':        'Performance Report',
    'page.kpi-overview':       'KPI Digital Overview',
    'page.action-plan':        'Action Plan',
    'page.kpi-progress':       'KPI Progress – Per Product',
    'page.owner-analysis':     'Owner Analysis',
    'page.branch-analysis':    'Branch Analysis',
    'page.rm-analysis':        'RM Analysis',
    'page.initiative-tracker': 'Initiative Tracker',
    'page.ai-chat':            'AI Assistant',
    'page.user-management':    'User Management',

    // ── Topbar ──
    'topbar.overview':        'Overview',
    'topbar.updated':         'Updated',
    'topbar.shortcuts-title': 'Shortcuts (?)',
    'topbar.theme-title':     'Toggle theme (Ctrl+D)',
    'topbar.sidebar-title':   'Collapse sidebar (Ctrl+B)',
    'topbar.menu-title':      'Menu (open sidebar)',

    // ── Sidebar footer ──
    'sidebar.db-disconnected': 'DB not connected',
    'sidebar.brand-name':      'Internal Portal',
    'sidebar.brand-sub':       'Product & Credit Solutions Center',

    // ── Login / Auth ──
    'auth.internal-portal':  'Internal Portal',
    'auth.org-sub':          'Product & Credit Solutions Center',
    'auth.signin-title':     'Sign In',
    'auth.username-label':   'Username',
    'auth.password-label':   'Password',
    'auth.password-ph':      'Password',
    'auth.login-btn':        'Sign In',
    'auth.loading':          'Processing...',

    // ── Dashboard ──
    'dash.filter.label':         'View by week:',
    'dash.filter.all-tasks':     '📊 All Tasks',
    'dash.filter.this-week':     '📅 This Week',
    'dash.total-label':          'Total Tasks',
    'dash.total-sub':            'All projects & BAU',
    'dash.done-label':           'Completed',
    'dash.inprogress-label':     'In Progress',
    'dash.overdue-label':        'Overdue',
    'dash.overdue-sub':          'Incomplete & past deadline',
    'dash.rag-title':            'Health Distribution (RAG)',
    'dash.rag-sub':              'Click chart to view details',
    'dash.init-table-title':     'Summary by Initiative',
    'dash.init-table-sub':       'Click to view task list',
    'dash.init-col-total':       'Total',
    'dash.init-col-done':        'Done',
    'dash.init-col-progress':    'Progress',
    'dash.team-dist-title':      'Distribution by Team',
    'dash.blocked-title':        'Blocked & Needs BLĐ',

    // ── Executive Summary ──
    'es.total-label':        'Total Tasks',
    'es.total-sub':          'All projects & BAU',
    'es.completion-label':   'Completion Rate',
    'es.overdue-label':      'Overdue',
    'es.overdue-sub':        'Incomplete & past deadline',
    'es.print-btn':          'Print / Export PDF',
    'es.updated-label':      'Updated:',

    // ── Common actions ──
    'common.save':      'Save',
    'common.cancel':    'Cancel',
    'common.delete':    'Delete',
    'common.edit':      'Edit',
    'common.add-new':   'Add New',
    'common.close':     'Close',
    'common.confirm':   'Confirm',
    'common.search':    'Search',
    'common.filter':    'Filter',
    'common.export':    'Export Excel',
    'common.import':    'Import Excel',
    'common.refresh':   'Refresh',
    'common.print':     'Print',
    'common.all':       'All',
    'common.loading':   'Loading...',

    // ── Task modal ──
    'modal.task-add-title':   'Add New Task',
    'modal.task-add-sub':     'Fill in task details',
    'modal.task-edit-title':  'Edit Task',
    'modal.task-delete-title':'Delete Task',
    'modal.task-clone-title': 'Clone Task',

    // ── Confirm dialogs ──
    'confirm.save-title':    'Confirm Save Task',
    'confirm.save-btn':      'Save',
    'confirm.delete-btn':    'Delete',
    'confirm.conflict-title':'⚠️ Update Conflict',
    'confirm.conflict-btn':  'Overwrite & Save',
    'confirm.overwrite-info':'Click <strong>Overwrite & Save</strong> to save your version, or <strong>Cancel</strong> to review the latest data.',

    // ── Toast messages ──
    'toast.task-saved':        'Task saved',
    'toast.task-deleted':      'Task deleted',
    'toast.path-copied':       'Path copied!',
    'toast.copy-failed':       'Copy failed, please copy manually.',
    'toast.conflict-reload':   'Data was just updated by another user. Reloading latest data…',
    'toast.conflict-check-skip': 'conflict check skipped (GAS unavailable)',

    // ── State display ──
    'state.not-started': 'Not Started',
    'state.in-progress': 'In Progress',
    'state.prep-done':   'Prep. Done',
    'state.completed':   'Completed',
    'state.on-hold':     'On Hold',
    'state.blocked':     'Blocked',

    // ── Filter bar — Tasks view ──
    'filter.id':          'Task ID',
    'filter.initiative':  'Initiative',
    'filter.team':        'Team',
    'filter.pic':         'PIC Responsible',
    'filter.state':       'Status',
    'filter.rag':         'Health (RAG)',
    'filter.tuanbc':      'Report Week',
    'filter.thisweek':    '📅 This Week',

    // ── Preset bar — Tasks view ──
    'preset.active':  'Active',
    'preset.week':    'This Week',
    'preset.overdue': 'Overdue',
    'preset.all':     'All',

    // ── Task scope toggle ──
    'task.scope.mine': 'Mine',
    'task.scope.all':  'All',

    // ── Task table UI ──
    'task.count.showing': 'Showing',
    'task.count.of':      '/',
    'task.count.unit':    'tasks',
    'task.empty':         'No tasks found. Add new or Import Excel file.',

    // ── Filter chip prefixes ──
    'chip.id':        'ID',
    'chip.initiative':'Initiative',
    'chip.team':      'Team',
    'chip.pic':       'PIC',
    'chip.state':     'Status',
    'chip.rag':       'RAG',
    'chip.tuanbc':    'Week',
    'chip.thisweek':  'This Week',
  },
};

/** Raw state value → i18n key lookup (state raw values are Vietnamese, stored in GAS unchanged). */
const _STATE_KEY = {
  'Chưa bắt đầu':       'state.not-started',
  'Đang thực hiện':      'state.in-progress',
  'Hoàn thành chuẩn bị': 'state.prep-done',
  'Hoàn thành':          'state.completed',
  'Tạm dừng':            'state.on-hold',
  'Blocked':             'state.blocked',
};

/** Display-translated state label. Raw GAS value in → localized string out. */
function tState(raw) {
  if (!raw) return '–';
  const key = _STATE_KEY[raw];
  return key ? t(key) : raw;
}

/** Return translated string for current language. Falls back to Vietnamese, then the key itself. */
function t(key) {
  return (TRANSLATIONS[_lang] || TRANSLATIONS.vi)[key]
      || TRANSLATIONS.vi[key]
      || key;
}

/** Walk DOM: update elements with data-i18n, data-i18n-placeholder, data-i18n-title. */
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // Sync option elements (textContent for <option> elements)
  document.querySelectorAll('option[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
}

/** Switch language, persist preference, update UI. */
function setLang(lang) {
  if (lang !== 'vi' && lang !== 'en') return;
  _lang = lang;
  localStorage.setItem('shtd_lang', lang);
  document.documentElement.lang = lang;

  // Update toggle button active states
  const btnVI = document.getElementById('langVI');
  const btnEN = document.getElementById('langEN');
  if (btnVI) btnVI.classList.toggle('active', lang === 'vi');
  if (btnEN) btnEN.classList.toggle('active', lang === 'en');

  // Re-translate static DOM elements
  applyI18n();

  // Re-translate current page title (set dynamically by navigateTo)
  const activeItem = document.querySelector('.nav-item.active');
  const activeView = activeItem ? activeItem.dataset.view : 'dashboard';
  const pageTitle = document.getElementById('pageTitle');
  if (pageTitle && activeView) {
    pageTitle.textContent = t('page.' + activeView);
  }

  // Re-render active view so any t()-based dynamic content updates
  if (typeof renderAll === 'function') renderAll();
}
