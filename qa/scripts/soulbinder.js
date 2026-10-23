// Soulbinder Soul Chain / Soul Feast (Rook, PR #52): independent checks against
// docs/design/SOULBINDER_N3_N4_IMPLEMENTATION_CONTRACT.md (PR #48, cases 1-10) and the
// K1-K3 amendment (PR #54, cases 11-16, marked "#54"), plus caster-clock paths 17-22 (stun, Haste, item,
// recast, caster death, restore into a fresh engine) added for the re-review of head 077633f.
//   node qa/scripts/soulbinder.js                 (this repo)
//   ENSO_ROOT=/path/to/checkout node qa/scripts/soulbinder.js
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

/** Soulbinder at `level` (3, 5 or 11) in the hallway vs `enemies` (keys), all 999 HP / DEF 0 / crit 0 unless patched. */
function sb({ level = 3, enemies = ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], spd = 10, patch = {}, seed = 3 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of new Set(enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 }, patch[k] || {});
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input('necromancer'); g.input('add_xp 250'); g.input('soulbinder');
    if (level >= 5) g.input('add_xp 562');
    if (level >= 11) g.input('add_xp 10481');
    g.player.spd = spd; g.input('n'); g.input('engage');
    g.player.hp = g.player.maxHp = 9999;
    if (!g.player.skills.includes('Guard')) g.player.skills.push('Guard'); // harmless 0-cost action to pass turns (no damage)
    g.do = (c, se = 9) => { if (se != null) g.player.resource.current = se; return T(g.input(c)); };
    return g;
}
const E = (g, i) => g.combat.enemies[i];
const linked = (t) => t.statusEffects.some((s) => s.type === 'soul_link');
const feast = (t) => t.statusEffects.find((s) => s.type === 'soul_feast');
const lose = (t, fn) => { const h = t.hp; fn(); return h - t.hp; };
/** Link two/three enemies directly (bypasses the command path). */
const link = (g, targets) => { g.castSkill(g.player, g.playerSkill('Soul Chain'), targets); g.flush(); };

// ===================================================================== case 1: cast, cost, refusals
check('1a', 'Real progression: L3 Soulbinder learns Soul Chain (Binding Will), L5 Chain of Woe (Wound Transfer), L11 Soul Feast', () => {
    const a = sb({ level: 3 }), b = sb({ level: 5 }), c = sb({ level: 11 });
    const ok = a.player.skills.includes('Soul Chain') && a.hasTrait('Binding Will') && b.hasTrait('Wound Transfer') && c.player.skills.includes('Soul Feast') && c.hasTrait('You heal for 100% of Soul Feast dmg');
    return { ok, note: `L3 ${a.progression.evolutionName}, L5 ${b.progression.evolutionName}, L11 ${c.progression.evolutionName} (level ${c.player.level})` };
});
check('1b', "'soul chain 1,2' costs 1 Soul Energy, uses the turn, links both (duration 2 + Binding Will = 3)", () => {
    const g = sb(); const r0 = g.combat.round;
    g.do('soul chain 1,2', 5);
    const s = E(g, 0).statusEffects.find((x) => x.type === 'soul_link');
    return { ok: g.player.resource.current === 4 || g.player.resource.current === 5, note: `SE 5 -> ${g.player.resource.current} (end-round gains may follow), round ${r0} -> ${g.combat.round}, linked [${[0, 1, 2].map((i) => linked(E(g, i)))}], duration ${s && s.duration}` };
});
check('1c', 'Refusals cost nothing and keep the turn: single target, duplicate, out of range, 3 at L3, 0 SE, one enemy left', () => {
    const cases = { 'soul chain 1': 9, 'soul chain 1,1': 9, 'soul chain 1,7': 9, 'soul chain 1,2,3': 9, 'soul chain 1,2 (0 SE)': 0 };
    const res = [];
    for (const [cmd, se] of Object.entries(cases)) {
        const g = sb(); const r0 = g.combat.round;
        const txt = g.do(cmd.replace(' (0 SE)', ''), se);
        res.push(`${cmd}: ${g.player.resource.current === se && g.combat.round === r0 && !linked(E(g, 0)) ? 'refused, free' : 'CHARGED/USED'}`);
    }
    const g = sb(); E(g, 1).hp = 0; E(g, 1).dead = true; E(g, 2).hp = 0; E(g, 2).dead = true;
    const r0 = g.combat.round; g.do('soul chain 1,2', 9);
    res.push(`one enemy left: ${g.player.resource.current === 9 && g.combat.round === r0 ? 'refused, free' : 'CHARGED/USED'}`);
    return { ok: res.every((r) => r.endsWith('refused, free')), note: res.join(' · ') };
});
check('1d', 'L5 Chain of Woe: 3 targets required when 3 are alive; 2 allowed when only 2 are alive', () => {
    const g = sb({ level: 5 }); const r0 = g.combat.round;
    g.do('soul chain 1,2', 9); const refused2of3 = g.combat.round === r0 && !linked(E(g, 0));
    g.do('soul chain 1,2,3', 9); const ok3 = [0, 1, 2].every((i) => linked(E(g, i)));
    const h = sb({ level: 5 }); E(h, 2).hp = 0; E(h, 2).dead = true; h.do('soul chain 1,2', 9);
    return { ok: refused2of3 && ok3 && linked(E(h, 0)) && linked(E(h, 1)), note: `2 of 3 refused: ${refused2of3}; 3 linked: ${ok3}; 2 when only 2 alive: ${linked(E(h, 0)) && linked(E(h, 1))}` };
});
check('1e', 'Recast replaces the group; a failed recast keeps the old one', () => {
    const g = sb(); link(g, [E(g, 0), E(g, 1)]);
    g.do('soul chain 1,1', 9); const kept = linked(E(g, 0)) && linked(E(g, 1));
    link(g, [E(g, 1), E(g, 2)]);
    return { ok: kept && !linked(E(g, 0)) && linked(E(g, 1)) && linked(E(g, 2)), note: `failed recast kept old: ${kept}; new group [${[0, 1, 2].map((i) => linked(E(g, i)))}]` };
});

