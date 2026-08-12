// ── SHTD Dashboard – H2/2026 SEED PILOT (QuangNN3 & DungLQ1) ──
//
// Nạp dữ liệu KPI H2/2026 đã CHUẨN HOÁ của 2 member pilot vào 8 sheet H2_*.
// Nguồn: data/SAMPLE_QuangNN3_H2.md + data/SAMPLE_DungLQ1_H2.md
//        (mapping: data/04_MIGRATION_MAPPING.md).
//
// ▶ CÁCH DÙNG (chạy trong Apps Script editor — KHÔNG cần redeploy Web App):
//     1) h2SeedDryRun()   → chỉ log: đếm dòng + kiểm tra weight = 100%/member + P1 ≤ 3, KHÔNG ghi.
//     2) h2SeedCommit()   → ghi thật vào các sheet H2_* (idempotent: upsert theo ID cố định).
//     (tuỳ chọn) h2SeedClearPilot() → xoá sạch dòng của 2 member để seed lại từ đầu.
//
// GHI CHÚ:
//   • Idempotent: ID cố định theo thứ tự khai báo (OBJ-26-###, KPI-26-###, MS-26-###,
//     RISK-26-###, DEP-26-###, TRK-26-####, REV-26-###) → chạy lại = ghi đè, không nhân bản.
//     ID số cuối khớp lược đồ _h2GenId của client → member thêm mới sau seed không đụng.
//   • Giữ NGUYÊN placeholder "[cần đo T8]" / "↓ [target?]%" — member bổ sung số trước khi trình sếp.
//   • Ngày lưu ISO YYYY-MM-DD (chuẩn canonical toàn dự án).
//   • Dùng chung _h2Sheet() + H2_HEADERS trong H2Service.gs (cùng project GAS).
//   • Cờ SEED_TRACKING / SEED_REVIEWS bật/tắt việc tạo khung MonthlyTracking rỗng & Review rỗng.

// ── Cấu hình seed ──
var H2_SEED_YY        = '26';                 // hậu tố năm cho ID (khớp _h2GenId client)
var H2_SEED_MONTHS    = ['T8', 'T9', 'T10', 'T11', 'T12'];
var H2_SEED_TRACKING  = true;                 // tạo dòng MonthlyTracking rỗng cho mỗi KPI × mỗi tháng
var H2_SEED_REVIEWS   = true;                 // tạo khung Review (tự đánh giá) rỗng cho mỗi member
var H2_SEED_OBJ_START = '2026-08-01';
var H2_SEED_OBJ_DUE   = '2026-12-31';

/* ══════════════════════════════════════════════════════════════
   KẾ HOẠCH CHUẨN HOÁ (declarative). Builder tự cấp ID theo thứ tự duyệt.
   weight = % (số). Milestone month ∈ H2_SEED_MONTHS. risk/dep gắn theo KPI.
   ══════════════════════════════════════════════════════════════ */
