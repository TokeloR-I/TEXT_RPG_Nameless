/* Prints the class Skill Webs (docs/design/SKILL_WEB.md) one by one and validates them.
 *   node tools/skill-web.js              every class web
 *   node tools/skill-web.js necromancer  one class web
 * Exit code 1 if validateSkillWeb finds problems (the same check the tests run). */
const data = require('../src/data.js');
const { buildSkillWeb, validateSkillWeb } = require('../src/engine/skill-web.js');

const only = process.argv[2];
const problems = validateSkillWeb(data);
const web = buildSkillWeb(data);
const tag = { heart: '♥', active: '◆', passive: '○', gateway: '⇒' };
const regions = [...new Set(web.list.map((n) => n.region))];
for (const region of regions) {
    if (only && region !== only) continue;
    const list = web.list.filter((n) => n.region === region);
    const legend = web.nodes.get(`heart.${region}`).legendary;
    console.log(`\n== ${legend ? `${web.nodes.get(`heart.${region}`).label} (legendary)` : data.basePlayerClasses[region].name} web (${list.length} nodes)`);
    if (legend) { const r = web.nodes.get(`heart.${region}`).requires; console.log(`  opens after: ${(r.stages || []).join(' + ')}${r.event ? ` + ${r.event}` : ''}`); }
    const groups = [null, ...new Set(list.filter((n) => n.branch).map((n) => n.branch))];
    for (const b of groups) {
        const nodes = list.filter((n) => n.branch === b);
        if (b) console.log(`  -- ${web.branches[b].name}`);
        for (const n of nodes) {
            const out = n.kind === 'gateway' ? [`${n.to} (${n.target} web)`] : [];
            console.log(`   ${tag[n.kind]} ${n.id.padEnd(34)} ${n.label}${n.minLevel > 1 ? `  L${n.minLevel}` : ''}${n.requiresEvent ? '  (event)' : ''}${n.cost !== 1 ? `  cost ${n.cost}` : ''}${out.length ? `  ⇒ ${out.join(', ')}` : ''}`);
        }
    }
}
const kinds = (k) => web.list.filter((n) => n.kind === k).length;
console.log(`\n${web.webs.length} class webs + ${web.legendary.length} legendary webs, ${web.list.length} nodes: ${kinds('heart')} hearts, ${kinds('active')} active, ${kinds('passive')} passive, ${kinds('gateway')} gateways.`);
console.log('Legend: ♥ class heart  ◆ active skill (skill bar)  ○ passive trait  ⇒ gateway into another class web');
if (problems.length) { console.log('\nProblems:'); for (const p of problems) console.log(`  - ${p}`); process.exit(1); }
console.log('Valid.');