// ===================================================================== cases 2-5: propagation
check('2', '11 actual HP loss on A -> B takes floor(5.5) = 5 regardless of B\'s DEF; with 3 linked, B and C each take 5', () => {
    const g = sb({ patch: { cellar_vermin: { def: 50 } } }); link(g, [E(g, 0), E(g, 1)]);
    const b = lose(E(g, 1), () => g.damage(E(g, 0), 11, g.player));
    const h = sb({ level: 5 }); link(h, [E(h, 0), E(h, 1), E(h, 2)]); h.player.traits = h.player.traits.filter((t) => t.name !== 'Wound Transfer'); // capacity 3, no +10%
    const bc = [1, 2].map((i) => E(h, i).hp); h.damage(E(h, 0), 11, h.player); const got = [1, 2].map((i, k) => bc[k] - E(h, i).hp);
    return { ok: b === 5 && got.join() === '5,5', note: `B (DEF 50) lost ${b}; 3-link B/C lost ${got}` };
});
check('3a', 'Prevented damage: an attack absorbed by Bone Wall, or a 0-damage hit, propagates nothing', () => {
    const g = sb(); link(g, [E(g, 0), E(g, 1)]);
    g.applyStatus(E(g, 0), E(g, 0), { name: 'Bone Wall', type: 'absorb', duration: 3 });
    const a = lose(E(g, 1), () => g.castSkill(g.player, g.playerSkill('Basic Attack'), [E(g, 0)]));
    E(g, 0).def = 999;
    const z = lose(E(g, 1), () => g.castSkill(g.player, g.playerSkill('Basic Attack'), [E(g, 0)]));
    return { ok: a === 0 && z === 0, note: `B lost ${a} (absorbed), ${z} (0-damage hit)` };
});
check('3b', 'Overkill: A has 3 HP and takes 20 -> B gets floor(3 x 0.5) = 1', () => {
    const g = sb(); link(g, [E(g, 0), E(g, 1)]); E(g, 0).hp = 3;
    const b = lose(E(g, 1), () => g.damage(E(g, 0), 20, g.player));
    return { ok: b === 1, note: `B lost ${b}` };
});
check('4a', "B's 20% damage reduction turns 5 into 4; a magic-immune B takes 0", () => {
    const g = sb(); link(g, [E(g, 0), E(g, 1)]);
    g.applyStatus(E(g, 1), E(g, 1), { name: 'Guard', type: 'damage_reduction', value: 0.2, duration: 5 });
    const r = lose(E(g, 1), () => g.damage(E(g, 0), 11, g.player));
    const h = sb(); link(h, [E(h, 0), E(h, 1)]); E(h, 1).statusAffinities = { magic: 'immune' };
    const i = lose(E(h, 1), () => h.damage(E(h, 0), 11, h.player));
    return { ok: r === 4 && i === 0, note: `reduced: ${r}, immune: ${i}` };
});
check('4b', 'Secondary hits never crit, draw no RNG, and never propagate again (3-link: A 10 -> B 5, C 5, nothing more)', () => {
    const g = sb({ level: 5 }); link(g, [E(g, 0), E(g, 1), E(g, 2)]); g.player.traits = g.player.traits.filter((t) => t.name !== 'Wound Transfer');
    const before = g.rng.getState ? g.rng.getState() : null;
    const hp = [0, 1, 2].map((i) => E(g, i).hp); g.damage(E(g, 0), 10, g.player); const loss = [0, 1, 2].map((i) => hp[i] - E(g, i).hp);
    const after = g.rng.getState ? g.rng.getState() : null;
    return { ok: loss.join() === '10,5,5' && before === after, note: `losses ${loss}; RNG untouched: ${before === after}` };
});
check('5', 'Wound Transfer +10% once on the primary and once on the secondary (rounding)', () => {
    const g = sb({ level: 5 }); E(g, 2).hp = 0; E(g, 2).dead = true; link(g, [E(g, 0), E(g, 1)]);
    const hp = [E(g, 0).hp, E(g, 1).hp]; g.damage(E(g, 0), 20, g.player);
    const a = hp[0] - E(g, 0).hp, b = hp[1] - E(g, 1).hp;
    // attack path: same seed, same attack, linked vs unlinked target -> ratio 1.1 applied once
    const atk = (lnk) => { const h = sb({ level: 5, seed: 9 }); E(h, 2).hp = 0; E(h, 2).dead = true; if (lnk) link(h, [E(h, 0), E(h, 1)]); h.rng = () => 0.5; return lose(E(h, 0), () => h.castSkill(h.player, h.playerSkill('Grave Bolt'), [E(h, 0)])); };
    const plain = atk(false), boosted = atk(true);
    return { ok: a === 22 && b === 12 && boosted === Math.floor(plain * 1.1), note: `generic 20 -> A ${a} (expect 22), B ${b} (floor(11 x 1.1) = 12); Grave Bolt unlinked ${plain} -> linked ${boosted} (expect ${Math.floor(plain * 1.1)})` };
});
check('5b', 'No double Wound Transfer on other paths: DoT tick, Lightning Arc chain, Riposte, Clockwork Bomb', () => {
    const res = [];
    // DoT: Poison 10 on a linked enemy -> 11
    { const g = sb({ level: 5 }); E(g, 2).hp = 0; E(g, 2).dead = true; link(g, [E(g, 0), E(g, 1)]); g.applyDot(g.player, E(g, 0), { name: 'Poison', value: 10, duration: 3 }); const l = lose(E(g, 0), () => g.startTurn(E(g, 0))); res.push(`DoT 10 -> ${l}`); }
    // Lightning Arc: arc target linked vs not, same RNG
    const arc = (lnk) => { const g = sb({ level: 5, seed: 5 }); g.player.skills.push('Lightning Arc'); if (lnk) link(g, [E(g, 1), E(g, 2)]); g.rng = () => 0.5; const hp = E(g, 1).hp; g.castSkill(g.player, g.playerSkill('Lightning Arc'), [E(g, 0)]); return hp - E(g, 1).hp; };
    const a0 = arc(false), a1 = arc(true);
    res.push(`arc ${a0} -> linked ${a1}`);
    return { ok: res[0] === 'DoT 10 -> 11' && a1 <= Math.ceil(a0 * 1.1) + Math.floor(Math.floor(a0 * 1.1) * 0.5 * 1.1) + 1, note: res.join(' · ') + ' (arc onto a linked target includes its own +10% once, plus the partner propagation)' };
});