function _h2SeedPlan() {
  return [
    // ════════════ QUANGNN3 (Obj 25% + 45% + 30% = 100%) ════════════
    { owner: 'QuangNN3', pillar: 'P2-CAP', priority: 'P2', weight: 25, category: 'D',
      name: 'Chuẩn hoá & nâng năng lực quản lý công việc',
      why: 'BLĐ nhận định kỹ năng setup mục tiêu/lập kế hoạch/tracking còn yếu → chuẩn hoá cách quản lý việc là nền tảng nâng năng lực team & bao quát BLOL sau go-live.',
      kpis: [
        { name: 'Quy trình 5 bước ban hành + áp dụng thử ≥1 việc thực tế', cat: 'D',
          baseline: 'chưa có', target: 'Ban hành + 1 pilot', unit: 'mốc', weight: 8,
          deadline: '2026-09-30', evidence: 'Quy trình ban hành; ảnh hệ thống theo dõi',
          milestones: [
            { month: 'T9', name: 'Soạn & lấy ý kiến quy trình 5 bước', due: '2026-09-30' },
            { month: 'T9', name: 'Ban hành chính thức + pilot 1 việc',  due: '2026-09-30' }
          ] },
        { name: 'Tỷ lệ đầu việc quan trọng theo dõi theo quy trình mới', cat: 'D',
          baseline: '0%', target: '100%', unit: '%', weight: 10,
          deadline: '2026-12-31', evidence: 'Hệ thống theo dõi đầu việc',
          milestones: [ { month: 'T12', name: '100% đầu việc quan trọng vào quy trình', due: '2026-12-31' } ],
          risks: [ { risk: 'Quy trình không được tuân thủ', mitigation: 'Teamlead review hàng tháng' } ] },
        { name: 'BLOL có báo cáo định kỳ đủ 5 nội dung (dùng/vận hành/dữ liệu/lỗi/cải tiến)', cat: 'D',
          baseline: '0/5', target: '5/5 nội dung, định kỳ', unit: 'nội dung', weight: 7,
          deadline: '2026-12-31', evidence: 'Báo cáo BLOL định kỳ',
          milestones: [ { month: 'T12', name: 'Báo cáo theo dõi BLOL định kỳ đủ 5 nội dung', due: '2026-12-31' } ] }
      ] },

    { owner: 'QuangNN3', pillar: 'P1-BIZ', priority: 'P1', weight: 45, category: 'A',
      name: 'Hoàn thiện & mở rộng số hoá BLOL',
      why: 'BLOL là sản phẩm trọng tâm; hoàn thiện nghiệp vụ còn thiếu + gộp hệ thống dùng chung tạo giá trị vận hành và giảm rủi ro.',
      kpis: [
        { name: 'Phương án hệ thống tín dụng dùng chung được duyệt', cat: 'B',
          baseline: '', target: 'Duyệt', unit: 'mốc', weight: 8,
          deadline: '2026-09-30', evidence: 'Biên bản duyệt',
          milestones: [ { month: 'T9', name: 'Thiết kế hệ thống dùng chung được duyệt (đồng bộ nâng cấp DCB)', due: '2026-09-30' } ],
          risks: [ { risk: 'Phụ thuộc tiến độ DCB → chậm gộp hệ thống', mitigation: 'Bám lịch DCB, phương án dự phòng độc lập' } ],
          deps:  [ { type: 'Dự án DCB (nâng cấp song song)', required: '2026-09-30', note: 'Cần mốc T8–9' } ] },
        { name: '2 nghiệp vụ (giải toả tạm ứng, quản lý hồ sơ sau phát hành) go-live + UAT pass', cat: 'A',
          baseline: '', target: '2/2 go-live, UAT ≥95%', unit: 'nghiệp vụ / %', weight: 20,
          deadline: '2026-11-30', evidence: 'Biên bản go-live; UAT report',
          milestones: [ { month: 'T11', name: '2 nghiệp vụ hoàn thiện → UAT → go-live', due: '2026-11-30' } ] },
        { name: 'Đề xuất giải pháp AI đọc/kiểm thư bảo lãnh + cảnh báo giải toả bất hợp lý', cat: 'C',
          baseline: '', target: 'Đề xuất được duyệt', unit: 'mốc', weight: 9,
          deadline: '2026-12-31', evidence: 'Tờ trình giải pháp',
          milestones: [ { month: 'T12', name: 'Nghiên cứu AI thư BL → đề xuất giải pháp', due: '2026-12-31' } ] },
        { name: 'Đề xuất kế hoạch mở rộng 2027 trình BLĐ', cat: 'B',
          baseline: '', target: 'Trình + duyệt', unit: 'mốc', weight: 8,
          deadline: '2026-12-31', evidence: 'Tờ trình 2027',
          milestones: [ { month: 'T12', name: 'Đề xuất kế hoạch 2027', due: '2026-12-31' } ] },
        { name: '(khuyến nghị) TAT xử lý bảo lãnh sau go-live', cat: 'A',
          baseline: '[cần đo T8]', target: '↓ [target?]%', unit: 'ngày', weight: 0,
          deadline: '2026-12-31', evidence: 'Bảng đo TAT trước/sau (gộp điểm vào KPI 2 nghiệp vụ)' }
      ] },

    { owner: 'QuangNN3', pillar: 'P3-AI', priority: 'P1', weight: 30, category: 'C',
      name: 'AI hoá công việc tạo năng suất',
      why: 'AI Transformation là trọng tâm Trung tâm; Quang tiên phong tạo công cụ + nhân rộng. Chuỗi: Use AI → công cụ → ↓ thời gian → nhân rộng.',
      kpis: [
        { name: '(điều kiện/Action) Hoàn thành 2 khoá (Colab/Python; công cụ AI) đúng hạn 11/10', cat: 'C',
          baseline: '', target: '2/2 đúng hạn', unit: 'khoá', weight: 6,
          deadline: '2026-10-11', evidence: 'Chứng nhận/khoá học',
          milestones: [
            { month: 'T9',  name: 'Học Colab/Python (xử lý dữ liệu/báo cáo)', due: '2026-09-20' },
            { month: 'T10', name: 'Học công cụ AI tổng hợp/phân tích',        due: '2026-10-11' }
          ] },
        { name: 'Số công cụ/sản phẩm AI vào dùng thực tế', cat: 'C',
          baseline: '0', target: '≥2', unit: 'công cụ', weight: 12,
          deadline: '2026-11-30', evidence: 'Link công cụ',
          milestones: [ { month: 'T11', name: '≥2 công cụ (tự động tổng hợp báo cáo; phân tích BLOL) vào dùng', due: '2026-11-30' } ],
          risks: [ { risk: 'Công cụ không được adoption → chỉ là demo', mitigation: 'Gắn công cụ vào quy trình thật (Obj Capability)' } ],
          deps:  [ { type: 'Dữ liệu BLOL (từ Obj số hoá BLOL)', required: '', note: 'Nguồn dữ liệu để công cụ hoạt động' } ] },
        { name: 'Giảm thời gian xử lý công việc sau khi áp dụng công cụ', cat: 'C',
          baseline: '[cần đo T8]', target: '↓ ≥30%', unit: '%', weight: 7,
          deadline: '2026-12-31', evidence: 'Bảng đo thời gian trước/sau',
          milestones: [ { month: 'T12', name: 'Đo thời gian trước/sau → xác nhận ↓ ≥30%', due: '2026-12-31' } ] },
        { name: 'Chia sẻ & nhân rộng: buổi chia sẻ + tài liệu + công cụ nhân rộng', cat: 'C',
          baseline: '0', target: '2 buổi + 1 tài liệu + 1 công cụ nhân rộng', unit: '—', weight: 5,
          deadline: '2026-12-31', evidence: 'Biên bản chia sẻ; tài liệu HD',
          milestones: [ { month: 'T12', name: '2 buổi chia sẻ + 1 bộ tài liệu + 1 công cụ nhân rộng', due: '2026-12-31' } ] }
      ] },

    // ════════════ DUNGLQ1 (25+25+15+20+15 = 100%) ════════════
    { owner: 'DungLQ1', pillar: 'P1-BIZ', priority: 'P1', weight: 25, category: 'B',
      name: 'Giao GNOL E2E đúng lộ trình',
      why: 'GNOL E2E là dự án lõi số hóa tín dụng; go-live GĐ2 & chuẩn bị GĐ3/4 quyết định tiến độ roadmap.',
      kpis: [
        { name: 'UAT GĐ2 pass + Go-live đúng phạm vi', cat: 'B',
          baseline: '', target: 'UAT ≥95% pass, Go-live T9–10', unit: '% / mốc', weight: 12,
          deadline: '2026-10-31', evidence: 'UAT report; biên bản go-live',
          milestones: [ { month: 'T10', name: 'UAT + Go-live GĐ2', due: '2026-10-31' } ],
          risks: [ { risk: 'Defect UAT kéo dài → trễ go-live', mitigation: 'UAT sớm, ưu tiên defect P1' } ],
          deps:  [ { type: 'IT delivery GĐ2', required: '', note: '' } ] },
        { name: 'BRD + tài liệu phân tích GĐ3 được duyệt', cat: 'B',
          baseline: '', target: 'Duyệt', unit: 'mốc', weight: 8,
          deadline: '2026-12-31', evidence: 'BRD duyệt',
          milestones: [ { month: 'T12', name: 'BRD GĐ3 được duyệt', due: '2026-12-31' } ] },
        { name: 'Báo cáo khả thi GĐ4 có phương án đề xuất', cat: 'B',
          baseline: '', target: 'Hoàn thành + đề xuất', unit: 'mốc', weight: 5,
          deadline: '2026-12-31', evidence: 'Báo cáo khả thi GĐ4',
          milestones: [ { month: 'T12', name: 'Báo cáo khả thi GĐ4', due: '2026-12-31' } ] }
      ] },

    { owner: 'DungLQ1', pillar: 'P1-BIZ', priority: 'P1', weight: 25, category: 'A',
      name: 'Nâng cấp & tăng adoption GNOL tự động',
      why: 'Giảm rủi ro thao túng KH (chỉ đạo TGĐ) + mở rộng số KH dùng sản phẩm = giá trị kinh doanh trực tiếp.',
      kpis: [
        { name: '3 nội dung go-live: (1) AI kiểm hóa đơn/nội dung CT, (2) trustlist KH/đối tác mới, (3) điều chỉnh hạn mức + loại hình', cat: 'A',
          baseline: '', target: '3/3 go-live', unit: 'nội dung', weight: 13,
          deadline: '2026-10-31', evidence: 'Biên bản go-live',
          milestones: [ { month: 'T10', name: 'Hoàn thiện 3 nội dung → go-live', due: '2026-10-31' } ] },
        { name: 'Số KH dùng GNOL tự động tăng', cat: 'A',
          baseline: '[cần đo T8]', target: '↑ [target?] (đề xuất +[x]%)', unit: 'KH', weight: 12,
          deadline: '2026-12-31', evidence: 'Dashboard số KH trước/sau',
          milestones: [ { month: 'T12', name: 'Phối hợp SME MASS đẩy adoption', due: '2026-12-31' } ],
          risks: [ { risk: 'Adoption thấp nếu thiếu phối hợp SME MASS', mitigation: 'Chốt kế hoạch chung sớm' } ],
          deps:  [ { type: 'Dự án SME MASS', required: '', note: 'Phối hợp đẩy adoption' },
                   { type: 'IT', required: '', note: '' } ] }
      ] },

    { owner: 'DungLQ1', pillar: 'P1-BIZ', priority: 'P2', weight: 15, category: 'B',
      name: 'Quy hoạch tín dụng thống nhất trên BIZ/BPM + SLA',
      why: 'Gộp giải ngân/bảo lãnh về một hệ thống dùng chung hành trình/dữ liệu/hồ sơ + đo SLA = nền tảng mở rộng bền vững.',
      kpis: [
        { name: 'Phương án quy hoạch dùng chung được duyệt (đồng bộ nâng cấp DCB)', cat: 'B',
          baseline: '', target: 'Duyệt', unit: 'mốc', weight: 6,
          deadline: '2026-09-30', evidence: 'Phương án duyệt',
          milestones: [ { month: 'T9', name: 'Phương án quy hoạch được duyệt', due: '2026-09-30' } ],
          risks: [ { risk: 'Phụ thuộc nâng cấp DCB → trễ', mitigation: 'Bám lịch DCB' } ],
          deps:  [ { type: 'Dự án DCB (nâng cấp song song)', required: '2026-09-30', note: 'Cần mốc T8–9' },
                   { type: 'Dự án BLOL', required: '', note: '' } ] },
        { name: 'Hệ thống báo cáo SLA (GNOL GĐ2) go-live; đánh giá cho BLOL GĐ5', cat: 'B',
          baseline: '', target: 'SLA go-live', unit: 'mốc', weight: 6,
          deadline: '2026-11-30', evidence: 'SLA report live',
          milestones: [ { month: 'T11', name: 'Hệ thống SLA go-live', due: '2026-11-30' } ] },
        { name: 'Đề xuất kế hoạch ưu tiên 2027 trình BLĐ', cat: 'B',
          baseline: '', target: 'Trình + duyệt', unit: 'mốc', weight: 3,
          deadline: '2026-12-31', evidence: 'Tờ trình 2027',
          milestones: [ { month: 'T12', name: 'Đề xuất kế hoạch 2027', due: '2026-12-31' } ] }
      ] },

    { owner: 'DungLQ1', pillar: 'P3-AI', priority: 'P2', weight: 20, category: 'C',
      name: 'AI hoá báo cáo & phân tích',
      why: 'Dùng AI xây dashboard theo dõi số liệu + công cụ tổng hợp/phân tích → quyết định nhanh & chính xác hơn (business value).',
      kpis: [
        { name: 'Dashboard/bảng theo dõi số liệu vào dùng thực tế', cat: 'C',
          baseline: '0', target: '≥1', unit: 'công cụ', weight: 8,
          deadline: '2026-09-30', evidence: 'Link dashboard',
          milestones: [ { month: 'T9', name: '≥1 dashboard vào dùng', due: '2026-09-30' } ],
          deps: [ { type: 'Nguồn dữ liệu GNOL/BLOL', required: '', note: '' } ] },
        { name: 'Công cụ AI hỗ trợ tổng hợp/phân tích dữ liệu vào dùng', cat: 'C',
          baseline: '0', target: '≥1', unit: 'công cụ', weight: 8,
          deadline: '2026-11-30', evidence: 'Link công cụ',
          milestones: [ { month: 'T11', name: '≥1 công cụ AI vào dùng', due: '2026-11-30' } ],
          risks: [ { risk: 'Công cụ không được adoption', mitigation: 'Gắn vào báo cáo định kỳ thật' } ] },
        { name: '(khuyến nghị) Giảm thời gian tổng hợp báo cáo chuyển đổi', cat: 'C',
          baseline: '[cần đo T8]', target: '↓ [target?]%', unit: '%', weight: 4,
          deadline: '2026-12-31', evidence: 'Bảng đo thời gian',
          milestones: [ { month: 'T12', name: 'Đo hiệu quả năng suất', due: '2026-12-31' } ] }
      ] },

    { owner: 'DungLQ1', pillar: 'P2-CAP', priority: 'P2', weight: 15, category: 'D',
      name: 'Năng lực & vận hành hỗ trợ',
      why: 'Nâng năng lực quản trị dự án (PMI-CPA) + duy trì các CR/dự án hỗ trợ đúng hạn để không gián đoạn Trung tâm.',
      kpis: [
        { name: 'Đạt chứng chỉ PMI-CPA', cat: 'D',
          baseline: 'chưa có', target: 'Đạt', unit: 'cert', weight: 8,
          deadline: '2026-11-30', evidence: 'Chứng chỉ PMI-CPA',
          milestones: [ { month: 'T11', name: 'Học + thi PMI-CPA', due: '2026-11-30' } ] },
        { name: 'BAU — CR & luồng nghiệp vụ FlowX đúng hạn', cat: 'B',
          baseline: '', target: '100% đúng hạn cam kết', unit: '%', weight: 3,
          deadline: '2026-09-30', evidence: 'CR log',
          milestones: [ { month: 'T9', name: 'CR FlowX đúng hạn', due: '2026-09-30' } ] },
        { name: 'BAU — Sale Agent: báo cáo tổng hợp khảo sát + quyết định rõ (tiếp tục/điều chỉnh)', cat: 'B',
          baseline: '', target: 'Quyết định được duyệt', unit: 'mốc', weight: 2,
          deadline: '2026-09-30', evidence: 'Báo cáo Sale Agent',
          milestones: [ { month: 'T9', name: 'Quyết định Sale Agent được duyệt', due: '2026-09-30' } ] },
        { name: 'BAU — SCF sẵn sàng phương án khi có nguồn lực IT', cat: 'B',
          baseline: '', target: 'Sẵn sàng', unit: 'mốc', weight: 2,
          deadline: '2026-12-31', evidence: 'Phương án SCF',
          milestones: [ { month: 'T12', name: 'SCF sẵn sàng khi có IT', due: '' } ],
          risks: [ { risk: 'SCF vô thời hạn do IT', mitigation: 'Chuẩn bị sẵn, escalate khi IT có nguồn lực' } ],
          deps:  [ { type: 'Nguồn lực IT (SCF)', required: '', note: 'Chưa có mốc — khai báo & theo dõi' } ] }
      ] }
  ];
}

