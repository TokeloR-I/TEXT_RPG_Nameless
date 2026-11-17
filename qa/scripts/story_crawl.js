// Story crawler (Tally, QA report #18): plays Chapters One and Two through the real world model and engine with no
// script. Each round it walks every map it can reach on foot, talks to everyone (trying dialogue choices it has not
// tried yet), inspects everything, picks things up and fights every visible group (forced wins: this checks the
// story graph, not balance). It stops when a round changes nothing, then prints every quest that never finished and
// the step it is stuck on. A stuck main quest is a stall a player could hit.
//   node qa/scripts/story_crawl.js [seed=1] [class=warrior] [--verbose]
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const { WorldSession, DIRS } = require(path.join(ROOT, 'src/world/world.js'));
const ZONE1 = require(path.join(ROOT, 'src/world/zone1.js'));
const STORY = require(path.join(ROOT, 'src/story/chapter1.js'));
const data = require(path.join(ROOT, 'src/data.js'));

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const SEED = +(args[0] || 1), CLS = args[1] || 'warrior', VERBOSE = process.argv.includes('--verbose');
let rs = SEED * 2654435761 % 2147483647 || 7;
const rnd = () => { rs = (rs * 48271) % 2147483647; return rs / 2147483647; };
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const g = new GameEngine({ seed: SEED });
g.start(); g.act({ type: 'choose_class', classId: CLS }); g.act({ type: 'enter_world' });
const s = new WorldSession(ZONE1, { engine: g });
s.place(ZONE1.start.map, ZONE1.start.spawn);
const errors = [];
const log = (...a) => { if (VERBOSE) console.log(...a); };

function heal() { g.player.hp = g.player.maxHp = Math.max(g.player.maxHp, 99999); g.player.gold = Math.max(g.player.gold, 500); }
function settle() {
    for (let i = 0; i < 5 && g.mode === 'branch_select'; i++) {
        const b = (g.getAvailableActions().actions || []).filter((x) => x.type === 'choose_branch');
        g.act(b[Math.floor(rnd() * b.length)]);
    }
}
function win() {
    for (let i = 0; i < 300 && g.mode === 'combat'; i++) {
        for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1;
        heal();
        const a = g.getAvailableActions();
        if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null });
        else if (a.awaiting === 'dialogue') g.act({ type: 'dialogue_leave' });
        else { const t = g.alive(g.combat.enemies)[0]; if (!t) break; g.act({ type: 'attack', targetId: t.id }); }
    }
    if (g.mode === 'combat') errors.push(`fight never ended on ${s.mapId} (${g.world && g.world.encounter})`);
    settle();
}
const tried = new Set();
/** Run a conversation: take choices not tried before (random order), leave when none are new. */
let freshTalk = 0;
function converse(npc) {
    for (let step = 0; step < 40; step++) {
        settle();
        if (g.mode === 'combat') { win(); }
        const a = g.getAvailableActions();
        if (a.awaiting !== 'dialogue') return;
        const cs = (a.actions || []).filter((x) => x.type === 'dialogue_choice' && x.enabled !== false);
        const st = sig(); const key = (c) => `${npc}|${c.text}|${st}`;
        const bye = (c) => /^(Goodbye|Leave|Not now|Never mind)/i.test(c.text);
        cs.splice(0, cs.length, ...cs.filter((c) => !/^(Put away|Take out) /.test(c.text)));   // the stash chest is storage, not story
        let fresh = shuffle(cs.filter((c) => !tried.has(key(c)) && !bye(c)));
        if (!fresh.length) fresh = cs.filter((c) => !tried.has(key(c)) && bye(c) && !/^Not now|^Never mind/i.test(c.text));   // a goodbye can carry the step
        if (!fresh.length) { g.act({ type: 'dialogue_leave' }); settle(); return; }
        tried.add(key(fresh[0])); freshTalk++;
        log(`    [${npc}] > ${fresh[0].text}`);
        g.act({ type: 'dialogue_choice', choiceId: fresh[0].choiceId });
    }
    if (g.getAvailableActions().awaiting === 'dialogue') { errors.push(`conversation with ${npc} did not end in 40 choices`); g.act({ type: 'dialogue_leave' }); }
}