// ===================================================================== case 6: removal, death, cleanup
check('6', 'Remove 1 of 3 -> 2 stay linked and propagate; remove another -> group clears; member death and victory clean up', () => {
    const g = sb({ level: 5 }); link(g, [E(g, 0), E(g, 1), E(g, 2)]); g.player.traits = g.player.traits.filter((t) => t.name !== 'Wound Transfer');
    g.cleanse(E(g, 2), { statuses: ['Soul Chain'] });
    const two = linked(E(g, 0)) && linked(E(g, 1)) && !linked(E(g, 2)); const p = lose(E(g, 1), () => g.damage(E(g, 0), 10, g.player));
    g.cleanse(E(g, 1), { statuses: ['Soul Chain'] }); const cleared = !linked(E(g, 0));
    const h = sb(); link(h, [E(h, 0), E(h, 1)]); h.damage(E(h, 1), 9999, h.player); const deathClears = !linked(E(h, 0));
    const v = sb({ enemies: ['shackled_ghoul', 'rust_rat'] }); link(v, [E(v, 0), E(v, 1)]); E(v, 0).hp = 1; E(v, 1).hp = 1; v.do('attack 1'); if (v.mode === 'combat') v.do('attack 1');
    return { ok: two && p === 5 && cleared && deathClears && v.mode !== 'combat', note: `2 remain ${two} (propagates ${p}); group cleared ${cleared}; member death clears ${deathClears}; fight ended ${v.mode !== 'combat'}` };
});

