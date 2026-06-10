# SESSION HANDOVER
**Date**: 2026-06-10 (Session 15 — Bug fixes + genId + Preset Tab Bar)
**Model**: Claude Sonnet 4.6
**Repo**: https://github.com/tuanttstb-debug/SHTD-Dashboard
**master HEAD**: `11d054a`
**main HEAD**: `45bf54a` — behind master by 4 commits; PO quản lý

---

## Branch Strategy (ENFORCED)

| Branch | Who pushes | Purpose |
|---|---|---|
| `master` | Developer / AI | Testing → local verify (Netlify hết credit) |
| `main` | **PO ONLY** via GitHub PR/commit | Production → GitHub Pages |

**Rule: AI/Claude KHÔNG push `main` trừ khi PO yêu cầu rõ ràng trong message.**

---

## Tasks Completed This Session

| # | Task | Commit | Tests |
|---|---|---|---|
| S15-01 | Sync check: master vs main — xác nhận source code giống nhau; local main cập nhật | — | — |
| S15-02 | Docs: đánh dấu Netlify hết credit | `8f139c0` | — |
| S15-03 | **Bug 1**: `fInit` dropdown hiển thị milestones → fix `!i.parentId` trong `initMap` | `bdc312f` | 15/15 ✅ |
| S15-04 | **Bug 2**: Task ID không auto-update → `fId` readonly + nút "Tạo lại" + navigation listeners | `bdc312f` | 15/15 ✅ |
| S15-05 | `handleSubmit` fix: dùng `origId` làm lookup key khi ID auto-đổi (tránh phantom task) | `bdc312f` | — |
| S15-06 | **genId mới**: format `{init}-{ms_short}-{seq}` (vd: `Econtract-001-M1-001`) | `45f2f39` | 18/18 ✅ |
| S15-07 | **Preset Tab Bar**: 4 tabs trên task manager — Đang làm / Tuần BC này / Quá hạn / Tất cả | `11d054a` | 20/20 ✅ |
| S15-08 | `navigateTo('tasks')` giờ gọi `renderTaskTable()` — bảng fresh khi quay lại màn hình | `11d054a` | — |

---

## Decisions Made

| Decision | Rationale |
|---|---|
| `fId` readonly, bỏ label `<span class="req">*</span>` | ID auto-gen, user không cần và không nên gõ trực tiếp |
| `fInit.change` → `autoGenId()` không guard origId (cả EDIT) | ID phải nhất quán với initiative; dùng `origId` làm lookup để tránh corrupt |
| `fMs.change` → `autoGenId()` chỉ ADD mode | EDIT mode: milestone không đủ context để thay ID cũ |
| genId BAU format: `{team}-{seq}` (thêm dấu `-`) | Nhất quán với format mới; trước đây là `Số001` nay là `Số-001` |
| Preset default = "Đang làm" | 600 task, đa số hoàn thành → default phải lọc noise |
| `clearFilters()` giữ preset | Preset là context view, không phải filter bar detail |
| Preset persist `localStorage['shtd_preset']` (key riêng) | Không đụng `shtd_v2` schema |

---

## Deployment State

| Env | Branch | HEAD | Status |
|---|---|---|---|
| Testing (Netlify) | `master` | `11d054a` | ❌ **Hết credit — không auto-deploy** |
| Production (GitHub Pages) | `main` | `45bf54a` | ✅ Live — PO quản lý (behind 4 commits) |
| GAS Backend | — | — | ✅ Code.gs + UserService.gs deployed; ⚠️ AiService.gs unconfirmed |

---

## Files Changed This Session

| File | Change |
|---|---|
| `assets/js/app.js` | L75: `&& !i.parentId` filter milestones khỏi initMap |
| `assets/js/helpers.js` | `genId(init, team, ms, extra)` — param ms mới, prefix logic 3 cases |
| `assets/js/crud.js` | `autoGenId()` + `cloneTask()` pass `fMs.value`; `handleSubmit` dùng `origId` làm lookup |
| `assets/js/ui/navigation.js` | Bỏ guard `origId` cho fInit/fTeam change; thêm fMs listener (ADD only); `navigateTo('tasks')` → `renderTaskTable()` |
| `assets/js/constants.js` | +`let activePreset` |
| `assets/js/views/tasks.js` | `_getThisWeekLabel`, `_applyPreset`, `setPreset`, `updatePresetCounts`, `_initPresetUI`; `getFiltered` + `renderTaskTable` updated |
| `assets/css/table.css` | +35 lines preset CSS |
| `index.html` | `fId` → readonly + "Tạo lại mã" btn; preset-bar HTML block |
| `verify_bug_fixes.mjs` | 18 tests cho Bug1 + Bug2 + genId |
| `verify_preset.mjs` | NEW — 20 tests cho preset tab bar |

---

## Regression Risks

| Risk | Severity | Detail |
|---|---|---|
| `genId` format thay đổi | 🟡 MEDIUM | BAU tasks: `Số001` → `Số-001`. Task cũ có ID `Số001` không bị đổi, nhưng khi clone/add sẽ gen `Số-002` (gap sequence). Chấp nhận được. |
| `fInit.change` auto-gen trong EDIT mode | 🟡 MEDIUM | Nếu user vô tình đổi initiative trong edit modal → ID đổi. `origId` vẫn giữ nên lưu đúng. Xem xét thêm toast warning. |
| Preset default "Đang làm" | 🟢 LOW | User quen với "Tất cả" cần click 1 lần; task cũ hoàn thành cần vào tab "Tất cả" |
| `navigateTo('tasks')` gọi `renderTaskTable()` | 🟢 LOW | Thêm 1 re-render mỗi lần navigate to tasks — negligible với 600 tasks |
| AI Chat GAS chưa verify | 🟡 MEDIUM | Không thay đổi session này, vẫn unconfirmed |
