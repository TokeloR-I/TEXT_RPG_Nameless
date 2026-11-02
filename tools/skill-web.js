/* Prints the Skill Web (docs/design/SKILL_WEB.md) region by region and validates it.
 *   node tools/skill-web.js              the whole web
 *   node tools/skill-web.js necromancer  one class region
 * Exit code 1 if validateSkillWeb finds problems (the same check the tests run). */
const data = require('../src/data.js');
const { buildSkillWeb, validateSkillWeb } = require('../src/engine/skill-web.js');

const only = process.argv[2];
const problems = validateSkillWeb(data);
const web = buildSkillWeb(data);
const tag = { heart: '♥', active: '◆', passive: '○' };
const regions = [...new Set(web.list.map((n) => n.region))];
for (const region of regions) {
    if (only && region !== only) continue;
    const list = web.list.filter((n) => n.region === region);
    console.log(`\n== ${data.basePlayerClasses[region].name} (${list.length} nodes)`);
    const groups = [null, ...new Set(list.filter((n) => n.branch).map((n) => n.branch))];
    for (const b of groups) {
        const nodes = list.filter((n) => n.branch === b);
        if (b) console.log(`  -- ${web.branches[b].name}`);
        for (const n of nodes) {
            const out = n.links.filter((to) => web.nodes.get(to).region !== region);
            console.log(`   ${tag[n.kind]} ${n.id.padEnd(34)} ${n.label}${n.minLevel > 1 ? `  L${n.minLevel}` : ''}${n.requiresEvent ? '  (event)' : ''}${n.cost !== 1 ? `  cost ${n.cost}` : ''}${out.length ? `  ⇄ ${out.join(', ')}` : ''}`);
        }
    }
}
const kinds = (k) => web.list.filter((n) => n.kind === k).length;
console.log(`\n${web.list.length} nodes: ${kinds('heart')} hearts, ${kinds('active')} active, ${kinds('passive')} passive; ${(data.skillWeb.bridges || []).length} bridges.`);
console.log('Legend: ♥ class heart  ◆ active skill (skill bar)  ○ passive trait  ⇄ link to another class');
if (problems.length) { console.log('\nProblems:'); for (const p of problems) console.log(`  - ${p}`); process.exit(1); }
console.log('Valid.');