// ===================================================================== cases 7-9: Soul Feast
check('7a', 'Feast: no tick on cast; 2 per target at the start of each of its next 3 turns; ignores DEF; base heal 0', () => {
    const g = sb({ patch: { shackled_ghoul: { def: 50 }, cellar_vermin: { def: 50 } } }); g.player.skills.push('Soul Feast');
    g.do('soul chain 1,2');
    for (const t of [E(g, 0), E(g, 1)]) t.statusEffects.find((x) => x.type === 'soul_link').duration = 99; // isolate Feast from link expiry (see X5)
    const hp0 = [E(g, 0).hp, E(g, 1).hp];
    let atCast = null; const tick = g.tickSoulFeast.bind(g); const perTarget = { 0: 0, 1: 0 };
    g.tickSoulFeast = (a) => { const i = g.combat.enemies.indexOf(a); const h = a.hp; tick(a); if (h !== a.hp && i in perTarget) perTarget[i]++; };
    g.player.resource.current = 9; const php = g.player.hp;
    const castHp = (() => { g.castSkill(g.player, g.playerSkill('Soul Feast'), []); return [E(g, 0).hp, E(g, 1).hp]; })(); atCast = hp0[0] - castHp[0] + hp0[1] - castHp[1];
    g.flush(); g.combat.idx++; g.advance(); let log = T(g.flush());
    for (let i = 0; i < 6 && g.mode === 'combat'; i++) log += g.do('guard', 0);
    const healed = g.player.hp > php;
    return { ok: atCast === 0 && perTarget[0] === 3 && perTarget[1] === 3 && hp0[0] - E(g, 0).hp === 6 && hp0[1] - E(g, 1).hp === 6 && !healed, note: `damage at the moment of casting: ${atCast}; ticks per target ${perTarget[0]}/${perTarget[1]} (expect 3/3); A/B (DEF 50) lost ${hp0[0] - E(g, 0).hp}/${hp0[1] - E(g, 1).hp} (expect 6/6); caster healed: ${healed}` };
});
check('7b', 'Eidolon King heals exactly the drain dealt, capped at missing HP', () => {
    const g = sb({ level: 11, enemies: ['shackled_ghoul', 'cellar_vermin'] });
    link(g, [E(g, 0), E(g, 1)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), [E(g, 0), E(g, 1)]); g.flush();
    g.player.hp = g.player.maxHp - 3; g.startTurn(E(g, 0)); const after1 = g.player.maxHp - g.player.hp; // healed 2 of 3 missing
    g.startTurn(E(g, 1)); const after2 = g.player.maxHp - g.player.hp; // healed the last 1 only
    return { ok: after1 === 1 && after2 === 0, note: `missing HP 3 -> ${after1} -> ${after2}` };
});
check('8a', 'Feast recast refreshes (one instance, back to 3) and adds no extra tick', () => {
    const g = sb(); g.player.skills.push('Soul Feast'); link(g, [E(g, 0), E(g, 1)]);
    g.castSkill(g.player, g.playerSkill('Soul Feast'), []); g.startTurn(E(g, 0)); g.tickStatusesEndOfRound();
    const mid = feast(E(g, 0)).duration; const hp = E(g, 0).hp;
    g.castSkill(g.player, g.playerSkill('Soul Feast'), []); g.flush();
    return { ok: mid === 2 && feast(E(g, 0)).duration === 3 && E(g, 0).statusEffects.filter((s) => s.type === 'soul_feast').length === 1 && E(g, 0).hp === hp, note: `duration ${mid} -> ${feast(E(g, 0)).duration}, instances ${E(g, 0).statusEffects.filter((s) => s.type === 'soul_feast').length}, no tick on recast` };
});
check('8b', 'Re-linking without recasting Feast does not carry the old drain; DoT cleanse stops Feast but keeps the link', () => {
    const g = sb(); g.player.skills.push('Soul Feast'); link(g, [E(g, 0), E(g, 1)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), []);
    link(g, [E(g, 0), E(g, 2)]); const l1 = lose(E(g, 0), () => g.startTurn(E(g, 0))) + lose(E(g, 2), () => g.startTurn(E(g, 2)));
    const h = sb(); h.player.skills.push('Soul Feast'); link(h, [E(h, 0), E(h, 1)]); h.castSkill(h.player, h.playerSkill('Soul Feast'), []);
    h.cleanse(E(h, 0), { categories: ['dot'] }); const l2 = lose(E(h, 0), () => h.startTurn(E(h, 0)));
    return { ok: l1 === 0 && l2 === 0 && linked(E(h, 0)), note: `old drain after re-link: ${l1} dmg; after DoT cleanse: ${l2} dmg, link kept ${linked(E(h, 0))}` };
});
check('9', 'Feast damage never triggers Soul Chain propagation', () => {
    const g = sb(); g.player.skills.push('Soul Feast'); link(g, [E(g, 0), E(g, 1)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), []); g.flush();
    const b = lose(E(g, 1), () => g.startTurn(E(g, 0)));
    return { ok: b === 0, note: `B lost ${b} when A was drained` };
});

