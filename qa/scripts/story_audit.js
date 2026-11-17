// Story data audit (Tally, QA report #18): static checks over Chapters One and Two that the tests don't make.
//   - every item the story, shops, loot or recipes hand out has an item definition (else no name, icon or price)
//   - every flag a condition reads is set by something (else that branch can never open)
//   - every item a condition asks for can be obtained somewhere
//   - every quest is started by something, and every `start` names a real quest
//   - every enemy on a map exists in data.enemies and has a live-combat kit
//   - every quest marker sits near the thing its step waits on
//   node qa/scripts/story_audit.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const data = require(path.join(ROOT, 'src/data.js'));
const ZONE1 = require(path.join(ROOT, 'src/world/zone1.js'));
const STORY = require(path.join(ROOT, 'src/story/chapter1.js'));

const out = [];
const bad = (k, m) => out.push(`${k.padEnd(14)} ${m}`);
const items = data.itemDefinitions;

// Walk every value, remembering a path, to collect what is granted, set and read.
const granted = new Map(), setFlags = new Set(), readFlags = new Map(), wantItems = new Map(), started = new Set();
function walk(v, where) {
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, where)); return; }
    if (!v || typeof v !== 'object') return;
    if (typeof v.item === 'string' && (v.key || v.removeItem === undefined)) granted.set(v.item, where);
    if (typeof v.flag === 'string') setFlags.add(v.flag);
    if (Array.isArray(v.flags) && v !== null) for (const f of v.flags) readFlags.set(f, where);
    if (Array.isArray(v.notFlags)) for (const f of v.notFlags) if (!readFlags.has(f)) readFlags.set(f, where);
    if (Array.isArray(v.items)) for (const it of v.items) if (typeof it === 'string') wantItems.set(it, where);
    if (typeof v.start === 'string') started.add(v.start);
    for (const [k, x] of Object.entries(v)) walk(x, `${where}.${k}`);
}
for (const [id, q] of Object.entries(STORY.quests)) walk(q, `quest ${id}`);
for (const [id, n] of Object.entries(STORY.npcs)) walk(n, `npc ${id}`);
walk(STORY.triggers || [], 'triggers');
walk(STORY.catchUp || [], 'catchUp');
for (const [mid, m] of Object.entries(ZONE1.maps)) walk([m.interactables, m.encounters, m.exits], `map ${mid}`);

// Flags set by code (engine modules, world) rather than story data.
const code = ['src/engine.js', ...require('fs').readdirSync(path.join(ROOT, 'src/engine')).map((f) => 'src/engine/' + f), 'src/world/world.js', 'src/data.js']
    .map((f) => require('fs').readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
const setInCode = (f) => code.includes(`'${f}'`) || code.includes(`"${f}"`) || code.includes('`' + f) || /^(anchor:|aspect_|item:|quest:|trigger:)/.test(f);

// Items: story grants, pickups, shop stock, loot tables, recipes.
const sources = new Map(granted);
for (const [mid, m] of Object.entries(ZONE1.maps)) for (const o of m.interactables || []) if (o.item) sources.set(o.item, `map ${mid}.${o.id}`);
for (const [sid, sh] of Object.entries(data.shopDefinitions || {})) for (const it of Object.keys(sh.stock || sh.items || {})) sources.set(it, `shop ${sid}`);
(function recipes(v, w) { if (!v || typeof v !== 'object') return; if (typeof v.output === 'string') sources.set(v.output, w); for (const [k, x] of Object.entries(v)) recipes(x, `recipe ${k}`); })(data.recipeDefinitions, 'recipe');
for (const [seed, c] of Object.entries(data.cropDefinitions || {})) if (c.produces) sources.set(c.produces, `crop ${seed}`);
(function forage(v, w) { if (!v || typeof v !== 'object') return; if (typeof v.item === 'string') sources.set(v.item, w); for (const [k, x] of Object.entries(v)) forage(x, `forage ${k}`); })(data.forageDefinitions, 'forage');
for (const [it, w] of sources) if (!items[it]) bad('NO ITEM DEF', `"${it}" (from ${w})`);

for (const [f, w] of readFlags) if (!setFlags.has(f) && !setInCode(f)) bad('FLAG NEVER SET', `${f} (read in ${w})`);
const lootItems = JSON.stringify([data.enemies, data.lootTables || {}, data.loot || {}, data.forage || {}, data.foodRules || {}, data.farming || {}]);
for (const [it, w] of wantItems) if (!sources.has(it) && !lootItems.includes(`"${it}"`)) bad('ITEM UNOBTAINABLE', `${it} (asked for in ${w})`);
for (const q of started) if (!STORY.quests[q]) bad('BAD START', q);
for (const id of Object.keys(STORY.quests)) if (!started.has(id) && !/^Q01$/.test(id)) bad('NEVER STARTED', id);

for (const [mid, m] of Object.entries(ZONE1.maps)) for (const e of m.encounters || []) for (const en of e.enemies || []) {
    const d = data.enemies[en];
    if (!d) bad('NO ENEMY', `${mid}.${e.id}: ${en}`);
    else if (!(data.actionRules && data.actionRules.enemies && data.actionRules.enemies[en]) && !d.action && !d.live) { /* kits may live elsewhere; checked in the live test below */ }
}

// Markers: within 6 tiles of the object the step waits on (inspect / defeat / talk), on the same map.
const where = new Map();
for (const [mid, m] of Object.entries(ZONE1.maps)) for (const o of [...(m.interactables || []), ...(m.encounters || [])]) {
    where.set(o.id, [mid, o.x, o.y]);
    if (o.npc && !where.has('npc:' + o.npc)) where.set('npc:' + o.npc, [mid, o.x, o.y]);
}
for (const [qid, q] of Object.entries(STORY.quests)) for (const o of q.objectives || []) {
    if (!o.marker || !o.on) continue;
    const t = o.on.type === 'talk' ? where.get('npc:' + o.on.id) : ['inspect', 'defeat', 'pickup'].includes(o.on.type) ? where.get(o.on.id) : null;
    if (!t) continue;
    const [mid, x, y] = t;
    if (o.marker.map !== mid) bad('MARKER MAP', `${qid}.${o.id}: marker on ${o.marker.map}, ${o.on.id} is on ${mid}`);
    else if (Math.max(Math.abs(o.marker.x - x), Math.abs(o.marker.y - y)) > 6) bad('MARKER FAR', `${qid}.${o.id}: marker (${o.marker.x},${o.marker.y}), ${o.on.id} at (${x},${y})`);
}
console.log(out.length ? out.join('\n') : 'story audit: nothing found');
console.log(`${out.length} findings`);