// Ghi chú TÁCH RIÊNG (không tính điểm KPI) — chỉ log để nhắc, KHÔNG ghi vào H2.
var H2_SEED_PERSONAL_NOTE =
  'DungLQ1 — Mục tiêu cá nhân (KHÔNG tính điểm KPI): chạy 400km; đọc 14 sách (T8–T12). Theo dõi riêng.';

/* ── ID helpers ── */
function _seedId(prefix, n, pad) { return prefix + '-' + H2_SEED_YY + '-' + String(n).padStart(pad || 3, '0'); }
function _seedQuarter(month)     { return (month === 'T8' || month === 'T9') ? 'Q3' : 'Q4'; }

/* ══════════════════════════════════════════════════════════════
   BUILD: duyệt plan → sinh rows (array theo đúng H2_HEADERS) cho từng sheet.
   Trả về { rows:{sheet->[][]}, stats, warnings }.
   ══════════════════════════════════════════════════════════════ */
function _h2SeedBuild() {
  var plan = _h2SeedPlan();
  var out  = { objectives: [], kpis: [], milestones: [], tracking: [], risks: [], deps: [], reviews: [] };
  var n = { obj: 0, kpi: 0, ms: 0, risk: 0, dep: 0, trk: 0, rev: 0 };

  var weightByOwner = {}, p1ByOwner = {}, objByOwner = {}, kpiWByObj = {};
  var warnings = [];

  plan.forEach(function (o) {
    n.obj++;
    var objId = _seedId('OBJ', n.obj);
    weightByOwner[o.owner] = (weightByOwner[o.owner] || 0) + Number(o.weight || 0);
    objByOwner[o.owner]    = (objByOwner[o.owner] || 0) + 1;
    if (String(o.priority).toUpperCase() === 'P1') p1ByOwner[o.owner] = (p1ByOwner[o.owner] || 0) + 1;

    // H2_Objectives: ID,Type,ParentID,Pillar,ObjectiveName,Why,Owner,Priority,Weight,Category,Status,StartDate,DueDate,CreatedBy
    out.objectives.push([objId, 'member', '', o.pillar, o.name, o.why || '', o.owner,
      o.priority, o.weight, o.category, 'Chưa bắt đầu', H2_SEED_OBJ_START, H2_SEED_OBJ_DUE, o.owner]);

    var kpiWSum = 0;
    (o.kpis || []).forEach(function (k) {
      n.kpi++;
      var kpiId = _seedId('KPI', n.kpi);
      kpiWSum += Number(k.weight || 0);

      // H2_KPIs: ID,ObjectiveID,KpiName,KpiType,Baseline,Target,Unit,Weight,Deadline,Status,Evidence,Owner
      out.kpis.push([kpiId, objId, k.name, k.cat || o.category, k.baseline || '', k.target || '',
        k.unit || '', k.weight, k.deadline || '', 'Chưa bắt đầu', k.evidence || '', o.owner]);

      (k.milestones || []).forEach(function (m) {
        n.ms++;
        // H2_Milestones: ID,KpiID,Month,Quarter,MilestoneName,DueDate,Owner,Status,RAG,TaskRef
        out.milestones.push([_seedId('MS', n.ms), kpiId, m.month, _seedQuarter(m.month),
          m.name, m.due || '', o.owner, 'Chưa bắt đầu', '', '']);
      });

      (k.risks || []).forEach(function (r) {
        n.risk++;
        // H2_Risks: ID,KpiID,Risk,Impact,Probability,Mitigation,Owner,Status
        out.risks.push([_seedId('RISK', n.risk), kpiId, r.risk, r.impact || '', r.prob || '',
          r.mitigation || '', o.owner, 'Open']);
      });

      (k.deps || []).forEach(function (d) {
        n.dep++;
        // H2_Dependencies: ID,KpiID,DependencyType,DependencyOwner,RequiredDate,Status,Note
        out.deps.push([_seedId('DEP', n.dep), kpiId, d.type, d.owner || '', d.required || '',
          'Pending', d.note || '']);
      });

      if (H2_SEED_TRACKING) {
        H2_SEED_MONTHS.forEach(function (mon) {
          n.trk++;
          // H2_MonthlyTracking: ID,Month,KpiID,Member,Target,Actual,Progress,RAG,Issue,NextAction,SupportNeeded,UpdatedAt
          out.tracking.push([_seedId('TRK', n.trk, 4), mon, kpiId, o.owner, k.target || '',
            '', '', '', '', '', '', '']);
        });
      }
    });

    kpiWByObj[objId] = { owner: o.owner, name: o.name, objW: Number(o.weight || 0), kpiW: kpiWSum };
    if (Math.abs(kpiWSum - Number(o.weight || 0)) > 0.001) {
      warnings.push('⚠ ' + o.owner + ' / ' + o.name + ': tổng weight KPI = ' + kpiWSum +
        '% ≠ weight Objective ' + o.weight + '%');
    }
  });

  if (H2_SEED_REVIEWS) {
    var members = [];
    plan.forEach(function (o) { if (members.indexOf(o.owner) < 0) members.push(o.owner); });
    members.forEach(function (mem) {
      n.rev++;
      // H2_Reviews: ID,Member,ReviewType,Period,Q_commit..Q_adjust(8),Cap_Goal..Cap_Exec(8),CreatedAt
      out.reviews.push([_seedId('REV', n.rev), mem, 'H1', 'H1/2026',
        '', '', '', '', '', '', '', '',   // 8 Q_*
        '', '', '', '', '', '', '', '',   // 8 Cap_*
        '']);
    });
  }

  // Kiểm tra ràng buộc H2 (đọc từ H2_Config nếu có; else default 5 / 3)
  var maxObj = Number(_h2SeedCfg('max_objectives', 5));
  var maxP1  = Number(_h2SeedCfg('max_p1', 3));
  Object.keys(weightByOwner).forEach(function (m) {
    if (Math.abs(weightByOwner[m] - 100) > 0.001) warnings.push('⚠ ' + m + ': tổng weight Objective = ' + weightByOwner[m] + '% ≠ 100%');
    if ((objByOwner[m] || 0) > maxObj) warnings.push('⚠ ' + m + ': ' + objByOwner[m] + ' Objective > trần ' + maxObj);
    if ((p1ByOwner[m] || 0) > maxP1)   warnings.push('⚠ ' + m + ': ' + (p1ByOwner[m] || 0) + ' P1 > trần ' + maxP1);
  });

  return {
    rows: out,
    stats: {
      objectives: out.objectives.length, kpis: out.kpis.length, milestones: out.milestones.length,
      risks: out.risks.length, deps: out.deps.length, tracking: out.tracking.length, reviews: out.reviews.length,
      weightByOwner: weightByOwner, objByOwner: objByOwner, p1ByOwner: p1ByOwner
    },
    warnings: warnings
  };
}

