/**
 * verify_id_reassign.mjs — Spec test for the concurrent-create ID reassignment
 * algorithm (S65). Mirrors backend/Concurrency.gs `reassignIdIfExists()` as a
 * pure function over an array of existing IDs (the sheet's column A), so the
 * behaviour is locked even though GAS itself cannot run under node.
 *
 * ⚠️ Keep this in sync with backend/Concurrency.gs. If the GAS algorithm
 *    changes, update `nextFreeId` below to match.
 */

// ── Ported pure logic (must equal reassignIdIfExists over existingIds) ──
function _padNum(n, width) {
  let s = String(n);
  while (s.length < width) s = '0' + s;
  return s;
}

function nextFreeId(existingIds, id) {
  const raw   = existingIds.map(x => String(x).trim());
  const taken = {};
  raw.forEach(x => { taken[x.toLowerCase()] = true; });

  const key = String(id).trim().toLowerCase();
  if (!taken[key]) return id;                      // không trùng → giữ nguyên

  const m = String(id).match(/^(.*?)(\d+)$/);
  if (!m) {
    let base = String(id), n = 2, cand = base + '-' + n;
    while (taken[cand.toLowerCase()]) { n++; cand = base + '-' + n; }
    return cand;
  }

  const pfx   = m[1];
  const width = m[2].length;
  const pfxLc = pfx.toLowerCase();
  let max = 0;
  raw.forEach(s => {
    if (s.toLowerCase().indexOf(pfxLc) === 0) {
      const num = parseInt(s.substring(pfx.length), 10);
      if (!isNaN(num) && num > max) max = num;
    }
  });
  let next = max + 1;
  let out  = pfx + _padNum(next, width);
  while (taken[out.toLowerCase()]) { next++; out = pfx + _padNum(next, width); }
  return out;
}

// ── Tiny assert harness ──
let pass = 0, fail = 0;
function eq(label, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log(`  ✗ ${label}: got "${got}", want "${want}"`); }
}

// ── T1: no collision → unchanged (every scheme) ──
eq('T1 task no-collision',  nextFreeId(['SO-001','SO-002'], 'SO-003'), 'SO-003');
eq('T1 case no-collision',  nextFreeId(['CP-001'], 'CP-002'), 'CP-002');
eq('T1 empty sheet',        nextFreeId([], 'DEV-26-001'), 'DEV-26-001');

// ── T2: Task SO-### collision → next max+1, keep 3-width ──
eq('T2 task collide',       nextFreeId(['SO-004','SO-005'], 'SO-005'), 'SO-006');
eq('T2 task collide gap',   nextFreeId(['SO-005','SO-009'], 'SO-005'), 'SO-010');

// ── T3: Case CP-### ──
eq('T3 case collide',       nextFreeId(['CP-005','CP-006'], 'CP-005'), 'CP-007');

// ── T4: Issue IS-YY-### (mid dash must NOT be swallowed) ──
eq('T4 issue collide',      nextFreeId(['IS-26-004','IS-26-005'], 'IS-26-005'), 'IS-26-006');
eq('T4 issue year-scoped',  nextFreeId(['IS-25-099','IS-26-001'], 'IS-26-001'), 'IS-26-002');

// ── T5: Dev DEV-YY-### ──
eq('T5 dev collide',        nextFreeId(['DEV-26-005'], 'DEV-26-005'), 'DEV-26-006');

// ── T6: Milestone {parent}-M# (parent row must not interfere) ──
eq('T6 ms collide',         nextFreeId(['SCF-001','SCF-001-M1','SCF-001-M2'], 'SCF-001-M2'), 'SCF-001-M3');
eq('T6 ms parent kept',     nextFreeId(['SCF-001','SCF-001-M1'], 'SCF-001-M1'), 'SCF-001-M2');

// ── T7: Root initiative user-typed ending in number ──
eq('T7 init collide',       nextFreeId(['SCF-001','SCF-002'], 'SCF-001'), 'SCF-003');

// ── T8: prefix isolation — other prefixes ignored when computing max ──
eq('T8 prefix isolation',   nextFreeId(['SO-005','BL-009','SO-006'], 'SO-005'), 'SO-007');

// ── T9: case-insensitive collision detection ──
eq('T9 case-insensitive',   nextFreeId(['so-005'], 'SO-005'), 'SO-006');

// ── T10: reassigned candidate itself already taken → skip forward ──
eq('T10 skip taken next',   nextFreeId(['SO-005','SO-006'], 'SO-005'), 'SO-007');

// ── T11: ID with no trailing number → -2, -3 suffix ──
eq('T11 no-trailing-num',   nextFreeId(['BAU'], 'BAU'), 'BAU-2');
eq('T11 no-trailing chain', nextFreeId(['BAU','BAU-2'], 'BAU'), 'BAU-3');

console.log(`\nverify_id_reassign: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
