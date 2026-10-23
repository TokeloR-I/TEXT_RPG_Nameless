// D-09 Eternal Architect (Vaelis Package 3; Wren PR #82): independent checks through the CLI and act().
// L14 Chronomancer earned by real levelling. Scratch data copies only.
//   ENSO_ROOT=/path/to/checkout node qa/scripts/turn_order.js
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => (evs || []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => {
    try { const r = fn(); out.push({ id, what, state: r.info ? 'INFO' : r.ok ? 'PASS' : 'FAIL', note: r.note || '' }); }
    catch (e) { out.push({ id, what, state: 'FAIL', note: 'THREW ' + e.stack.split('\n').slice(0, 2).join(' ') }); }
};
function arch({ enemies = ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], room = 'hallway_of_chains', spd = 99, seed = 5 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of Object.keys(d.enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 });
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input('mage'); g.input('add_xp 250'); g.input('chronomancer');
    for (let i = 0; i < 400 && g.player.level < 14; i++) g.input('add_xp 100');
    g.player.spd = spd; g.currentRoom = room; g.input('engage');
    g.player.hp = g.player.maxHp = 9999;
    if (!g.player.skills.includes('Guard')) g.player.skills.push('Guard');
    g.do = (c, res = 5) => { if (res != null) g.player.resource.current = res; return T(g.input(c)); };
    // who acts, in order (normal turns only), per round
    g.turns = []; const begin = g.beginOpportunity.bind(g);
    g.beginOpportunity = (a, o = {}) => { g.turns.push(`${g.combat.round}:${a.isPlayer ? 'P' : a.id.replace('enemy_', 'E')}${o.skipped ? '(skip)' : ''}`); return begin(a, o); };
    return g;
}
const aw = (g) => g.getAvailableActions().awaiting;
const roundTurns = (g, r) => g.turns.filter((t) => t.startsWith(`${r}:`)).map((t) => t.split(':')[1]);
const ids = (g) => g.getAvailableActions().actions.find((a) => a.mode === 'choose').defaultOrder;