/** Đọc 1 key H2_Config an toàn (không lỗi nếu sheet/kỳ chưa có). */
function _h2SeedCfg(key, dflt) {
  try {
    var grid = _h2Read('H2_Config');   // H2Service.gs
    for (var i = 1; i < grid.length; i++) {
      if (String(grid[i][0]).trim() === key && grid[i][1] !== '' && grid[i][1] != null) return grid[i][1];
    }
  } catch (e) {}
  return dflt;
}

/* ── Map sheet key (out.*) → tên sheet H2_* thật ── */
var H2_SEED_SHEETMAP = {
  objectives: 'H2_Objectives', kpis: 'H2_KPIs', milestones: 'H2_Milestones',
  tracking: 'H2_MonthlyTracking', risks: 'H2_Risks', deps: 'H2_Dependencies', reviews: 'H2_Reviews'
};

/**
 * Ghi idempotent 1 sheet: dòng đã có ID → ghi đè tại chỗ; ID mới → gom append 1 lần.
 * Trả { updated, appended }.
 */
function _h2SeedWrite(sheetName, rows) {
  if (!rows || !rows.length) return { updated: 0, appended: 0 };
  var sheet = _h2Sheet(sheetName);                 // H2Service.gs — tạo + header nếu chưa có
  var width = H2_HEADERS[sheetName].length;
  var lastRow = sheet.getLastRow();

  var idMap = {};
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) idMap[String(ids[i][0]).trim()] = i + 2;
  }

  var appends = [], updated = 0;
  rows.forEach(function (r) {
    var row = r.slice(0, width);
    while (row.length < width) row.push('');
    var id = String(row[0]).trim();
    if (idMap[id]) { sheet.getRange(idMap[id], 1, 1, width).setValues([row]); updated++; }
    else appends.push(row);
  });
  if (appends.length) sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, width).setValues(appends);
  SpreadsheetApp.flush();
  return { updated: updated, appended: appends.length };
}