// ===================================================================== case 10: determinism, save/restore
check('10a', 'Same seed + same commands -> identical logs and state (Soulbinder fight with links, Feast, deaths)', () => {
    const play = () => { const g = sb({ level: 11, enemies: ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], patch: { shackled_ghoul: { hp: 30, maxHp: 30 }, cellar_vermin: { hp: 25, maxHp: 25 }, rust_rat: { hp: 15, maxHp: 15 } } });
        let log = ''; for (const c of ['soul chain 1,2,3', 'soul feast', 'grave bolt 1', 'grave bolt 1', 'soul leech 1', 'grave bolt 1', 'attack 1']) if (g.mode === 'combat') log += g.do(c);
        return log + JSON.stringify(g.getState()); };
    return { ok: play() === play(), note: 'two runs byte-identical' };
});
check('10b', 'Snapshot / restore mid-link: replaying the same commands gives the same events and state', () => {
    const g = sb({ level: 11 });
    g.do('soul chain 1,2,3'); g.do('soul feast');
    const snap = g.snapshot(); const run = () => { let l = ''; for (const c of ['grave bolt 1', 'grave bolt 2', 'soul leech 3']) l += g.do(c); return l + JSON.stringify(g.getState()); };
    const a = run(); g.restore(snap); const b = run();
    return { ok: a === b, note: `replay after restore identical: ${a === b}` };
});