function pathTo(x, y) {
    const key = (a, b) => `${a},${b}`;
    const prev = new Map([[key(s.x, s.y), null]]); const q = [[s.x, s.y]];
    while (q.length) {
        const [cx, cy] = q.shift();
        if (cx === x && cy === y) break;
        for (const [dir, [dx, dy]] of Object.entries(DIRS)) {
            const nx = cx + dx, ny = cy + dy;
            if (prev.has(key(nx, ny)) || s.isBlocked(nx, ny)) continue;
            if (s.exitAt(nx, ny, 'step') && !(nx === x && ny === y)) continue;
            prev.set(key(nx, ny), [cx, cy, dir]); q.push([nx, ny]);
        }
    }
    if (!prev.has(key(x, y))) return null;
    const dirs = [];
    for (let k = key(x, y); prev.get(k);) { const [px, py, dir] = prev.get(k); dirs.unshift(dir); k = key(px, py); }
    return dirs;
}
function walk(dirs) { let r = null; for (const d of dirs) { r = s.move(d); if (r.type !== 'moved' && r.type !== 'boundary') return r; } return r; }
/** Stand next to (x,y,w,h), face it. Returns false if no free side can be reached. */
function approach(o) {
    const w = o.w || 1, h = o.h || 1, spots = [];
    for (let xx = o.x; xx < o.x + w; xx++) { spots.push([xx, o.y + h, 'up']); spots.push([xx, o.y - 1, 'down']); }
    for (let yy = o.y; yy < o.y + h; yy++) { spots.push([o.x - 1, yy, 'right']); spots.push([o.x + w, yy, 'left']); }
    for (const [nx, ny, f] of spots) {
        if (s.isBlocked(nx, ny) || s.exitAt(nx, ny, 'step')) continue;
        const p = pathTo(nx, ny); if (!p) continue;
        const r = walk(p);
        if (r && r.type === 'encounter') return r;      // walked into a fight on the way
        if (s.x !== nx || s.y !== ny) continue;
        return { face: f };
    }
    return false;
}
const doneObj = new Set();
let progress = 0;
const sig = () => JSON.stringify([g.story.flags.length, Object.values(g.story.quests).map((q) => q.state + (q.step || 0)), Object.keys(g.player.inventory || {}).length, g.world && g.world.defeated && g.world.defeated.length]);

