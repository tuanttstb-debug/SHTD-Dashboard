'use strict';
/* ===== KPI DATA LAYER =====
   Cập nhật số liệu: QuangNN3 / DungLQ1
   Nguồn: EB050, XD_E2E.xlsx, reportEGP.xlsx, Lọc_15_04.csv,
          File_cấu_trúc_chung.xlsx (dữ liệu đến 03/06/2026)
   ======================================= */

const KPI_DATA = {

  /* --- Kỳ báo cáo --- */
  months:     ['T1', 'T2', 'T3', 'T4', 'T5', 'T6*'],
  monthsFull: ['Tháng 1/2026','Tháng 2/2026','Tháng 3/2026',
               'Tháng 4/2026','Tháng 5/2026','T6 (03/06)'],

  /* --- Sản phẩm (monthly breakdown) --- */
  products: {
    BL_Auto: {
      id:'BL_Auto', name:'Bảo lãnh Tự động', owner:'QuangNN3', group:'BL',
      kpiRate:40, kpiSLGD:null, hasRateKPI:true,
      biz:  [499, 302, 374, 573, 461, 29],
      bpm:  [0,   0,   0,   0,   0,   0],
      cust: [85,  58,  68,  98,  87,  31],
    },
    BL_E2E: {
      id:'BL_E2E', name:'Bảo lãnh E2E', owner:'QuangNN3', group:'BL',
      kpiRate:40, kpiSLGD:9000, hasRateKPI:true,
      biz:  [706, 429, 529, 812, 650, 41],
      bpm:  [2345,1249,1883,1951,1909,81],
      cust: [120, 88,  104, 160, 130, 19],
    },
    IDNES: {
      id:'IDNES', name:'IDNES (Bảo lãnh điện tử)', owner:'QuangNN3', group:'BL',
      kpiRate:null, kpiSLGD:null, hasRateKPI:false,
      biz:  [8,  5,  7,  11, 27, 3],
      bpm:  [0,  0,  0,  0,  0,  0],
      cust: [5,  4,  5,  6,  7,  2],
    },
    GN_Auto: {
      id:'GN_Auto', name:'Giải ngân Tự động', owner:'DungLQ1', group:'GN',
      kpiRate:null, kpiSLGD:null, hasRateKPI:false,
      biz:  [67,  47,  70,  106, 80,  10],
      bpm:  [0,   0,   0,   0,   0,   0],
      cust: [8,   6,   9,   12,  11,  3],
    },
    GN_E2E: {
      id:'GN_E2E', name:'Giải ngân E2E', owner:'DungLQ1', group:'GN',
      kpiRate:null, kpiSLGD:null, hasRateKPI:false,
      biz:  [407, 279, 407, 670, 547, 45],
      bpm:  [2354,1613,2353,3873,3159,258],
      cust: [52,  42,  54,  76,  63,  17],
    },
  },

  /* --- Chi nhánh (top 25 theo SLGD Biz) --- */
  branches: [
    { code:'040', name:'TPBANK THANG LONG',          zone:'north',   biz:611, bpm:154,  cust:29, rate:79.9, kpi:40 },
    { code:'063', name:'TPBANK SON TAY',              zone:'north',   biz:191, bpm:37,   cust:19, rate:83.8, kpi:40 },
    { code:'021', name:'TPBANK HONG HA',              zone:'north',   biz:94,  bpm:63,   cust:22, rate:59.9, kpi:40 },
    { code:'068', name:'TPBANK TAY HA NOI',           zone:'north',   biz:88,  bpm:126,  cust:7,  rate:41.1, kpi:40 },
    { code:'242', name:'TPBANK DO THANH 2',           zone:'south',   biz:87,  bpm:0,    cust:20, rate:100.0,kpi:40 },
    { code:'025', name:'TPBANK CONG HOA',             zone:'north',   biz:84,  bpm:14,   cust:6,  rate:85.7, kpi:40 },
    { code:'120', name:'TPBANK THANH XUAN',           zone:'north',   biz:72,  bpm:200,  cust:13, rate:26.5, kpi:40 },
    { code:'391', name:'TRUNG TAM KD CAN THO',        zone:'south',   biz:68,  bpm:94,   cust:15, rate:42.0, kpi:40 },
    { code:'313', name:'TPBANK VINH',                 zone:'central', biz:66,  bpm:68,   cust:19, rate:49.3, kpi:40 },
    { code:'001', name:'TPBANK BA DINH',              zone:'north',   biz:63,  bpm:31,   cust:15, rate:67.0, kpi:40 },
    { code:'049', name:'TPBANK BAC THANG LONG',       zone:'north',   biz:59,  bpm:43,   cust:2,  rate:57.8, kpi:40 },
    { code:'014', name:'TPBANK DONG DO',              zone:'north',   biz:58,  bpm:609,  cust:4,  rate:8.7,  kpi:40 },
    { code:'030', name:'TPBANK THANH TRI',            zone:'north',   biz:54,  bpm:50,   cust:14, rate:51.9, kpi:40 },
    { code:'056', name:'TPBANK HOAN KIEM',            zone:'north',   biz:54,  bpm:227,  cust:9,  rate:19.2, kpi:40 },
    { code:'250', name:'TPBANK HOC MON',              zone:'south',   biz:54,  bpm:0,    cust:12, rate:100.0,kpi:40 },
    { code:'057', name:'TPBANK HOANG MAI',            zone:'north',   biz:52,  bpm:1,    cust:12, rate:98.1, kpi:40 },
    { code:'207', name:'TPBANK TAY SAI GON',          zone:'south',   biz:51,  bpm:20,   cust:9,  rate:71.8, kpi:40 },
    { code:'035', name:'TPBANK DONG ANH',             zone:'north',   biz:50,  bpm:70,   cust:6,  rate:41.7, kpi:40 },
    { code:'042', name:'TPBANK GIA DINH',             zone:'south',   biz:50,  bpm:15,   cust:5,  rate:76.9, kpi:40 },
    { code:'046', name:'TRUNG TAM KD LE TRONG TAN',   zone:'north',   biz:50,  bpm:125,  cust:7,  rate:28.6, kpi:40 },
    { code:'350', name:'TPBANK HAI PHONG',            zone:'north',   biz:45,  bpm:210,  cust:11, rate:17.6, kpi:40 },
    { code:'276', name:'TPBANK BINH TAN',             zone:'south',   biz:43,  bpm:185,  cust:8,  rate:18.8, kpi:40 },
    { code:'241', name:'TPBANK TAN BINH',             zone:'south',   biz:40,  bpm:160,  cust:6,  rate:20.0, kpi:40 },
    { code:'115', name:'TPBANK DONG HA NOI',          zone:'north',   biz:38,  bpm:95,   cust:5,  rate:28.6, kpi:40 },
    { code:'380', name:'TPBANK DAK LAK',              zone:'central', biz:35,  bpm:145,  cust:7,  rate:19.4, kpi:40 },
  ],

  /* --- RM (Relationship Manager) --- */
  rms: [
    { name:'HueVT1',     customers:543, blol:48, gnol:4,  egp:6,  digital:58 },
    { name:'HoangNK3',   customers:487, blol:38, gnol:1,  egp:8,  digital:47 },
    { name:'KhanhBN2',   customers:461, blol:37, gnol:4,  egp:5,  digital:46 },
    { name:'AnhDT24',    customers:446, blol:55, gnol:8,  egp:8,  digital:71 },
    { name:'LinhNV12',   customers:426, blol:28, gnol:0,  egp:5,  digital:33 },
    { name:'HuongLT19',  customers:416, blol:51, gnol:1,  egp:24, digital:76 },
    { name:'LyNN1',      customers:415, blol:43, gnol:1,  egp:6,  digital:50 },
    { name:'CuongNV34',  customers:413, blol:29, gnol:0,  egp:2,  digital:31 },
    { name:'AnhLTP1',    customers:390, blol:31, gnol:8,  egp:7,  digital:46 },
    { name:'DuyenNLM',   customers:317, blol:36, gnol:7,  egp:2,  digital:45 },
    { name:'SonNT23',    customers:288, blol:15, gnol:1,  egp:5,  digital:21 },
    { name:'QuynhVN6',   customers:244, blol:10, gnol:8,  egp:4,  digital:22 },
    { name:'HuongPTT22', customers:229, blol:11, gnol:3,  egp:5,  digital:19 },
    { name:'QuynhNNY',   customers:59,  blol:3,  gnol:3,  egp:1,  digital:7  },
  ],

  /* --- Chỉ tiêu KPI 2026 --- */
  kpis: [
    {
      id:'slgd_bl', name:'2.1 – SLGD BL qua kênh TPBiz',
      kpi2026:20000, weight:'30%', unit:'GD', type:'count',
      ytdMonth:5, actual:5405, forecast:12972,
      note:'BL Auto (EB050): 2.238 GD + BL E2E (XD_E2E): 3.167 GD = 5.405 GD Biz Online',
    },
    {
      id:'rate_bl', name:'2.2 – Tỷ lệ GD BL qua kênh TPBiz',
      kpi2026:40, weight:'25%', unit:'%', type:'rate',
      ytdMonth:5, actual:36.0, forecast:37.0,
      note:'5.405 BIZ / 14.823 tổng GD BL = 36,0%',
    },
  ],

  /* --- Tổng hợp toàn kỳ --- */
  summary: {
    BL: {
      totalKH:621, prevKH:430, khGrowth:154,
      totalGD:14823, bizGD:5405, bpmGD:9418, rate:36.0,
    },
    GN: {
      totalKH:354, autoKH:49, e2eKH:305,
      totalGD:16344, bizGD:2735, bpmGD:13609, rate:16.7,
    },
    IDNES: {
      totalGD:61, uniqueCIF:9, branches:7,
    },
  },

  /* --- PTKD breakdown per channel (File_cấu_trúc_chung – 03/06/2026) --- */
  quangPTKD: [
    {ptkd:'HueVT1',     biz:693, bpm:1660, total:2353, rate:29.5},
    {ptkd:'HoangNK3',   biz:923, bpm:863,  total:1786, rate:51.7},
    {ptkd:'AnhDT24',    biz:831, bpm:600,  total:1431, rate:58.1},
    {ptkd:'KhanhBN2',   biz:436, bpm:981,  total:1417, rate:30.8},
    {ptkd:'LyNN1',      biz:482, bpm:718,  total:1200, rate:40.2},
    {ptkd:'LinhNV12',   biz:333, bpm:837,  total:1170, rate:28.5},
    {ptkd:'HuongLT19',  biz:340, bpm:730,  total:1070, rate:31.8},
    {ptkd:'DuyenNLM',   biz:408, bpm:577,  total:985,  rate:41.4},
    {ptkd:'AnhLTP1',    biz:276, bpm:682,  total:958,  rate:28.8},
    {ptkd:'CuongNV34',  biz:298, bpm:580,  total:878,  rate:33.9},
    {ptkd:'QuynhVN6',   biz:144, bpm:476,  total:620,  rate:23.2},
    {ptkd:'SonNT23',    biz:191, bpm:386,  total:577,  rate:33.1},
    {ptkd:'HuongPTT22', biz:87,  bpm:302,  total:389,  rate:22.4},
    {ptkd:'QuynhNNY',   biz:13,  bpm:26,   total:39,   rate:33.3},
  ],

  dungPTKD: [
    {ptkd:'HuongLT19',  biz:501, bpm:703,  total:1204, rate:41.6, oldBiz:51,  oldRate:6.8},
    {ptkd:'HueVT1',     biz:86,  bpm:1099, total:1185, rate:7.3,  oldBiz:6,   oldRate:0.5},
    {ptkd:'CuongNV34',  biz:242, bpm:901,  total:1143, rate:21.2, oldBiz:23,  oldRate:2.5},
    {ptkd:'AnhLTP1',    biz:143, bpm:940,  total:1083, rate:13.2, oldBiz:10,  oldRate:1.1},
    {ptkd:'SonNT23',    biz:233, bpm:778,  total:1011, rate:23.0, oldBiz:18,  oldRate:2.3},
    {ptkd:'HoangNK3',   biz:156, bpm:749,  total:905,  rate:17.2, oldBiz:22,  oldRate:2.9},
    {ptkd:'QuynhVN6',   biz:185, bpm:716,  total:901,  rate:20.5, oldBiz:16,  oldRate:2.2},
    {ptkd:'AnhDT24',    biz:275, bpm:589,  total:864,  rate:31.8, oldBiz:32,  oldRate:5.2},
    {ptkd:'LyNN1',      biz:159, bpm:679,  total:838,  rate:19.0, oldBiz:19,  oldRate:2.7},
    {ptkd:'LinhNV12',   biz:114, bpm:703,  total:817,  rate:14.0, oldBiz:22,  oldRate:3.0},
    {ptkd:'KhanhBN2',   biz:109, bpm:697,  total:806,  rate:13.5, oldBiz:9,   oldRate:1.3},
    {ptkd:'DuyenNLM',   biz:257, bpm:524,  total:781,  rate:32.9, oldBiz:27,  oldRate:4.9},
    {ptkd:'HuongPTT22', biz:231, bpm:363,  total:594,  rate:38.9, oldBiz:23,  oldRate:6.0},
    {ptkd:'QuynhNNY',   biz:137, bpm:56,   total:193,  rate:71.0, oldBiz:1,   oldRate:1.8},
  ],

  sheet2PTKD: [
    {ptkd:'DiepNTN',  count:384, ht:352}, {ptkd:'HoaDTV',   count:342, ht:318},
    {ptkd:'DuyenHMT', count:243, ht:231}, {ptkd:'VanNH9',   count:240, ht:226},
    {ptkd:'ThuyLT14', count:227, ht:215}, {ptkd:'TuBTN',    count:212, ht:198},
    {ptkd:'HungDM',   count:183, ht:172}, {ptkd:'ThoaNTK',  count:161, ht:154},
    {ptkd:'ThanhBL',  count:147, ht:141}, {ptkd:'ThuMTH',   count:145, ht:138},
    {ptkd:'HaVTH',    count:142, ht:135}, {ptkd:'AnNC',     count:141, ht:141},
    {ptkd:'HanhNT3',  count:141, ht:133}, {ptkd:'DucVQ1',   count:139, ht:132},
    {ptkd:'HienTTT',  count:139, ht:130},
  ],

  /* --- Aggregate totals (03/06/2026) --- */
  agg: {
    totalGD:    27244,
    bizTotal:    8326,
    bpmTotal:   18918,
    quangTotal: 14883, quangBiz: 5465, quangBpm: 9418,
    dungTotal:  12361, dungBiz:  2861, dungBpm:  9500,
    kpi21Target:20000, kpi21Actual: 5465, kpi21Forecast: 13116,
    kpi22Target:  40.0, kpi22Actual:  36.7,
    gnHT1: 6502, gnHT2: 3275, gnPending: 1,
  },
};