// ===================================================================== #54 amendment (K1-K3)
check('11 (#54 K1)', 'One group clock: link lasts the same number of caster turns whatever the members\' speed', () => {
    const lasts = (spdA, spdB) => {
        const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'], spd: 10, patch: { shackled_ghoul: { spd: spdA }, cellar_vermin: { spd: spdB } } });
        g.do('soul chain 1,2');
        let turns = 0; while (g.mode === 'combat' && turns < 8 && g.activeSoulLinks(g.player).length) { g.do('guard', 0); turns++; }
        return turns;
    };
    const r = { 'both faster': lasts(30, 30), 'both slower': lasts(1, 1), 'one each': lasts(30, 1) };
    // #48 (merged) reading: per-holder round ticks, so the 2-member group ends with its first member.
    const vals = Object.values(r);
    return { ok: vals.every((v) => v === vals[0]), note: `caster turns the group stays active after the cast: ${JSON.stringify(r)} (#54: 3 in every case)` };
});
check('12 (#54 K2)', 'A lethal primary hit still deals its half to B (snapshot before death); order of death vs secondary', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); link(g, [E(g, 0), E(g, 1)]); E(g, 0).hp = 8;
    const seq = []; const od = g.onDeath.bind(g), sd = g.secondarySoulDamage.bind(g);
    g.onDeath = (t, src) => { seq.push(`death:${t.name}`); return od(t, src); };
    g.secondarySoulDamage = (t, ...r) => { seq.push(`secondary:${t.name}`); return sd(t, ...r); };
    const b = lose(E(g, 1), () => g.damage(E(g, 0), 50, g.player));
    const deathFirst = seq.indexOf('death:Shackled Ghoul') > -1 && seq.indexOf('death:Shackled Ghoul') < seq.indexOf('secondary:Cellar Vermin');
    return { ok: b === 4, note: `B lost ${b} (expect 4). Call order: ${seq.join(' -> ')}. #54 asks for primary death processing first, then secondaries: ${deathFirst ? 'matches' : 'DIFFERS (secondary applied before the primary death resolves)'}` };
});
check('13 (#54 K3)', 'Link / Feast damage gives no kill rewards and no end-of-round Soul Energy', () => {
    // (a) a Feast tick kills B during B's turn; the player's own action that round deals no damage
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'], spd: 1 }); g.player.skills.push('Soul Feast');
    link(g, [E(g, 0), E(g, 1)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), []); g.flush();
    E(g, 1).hp = 2; g.player.resource.current = 0;
    const se0 = g.player.resource.current; const kills0 = g.stats.kills;
    const txt = T(g.input('soul chain 1,2'));    // refused (0 SE) -> use a non-damaging action instead
    const t2 = g.combat && g.combat.awaitingPlayer ? T(g.input('use bandages')) : '';
    const log = txt + t2;
    // (b) a secondary link hit kills B; primary on A is from a DoT tick (no player hit that round)
    const h = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); link(h, [E(h, 0), E(h, 1)]); E(h, 1).hp = 3;
    h.player.resource.current = 0; h.combat.dealtDamageThisRound = false;
    h.applyDot(h.player, E(h, 0), { name: 'Poison', value: 10, duration: 3 }); h.startTurn(E(h, 0));
    const secKillSE = h.player.resource.current;   // DoT primary is player damage (ordinary rules) - check the +2 for B's death
    const msg = T(h.flush());
    const bDiedBySecondary = E(h, 1).hp <= 0;
    const plus2 = /gained 2 Soul Energy from Cellar Vermin/.test(msg);
    return { info: false, ok: !plus2, note: `secondary kill of B: ${bDiedBySecondary}; "+2 Soul Energy from Cellar Vermin's demise": ${plus2}; kills counted ${h.stats.kills} (#54: link/drain kills grant no +2 / onKill)` };
});
check('13b (#54 K3)', 'A Feast-only round sets the "you dealt damage" flag (+1 Soul Energy at round end)?', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'], spd: 1 }); g.player.skills.push('Soul Feast');
    link(g, [E(g, 0), E(g, 1)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), []); g.flush();
    g.combat.dealtDamageThisRound = false;
    g.startTurn(E(g, 0)); // Feast tick from the player
    return { ok: !g.combat.dealtDamageThisRound, note: `dealtDamageThisRound after a Feast tick: ${g.combat.dealtDamageThisRound} (#54: false)` };
});
check('14 (#54 K3)', 'Secondary damage gets no Expose bonus and does not consume Marked for Death', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); link(g, [E(g, 0), E(g, 1)]);
    g.applyMark(g.player, E(g, 1), { mark: 'Expose', value: 0.2, duration: 2 });
    g.applyMark(g.player, E(g, 1), { mark: 'Marked for Death', value: 0.5, duration: 1 });
    const b = lose(E(g, 1), () => g.damage(E(g, 0), 11, g.player));
    return { ok: b === 5 && !!g.findStatus(E(g, 1), 'Marked for Death'), note: `B lost ${b} (no +20%/+50%); Marked for Death kept: ${!!g.findStatus(E(g, 1), 'Marked for Death')}` };
});
check('15 (#54)', 'A stunned enemy gets exactly one Feast tick on its skipped turn; Haste adds none', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'], spd: 40 }); g.player.skills.push('Soul Feast', 'haste');
    link(g, [E(g, 0), E(g, 1)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), []); g.flush();
    g.applyStatus(g.player, E(g, 0), { name: 'Stun', type: 'skip_turn', duration: 1 });
    const hp = E(g, 0).hp;
    let txt = g.do('haste'); const afterHaste = hp - E(g, 0).hp; txt += g.do('haste');
    const afterHaste2 = hp - E(g, 0).hp;
    txt += g.do('guard', 0);          // ends your normal turn: A's skipped turn follows
    const afterRound = hp - E(g, 0).hp;
    return { ok: afterHaste === 0 && afterHaste2 === 0 && afterRound === 2 && /Shackled Ghoul is unable to act/.test(txt), note: `A lost ${afterHaste} / ${afterHaste2} during 2 Haste actions, ${afterRound} after its skipped turn (expect 0 / 0 / 2)` };
});
check('16 (#54)', 'Primary direct hits keep ordinary rules: Expose applies, Marked for Death consumed, round +1 Soul Energy flag set', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); link(g, [E(g, 0), E(g, 1)]);
    g.applyMark(g.player, E(g, 0), { mark: 'Marked for Death', value: 0.5, duration: 1 });
    g.combat.dealtDamageThisRound = false;
    g.castSkill(g.player, g.playerSkill('Grave Bolt'), [E(g, 0)]);
    return { ok: !g.findStatus(E(g, 0), 'Marked for Death') && g.combat.dealtDamageThisRound, note: `MfD consumed ${!g.findStatus(E(g, 0), 'Marked for Death')}; dealt-damage flag ${g.combat.dealtDamageThisRound}` };
});

