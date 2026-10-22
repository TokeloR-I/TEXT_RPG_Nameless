// Dragon's Dominion (Rook, PRs #34/#35): independent checks against the skill text in src/data.js
// ("Triple dmg vs bosses for 1 turn", cost: all Fury, once per fight) and the PR's QA focus list.
//   node qa/scripts/dominion.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => { try { const r = fn(); out.push(`${r.info ? 'INFO' : r.ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${r.note || ''}`); } catch (e) { out.push(`FAIL  [${id}] ${what}\n        THREW ${e.stack.split('\n').slice(0, 2).join(' ')}`); } };
const NAME = 'Dragon’s Dominion';

/** Wyrm's End (L14 Berserker) through real progression; room 'boss' or 'hall'. */
function wyrm({ room = 'boss', spd, mutate, fury = 6 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA)); if (mutate) mutate(d);
    const g = new GameEngine({ seed: 4, data: d }); g.start();
    ['warrior', 'add_xp 250', 'berserker', 'unlock_events', 'add_xp 999999'].forEach((c) => g.input(c));
    if (spd != null) g.player.spd = spd;
    g.player.critChance = 0;
    if (room === 'boss') g.currentRoom = 'wardens_roost'; else g.input('n');
    g.input('engage');
    g.player.hp = g.player.maxHp = 99999;
    for (const e of g.combat.enemies) { e.hp = e.maxHp = 99999; e.critChance = 0; }
    g.player.resource.current = fury;
    g.do = (c) => T(g.input(c));
    return g;
}
/** Damage of one fixed 20-dmg true hit from the player onto t right now. */
const probe = (g, t, type = 'true') => { const h = g.newHit(t); g.rollDamage(g.player, t, { name: 'Probe', base_damage: [20, 20], damage_type: type }, h); return h.damage; };

