/* Lists every status-system design value still PENDING (null) in src/data.js.
 * Each pending value keeps its feature switched off until a value is approved.
 *   node tools/pending-decisions.js */
const data = require('../src/data.js');

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const defs = data.statusDefinitions;
const rules = data.statusRules;
const out = [];
const section = (title, lines) => { if (lines.length) out.push(`\n${title}`, ...lines.map((l) => `  - ${l}`)); };

// 1. hard vs soft control + CR gain
const control = Object.entries(defs).filter(([, d]) => ['control', 'debuff', 'mark'].includes(d.category) && 'control' in d);
section('Hard vs soft control, and CR gain per application', control
    .filter(([, d]) => d.control == null || (d.control === 'hard' && !isNum(d.crGain)))
    .map(([n, d]) => `${n}: control=${d.control ?? 'PENDING'}, crGain=${d.crGain ?? 'PENDING'}`));

// 2. CR parameters
const cr = rules.controlResistance;
const crLines = [];
if (!isNum(cr.recoveryPerRound)) crLines.push('recoveryPerRound: PENDING');
if (!isNum(cr.releaseThreshold)) crLines.push('releaseThreshold: PENDING');
for (const [t, v] of Object.entries(cr.tierMultipliers)) if (!isNum(v)) crLines.push(`tierMultipliers.${t}: PENDING`);
section(`Control Resistance (threshold ${cr.threshold} is approved) — CR stays OFF until all of these are set`, crLines);

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
section('Cross-status reactions', [
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
