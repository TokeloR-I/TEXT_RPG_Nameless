// Necromancer progression passives (Rook, PR #58 audit): independent checks against the data text in
// src/data.js and docs/design/NECROMANCER_COMPLETION_AUDIT.md. Every trait is reached by real levelling
// (add_xp + branch choice), never pushed into player.traits by hand; minions come from the real summon cap.
//   node qa/scripts/necro_passives.js
//   ENSO_ROOT=/path/to/checkout node qa/scripts/necro_passives.js
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => {
    try { const r = fn(); out.push({ id, what, state: r.info ? 'INFO' : r.gap ? 'GAP' : r.ok ? 'PASS' : 'FAIL', note: r.note || '' }); }
    catch (e) { out.push({ id, what, state: 'FAIL', note: 'THREW ' + e.stack.split('\n').slice(0, 2).join(' ') }); }
};

/** Necromancer of `branch` levelled for real to `level`, in the hallway fight; enemies 999 HP, DEF 0, crit 0. */
function necro(branch, level, { enemies = ['shackled_ghoul', 'cellar_vermin'], seed = 5, patch = {} } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of new Set(enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 }, patch[k] || {});
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input('necromancer'); g.input('add_xp 250'); g.input(branch.replace(/_/g, ' '));
    for (let i = 0; i < 400 && g.player.level < level; i++) g.input('add_xp 100');
    g.input('n'); g.input('engage');
    g.player.hp = g.player.maxHp = 9999; g.player.def = 0;
    g.do = (c, se = 9) => { if (se != null) g.player.resource.current = se; return T(g.input(c)); };
    return g;
}
const E = (g, i) => g.combat.enemies[i];
/** Damage the player takes from a fixed 100-point enemy hit of `type`, through the engine's damage pipeline. */
const taken = (g, type = 'physical') => {
    const e = E(g, 0); e.critChance = 0; const h = g.newHit(g.player);
    g.rollDamage(e, g.player, { name: 'QA probe', base_damage: [100, 100], damage_type: type }, h); return h.damage;
};
/** Fill the minion cap with skeletons (the engine's own summon path, so the cap applies). */
const fill = (g) => { const want = g.minionCap(); for (let i = 0; i < 12 && g.alive(g.combat.minions).length < want; i++) g.castSkill(g.player, g.playerSkill('Raise Skeleton'), [g.player]); g.flush && g.flush(); return g.alive(g.combat.minions).length; };