check('1', "Learned at Wyrm's End (L14 Berserker, after the Dragon Slayer event)", () => {
    const g = wyrm();
    return { ok: g.progression.evolutionName === 'Wyrm’s End' && g.player.skills.includes(NAME) && g.player.resource.type === 'Fury Gauge', note: `${g.progression.evolutionName}, resource ${g.player.resource.type}` };
});
check('2', 'Spends ALL Fury (command path) and announces itself', () => {
    const g = wyrm({ fury: 7 }); const t = g.do('dragon\'s dominion');
    const used = /Used 7 Fury Gauge/.test(t);
    return { ok: used && /invokes Dragon’s Dominion/.test(t) && !!g.findStatus(g.player, NAME), note: `"Used 7 Fury Gauge": ${used}; Fury now ${g.player.resource.current} (later gains this round are normal)` };
});
check('2b', 'Cast at 0 Fury', () => {
    const g = wyrm({ fury: 0 }); const t = g.do('dragon\'s dominion');
    return { info: true, note: `at 0 Fury: ${g.findStatus(g.player, NAME) ? 'it casts (cost "all" of 0 = free)' : 'refused'} — design question` };
});
check('3', 'x3 final damage vs the boss (true and physical), non-boss unaffected', () => {
    const g = wyrm(); const b = g.combat.enemies[0];
    const t0 = probe(g, b), p0 = probe(g, b, 'physical');
    g.castSkill(g.player, g.playerSkill(NAME), [g.player]);
    const t1 = probe(g, b), p1 = probe(g, b, 'physical');
    const h = wyrm({ room: 'hall' }); const ghoul = h.combat.enemies[0]; const n0 = probe(h, ghoul);
    h.castSkill(h.player, h.playerSkill(NAME), [h.player]); const n1 = probe(h, ghoul);
    return { ok: t1 === 3 * t0 && p1 === Math.floor(3 * p0) && n1 === n0, note: `boss true ${t0}->${t1}, physical ${p0}->${p1}; non-boss ${n0}->${n1}` };
});
check('4', '"For 1 turn": your next turn is tripled, the one after is not — faster and slower than the boss', () => {
    const res = [40, 1].map((spd) => {
        const g = wyrm({ spd }); const b = g.combat.enemies[0];
        g.do('dragon\'s dominion');
        const next = !!g.findStatus(g.player, NAME); g.do('slash'); const after = !!g.findStatus(g.player, NAME);
        return `${spd === 40 ? 'faster' : 'slower'}: up on next turn ${next}, after it ${after}`;
    });
    return { ok: res.every((r) => /next turn true, after it false/.test(r)), note: res.join(' | ') };
});
check('5', 'Once per fight; usable again next fight', () => {
    // boss-flagged Warden in two ordinary rooms (killing him in his own room ends the game)
    const d = (x) => { x.rooms.hallway_of_chains.enemies = ['crow_touched_warden']; x.rooms.collapsed_wine_cellar.enemies = ['crow_touched_warden']; };
    const g = wyrm({ room: 'hall', mutate: d }); g.do('dragon\'s dominion'); g.player.resource.current = 5;
    const refused = /only be used once per fight/.test(g.do('dragon\'s dominion'));
    g.combat.enemies[0].hp = 1; g.do('slash');
    g.input('s'); g.input('e'); g.input('engage');
    if (g.mode !== 'combat') return { ok: false, note: `could not start fight 2 (mode ${g.mode})` };
    g.player.resource.current = 5; const again = g.do('dragon\'s dominion');
    return { ok: refused && /invokes/.test(again), note: `2nd cast same fight refused: ${refused}; next fight allowed: ${/invokes/.test(again)}` };
});
check('6', 'Haste bonus actions are tripled and do not shorten it', () => {
    const g = wyrm(); g.player.skills.push('haste'); const b = g.combat.enemies[0];
    g.do('dragon\'s dominion'); g.player.resource.current = 9;
    g.do('haste'); const up1 = !!g.findStatus(g.player, NAME); g.player.resource.current = 9;
    g.do('haste'); const up2 = !!g.findStatus(g.player, NAME);
    const x3 = probe(g, b) === 60;
    return { ok: up1 && up2 && x3, note: `still up after 2 bonus actions: ${up1 && up2}; probe x3: ${x3}` };
});
check('7', 'Stacks multiplicatively with Expose (+20%) on the boss', () => {
    const g = wyrm(); const b = g.combat.enemies[0];
    g.castSkill(g.player, g.playerSkill(NAME), [g.player]);
    g.applyMark(g.player, b, { mark: 'Expose', value: 0.2, duration: 2 });
    return { ok: probe(g, b) === 72, note: `20 true -> ${probe(g, b)} (20 x 1.2 x 3 = 72)` };
});
check('8', 'Not carried into the next fight; cleared on victory', () => {
    const g = wyrm(); g.do('dragon\'s dominion'); g.combat.enemies[0].hp = 1; g.do('slash');
    return { ok: g.mode !== 'combat' && !g.findStatus(g.player, NAME), note: `after victory: ${g.findStatus(g.player, NAME) ? 'still on' : 'cleared'}` };
});
check('9', 'Status taxonomy: has a statusDefinitions category (cleanse can see it)', () => {
    const g = wyrm(); g.castSkill(g.player, g.playerSkill(NAME), [g.player]);
    const s = g.findStatus(g.player, NAME);
    return { ok: s.category !== 'uncategorized', note: `category = ${s.category}; buff cleanse removes it: ${g.cleanse(g.player, { categories: ['buff'] }).length > 0}` };
});
check('10', 'DoT ticks on the boss while Dominion is up', () => {
    const g = wyrm(); const b = g.combat.enemies[0];
    g.castSkill(g.player, g.playerSkill(NAME), [g.player]);
    g.applyDot(g.player, b, { name: 'Bleed', value: 3, duration: 3 }); const hp = b.hp; g.startTurn(b);
    return { info: true, note: `Bleed 3/tick deals ${hp - b.hp} while Dominion is up (DoTs bypass the damage formula) — design question` };
});
check('11', 'Universal: an enemy holding Dominion would triple its hits on a "boss"-flagged target only', () => {
    const g = wyrm({ room: 'hall' }); const e = g.combat.enemies[0];
    g.applyStatus(e, e, { name: NAME, type: 'bonus_damage_vs_flag_percent', flag: 'boss', value: 2, duration: 1 });
    const h = g.newHit(g.player); g.player.def = 0; g.rollDamage(e, g.player, { name: 'Bite', base_damage: [10, 10], damage_type: 'true' }, h);
    return { ok: h.damage === 10, note: `enemy with Dominion vs the (non-boss) player: ${h.damage} (no bonus)` };
});

console.log("Dragon's Dominion — independent checks\n");
console.log(out.join('\n'));
const scored = out.filter((l) => !l.startsWith('INFO'));
console.log(`\n${scored.filter((l) => l.startsWith('PASS')).length}/${scored.length} pass (+${out.length - scored.length} info)`);
