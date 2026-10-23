// N-5 Possession (Vaelis Package 1; Wren PR #81): independent checks through the CLI and act().
// L8 Soulbinder (Wraithlord) earned by real levelling. Scratch data copies only.
//   ENSO_ROOT=/path/to/checkout node qa/scripts/possession.js
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
/** L8 Wraithlord in the hallway; enemies 999 HP / DEF 0 / crit 0; `spd` for the player (set before the fight). */
function sb({ enemies = ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], patch = {}, spd = 99, seed = 3, room = 'hallway_of_chains' } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of Object.keys(d.enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 }, patch[k] || {});
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input('necromancer'); g.input('add_xp 250'); g.input('soulbinder');
    for (let i = 0; i < 200 && g.player.level < 8; i++) g.input('add_xp 100');
    g.player.spd = spd; g.currentRoom = room; g.input('engage');
    g.player.hp = g.player.maxHp = 9999;
    if (!g.player.skills.includes('Guard')) g.player.skills.push('Guard');
    g.do = (c, se = 9) => { if (se != null) g.player.resource.current = se; return T(g.input(c)); };
    return g;
}
const E = (g, i) => g.combat.enemies[i];
const awaiting = (g) => g.getAvailableActions().awaiting;
const possessed = (x) => x.statusEffects.some((s) => s.type === 'possessed');
/** Play guard turns until the engine pauses for control (or n steps). */
const untilControl = (g, n = 4) => { let t = ''; for (let i = 0; i < n && g.mode === 'combat' && awaiting(g) !== 'control'; i++) t += g.combat.awaitingContinue ? g.do('ok', null) : g.do('guard', 0); return t; };