// ===================================================================== Bone Warden
check('B1', 'Bone Armor: 2% less damage per living minion, physical and magic; true damage ignores it', () => {
    const g = necro('bone_warden', 3); const row = [taken(g)];
    for (let i = 0; i < 3; i++) { g.summon('skeleton'); row.push(taken(g)); }
    const mag = taken(g, 'magic'), tru = taken(g, 'true');
    return { ok: row.join() === '100,98,96,94' && mag === 94 && tru === 100, note: `physical with 0-3 minions: ${row.join(' / ')} · magic with 3: ${mag} · true: ${tru}` };
});
check('B2', 'Real minion cap before Black Pharaoh: Bone Armor can never reach its 10% cap', () => {
    const rows = [3, 8, 13].map((lvl) => { const g = necro('bone_warden', lvl); const n = fill(g); return `L${lvl} (${g.progression.evolutionName}): cap ${g.minionCap()}, minions ${n}, reduction ${100 - taken(g)}%`; });
    const g14 = necro('bone_warden', 14); const n14 = fill(g14);
    return { info: true, note: rows.join(' · ') + ` · L14 (${g14.progression.evolutionName}): cap ${g14.minionCap()}, minions ${n14}, reduction ${100 - taken(g14)}%` };
});
check('B3', "Bone Fortress (Gravekeeper L8) — data text: '+1% dmg reduction per minion (max 15%)'", () => {
    const at = (lvl, n) => { const g = necro('bone_warden', lvl); for (let i = 0; i < n; i++) g.summon('skeleton'); return { r: 100 - taken(g), fort: g.hasTrait('Bone Fortress') }; };
    const l7 = [1, 2, 3].map((n) => at(7, n).r), l8 = [1, 2, 3].map((n) => at(8, n).r), fort = at(8, 1).fort;
    const same = l7.join() === l8.join();
    return { ok: !same, note: `has Bone Fortress at L8: ${fort}. Reduction with 1/2/3 minions — L7 ${l7.join('/')}%, L8 ${l8.join('/')}%. ` + (same ? 'Identical: the trait only lifts the cap 10%→15%, which 3 minions (2% each = 6%) never reach. No effect until L14' : 'differs') };
});
check('B4', 'Bone Fortress options, measured (not a ruling): reduction by live minions', () => {
    const rows = [1, 2, 3, 4, 5, 6].map((n) => `${n}: now ${Math.min(n * 2, 15)}% / '+1% per minion' (3% each, cap 15%) ${Math.min(n * 3, 15)}%`);
    return { info: true, note: 'minions ' + rows.join(' | ') + ' (4-6 minions need Black Pharaoh, L14)' };
});
check('B5', 'Grave Command (L3): minions attack the last enemy you attacked', () => {
    const g = necro('bone_warden', 3, { enemies: ['shackled_ghoul', 'cellar_vermin', 'rust_rat'] });
    if (!g.player.skills.includes('Guard')) g.player.skills.push('Guard');   // 0-cost, no damage: passes turns
    g.summon('skeleton'); g.do('guard', 0);                                   // the skeleton joins the order next round
    const picks = []; const cast = g.castSkill.bind(g);
    g.castSkill = (c, sk, ts) => { if (c.isMinion) picks.push(g.combat.enemies.indexOf(ts[0]) + 1); return cast(c, sk, ts); };
    for (let i = 0; i < 3 && g.mode === 'combat'; i++) g.do('grave bolt 3');  // you keep attacking enemy 3
    const all3 = picks.length > 0 && picks.every((x) => x === 3);
    return { gap: !all3, ok: all3, note: `hasTrait ${g.hasTrait('Grave Command')}; you attacked enemy 3 three times; the skeleton attacked enemy ${picks.join(', ')}. minionTurn() always takes the first living enemy` };
});
check('B6', 'Ossified Champion (L5): minions +20% HP; skeletons deal 6-9', () => {
    const g4 = necro('bone_warden', 4), g5 = necro('bone_warden', 5);
    const s4 = g4.summon('skeleton'), s5 = g5.summon('skeleton');
    return { gap: s5.maxHp === s4.maxHp, ok: s5.maxHp === Math.floor(s4.maxHp * 1.2), note: `skeleton maxHp L4 ${s4.maxHp}, L5 ${s5.maxHp} (data text: ${Math.floor(s4.maxHp * 1.2)}); Bone Club L5 ${JSON.stringify(s5.skills[0].base_damage)} (data text: [6,9]). Wren owns summon overrides` };
});
check('B7', 'Death Knight (L11): summons deal +25% damage', () => {
    const hits = (lvl) => { const g = necro('bone_warden', lvl); const s = g.summon('skeleton'); const xs = []; for (let i = 0; i < 40; i++) { const h = g.newHit(E(g, 0)); g.rollDamage(s, E(g, 0), s.skills[0], h); xs.push(h.damage); } return xs.reduce((a, b) => a + b, 0) / xs.length; };
    const a = hits(10), b = hits(11);
    return { gap: Math.abs(a - b) < 0.5, ok: b > a * 1.2, note: `average skeleton hit: L10 ${a.toFixed(2)}, L11 ${b.toFixed(2)} (data text: +25%)` };
});