function handle(r) {
    if (!r) return;
    if (r.type === 'encounter') { log(`  fight ${r.id}`); win(); s.fightOver(r.id, 'victory'); }
    if (r.type === 'talk') { log(`  talk ${r.npc}`); converse(r.npc); }
    if (g.getAvailableActions().awaiting === 'dialogue') converse('?');
    settle();
}
function workMap() {
    for (let pass = 0; pass < 12; pass++) {
        const before = sig(); freshTalk = 0;
        const objs = shuffle(s.visibleObjects().filter((o) => o.x != null));
        for (const o of objs) {
            heal();
            if (!s.visibleObjects().some((v) => v.id === o.id)) continue;
            const isEnc = o.kind === 'encounter';
            const k = `${s.mapId}:${o.id}:${sig()}`;
            if (doneObj.has(k)) continue;
            if (o.kind !== 'npc' && o.kind !== 'station') doneObj.add(k);
            const r = approach(o);
            if (!r) continue;
            if (r.type === 'encounter') { handle(r); continue; }
            if (isEnc) handle(s.move(r.face));
            else { s.move(r.face); handle(s.interact()); }
        }
        if (sig() === before && !freshTalk) break;
    }
}
function exitsHere() {
    return (s.map.exits || []).filter((e) => !/__\d+$/.test(e.id || ''));
}
function takeExit(e) {
    if (e.trigger === 'step') { const p = pathTo(e.x, e.y); if (!p) return null; return walk(p); }
    const a = approach({ x: e.x, y: e.y }); if (!a || a.type) return a || null;
    s.move(a.face); return s.interact();
}
// Kitchen, farm and building steps are menu actions, not world objects (tests 93/73 cover them). The crawler tries the
// real action, then fires the step's event itself and lists it under "assisted" so it is never mistaken for a pass.
const ASSIST = new Set(['craft', 'eat', 'build', 'plant', 'harvest']);
const assisted = [];
function assist() {
    for (const id of Object.keys(g.story.quests)) {
        const o = g.currentObjective(id);
        if (!o || !o.on || !ASSIST.has(o.on.type)) continue;
        if (o.on.type === 'eat' && g.player.inventory.includes(o.on.id)) g.act({ type: 'use_item', item: o.on.id });
        if (o.on.type === 'build') g.act({ type: 'build', upgradeId: o.on.id });
        if (g.currentObjective(id) === o) { assisted.push(`${id}.${o.id} (${o.on.type} ${o.on.id})`); g.storyEvent({ type: o.on.type, id: o.on.id }); }
        settle();
    }
}
// Breadth-first over maps by real exits; work each map. Rounds until nothing changes.
const seenMaps = new Set();
for (let round = 0; round < 40; round++) {
    const before = sig();
    const visited = new Set();
    const queue = [s.mapId];
    while (queue.length) {
        const m = queue.shift();
        if (visited.has(m)) continue;
        if (s.mapId !== m) {   // travel there through exits from the current map by BFS over known links
            const prev = new Map([[s.mapId, null]]); const q2 = [s.mapId];
            while (q2.length) { const c = q2.shift(); for (const e of ZONE1.maps[c].exits || []) if (!prev.has(e.toMap)) { prev.set(e.toMap, [c, e]); q2.push(e.toMap); } }
            const route = []; for (let c = m; prev.get(c); c = prev.get(c)[0]) route.unshift(prev.get(c)[1]);
            let ok = true;
            for (const e of route) { const r = takeExit(e); handle(r); if (!r || r.type !== 'transition') { ok = false; break; } }
            if (!ok || s.mapId !== m) continue;
        }
        visited.add(m); seenMaps.add(m);
        log(`round ${round} map ${m}`);
        workMap(); assist();
        for (const e of exitsHere()) if (!visited.has(e.toMap) && !queue.includes(e.toMap)) {
            // only queue a map if this exit can actually be used now
            if (!s.allows(e.requires)) continue;
            queue.push(e.toMap);
        }
    }
    if (sig() === before) { log(`settled after round ${round}`); break; }
}

const quests = STORY.quests;
const rows = [];
for (const [id, q] of Object.entries(quests)) {
    const st = g.story.quests[id];
    const state = st ? st.state : 'missing';
    if (state === 'complete') continue;
    let stuck = '';
    if (st && st.state === 'active') { try { const o = g.currentObjective(id); stuck = o ? o.text : '?'; } catch (e) { stuck = '?'; } }
    rows.push(`${id.padEnd(8)} ${(q.kind || '').padEnd(5)} ${state.padEnd(9)} ${q.title}${stuck ? '  -> stuck at: ' + stuck : ''}`);
}
const done = Object.values(g.story.quests).filter((q) => q.state === 'complete').length;
console.log(`seed ${SEED} ${CLS}: level ${g.player.level}, ${done}/${Object.keys(quests).length} quests complete, ${seenMaps.size}/${Object.keys(ZONE1.maps).length} maps reached`);
console.log(`maps never reached: ${Object.keys(ZONE1.maps).filter((m) => !seenMaps.has(m)).join(', ') || 'none'}`);
console.log(rows.join('\n'));
if (assisted.length) console.log('assisted (menu steps, not walked): ' + assisted.join(', '));
if (errors.length) console.log('ERRORS:\n  ' + [...new Set(errors)].join('\n  '));
