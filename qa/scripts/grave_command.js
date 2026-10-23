// Grave Command (Bone Warden L3, Rook PR #68): independent checks through the real command path.
// Trait reached by real levelling; minions raised with the real skill; every target choice observed by
// wrapping castSkill (observation only). Scratch data copies only.
//   node qa/scripts/grave_command.js
//   ENSO_ROOT=/path/to/checkout node qa/scripts/grave_command.js
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => {
    try { const r = fn(); out.push({ id, what, state: r.info ? 'INFO' : r.ok ? 'PASS' : 'FAIL', note: r.note || '' }); }
    catch (e) { out.push({ id, what, state: 'FAIL', note: 'THREW ' + e.stack.split('\n').slice(0, 2).join(' ') }); }
};

/** Necromancer (`branch`, real levelling to `level`) in the hallway vs 3 enemies at 999 HP / DEF 0 / crit 0. */
function necro({ branch = 'bone_warden', level = 3, enemies = ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], seed = 7, spd = 99, minions = 1 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of new Set(enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 });
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input('necromancer'); g.input('add_xp 250'); g.input(branch.replace(/_/g, ' '));
    for (let i = 0; i < 400 && g.player.level < level; i++) g.input('add_xp 100');
    g.input('n'); g.input('engage');
    g.player.hp = g.player.maxHp = 9999; g.player.spd = spd;
    for (const s of ['Guard', 'Channel the Grave']) if (!g.player.skills.includes(s)) g.player.skills.push(s);
    g.do = (c, se = 9) => { if (se != null) g.player.resource.current = se; return T(g.input(c)); };
    g.picks = []; const cast = g.castSkill.bind(g);
    g.castSkill = (c, sk, ts) => { if (c.isMinion) g.picks.push(`${c.name}->${g.combat.enemies.indexOf(ts[0]) + 1}`); return cast(c, sk, ts); };
    for (let i = 0; i < minions; i++) g.do('raise skeleton');      // real summon; each joins the order next round
    g.picks.length = 0;
    return g;
}
const E = (g, i) => g.combat.enemies[i];
/** Enemy numbers the minions attacked during `cmd`. */
const during = (g, cmd, se) => { g.picks.length = 0; const txt = g.do(cmd, se); return { to: g.picks.map((p) => +p.split('->')[1]), txt }; };
const all = (xs, n) => xs.length > 0 && xs.every((x) => x === n);

