/* Lists every effect type used in skillDefinitions that has no handler in
 * src/effects.js, plus handlers marked `partial`. This is the build backlog.
 *   node tools/missing-effects.js          human-readable report
 *   node tools/missing-effects.js --json   machine-readable (for an agent)  */
const data = require('../src/data.js');
const { registry } = require('../src/effects.js');

const usage = {}; // type -> [skill names]
for (const [name, skill] of Object.entries(data.skillDefinitions)) {
    for (const e of skill.effects || []) (usage[e.type] = usage[e.type] || []).push(name);
}

// Which skills can a player actually obtain, and from where?
const source = {};
for (const [cls, def] of Object.entries(data.basePlayerClasses)) for (const s of def.startingSkills) source[s] = `${cls} (start)`;
for (const [cls, tree] of Object.entries(data.evolutionPaths)) {
    for (const [bk, br] of Object.entries(tree.branches)) for (const st of br.stages) if (st.skill && !source[st.skill]) source[st.skill] = `${cls}/${bk} L${st.level}`;
}
for (const s of data.legendaryAndSecretClasses.the_hollow_king.skills) source[s] = source[s] || 'hollow king';

const missing = Object.keys(usage).filter((t) => !registry[t]).sort((a, b) => usage[b].length - usage[a].length);
const partial = Object.keys(usage).filter((t) => registry[t] && registry[t].partial);
const done = Object.keys(usage).filter((t) => registry[t] && !registry[t].partial);

const brokenSkills = Object.entries(data.skillDefinitions)
    .filter(([, s]) => (s.effects || []).some((e) => !registry[e.type]))
    .map(([n, s]) => ({ skill: n, obtainedFrom: source[n] || 'not obtainable', castable: !!s.base_damage || (s.effects || []).some((e) => registry[e.type]), missing: (s.effects || []).filter((e) => !registry[e.type]).map((e) => e.type) }));

if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ missing: missing.map((t) => ({ type: t, usedBy: usage[t] })), partial: partial.map((t) => ({ type: t, note: registry[t].partial })), brokenSkills }, null, 2));
    process.exit(0);
}

const total = Object.keys(usage).length;
console.log(`Effect types used by skills: ${total}`);
console.log(`  implemented: ${done.length}   partial: ${partial.length}   missing: ${missing.length}\n`);
console.log('MISSING (most-used first):');
for (const t of missing) console.log(`  - ${t.padEnd(32)} used by: ${usage[t].join(', ')}`);
console.log('\nPARTIAL:');
for (const t of partial) console.log(`  - ${t.padEnd(32)} ${registry[t].partial}`);
const dead = brokenSkills.filter((s) => !s.castable);
console.log(`\nSkills that can't be cast at all yet: ${dead.length}/${Object.keys(data.skillDefinitions).length}`);
