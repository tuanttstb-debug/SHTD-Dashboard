# GITHUB WORKFLOW — SHTD Dashboard

## Repository

```
https://github.com/tuanttstb-debug/SHTD-Dashboard
Branch: main
```

---

## Recommended Branch Strategy

```
main          ← Production (always deployable, protected)
develop       ← Integration branch (merges here first)
feature/*     ← New features (branch off develop)
fix/*         ← Bug fixes (branch off develop)
hotfix/*      ← Critical production fixes (branch off main)
docs/*        ← Documentation only
refactor/*    ← Refactoring (no behavior change)
```

### Rules
- `main` should only receive merges from `develop` (via PR) or `hotfix/*`
- All PRs require at least 1 approval before merge
- Squash merge for `feature/*` and `fix/*`
- Merge commit for `hotfix/*` (preserves history)
- Delete branch after merge

---

## Commit Convention (Conventional Commits)

```
<type>(<scope>): <subject>

[optional body]

[optional footer: Co-Authored-By, Fixes #issue]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change with no behavior change |
| `docs` | Documentation only |
| `style` | CSS/formatting only (no logic change) |
| `chore` | Build, dependencies, config |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

### Scopes

| Scope | Area |
|---|---|
| `dashboard` | Dashboard view |
| `tasks` | Task list view |
| `gantt` | Gantt view |
| `perf` | Performance view |
| `quickview` | Quick View Panel |
| `sync` | Google Sheets sync |
| `import` | Excel import |
| `export` | Excel export |
| `crud` | Task create/edit/delete |
| `css` | Styles |
| `gas` | Google Apps Script backend |
| `docs` | Documentation |
| `config` | Configuration |

### Examples

```
feat(quickview): add topbar Quick View button to rendered HTML
fix(export): apply v6.2 taskToRow with dd-mmm-yy date format
fix(export): apply v6.2 taskToRow with "75%" progress format
fix(css): remove orphaned HTML from inside <style> block (lines 154-178)
refactor(css): extract design tokens to assets/css/tokens.css
docs: add GITHUB_WORKFLOW.md
chore(gas): add Apps Script backend source to /backend/
```

---

## Pull Request Convention

### PR Title
Keep under 70 characters. Must follow commit convention format.

### PR Description Template

```markdown
## What
Brief description of what changed.

## Why
Business reason / bug / tech debt addressed.

## Risk
- [ ] No behavior change
- [ ] Low risk — isolated change
- [ ] Medium risk — test manually
- [ ] High risk — requires full regression

## Testing
- [ ] Dashboard view tested
- [ ] Task list, filters, pagination tested
- [ ] Add/Edit/Delete task tested
- [ ] Gantt view tested
- [ ] Performance view tested
- [ ] Quick View panel tested
- [ ] Import Excel tested
- [ ] Export Excel tested
- [ ] Sync with Google Sheets tested
- [ ] Dark mode tested
- [ ] Mobile layout tested (768px, 480px)
- [ ] Keyboard shortcuts tested

## References
Fixes #issue, closes #PR, addresses TD-XXX (from TECH_DEBT.md)
```

---

## Release Process

### Version Format: `vX.Y` (matches existing patch convention)

| Increment | When |
|---|---|
| Minor (v6 → v7) | Major refactoring milestone (monolith split) |
| Patch (.1, .2) | Bug fixes, small features, patch merges |

### Release Checklist
1. Merge `develop` → `main` via PR
2. Tag the commit: `git tag v7.0`
3. Push tag: `git push origin v7.0`
4. Update `CHANGE_LOG.md` with release notes
5. Update `TODO.md` to reflect what shipped

---

## Current State (As of 2026-06-03)

- [ ] Verify local project matches remote `main` branch
- [ ] Confirm `GAS.GS` is the same in local and remote
- [ ] Add `/backend/` folder with GAS source code
- [ ] Add `AI_CONTEXT/` generated docs to remote

### Next Steps
```bash
# Check current status
git status
git log --oneline -10

# Recommended first commit
git add AI_CONTEXT/
git commit -m "docs: add Phase 0-4 discovery documentation"
git push origin main
```