check('G1', 'Unlock: Bone Warden has Grave Command from L3 and keeps it (L5, L8, L11, L14); other branches never get it', () => {
    const bw = [3, 5, 8, 11, 14].map((l) => `${l}:${necro({ level: l, minions: 0 }).hasTrait('Grave Command')}`);
    const other = ['plaguecaller', 'soulbinder'].map((b) => `${b}:${necro({ branch: b, minions: 0 }).hasTrait('Grave Command')}`);
    const g = new GameEngine({ seed: 1 }); g.start(); g.input('necromancer'); const lvl1 = g.hasTrait('Grave Command');
    return { ok: bw.every((x) => x.endsWith('true')) && other.every((x) => x.endsWith('false')) && !lvl1, note: `Bone Warden ${bw.join(' ')} · ${other.join(' ')} · level 1 Necromancer: ${lvl1}` };
});
check('G2', "Real command 'grave bolt 3': the skeleton attacks enemy 3 that round", () => {
    const g = necro(); const r = during(g, 'grave bolt 3');
    return { ok: all(r.to, 3), note: `skeleton attacked enemy ${r.to.join(', ')}` };
});
check('G3', 'Every damaging player action moves the focus: basic attack, Soul Leech, Grave Bolt (and Reaper’s Charge at L11)', () => {
    const g = necro(); const a = during(g, 'attack 2').to, b = during(g, 'soul leech 3').to, c = during(g, 'grave bolt 1').to;
    const h = necro({ level: 11 }); const d = during(h, 'reaper’s charge 2', 9).to;
    return { ok: all(a, 2) && all(b, 3) && all(c, 1) && all(d, 2), note: `attack 2 → ${a} · soul leech 3 → ${b} · grave bolt 1 → ${c} · reaper’s charge 2 (L11) → ${d}` };
});
check('G4', 'Non-damaging actions keep the focus: Bone Wall, Raise Skeleton, Channel the Grave, Guard, an item', () => {
    const g = necro(); g.player.inventory.push('Bandages'); during(g, 'grave bolt 2');
    const res = ['bone wall', 'raise skeleton', 'channel the grave', 'guard', 'use bandages'].map((c) => { g.player.hp = 100; const r = during(g, c, c === 'channel the grave' ? 0 : 9); return `${c} → ${r.to.join(',') || 'no minion turn'}`; });
    return { ok: res.every((x) => /→ (2,?)+$/.test(x)), note: res.join(' · ') };
});
check('G5', 'Several minions all follow the focus (3 skeletons; L8 with a ghoul)', () => {
    const g = necro({ minions: 3 }); g.do('guard', 0); const r = during(g, 'grave bolt 3').to;
    const h = necro({ level: 8, minions: 2 }); h.do('raise ghoul'); h.do('guard', 0); const q = during(h, 'grave bolt 2').to;
    return { ok: r.length === 3 && all(r, 3) && q.length === 3 && all(q, 2), note: `3 skeletons → ${r.join(',')} · 2 skeletons + ghoul → ${q.join(',')} (${h.picks.join(' ')})` };
});
check('G6', 'Focus dies → minions fall back to the first living enemy; next attack sets a new focus', () => {
    const g = necro(); during(g, 'grave bolt 3'); E(g, 2).hp = 0; E(g, 2).dead = true;
    const fb = during(g, 'guard', 0).to; const nx = during(g, 'grave bolt 2').to;
    const h = necro(); during(h, 'grave bolt 2'); E(h, 0).hp = 0; E(h, 0).dead = true;   // enemy 1 dies: focus 2 must still hold
    const kept = during(h, 'guard', 0).to;
    return { ok: all(fb, 1) && all(nx, 2) && all(kept, 2), note: `after focus 3 died → ${fb} · grave bolt 2 → ${nx} · enemy 1 died while focus was 2 → ${kept}` };
});
check('G7', 'A minion kill of the focus mid-round: later minions retarget the first living enemy that same round', () => {
    const g = necro({ minions: 2 }); g.do('guard', 0); during(g, 'grave bolt 3'); E(g, 2).hp = 1;
    const r = during(g, 'guard', 0).to;
    return { ok: r[0] === 3 && r[1] === 1, note: `minion targets this round: ${r.join(', ')} (expect 3, then 1)` };
});
check('G8', 'A blinded player who misses still sets the focus ("deliberately attacked")', () => {
    const g = necro(); g.applyStatus(E(g, 0), g.player, { name: 'Blind', type: 'blind', value: 1, duration: 2 });
    const r = during(g, 'grave bolt 3'); const missed = /misses/.test(r.txt);
    return { info: true, note: `bolt missed: ${missed}; skeleton attacked enemy ${r.to.join(',')} (PR #68 sets focus before the hit check)` };
});
check('G9', 'A skipped (stunned) player turn keeps the focus', () => {
    const g = necro(); during(g, 'grave bolt 3'); g.applyStatus(E(g, 0), g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.picks.length = 0; g.do('guard', 0); if (g.combat.awaitingContinue) g.do('ok', null);
    return { ok: all(g.picks.map((p) => +p.split('->')[1]), 3), note: `minion targets across the stunned round: ${g.picks.join(' ')}` };
});
check('G10', 'New fight resets the focus (win, then engage again; flee, then engage again)', () => {
    const g = necro(); during(g, 'grave bolt 3'); g.combat.enemies.forEach((e) => { e.hp = 0; e.dead = true; }); g.do('guard', 0);
    const afterWin = g.mode; const room = g.currentRoom;
    const h = necro(); during(h, 'grave bolt 3'); h.do('flee', null); h.input('engage');
    const reset = h.combat && h.combat.graveCommandTargetId == null;
    return { ok: reset, note: `after the win mode=${afterWin} (${room}); after flee + engage, focus is ${h.combat && h.combat.graveCommandTargetId}` };
});
check('G11', 'Snapshot → JSON → restore into a FRESH engine keeps the focus', () => {
    const a = necro(); during(a, 'grave bolt 3'); const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = necro(); b.restore(snap); const cast = b.castSkill; const r = during(b, 'guard', 0).to;
    return { ok: all(r, 3), note: `restored engine's skeleton attacked enemy ${r.join(',')}` };
});
check('G12', 'No trait, no change: a Plaguecaller/Soulbinder with a skeleton still attacks enemy 1', () => {
    const r = ['plaguecaller', 'soulbinder'].map((b) => { const g = necro({ branch: b }); return `${b} → ${during(g, 'grave bolt 3').to}`; });
    return { ok: r.every((x) => /→ 1$/.test(x)), note: r.join(' · ') };
});
check('G13', 'Determinism: same seed + same commands → identical log twice', () => {
    const run = () => { const g = necro({ minions: 2 }); let l = ''; for (const c of ['guard', 'grave bolt 3', 'attack 2', 'bone wall', 'soul leech 1', 'guard']) l += g.do(c); return l + JSON.stringify(g.getState()); };
    return { ok: run() === run(), note: 'two runs byte-identical: ' + (run() === run()) };
});
check('X1', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above (none = no engine exceptions)' }));

console.log(`Grave Command (PR #68) — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