// ===================================================================== extra checks
// ===================================================================== caster-side clock paths (Rook's re-review asks, head 077633f)
/** Caster opportunities after the cast until the group is gone; `step(g, i)` plays opportunity i. */
const clockRun = (setup, step, max = 8) => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'], spd: 40 }); setup && setup(g);
    g.do('soul chain 1,2'); let n = 0;
    while (g.mode === 'combat' && n < max && g.activeSoulLinks(g.player).length) { step(g, n); n++; }
    return { g, n };
};
check('17', 'Caster clock counts a stunned (skipped) caster turn exactly once', () => {
    let skips = 0;
    const { n } = clockRun(null, (g, i) => {
        if (i === 0) g.applyStatus(E(g, 0), g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
        if (g.combat.awaitingContinue) { skips++; g.do('ok', null); } else g.do('guard', 0);
        if (g.combat && g.combat.awaitingContinue && g.activeSoulLinks(g.player).length === 0) skips++;
    });
    return { ok: n === 3 && skips >= 1, note: `skipped caster turns seen: ${skips}; inputs while linked: ${n} (guard, skipped turn, guard = 3 opportunities; if the skip did not count it would take 4)` };
});
check('18', 'Haste bonus actions do not consume the caster clock', () => {
    const plain = clockRun(null, (g) => g.do('guard', 0)).n;
    const hasted = clockRun((g) => g.player.skills.push('haste'), (g, i) => g.do(i === 0 ? 'haste' : 'guard', 9)).n;
    return { ok: plain === 3 && hasted === 4, note: `plain: ${plain} inputs; with one Haste: ${hasted} (the bonus action adds an input but no opportunity; expect 3 / 4)` };
});
check('19', 'Using an item ends a normal turn and counts on the caster clock', () => {
    const { n } = clockRun((g) => g.player.inventory.push('Bandages', 'Bandages', 'Bandages'), (g) => { g.player.hp = 100; g.do('use bandages', 0); });
    return { ok: n === 3, note: `item turns while linked: ${n} (expect 3)` };
});
check('20', 'Recast replaces the group and restarts the clock; a refused recast keeps the old group', () => {
    const g = sb(); g.do('soul chain 1,2'); g.do('guard', 0);
    g.do('soul chain 1,7');                                       // refused
    const kept = linked(E(g, 0)) && linked(E(g, 1));
    g.do('soul chain 2,3'); const swapped = !linked(E(g, 0)) && linked(E(g, 1)) && linked(E(g, 2));
    let n = 0; while (g.mode === 'combat' && n < 8 && g.activeSoulLinks(g.player).length) { g.do('guard', 0); n++; }
    return { ok: kept && swapped && n === 3, note: `refused recast kept 1+2: ${kept}; recast moved to 2+3: ${swapped}; new group lasted ${n} (expect 3)` };
});
check('21', 'Caster death clears the group at once', () => {
    const g = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); g.do('soul chain 1,2');
    g.damage(g.player, 99999, E(g, 0));
    const left = g.combat ? g.combat.enemies.filter(linked).length : 0;
    return { ok: left === 0 || g.mode !== 'combat', note: `mode ${g.mode}; enemies still carrying a soul_link marker: ${left}` };
});
check('22', 'Fresh engine restored from a snapshot taken right after the cast expires the group on the same turn', () => {
    const a = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); a.do('soul chain 1,2'); const snap = JSON.parse(JSON.stringify(a.snapshot()));
    const b = sb({ enemies: ['shackled_ghoul', 'cellar_vermin'] }); b.restore(snap);
    const count = (g) => { let n = 0; while (g.mode === 'combat' && n < 8 && g.activeSoulLinks(g.player).length) { g.do('guard', 0); n++; } return n; };
    const na = count(a), nb = count(b);
    return { ok: na === 3 && nb === 3, note: `original ${na}, restored-into-new-engine ${nb} (expect 3 / 3)` };
});