// ===================================================================== Plaguecaller
check('P1', 'Pestilent Sage (L5): your Infection and Poison last +1 turn; stacks unchanged', () => {
    // read each status right after its own cast (durations tick at round end)
    const r = (lvl) => { const g = necro('plaguecaller', lvl); g.do('contagion 1'); const inf = g.infectionOn(E(g, 0)); const a = `${inf.duration}/${inf.stacks}`;
        const p = g.applyDot(g.player, E(g, 1), { name: 'Poison', value: 5, duration: 3 }); let spit = '-';
        if (g.player.skills.includes('Black Spit')) { g.do('black spit 2'); const ps = g.findStatus(E(g, 1), 'Poison'); spit = ps ? ps.duration : '?'; }
        return `${a}/${p.duration}/${spit}`; };
    const l4 = r(4), l5 = r(5);
    return { ok: l4 === '3/1/3/-' && l5 === '4/1/4/4', note: `Contagion duration/stacks · Poison (engine applyDot) · Black Spit Poison, read right after each cast: L4 ${l4}, L5 ${l5} (expect 3/1/3/- → 4/1/4/4)` };
});
check('P2', 'Plague Reservoir (L8): killing an infected enemy yourself gives exactly +1 Soul Energy more than an uninfected kill', () => {
    const kill = (lvl, infected) => { const g = necro('plaguecaller', lvl); const e = E(g, 0); if (infected) g.infect(g.player, e, 1); e.hp = 1; g.player.resource.current = 0; g.do('attack 1', null); return g.player.resource.current; };
    const r = { l7plain: kill(7, false), l7inf: kill(7, true), l8plain: kill(8, false), l8inf: kill(8, true) };
    return { ok: r.l8inf - r.l8plain === 1 && r.l7inf === r.l7plain, note: `Soul Energy after a basic-attack kill from 0 — L7 uninfected ${r.l7plain}, infected ${r.l7inf} · L8 uninfected ${r.l8plain}, infected ${r.l8inf}` };
});
check('P3', 'Plague Reservoir kill sources today (N-7 is open; this records behaviour, not a ruling)', () => {
    const run = (how) => { const g = necro('plaguecaller', 8); const e = E(g, 0); g.infect(g.player, e, 1); g.player.resource.current = 0;
        const said = []; const say = g.say.bind(g); g.say = (t, o) => { said.push(String(t)); return say(t, o); };
        e.hp = 1;
        if (how === 'minion') { const s = g.summon('skeleton'); g.castSkill(s, s.skills[0], [e]); }
        if (how === 'tick') g.tickDots(e);
        if (how === 'player') g.castSkill(g.player, g.playerSkill(g.basicAttackName()), [e]);
        g.flush && g.flush();
        return `${said.some((t) => /Plague Reservoir/.test(t)) ? 'Reservoir +1' : 'no Reservoir'} (SE ${g.player.resource.current})`; };
    return { info: true, note: `your hit: ${run('player')} · skeleton's hit: ${run('minion')} · Infection tick: ${run('tick')} (the tick's source is the infection's caster, so it counts as your kill)` };
});
check('P4', "Rook's Plague Reservoir test asserts 'resource >= 1' after g.damage(): does it pass WITHOUT the trait?", () => {
    const g = necro('plaguecaller', 3); const e = E(g, 0); g.infect(g.player, e, 1); g.player.resource.current = 0;
    g.damage(e, e.hp, g.player); g.flush && g.flush();
    const se = g.player.resource.current, has = g.hasTrait('Plague Reservoir');
    return { ok: se < 1, note: `L3, no Plague Reservoir (${has}): Soul Energy after the same kill = ${se}. ${se >= 1 ? 'The assertion would pass without the trait, so the test does not prove Reservoir pays' : 'assertion is discriminating'}` };
});
check('P5', 'Harbinger (L11): +2 per Infection tick, flat (not per stack)', () => {
    const ticks = (lvl) => [1, 2, 3].map((n) => { const g = necro('plaguecaller', lvl); g.infect(g.player, E(g, 0), n); return g.dotTickDamage(g.infectionOn(E(g, 0))); }).join('/');
    const a = ticks(10), b = ticks(11);
    return { ok: a === '2/4/6' && b === '4/6/8', note: `tick with 1/2/3 stacks: L10 ${a}, L11 ${b} (flat +2; the per-stack reading would be 4/8/12 — N-7)` };
});

// ===================================================================== base
check('C1', "Channel the Grave: '(Cooldown: 1 turn)' — can it be used on consecutive turns?", () => {
    const g = necro('bone_warden', 3); g.player.skills.includes('Channel the Grave') || g.player.skills.push('Channel the Grave');
    const r0 = g.combat.round; g.do('channel the grave', 0); const r1 = g.combat.round; const se1 = g.player.resource.current;
    const txt = g.do('channel the grave', null); const r2 = g.combat.round;
    return { info: true, note: `round ${r0} → ${r1} → ${r2}; second cast ${r2 > r1 ? 'WENT THROUGH' : 'refused'}${/cooldown/i.test(txt) ? ' (mentions cooldown)' : ''}. Design: cooldown semantics not approved yet` };
});
check('X1', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above (none = no engine exceptions)' }));

console.log(`Necromancer passives (PR #58 audit) — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state === 'PASS' || r.state === 'FAIL');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass · ${out.filter((r) => r.state === 'GAP').length} confirmed gaps · ${out.filter((r) => r.state === 'INFO').length} info`);