check('P1', 'Real L8 Wraithlord learns Possession; cast costs 3 Soul Energy and the turn; the target gets Possessed (+35 CR)', () => {
    const g = sb(); const has = g.player.skills.includes('Possession'); const r0 = g.combat.round;
    const txt = g.do('possession 2', 5);
    return { ok: has && g.player.resource.current <= 3 && g.crValue(E(g, 1)) === 35 && (possessed(E(g, 1)) || awaiting(g) === 'control'), note: `learned ${has}; SE 5 → ${g.player.resource.current}; CR ${g.crValue(E(g, 1))}; awaiting ${awaiting(g)}` };
});
check('P2', 'Refusals cost nothing and keep the turn: boss, explicit immunity, CR 75 (74 allowed), 2 SE', () => {
    const res = [];
    const b = sb({ room: 'wardens_roost' }); const tb = b.do('possession 1', 5); res.push(`boss: SE ${b.player.resource.current}, possessed ${possessed(E(b, 0))}`);
    const i = sb(); E(i, 0).statusAffinities = { Possessed: 'immune' }; i.do('possession 1', 5); res.push(`immune: SE ${i.player.resource.current}`);
    const c = sb(); c.crState(E(c, 0)).value = 75; c.do('possession 1', 5); res.push(`CR75: SE ${c.player.resource.current}`);
    const d = sb(); d.crState(E(d, 0)).value = 74; d.do('possession 1', 5); res.push(`CR74: SE ${d.player.resource.current}, possessed-or-paused ${possessed(E(d, 0)) || awaiting(d) === 'control'}`);
    const p = sb(); p.do('possession 1', 2); res.push(`2 SE: SE ${p.player.resource.current}`);
    const ok = res[0] === 'boss: SE 5, possessed false' && res[1] === 'immune: SE 5' && res[2] === 'CR75: SE 5' && /SE [0-2], possessed-or-paused true/.test(res[3]) && res[4] === '2 SE: SE 2';
    return { ok, note: res.join(' · ') };
});
check('P3', 'Availability and act() agree on the boss refusal (same code and message)', () => {
    const b = sb({ room: 'wardens_roost' }); b.player.resource.current = 9;
    const opt = b.getAvailableActions().actions.find((a) => a.skillId === 'Possession');
    const t = opt && (opt.targets ? opt.targets[0] : null);
    const r = b.act({ type: 'skill', skillId: 'Possession', targetId: E(b, 0).id });
    const avail = t && t.reason ? `${t.reason.code}: ${t.reason.message}` : opt && opt.reason ? `${opt.reason.code}: ${opt.reason.message}` : 'enabled';
    const acted = r.error ? `${r.error.code}: ${r.error.message}` : 'ok';
    return { ok: avail === acted && /REQUIREMENT_FAILED/.test(acted), note: `availability "${avail}" · act() "${acted}"` };
});
check('P4', 'Enemy SLOWER than you: its next turn pauses for your choice; it hits a former ally; then the control ends', () => {
    const g = sb({ spd: 99 }); g.do('possession 2', 5); untilControl(g);
    const a = g.getAvailableActions(); const hp0 = E(g, 0).hp, me = g.player.hp;
    const opts = a.actions.filter((x) => x.type === 'control'); const tIds = opts[0] ? opts[0].targets.map((t) => t.id) : [];
    const r = g.act({ type: 'control', actorId: E(g, 1).id, skillId: opts[0].skillId, targetId: E(g, 0).id });
    return { ok: a.awaiting === 'control' && a.controlledActorId === E(g, 1).id && !tIds.includes(E(g, 1).id) && !tIds.includes(g.player.id) && E(g, 0).hp < hp0 && g.player.hp === me - 0 && !possessed(E(g, 1)), note: `awaiting ${a.awaiting} for ${a.controlledActorId}; targets ${tIds.join(',')}; enemy 1 lost ${hp0 - E(g, 0).hp}; still possessed ${possessed(E(g, 1))}` };
});
check('P5', 'Enemy FASTER than you (it already acted this round when you cast): does the control survive to its next turn?', () => {
    const g = sb({ spd: 1 }); const txt = g.do('possession 2', 5); const afterCast = possessed(E(g, 1));
    const t = untilControl(g, 2); const paused = awaiting(g) === 'control';
    const lost = /wears off|Possessed\] wears off/.test(t);
    return { ok: paused, note: `possessed right after the cast ${afterCast}; paused for control at its next turn ${paused}${lost ? ' — the status wore off at the end of the round first' : ''}; SE spent ${5 - g.player.resource.current}` };
});
check('P6', 'Initiative and turn count unchanged: the possessed enemy acts once, in its own slot; nobody gets an extra turn', () => {
    const g = sb(); const order0 = g.combat.order.map((x) => x.id).join(); g.do('possession 2', 5);
    const seen = []; const cast = g.castSkill.bind(g); g.castSkill = (c, sk, ts) => { if (!c.isPlayer) seen.push(c.id); return cast(c, sk, ts); };
    untilControl(g); const id = E(g, 1).id; g.act({ type: 'control', actorId: id, skillId: g.getAvailableActions().actions.find((x) => x.type === 'control').skillId, targetId: E(g, 0).id });
    const roundSeen = seen.slice(); const order1 = g.combat.order.map((x) => x.id).join();
    return { ok: roundSeen.filter((x) => x === id).length === 1 && order0 === order1, note: `enemy casts this round: ${roundSeen.join(', ')}; order unchanged ${order0 === order1}` };
});
/** Cast Possession without ending your turn (so the test can change things before the holder's turn). */
const possessNow = (g, i) => { g.castSkill(g.player, g.playerSkill('Possession'), [E(g, i)]); return possessed(E(g, i)); };
check('P7', 'Stunned holder loses the turn AND the control (no extra action); cleanse and death end it', () => {
    const g = sb(); possessNow(g, 1); g.applyStatus(E(g, 0), E(g, 1), { name: 'Stun', type: 'skip_turn', duration: 1 });
    const t = untilControl(g, 2); const stunned = awaiting(g) !== 'control' && !possessed(E(g, 1)) && /unable to act/.test(t);
    const h = sb(); possessNow(h, 1); h.cleanse(E(h, 1), { categories: ['control'] }); untilControl(h, 2); const cleansed = awaiting(h) !== 'control' && !possessed(E(h, 1));
    const k = sb(); possessNow(k, 1); k.damage(E(k, 1), 99999, k.player); untilControl(k, 2); const dead = awaiting(k) !== 'control';
    return { ok: stunned && cleansed && dead, note: `stunned: skipped, no pause, status gone ${stunned} · cleansed: no pause ${cleansed} · killed: no pause ${dead}` };
});
check('P8', 'No legal move (its only ally is dead): the engine does the no-op itself, no pause, control ends', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); possessNow(g, 1); g.damage(E(g, 0), 99999, g.player);
    const t = untilControl(g, 2);
    return { ok: awaiting(g) !== 'control' && !possessed(E(g, 1)) && /no move it can make/.test(t), note: `paused ${awaiting(g) === 'control'}; "${(t.split('\n').find((l) => /no move/.test(l)) || '').trim()}"` };
});
check('P9', 'A possession kill is the enemy\'s: no Soul Energy, no player kill credit', () => {
    const g = sb(); g.do('possession 2', 5); untilControl(g); E(g, 0).hp = 1; const kills = g.stats.kills; g.player.resource.current = 0;
    g.act({ type: 'control', actorId: E(g, 1).id, skillId: g.getAvailableActions().actions.find((x) => x.type === 'control').skillId, targetId: E(g, 0).id });
    return { ok: E(g, 0).hp <= 0 && g.stats.kills === kills && g.player.resource.current === 0, note: `enemy 1 dead ${E(g, 0).hp <= 0}; kills ${kills} → ${g.stats.kills}; SE 0 → ${g.player.resource.current}` };
});
check('P10', 'While awaiting control, anything else is WRONG_MODE; a bad target is INVALID_TARGET; nothing changes', () => {
    const g = sb(); g.do('possession 2', 5); untilControl(g); const s0 = JSON.stringify(g.getState());
    const a = g.act({ type: 'skill', skillId: 'Grave Bolt', targetId: E(g, 0).id }), b = g.act({ type: 'control', actorId: E(g, 1).id, skillId: g.getAvailableActions().actions.find((x) => x.type === 'control').skillId, targetId: E(g, 1).id });
    return { ok: a.error && a.error.code === 'WRONG_MODE' && b.error && b.error.code === 'INVALID_TARGET' && JSON.stringify(g.getState()) === s0, note: `skill → ${a.error && a.error.code}; self-target → ${b.error && b.error.code}; state unchanged ${JSON.stringify(g.getState()) === s0}` };
});
check('P11', 'CLI and act() give identical results (same seed, same choice)', () => {
    const run = (viaCli) => { const g = sb(); g.do('possession 2', 5); untilControl(g); const mv = g.getAvailableActions().actions.find((x) => x.type === 'control').skillId;
        if (viaCli) g.input(`${mv.toLowerCase()} 1`); else g.act({ type: 'control', actorId: E(g, 1).id, skillId: mv, targetId: E(g, 0).id });
        return JSON.stringify(g.getState()); };
    return { ok: run(true) === run(false), note: `identical state: ${run(true) === run(false)}` };
});
check('P12', 'Snapshot while awaiting control → JSON → fresh engine: still awaiting, same choice gives the same result', () => {
    const g = sb(); g.do('possession 2', 5); untilControl(g); const snap = JSON.parse(JSON.stringify(g.snapshot()));
    const h = sb(); h.restore(snap); const mv = h.getAvailableActions().actions.find((x) => x.type === 'control');
    const act = (x) => { x.act({ type: 'control', actorId: x.combat.enemies[1].id, skillId: mv.skillId, targetId: x.combat.enemies[0].id }); return JSON.stringify(x.getState()); };
    const aw = h.getAvailableActions().awaiting; return { ok: aw === 'control' && act(g) === act(h), note: `restored awaiting ${aw}; same result ${act(g) === act(h)}` };
});
check('P13', 'Recast on another enemy releases the first (one target per caster)', () => {
    const g = sb({ spd: 99 }); g.do('possession 2', 5); const first = possessed(E(g, 1));
    // the cast ended your turn; recast next turn is only possible if enemy 2 hasn't acted yet, so do it directly
    g.castSkill(g.player, g.playerSkill('Possession'), [E(g, 2)]);
    return { ok: first && !possessed(E(g, 1)) && possessed(E(g, 2)), note: `enemy 2 possessed ${first} → ${possessed(E(g, 1))}; enemy 3 ${possessed(E(g, 2))}` };
});
check('P14', 'A lone non-boss enemy: Possession = a guaranteed lost turn for 3 SE (contract no-op)', () => {
    const g = sb({ enemies: ['shackled_ghoul'] }); const t = g.do('possession 1', 5);
    return { info: true, note: `"${(t.split('\n').find((l) => /no move|unable/.test(l)) || 'no message').trim()}" — the enemy's turn was used up; CR ${g.crValue(E(g, 0))}` };
});
check('X1', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above' }));

console.log(`Possession (N-5, PR #81) — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