/* --- Helpers --- */
function kpiTotalBiz(id)  { return KPI_DATA.products[id].biz.reduce((a,b)=>a+b,0); }
function kpiTotalBpm(id)  { return KPI_DATA.products[id].bpm.reduce((a,b)=>a+b,0); }
function kpiDigitalRate(id) {
  const b=kpiTotalBiz(id), p=kpiTotalBpm(id);
  return b+p > 0 ? b/(b+p)*100 : 0;
}
function kpiMonthlyRate(id, m) {
  const p=KPI_DATA.products[id];
  const total=p.biz[m]+p.bpm[m];
  return total > 0 ? p.biz[m]/total*100 : 0;
}
function kpiStatusClass(actual, target) {
  const pct = actual / target * 100;
  if (pct >= 100) return 'ahead';
  if (pct >= 80)  return 'on-track';
  if (pct >= 60)  return 'behind';
  return 'critical';
}

/* Format number VN locale */
function fmtKN(n) { return Number(n).toLocaleString('vi-VN'); }

/* KPI chip badge (Bảo lãnh – KPI 40%) */
function kpiChip(rate, threshold) {
  threshold = threshold || 40;
  if (rate >= threshold) return '<span class="kpi-chip kpi-chip-green">Đạt KPI</span>';
  if (rate >= 30)        return '<span class="kpi-chip kpi-chip-gold">Cần tăng</span>';
  return '<span class="kpi-chip kpi-chip-red">Dưới KPI</span>';
}

/* KPI chip badge (Giải ngân – tham khảo 10%) */
function dungChip(rate) {
  if (rate >= 10) return '<span class="kpi-chip kpi-chip-green">Tốt</span>';
  if (rate >= 3)  return '<span class="kpi-chip kpi-chip-gold">Thấp</span>';
  return '<span class="kpi-chip kpi-chip-red">Rất thấp</span>';
}

/* Alert class for PTKD cards */
function kpiAlertClass(rate, threshold) {
  threshold = threshold || 40;
  return rate >= threshold ? 'alert-ok' : rate >= 30 ? 'alert-warning' : 'alert-critical';
}
function dungAlertClass(rate) {
  return rate >= 10 ? 'alert-ok' : rate >= 3 ? 'alert-warning' : 'alert-critical';
}

/* ── Live data override (loaded from File raw.xlsx or GG Sheet) ── */
let KPI_LIVE    = null;
let KPI_LIVE_TS = null;

function getKpiData() { return KPI_LIVE || KPI_DATA; }

function setKpiLive(parsed) {
  KPI_LIVE    = { ...KPI_DATA, ...parsed };
  KPI_LIVE_TS = new Date();
}