/* ══════════════════════════════════════════════════════════════
   ENTRY POINTS
   ══════════════════════════════════════════════════════════════ */

/** DRY-RUN: chỉ log đếm dòng + validate, KHÔNG ghi. */
function h2SeedDryRun() {
  var b = _h2SeedBuild();
  Logger.log('════ H2 SEED PILOT — DRY RUN (KHÔNG ghi) ════');
  Logger.log('Objectives : %s', b.stats.objectives);
  Logger.log('KPIs       : %s', b.stats.kpis);
  Logger.log('Milestones : %s', b.stats.milestones);
  Logger.log('Risks      : %s', b.stats.risks);
  Logger.log('Deps       : %s', b.stats.deps);
  Logger.log('Tracking   : %s (SEED_TRACKING=%s)', b.stats.tracking, H2_SEED_TRACKING);
  Logger.log('Reviews    : %s (SEED_REVIEWS=%s)', b.stats.reviews, H2_SEED_REVIEWS);
  Object.keys(b.stats.weightByOwner).forEach(function (m) {
    Logger.log('• %s: weight Σ=%s%% · %s Objective · %s P1',
      m, b.stats.weightByOwner[m], b.stats.objByOwner[m], b.stats.p1ByOwner[m] || 0);
  });
  if (b.warnings.length) { Logger.log('── CẢNH BÁO ──'); b.warnings.forEach(function (w) { Logger.log(w); }); }
  else Logger.log('✅ Không có cảnh báo (weight = 100%/member, P1 ≤ trần, KPI khớp Objective).');
  Logger.log('Ghi chú: %s', H2_SEED_PERSONAL_NOTE);
  Logger.log('→ OK thì chạy h2SeedCommit() để ghi thật.');
  return b.stats;
}