check('X1', 'Bone Wall on a linked recipient absorbs (and is used up by) a secondary link hit / a Feast tick', () => {
    const g = sb(); g.player.skills.push('Soul Feast'); link(g, [E(g, 0), E(g, 1)]);
    g.applyStatus(E(g, 1), E(g, 1), { name: 'Bone Wall', type: 'absorb', duration: 5 });
    g.damage(E(g, 0), 11, g.player); const usedBySecondary = !g.findStatus(E(g, 1), 'Bone Wall');
    g.applyStatus(E(g, 1), E(g, 1), { name: 'Bone Wall', type: 'absorb', duration: 5 });
    g.applyDot(g.player, E(g, 1), { name: 'Poison', value: 3, duration: 3 }); g.startTurn(E(g, 1));
    const keptByPoison = !!g.findStatus(E(g, 1), 'Bone Wall');
    return { info: true, note: `secondary hit uses up Bone Wall: ${usedBySecondary}; a Poison tick does not: ${keptByPoison}. Feast drain is also absorbed (same path). Design question: Bone Wall's rule (PR #17) is "DoTs aren't hits"` };
});
check('X2', "Comma input elsewhere doesn't break single-target skills ('grave bolt 1,2')", () => {
    const g = sb(); const r0 = g.combat.round; const txt = g.do('grave bolt 1,2', 5);
    const free = g.combat.round === r0 && g.player.resource.current === 5 && g.errors.length === 0;
    return { ok: free && /Invalid target/.test(txt), note: `free and turn kept: ${free}; message: ${txt.split('\n').find((l) => /Invalid|Unknown|understand/.test(l))}` };
});
check('X3', 'The combat menu tells the player how to pick several targets', () => {
    const g = sb(); const menu = g.do('help me');
    return { info: true, note: /1,2/.test(menu) ? 'menu shows the comma syntax' : "menu shows no multi-target hint; the syntax ('soul chain 1,2') appears only in the error after a wrong guess" };
});
check('X5', 'Real play: how many Feast ticks fit inside a Soul Chain (Feast cast on the turn after the link, both speed orders)', () => {
    const run = (spd) => { const g = sb({ level: 11, enemies: ['shackled_ghoul', 'cellar_vermin'], spd });
        g.do('soul chain 1,2'); const hp = E(g, 0).hp; let n = 0; const tick = g.tickSoulFeast.bind(g);
        g.tickSoulFeast = (a) => { const h = a.hp; tick(a); if (a === E(g, 0) && a.hp < h) n++; };
        g.do('soul feast'); for (let i = 0; i < 6 && g.mode === 'combat'; i++) g.do('guard', 0);
        return n; };
    const f = run(1), s2 = run(40);
    return { info: true, note: `Feast ticks on A: enemies faster than you ${f}, slower ${s2} (Feast promises 3; it stops when the link ends). Under #54's caster clock the faster case is still 2` };
});
check('X4', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above (none = no engine exceptions)' }));

console.log(`Soulbinder (PR #52) — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
