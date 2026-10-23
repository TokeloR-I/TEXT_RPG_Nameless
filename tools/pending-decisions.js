/* Lists every status-system design value still PENDING (null) in src/data.js.
 * Each pending value keeps its feature switched off until a value is approved.
 *   node tools/pending-decisions.js */
const data = require('../src/data.js');

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const defs = data.statusDefinitions;
const rules = data.statusRules;
const out = [];
const section = (title, lines) => { if (lines.length) out.push(`\n${title}`, ...lines.map((l) => `  - ${l}`)); };

// 1. hard vs soft control (Vaelis Package 2: 'hard' | 'soft' | false; anything that skips a turn is hard anyway)
const control = Object.entries(defs).filter(([, d]) => ['control', 'debuff', 'mark'].includes(d.category) && 'control' in d);
section('Control Resistance class (hard / soft / not control)', control
    .filter(([, d]) => d.control == null)
    .map(([n]) => `${n}: control PENDING`));

// 2. CR parameters (Package 2)
const cr = rules.controlResistance || {};
const crLines = [];
for (const k of ['max', 'capAt', 'resistAt', 'capTurns', 'softStrength', 'decayPerOpportunity']) if (!isNum(cr[k])) crLines.push(`${k}: PENDING`);
for (const t of ['regular', 'elite', 'boss', 'player', 'summon']) if (!isNum((cr.start || {})[t])) crLines.push(`start.${t}: PENDING`);
for (const c of ['hard', 'soft']) if (!isNum((cr.gain || {})[c])) crLines.push(`gain.${c}: PENDING`);
section('Control Resistance parameters', crLines);

// 3. stacking caps
section('Stacking caps (only Infection is approved; others refresh-only until set)', Object.entries(defs)
    .filter(([, d]) => d.category === 'dot' && !isNum(d.maxStacks)).map(([n]) => `${n}: maxStacks PENDING`));

// 4. DoT tick values without an approved base
section('DoT values come from each skill today (no approved per-status base)', Object.entries(defs)
    .filter(([, d]) => d.category === 'dot' && !isNum(d.value)).map(([n]) => `${n}: base tick damage PENDING`));

// 5. overflow
section('Overflow (which DoTs allow it + baseChance / chanceStep / maxChance / burstMultiplier)', Object.entries(defs)
    .filter(([, d]) => d.category === 'dot' && !d.overflow).map(([n]) => `${n}: overflow PENDING (off)`));

// 6. affinities
const enemiesWithAff = Object.entries(data.enemies).filter(([, e]) => e.statusAffinities);
section('Enemy status affinities', [
    `affinity tables: ${enemiesWithAff.length ? enemiesWithAff.map(([k]) => k).join(', ') : 'none defined (PENDING)'}`,
    `what "resist" does: ${rules.affinityEffects.resist ? JSON.stringify(rules.affinityEffects.resist) : 'PENDING'}`,
    `what "vulnerable" does: ${rules.affinityEffects.vulnerable ? JSON.stringify(rules.affinityEffects.vulnerable) : 'PENDING'}`
]);

// 7. enemy tiers
const tiered = Object.values(data.enemies).filter((e) => e.tier).length;
section('Enemy tiers', [`${tiered ? tiered + ' enemies have an explicit tier' : 'no explicit tiers'}; bosses are detected by the "boss" flag, everything else counts as regular. No elites defined yet.`]);

// 8. cleansing
const cleanseSkills = Object.entries(data.skillDefinitions).filter(([, s]) => (s.effects || []).some((e) => e.type === 'cleanse'));
const cats = [...new Set(Object.values(defs).map((d) => d.category))];
section('Cleansing', [
    `status categories in use (PROVISIONAL taxonomy): ${cats.join(', ')}`,
    `abilities that cleanse: ${cleanseSkills.length ? cleanseSkills.map(([n]) => n).join(', ') : 'none yet (PENDING)'}`
]);

// 9. reactions
const unsafe = require('../src/statuses.js').findUnsafeReactions(data.statusReactions);
section('Cross-status reactions', [
    ...unsafe.map((u) => `DISABLED recipe #${u.index} "${u.name}": ${u.reason}`),
    `recipes approved: ${data.statusReactions.length || 'none (PENDING)'}`,
    'character-attribute modifier for reaction chance: PAUSED (Design Decision 16) — currently adds 0'
]);

// 10. statuses used by skills but missing a definition
const used = new Set();
for (const s of Object.values(data.skillDefinitions)) for (const e of s.effects || []) {
    if (e.type === 'apply_mark') used.add(e.mark);
    if (e.type === 'apply_status') used.add(e.status);
}
section('Statuses used by skills with no definition entry', [...used].filter((n) => n && !defs[n]).map((n) => `${n}`));

console.log('PENDING STATUS-SYSTEM DECISIONS (from src/data.js)' + out.join('\n'));