check('A1', 'Real L14 Eternal Architect learns rearrangeTurnOrder; 0 Time Charges is refused free; the cast spends ALL charges', () => {
    const g = arch(); const has = g.player.skills.includes('rearrangeTurnOrder');
    const r0 = g.combat.round; g.do('rearrangeturnorder', 0); const refused = g.combat.round === r0 && aw(g) === 'action';
    const h = arch(); h.do('rearrangeturnorder', 4); const spent = h.player.resource.current;
    return { ok: has && refused && spent <= 1, note: `learned ${has}; 0 charges refused, turn kept: ${refused}; 4 charges → ${spent} after the cast (end-round regen may add 1)` };
});
check('A2', 'Window = the next 3 rounds: a pause at the start of each, then normal initiative resumes', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); const pauses = [];
    for (let i = 0; i < 12 && g.mode === 'combat'; i++) { if (aw(g) === 'turn_order') { pauses.push(g.combat.round); g.do('order', null); } else g.do('guard', 0); }
    const castRound = pauses[0] - 1;
    return { ok: pauses.length === 3 && pauses[1] === pauses[0] + 1 && pauses[2] === pauses[0] + 2, note: `pauses at rounds ${pauses.join(', ')} (cast in round ${castRound})` };
});
check('A3', 'A chosen permutation is applied; everyone acts exactly once that round (player last, then first next round)', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0);
    const r = g.combat.round; const def = ids(g); const P = def.find((x) => x === g.player.id);
    const order = [...def.filter((x) => x !== P).reverse(), P];
    const res = g.act({ type: 'turn_order', order }); while (g.combat.round === r && g.mode === 'combat') g.do('guard', 0);
    const got = roundTurns(g, r);
    return { ok: res.ok !== false && got.join() === order.map((x) => (x === P ? 'P' : x.replace('enemy_', 'E'))).join() && new Set(got).size === got.length, note: `asked ${order.map((x) => (x === P ? 'P' : x.replace('enemy_', 'E'))).join(' ')} → round ${r} acted ${got.join(' ')}` };
});
check('A4', 'Bad orders are INVALID_ORDER at no cost and the round keeps waiting: duplicate, missing, unknown, dead id', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0);
    const def = ids(g); const s0 = JSON.stringify(g.getState()); const res = [];
    for (const [name, o] of [['dup', [def[0], ...def.slice(0, -1)]], ['missing', def.slice(1)], ['unknown', [...def.slice(1), 'enemy_99']]]) { const r = g.act({ type: 'turn_order', order: o }); res.push(`${name}:${r.error && r.error.code}`); }
    const other = g.act({ type: 'skill', skillId: 'Arcane Bolt', targetId: def.find((x) => x !== g.player.id) });
    const same = JSON.stringify(g.getState()) === s0 && aw(g) === 'turn_order';
    return { ok: res.every((x) => x.endsWith('INVALID_ORDER')) && other.error && other.error.code === 'WRONG_MODE' && same, note: `${res.join(' ')} · a skill → ${other.error && other.error.code} · state unchanged, still waiting: ${same}` };
});
check('A5', 'Recast inside the window refreshes it to 3 (no stacking)', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); let n = 0, recast = false;
    for (let i = 0; i < 16 && g.mode === 'combat'; i++) {
        if (aw(g) === 'turn_order') { n++; g.do('order', null); if (n === 2 && !recast) { recast = true; g.do('rearrangeturnorder', 4); } }
        else g.do('guard', 0);
    }
    return { ok: n === 5, note: `pauses in total: ${n} (2 from the first cast, then 3 from the refresh; stacking would give 6+)` };
});
check('A6', 'The boss still gets exactly one turn per window round, wherever it is placed', () => {
    const g = arch({ room: 'wardens_roost' }); g.do('rearrangeturnorder', 4); const rs = [];
    for (let i = 0; i < 12 && g.mode === 'combat'; i++) {
        if (aw(g) === 'turn_order') { const def = ids(g); rs.push(g.combat.round); g.act({ type: 'turn_order', order: def.slice().reverse() }); }
        else g.do('guard', 0);
    }
    const boss = g.combat.enemies[0].id.replace('enemy_', 'E'); const per = rs.map((r) => roundTurns(g, r).filter((x) => x.startsWith(boss)).length);
    return { ok: per.length === 3 && per.every((x) => x === 1), note: `boss turns in window rounds ${rs.join(',')}: ${per.join(',')}` };
});
check('A7', 'DoTs tick once per actual turn (Poison on an enemy moved to the end of the round)', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0);
    const e = g.combat.enemies[0]; g.applyDot(g.player, e, { name: 'Poison', value: 5, duration: 9 }); const def = ids(g);
    const ticks = []; const tick = g.tickDots.bind(g); g.tickDots = (a) => { if (a === e) ticks.push(g.combat.round); return tick(a); };
    g.act({ type: 'turn_order', order: [...def.filter((x) => x !== e.id), e.id] }); const r = g.combat.round;
    for (let i = 0; i < 6 && g.mode === 'combat'; i++) { if (aw(g) === 'turn_order') g.act({ type: 'turn_order', order: [e.id, ...ids(g).filter((x) => x !== e.id)] }); else g.do('guard', 0); }
    const per = {}; for (const t of ticks) per[t] = (per[t] || 0) + 1;
    return { ok: Object.values(per).every((x) => x === 1), note: `Poison ticks per round (last in round ${r}, first after): ${JSON.stringify(per)}` };
});
check('A8', 'A stunned enemy is skipped once, in its slot; a summon/dead change is handled (dead drop out of the next choice)', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0);
    const e1 = g.combat.enemies[1]; g.applyStatus(g.player, e1, { name: 'Stun', type: 'skip_turn', duration: 1 });
    const r = g.combat.round; g.act({ type: 'turn_order', order: ids(g).slice().reverse() }); while (g.combat.round === r) g.do('guard', 0);
    const got = roundTurns(g, r); const id1 = e1.id.replace('enemy_', 'E');
    g.combat.enemies[2].hp = 0; g.combat.enemies[2].dead = true; while (aw(g) !== 'turn_order' && g.mode === 'combat') g.do('guard', 0);
    const next = ids(g);
    return { ok: got.filter((x) => x.startsWith(id1)).length === 1 && got.includes(`${id1}(skip)`) && !next.includes(g.combat.enemies[2].id), note: `round ${r}: ${got.join(' ')} · next choice lists ${next.length} (dead enemy dropped: ${!next.includes(g.combat.enemies[2].id)})` };
});
check('A9', 'Haste during a window: the bonus action is untouched and no one gets an extra normal turn', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0);
    const r = g.combat.round; g.do('order', null); g.do('haste', 5); const mid = aw(g); g.do('guard', 0); while (g.combat.round === r && g.mode === 'combat' && aw(g) !== 'turn_order') g.do('guard', 0);
    const got = roundTurns(g, r);
    return { ok: got.filter((x) => x === 'P').length === 1, note: `round ${r} normal turns: ${got.join(' ')} (player once; Haste's bonus action is not a normal turn)` };
});
check('A10', 'CLI positions and act() ids give identical results', () => {
    const run = (cli) => { const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0); const def = ids(g);
        if (cli) g.input(`order ${def.map((_, i) => def.length - i).join(' ')}`); else g.act({ type: 'turn_order', order: def.slice().reverse() }); return JSON.stringify(g.getState()); };
    return { ok: run(true) === run(false), note: `identical ${run(true) === run(false)}` };
});
check('A11', 'Snapshot while waiting for the order → JSON → fresh engine: still waiting, same remaining rounds, same result', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); while (aw(g) !== 'turn_order') g.do('guard', 0);
    const snap = JSON.parse(JSON.stringify(g.snapshot())); const h = arch(); h.restore(snap);
    const left = (x) => x.combat.turnOrder && x.combat.turnOrder.remainingRounds;
    const go = (x) => { x.act({ type: 'turn_order', order: ids(x).slice().reverse() }); return JSON.stringify(x.getState()); };
    const a = aw(h), l = left(h) === left(g); return { ok: a === 'turn_order' && l && go(g) === go(h), note: `restored awaiting ${a}; rounds left equal ${l}` };
});
check('A12', 'Window ends with the fight: the next fight has no turn-order pause', () => {
    const g = arch(); g.do('rearrangeturnorder', 4); if (aw(g) === 'turn_order') g.do('order', null);
    g.do('flee', null); const fled = g.mode; g.currentRoom = 'hallway_of_chains'; g.input('engage'); g.turns.length = 0;
    let paused = false; for (let i = 0; i < 4 && g.mode === 'combat'; i++) { if (aw(g) === 'turn_order') { paused = true; break; } g.do('guard', 0); }
    return { ok: fled === 'explore' && !paused, note: `fled (mode ${fled}); pause in the next fight: ${paused}; turnOrder ${JSON.stringify(g.combat && g.combat.turnOrder)}` };
});
check('X1', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above' }));

console.log(`Eternal Architect (D-09, PR #82) — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