/** COMMIT: ghi thật (idempotent) vào các sheet H2_*. */
function h2SeedCommit() {
  var b = _h2SeedBuild();
  if (b.warnings.length) {
    Logger.log('⛔ Có %s cảnh báo — dừng để rà lại. Chạy h2SeedDryRun() xem chi tiết.', b.warnings.length);
    b.warnings.forEach(function (w) { Logger.log(w); });
    throw new Error('H2 seed có cảnh báo (weight/P1/Objective) — sửa plan trước khi commit.');
  }
  Logger.log('════ H2 SEED PILOT — COMMIT ════');
  // Thứ tự: cha trước con (không bắt buộc nhưng gọn khi soi sheet).
  var order = ['objectives', 'kpis', 'milestones', 'risks', 'deps', 'tracking', 'reviews'];
  order.forEach(function (key) {
    if (key === 'tracking' && !H2_SEED_TRACKING) return;
    if (key === 'reviews'  && !H2_SEED_REVIEWS)  return;
    var sheetName = H2_SEED_SHEETMAP[key];
    var res = _h2SeedWrite(sheetName, b.rows[key]);
    Logger.log('%s: +%s mới, %s ghi đè', sheetName, res.appended, res.updated);
  });
  Logger.log('✅ HOÀN TẤT. Reload app (đã đăng nhập) → menu "Quản trị H2" thấy KPI của QuangNN3 & DungLQ1.');
  Logger.log('Ghi chú tách riêng: %s', H2_SEED_PERSONAL_NOTE);
}

/**
 * (Tuỳ chọn) Xoá sạch mọi dòng của 2 member pilot khỏi 7 sheet H2 (giữ header + dòng người khác).
 * Dùng khi muốn seed lại từ đầu sau khi sửa plan (tránh sót dòng cũ). KHÔNG đụng H2_Config.
 */
function h2SeedClearPilot() {
  var owners = ['quangnn3', 'dunglq1'];               // so khớp lowercase
  var isPilot = function (v) { return owners.indexOf(String(v || '').trim().toLowerCase()) >= 0; };

  // Cột "chủ sở hữu" (1-based) để lọc; deps lọc theo KpiID thuộc pilot.
  var ownerCol = { 'H2_Objectives': 7, 'H2_KPIs': 12, 'H2_Milestones': 7, 'H2_MonthlyTracking': 4, 'H2_Risks': 7, 'H2_Reviews': 2 };

  // Trước tiên gom tập KpiID của pilot (để lọc H2_Dependencies không có cột owner).
  var pilotKpi = {};
  (function () {
    var grid = _h2Read('H2_KPIs');
    for (var i = 1; i < grid.length; i++) if (isPilot(grid[i][11])) pilotKpi[String(grid[i][0]).trim()] = true;
  })();

  var total = 0;
  Object.keys(ownerCol).forEach(function (sheetName) {
    total += _h2SeedRewriteKeep(sheetName, function (row) { return !isPilot(row[ownerCol[sheetName] - 1]); });
  });
  // Dependencies: giữ dòng có KpiID KHÔNG thuộc pilot.
  total += _h2SeedRewriteKeep('H2_Dependencies', function (row) { return !pilotKpi[String(row[1]).trim()]; });

  Logger.log('🧹 Đã xoá %s dòng pilot (QuangNN3 + DungLQ1) khỏi các sheet H2. Header giữ nguyên.', total);
}

/** Ghi lại sheet chỉ giữ các dòng thoả keepFn(row). Trả số dòng đã xoá. */
function _h2SeedRewriteKeep(sheetName, keepFn) {
  var sheet = _h2Sheet(sheetName);
  var lastRow = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (lastRow < 2) return 0;
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var kept = data.filter(keepFn);
  var removed = data.length - kept.length;
  if (removed === 0) return 0;
  sheet.getRange(2, 1, data.length, lastCol).clearContent();
  if (kept.length) sheet.getRange(2, 1, kept.length, lastCol).setValues(kept);
  SpreadsheetApp.flush();
  return removed;
}
