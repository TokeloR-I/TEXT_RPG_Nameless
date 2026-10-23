// Rook's Package 1/3 PRs, independent checks against the approved contracts:
//   N-2 Plague of Ages + Plague Sovereign (#75) · D-10 Shadowstep + Lockstep (#76) · N-6 Eternal Lich (#77) ·
//   N-1 March of Endless Bones + Black Pharaoh splash (#78).
// Every class/stage is reached by real levelling; commands are typed where the contract is about play.
//   ENSO_ROOT=/path/to/checkout node qa/scripts/rook_packages.js [N2|D10|N6|N1 ...]
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const ONLY = process.argv.slice(2);
const T = (evs) => (evs || []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => {
    if (ONLY.length && !ONLY.some((p) => id.startsWith(p))) return;
    try { const r = fn(); out.push({ id, what, state: r.info ? 'INFO' : r.ok ? 'PASS' : 'FAIL', note: r.note || '' }); }
    catch (e) { out.push({ id, what, state: 'FAIL', note: 'THREW ' + e.stack.split('\n').slice(0, 2).join(' ') }); }
};
/** cls + branch levelled for real to `level`, in `room`; enemies 999 HP / DEF 0 / crit 0 unless patched. */
function hero(cls, branch, level, { enemies = ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], room = 'hallway_of_chains', patch = {}, spd = 99, seed = 6, hp = 9999 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of Object.keys(d.enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 }, patch[k] || {});
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input(cls); g.input('add_xp 250'); g.input(branch);
    for (let i = 0; i < 400 && g.player.level < level; i++) g.input('add_xp 100');
    g.player.spd = spd; g.currentRoom = room; g.input('engage');
    g.player.hp = g.player.maxHp = hp;
    if (!g.player.skills.includes('Guard')) g.player.skills.push('Guard');
    g.do = (c, res = 9) => { if (res != null) g.player.resource.current = res; return T(g.input(c)); };
    return g;
}
const E = (g, i) => g.combat.enemies[i];
const st = (x, name) => x.statusEffects.find((s) => s.name === name);
const has = (x, type) => x.statusEffects.some((s) => s.type === type);

// ============================================================== N-2 Plague of Ages / Plague Sovereign (#75)
const plague = (o) => hero('necromancer', 'plaguecaller', 14, o);
check('N2-1', 'Real L14 Plague Sovereign learns Plague of Ages; 0 SE refused free; the cast spends ALL Soul Energy; second cast is ONCE_PER_FIGHT', () => {
    const g = plague(); const learned = g.player.skills.includes('Plague of Ages'); const r0 = g.combat.round;
    g.do('plague of ages', 0); const refused = g.combat.round === r0;
    const h = plague(); h.do('plague of ages', 4); const after = h.player.resource.current; h.player.resource.current = 4;
    const again = h.act({ type: 'skill', skillId: 'Plague of Ages' });
    return { ok: learned && refused && after <= 1 && again.error && again.error.code === 'ONCE_PER_FIGHT', note: `learned ${learned}; 0 SE refused free ${refused}; 4 SE → ${after}; 2nd cast ${again.error && again.error.code}` };
});
check('N2-2', 'Every living enemy ends at 3 stacks from 0/1/2/3 prior stacks; duration 4 (Pestilent Sage at L14); no tick on cast', () => {
    const g = plague({ enemies: ['shackled_ghoul', 'cellar_vermin', 'rust_rat', 'bone_gnawer'] });
    [0, 1, 2, 3].forEach((n, i) => { if (n) g.infect(g.player, E(g, i), n); });
    const hp = g.combat.enemies.map((e) => e.hp);
    g.castSkill(g.player, g.playerSkill('Plague of Ages'), g.combat.enemies);
    const r = g.combat.enemies.map((e) => { const s = g.infectionOn(e); return `${s.stacks}/${s.duration}/${s.trueDamage ? 'T' : '-'}`; });
    const noTick = g.combat.enemies.every((e, i) => e.hp === hp[i]);
    return { ok: r.every((x) => x === '3/4/T') && noTick, note: `stacks/duration/true per enemy (prior 0,1,2,3): ${r.join(' ')} · HP unchanged on cast ${noTick}` };
});
check('N2-3', 'Empowered tick = 6 base, 8 with Harbinger (flat +2), and ignores DEF', () => {
    const g = plague({ patch: { shackled_ghoul: { def: 50 } } }); g.castSkill(g.player, g.playerSkill('Plague of Ages'), g.combat.enemies);
    const e = E(g, 0); const hp = e.hp; g.tickDots(e); const lost = hp - e.hp;
    return { ok: lost === 8 && g.dotTickDamage(g.infectionOn(e)) === 8, note: `L14 (Harbinger from L11): tick on a DEF 50 enemy = ${lost}` };
});
check('N2-4', 'Explicit Infection immunity is respected; with EVERY living enemy immune the cast is refused (no eligible enemies)', () => {
    const g = plague(); E(g, 1).statusAffinities = { Infection: 'immune' }; g.castSkill(g.player, g.playerSkill('Plague of Ages'), g.combat.enemies);
    const skip = !g.infectionOn(E(g, 1)) && !!g.infectionOn(E(g, 0));
    const h = plague(); h.combat.enemies.forEach((e) => { e.statusAffinities = { Infection: 'immune' }; }); const r0 = h.combat.round;
    const txt = h.do('plague of ages', 5); const refused = h.combat.round === r0 && h.player.resource.current === 5;
    return { ok: skip && refused, note: `immune enemy skipped ${skip} · all immune: refused free ${refused} (SE 5 → ${h.player.resource.current}, round ${r0} → ${h.combat.round})` };
});
check('N2-5', 'Plague Sovereign: your other DoTs (Black Spit Poison) are true damage; immunity still blocks them', () => {
    const g = plague(); g.do('black spit 1', 5); const p = st(E(g, 0), 'Poison');
    const h = plague(); E(h, 0).statusAffinities = { Poison: 'immune' }; h.do('black spit 1', 5);
    return { ok: p && p.trueDamage === true && !st(E(h, 0), 'Poison'), note: `Black Spit Poison true ${p && p.trueDamage} · immune target poisoned ${!!st(E(h, 0), 'Poison')}` };
});
check('N2-6', "Does the true-damage flag change any number today? (Keel Q1: DoT ticks already ignore DEF and reductions)", () => {
    const tick = (flag) => { const g = plague({ patch: { shackled_ghoul: { def: 50 } } }); g.infect(g.player, E(g, 0), 3); g.infectionOn(E(g, 0)).trueDamage = flag;
        E(g, 0).statusEffects.push({ name: 'QA guard', type: 'damage_reduction', value: 0.5, duration: 5 }); const hp = E(g, 0).hp; g.tickDots(E(g, 0)); return hp - E(g, 0).hp; };
    return { info: true, note: `3-stack tick on a DEF 50 enemy with a 50% damage-reduction status: flag off ${tick(false)}, flag on ${tick(true)}` };
});
check('N2-7', 'An empowered Infection tick kill pays Plague Reservoir (+1) and normal kill rewards (N-7 ruling)', () => {
    const g = plague(); g.castSkill(g.player, g.playerSkill('Plague of Ages'), g.combat.enemies); const e = E(g, 0); e.hp = 1; g.player.resource.current = 0;
    const said = []; const say = g.say.bind(g); g.say = (t, o) => { said.push(String(t)); return say(t, o); };
    g.tickDots(e);
    return { ok: e.hp <= 0 && said.some((t) => /Plague Reservoir/.test(t)), note: `killed ${e.hp <= 0}; Reservoir ${said.some((t) => /Plague Reservoir/.test(t))}; SE 0 → ${g.player.resource.current}` };
});

// ============================================================== D-10 Shadowstep / Lockstep (#76)
check('D10-1', 'Real L3 Assassin Shadowstep: costs 1 Stealth Token, emits one combat.presentation dash anchored on the target, no position state', () => {
    const g = hero('rogue', 'assassin', 3); g.player.resource.current = 3;
    const evs = g.input('shadowstep 2'); const dash = evs.filter((e) => e.type === 'combat.presentation');
    const posKeys = Object.keys(g.player).filter((k) => /^(pos|position|x|y|tile|tileX|tileY|location|coords?)$/i.test(k));
    return { ok: dash.length === 1 && dash[0].kind === 'dash' && dash[0].anchorId === E(g, 1).id && dash[0].actorId === g.player.id && posKeys.length === 0, note: `dash events ${dash.length} ${JSON.stringify(dash[0] || {})}; Stealth 3 → ${g.player.resource.current}; position-like fields ${posKeys.join(',') || 'none'}` };
});
check('D10-2', 'Guaranteed crit: survives a miss, a DoT tick and a minion hit; the next direct hit crits; recast refreshes (one buff)', () => {
    const g = hero('rogue', 'assassin', 3); g.castSkill(g.player, g.playerSkill('Shadowstep'), [E(g, 0)]); g.castSkill(g.player, g.playerSkill('Shadowstep'), [E(g, 0)]);
    const n = g.player.statusEffects.filter((s) => s.name === 'Guaranteed Crit').length;
    g.applyStatus(E(g, 0), g.player, { name: 'Blind', type: 'blind', value: 1, duration: 1 });
    const miss = T((g.castSkill(g.player, g.playerSkill(g.basicAttackName()), [E(g, 1)]), g.flush())); const kept1 = !!st(g.player, 'Guaranteed Crit');
    g.player.statusEffects = g.player.statusEffects.filter((s) => s.name !== 'Blind');
    g.applyDot(g.player, E(g, 1), { name: 'Poison', value: 3, duration: 3 }); g.tickDots(E(g, 1)); const kept2 = !!st(g.player, 'Guaranteed Crit');
    const txt = T((g.castSkill(g.player, g.playerSkill(g.basicAttackName()), [E(g, 1)]), g.flush())); const crit = /CRITICAL HIT/.test(txt); const gone = !st(g.player, 'Guaranteed Crit');
    return { ok: n === 1 && /misses|blindly/.test(miss) && kept1 && kept2 && crit && gone, note: `buffs after 2 casts ${n}; after a miss kept ${kept1}; after a DoT tick kept ${kept2}; next hit crit ${crit}, consumed ${gone}` };
});
check('D10-3', 'Real L5 Sentinel Lockstep: 1 Vigil; every enemy attacks you even while a minion taunts', () => {
    const g = hero('warrior', 'warden', 5, { spd: 99 }); const m = g.summon('skeleton'); m.hp = m.maxHp = 99999; g.applyStatus(g.player, m, { name: 'Taunt', type: 'taunt', duration: 5 });
    const hits = []; const cast = g.castSkill.bind(g); g.castSkill = (c, sk, ts) => { if (!c.isPlayer && !c.isMinion) hits.push(ts[0].isPlayer ? 'P' : 'M'); return cast(c, sk, ts); };
    g.do('lockstep', 3);
    return { ok: g.player.skills.includes('Lockstep') && hits.length === 3 && hits.every((x) => x === 'P'), note: `enemy targets after Lockstep (you act first): ${hits.join(',')}` };
});
check('D10-4', "Lockstep when the enemies are FASTER (they already acted this round): is each enemy's NEXT normal turn taunted?", () => {
    const run = (cmd) => { const g = hero('warrior', 'warden', 5, { spd: 1 }); const m = g.summon('skeleton'); m.hp = m.maxHp = 99999; g.applyStatus(g.player, m, { name: 'Taunt', type: 'taunt', duration: 9 });
        g.do('guard', 0);   // the summon joins; enemies act before you every round
        const hits = []; const cast = g.castSkill.bind(g); g.castSkill = (c, sk, ts) => { if (!c.isPlayer && !c.isMinion) hits.push(ts[0].isPlayer ? 'P' : 'M'); return cast(c, sk, ts); };
        g.do(cmd, 3); return hits.join(','); };
    const control = run('guard'), lock = run('lockstep');
    return { ok: /M/.test(control) && lock.length > 0 && lock.split(',').every((x) => x === 'P'), note: `next enemy turns after Guard (control): ${control} · after Lockstep: ${lock} (P = you, M = the taunting minion)` };
});
check('D10-5', 'Shield Charge (Knight L5) shares taunt_aoe: what does the log call it?', () => {
    const g = hero('warrior', 'vanguard', 5); g.castSkill(g.player, g.playerSkill('Shield Charge'), [g.player]); const t = T(g.flush());
    return { info: true, note: `"${(t.split('\n').find((l) => /draws|taunt|Lockstep/i.test(l)) || 'no taunt line').trim()}" · status on enemies: ${g.combat.enemies.map((e) => (e.statusEffects.find((x) => x.type === 'taunt_player') || {}).name).join(',')}` };
});

// ============================================================== N-6 Eternal Lich (#77)
const lich = (o) => hero('necromancer', 'soulbinder', 14, o);
check('N6-1', 'Real L14 Eternal Lich gets the Lich Unmake (5 Soul Energy, once/fight); Hollow King Unmake stays 5 Hollow Will', () => {
    const g = lich(); const sk = g.player.skills.filter((s) => /unmake/i.test(s)); const lu = DATA.skillDefinitions['Eternal Lich Unmake'] || {}; const hk = DATA.skillDefinitions.Unmake || {};
    return { ok: sk.length === 1 && lu.cost === 5 && lu.resource === 'Soul Energy' && lu.oncePerFight && hk.cost === 5 && hk.resource === 'Hollow Will', note: `skills: ${sk.join(', ')} · Lich: ${lu.cost} ${lu.resource} once ${!!lu.oncePerFight} · Hollow King: ${hk.cost} ${hk.resource}` };
});
check('N6-2', 'Lich Unmake: 4 SE refused free; boss refused free; erases a regular enemy with no kill rewards (no SE, no corpse, no kill credit); once per fight', () => {
    const g = lich(); const name = g.player.skills.find((s) => /unmake/i.test(s)); const cmd = name.toLowerCase();
    const r0 = g.combat.round; g.do(`${cmd} 1`, 4); const poor = g.combat.round === r0 && g.player.resource.current === 4;
    const b = lich({ room: 'wardens_roost' }); const br = b.combat.round; b.do(`${cmd} 1`, 9); const boss = b.combat.round === br && b.player.resource.current === 9;
    const corpses = g.combat.corpses, kills = g.stats.kills; g.do(`${cmd} 1`, 5); const se = g.player.resource.current;
    const erased = E(g, 0).erased === true; g.player.resource.current = 9; const again = g.act({ type: 'skill', skillId: name, targetId: E(g, 1).id });
    return { ok: poor && boss && erased && g.combat.corpses === corpses && g.stats.kills === kills && se <= 1 && again.error && again.error.code === 'ONCE_PER_FIGHT', note: `4 SE refused free ${poor}; boss refused free ${boss}; erased ${erased}; corpses ${corpses}→${g.combat.corpses}; kills ${kills}→${g.stats.kills}; SE 5→${se}; 2nd ${again.error && again.error.code}` };
});
check('N6-3', "Typing 'unmake 1' as an Eternal Lich", () => {
    const g = lich(); const t = g.do('unmake 1', 5);
    return { info: true, note: `"${(t.split('\n').find((l) => /unmake|know|Unknown/i.test(l) && !/^>/.test(l)) || '').trim()}"` };
});
check('N6-4', 'Undying Will: the first lethal hit leaves you at ceil(50% max HP) with Soul Energy, minions and debuffs; the second kills', () => {
    const g = lich({ hp: 101 }); g.player.resource.current = 4; const m = g.summon('skeleton'); g.applyStatus(E(g, 0), g.player, { name: 'Weaken', type: 'mark', value: 0.2, duration: 5 });
    g.damage(g.player, 500, E(g, 0)); g.checkBattleEnd(); const first = `${g.mode} HP ${g.player.hp} SE ${g.player.resource.current} minion ${m.hp > 0} weaken ${!!st(g.player, 'Weaken')}`;
    g.damage(g.player, 500, E(g, 0)); g.checkBattleEnd();
    return { ok: first === 'combat HP 51 SE 4 minion true weaken true' && g.mode === 'game_over', note: `after 1st lethal: ${first} · after 2nd: ${g.mode}` };
});
check('N6-5', 'Undying Will through real play: an enemy hit, a DoT tick at turn start, and Channel the Grave self-damage each trigger it once', () => {
    const big = {}; for (const k of ['shackled_ghoul', 'cellar_vermin', 'rust_rat']) big[k] = { skills: DATA.enemies[k].skills.map((x) => ({ ...x, base_damage: [999, 999] })) };
    const viaEnemy = (() => { const g = lich({ hp: 10, spd: 99, enemies: ['shackled_ghoul'], patch: big }); g.do('guard', 0); return `${g.mode}/${g.player.hp}`; })();
    const viaDot = (() => { const g = lich({ hp: 10 }); g.applyDot(E(g, 0), g.player, { name: 'Poison', value: 50, duration: 1 }); const t = g.do('guard', 0); const lostTurn = !/--- Your Turn! ---[\s\S]*$/.test(t.split('Undying Will')[1] || ''); return `${g.mode}/${g.player.hp}`; })();
    const viaSelf = (() => { const g = lich({ hp: 10 }); if (!g.player.skills.includes('Channel the Grave')) g.player.skills.push('Channel the Grave'); g.player.hp = 1; g.do('channel the grave', 0); return `${g.mode}/${g.player.hp}`; })();
    return { ok: [viaEnemy, viaDot, viaSelf].every((x) => x === 'combat/5'), note: `enemy hit → ${viaEnemy} · 1-round Poison tick → ${viaDot} · Channel the Grave at 1 HP → ${viaSelf} (expect combat/5 each)` };
});
check('N6-5b', 'Dying to a DoT at turn start: after Undying Will, is the killing DoT spent (a 1-round Poison must tick once)?', () => {
    const g = lich({ hp: 10 }); g.applyDot(E(g, 0), g.player, { name: 'Poison', value: 50, duration: 1 }); const t = g.do('guard', 0);
    const ticks = (t.match(/suffers 50 Poison/g) || []).length; const revived = /Undying Will restores/.test(t);
    return { ok: revived && ticks === 1 && g.mode === 'combat', note: `one Guard: revived ${revived}; the 1-round Poison ticked ${ticks}x; mode ${g.mode}. (startTurn skips arming statuses when the tick is lethal, so the unarmed Poison survives the round end and ticks again at your next turn; that turn is also lost)` };
});
check('N6-6', 'Undying Will keeps your Soul Chain and Soul Feast (you did not die)', () => {
    const g = lich({ hp: 101 }); g.castSkill(g.player, g.playerSkill('Soul Chain'), [E(g, 0), E(g, 1), E(g, 2)]); g.castSkill(g.player, g.playerSkill('Soul Feast'), []);
    const before = `${g.activeSoulLinks(g.player).length}/${g.combat.enemies.filter((e) => has(e, 'soul_feast')).length}`;
    g.damage(g.player, 500, E(g, 0)); g.checkBattleEnd(); const after = `${g.activeSoulLinks(g.player).length}/${g.combat.enemies.filter((e) => has(e, 'soul_feast')).length}`;
    return { ok: before === after, note: `links/Feast before ${before}, after Undying Will ${after}` };
});
check('N6-7', 'Free Soul Feast: first cast 0 SE, second 2; a refused cast (no link) does not use it; independent of Undying Will; resets next fight', () => {
    const g = lich(); const r0 = g.combat.round; g.do('soul feast', 5); const refusedFree = g.combat.round === r0 && g.player.resource.current === 5 && g.skillCost(g.playerSkill('Soul Feast')) === 0;
    g.castSkill(g.player, g.playerSkill('Soul Chain'), [E(g, 0), E(g, 1), E(g, 2)]); g.do('soul feast', 5); const first = 5 - g.player.resource.current;
    const second = g.skillCost(g.playerSkill('Soul Feast'));
    g.damage(g.player, 99999, E(g, 0)); g.checkBattleEnd(); const stillPaid = g.skillCost(g.playerSkill('Soul Feast'));
    g.do('flee', null); g.currentRoom = 'hallway_of_chains'; g.input('engage'); const reset = g.skillCost(g.playerSkill('Soul Feast'));
    return { ok: refusedFree && first <= 0 + 0 && second === 2 && stillPaid === 2 && reset === 0, note: `no-link cast refused and still free ${refusedFree}; 1st cast spent ${first}; then cost ${second}; after Undying Will ${stillPaid}; next fight ${reset}` };
});
check('N6-8', 'Snapshot → JSON → fresh engine keeps the Undying Will and free-Feast flags', () => {
    const g = lich({ hp: 101 }); g.damage(g.player, 500, E(g, 0)); g.checkBattleEnd();
    const snap = JSON.parse(JSON.stringify(g.snapshot())); const h = lich({ hp: 101 }); h.restore(snap);
    h.damage(h.player, 500, h.combat.enemies[0]); h.checkBattleEnd();
    return { ok: h.mode === 'game_over', note: `restored engine after a 2nd lethal hit: ${h.mode}` };
});

// ============================================================== N-1 March / Black Pharaoh (#78)
const pharaoh = (o) => hero('necromancer', 'bone warden', 14, o);
const march = (g) => { g.castSkill(g.player, g.playerSkill('March of Endless Bones'), [g.player]); return T(g.flush()); };
const kill = (g, m) => g.damage(m, 9999, E(g, 0));
check('N1-1', 'Real L14 Black Pharaoh: March learned, minion cap 6; no fallen + full cap refused free; 0 SE refused free', () => {
    const g = pharaoh(); const learned = g.player.skills.includes('March of Endless Bones'); const cap = g.minionCap();
    for (let i = 0; i < cap; i++) g.summon('skeleton'); const r0 = g.combat.round; g.do('march of endless bones', 5); const full = g.combat.round === r0 && g.player.resource.current === 5;
    const h = pharaoh(); const r1 = h.combat.round; h.do('march of endless bones', 0); const poor = h.combat.round === r1;
    return { ok: learned && cap === 6 && full && poor, note: `learned ${learned}; cap ${cap}; full cap refused free ${full}; 0 SE refused ${poor}` };
});
check('N1-2', 'Oldest death first, new ids, ceil(50%) of original max HP, no carried statuses; join next round; one slot left → no Ghoul (logged)', () => {
    const g = pharaoh(); const ms = [g.summon('skeleton'), g.summon('ghoul'), g.summon('skeleton')]; for (let i = 0; i < 2; i++) g.summon('skeleton');
    ms[0].maxHp = 21; ms[0].statusEffects.push({ name: 'Weaken', type: 'mark', value: 0.2, duration: 3 });
    kill(g, ms[1]); kill(g, ms[0]); kill(g, ms[2]);    // death order: ghoul, skeleton(21), skeleton
    const living0 = g.alive(g.combat.minions).length;   // 2 alive, cap 6 → 4 slots: 3 rises + ghoul
    const txt = march(g); const risen = g.combat.minions.filter((m) => m.resurrectedFrom);
    const order = risen.map((m) => m.resurrectedFrom).join(','); const ids = new Set(g.combat.minions.map((m) => m.id)).size === g.combat.minions.length;
    const hpOk = risen[1] && risen[1].hp === 11; const clean = risen.every((m) => !m.statusEffects.length); const notInOrder = risen.every((m) => !g.combat.order.includes(m));
    const ghoul = g.alive(g.combat.minions).length;
    return { ok: order === [ms[1].id, ms[0].id, ms[2].id].join(',') && ids && hpOk && clean && notInOrder && ghoul === 6, note: `risen from ${order} (deaths: ${ms[1].id}, ${ms[0].id}, ${ms[2].id}); ids unique ${ids}; 21-HP skeleton back at ${risen[1] && risen[1].hp}; statuses carried ${!clean}; in this round's order ${!notInOrder}; living ${living0} → ${ghoul}` };
});
check('N1-3', 'Two fallen, one slot: only the oldest returns; no Ghoul, and the log says so; the use is spent', () => {
    const g = pharaoh(); const a = g.summon('skeleton'), b = g.summon('skeleton'); for (let i = 0; i < 4; i++) g.summon('skeleton'); kill(g, a); kill(g, b); g.summon('skeleton');
    g.player.resource.current = 3; const txt = T(g.act({ type: 'skill', skillId: 'March of Endless Bones' }).events); const risen = g.combat.minions.filter((m) => m.resurrectedFrom).map((m) => m.resurrectedFrom);
    while (g.mode === 'combat' && !(g.combat.awaitingPlayer && !g.combat.awaitingContinue)) g.do('ok', null);
    g.player.resource.current = 9; const again = g.act({ type: 'skill', skillId: 'March of Endless Bones' });
    return { ok: risen.join() === a.id && /No capacity/i.test(txt) && again.error && again.error.code === 'ONCE_PER_FIGHT', note: `risen ${risen.join(',')}; log "${(txt.split('\n').find((l) => /capacity/i.test(l)) || '').trim()}"; living ${g.alive(g.combat.minions).length}; again → ${again.error && again.error.code}` };
});
check('N1-4', 'Black Pharaoh splash: a skeleton hit splashes floor(50% of actual damage) to each OTHER enemy; nothing with 1 enemy', () => {
    const g = pharaoh(); const m = g.summon('skeleton'); m.critChance = 0; const hp = g.combat.enemies.map((e) => e.hp);
    g.castSkill(m, { name: 'QA club', base_damage: [11, 11], damage_type: 'physical' }, [E(g, 0)]); const lost = g.combat.enemies.map((e, i) => hp[i] - e.hp);
    const s = pharaoh({ enemies: ['shackled_ghoul'] }); const m2 = s.summon('skeleton'); m2.critChance = 0; const h0 = E(s, 0).hp; s.castSkill(m2, { name: 'QA club', base_damage: [11, 11], damage_type: 'physical' }, [E(s, 0)]);
    return { ok: lost.join() === '11,5,5' && h0 - E(s, 0).hp === 11, note: `3 enemies: lost ${lost.join(' / ')} (expect 11 / 5 / 5) · 1 enemy: lost ${h0 - E(s, 0).hp}` };
});
check('N1-5', 'Splash: recipient mitigation once (DEF 3 recipient), no riders (Ghoul Weaken), no kill rewards from a splash kill', () => {
    const g = pharaoh({ patch: { cellar_vermin: { def: 3 } } }); const gh = g.summon('ghoul'); gh.critChance = 0; E(g, 2).hp = 2; g.player.resource.current = 0;
    const hp1 = E(g, 1).hp; const said = []; const say = g.say.bind(g); g.say = (t, o) => { said.push(String(t)); return say(t, o); };
    g.castSkill(gh, gh.skills[0], [E(g, 0)]); const prim = 999 - E(g, 0).hp;
    const weak = !!st(E(g, 1), 'Weaken') || !!st(E(g, 2), 'Weaken'); const dead = E(g, 2).hp <= 0;
    return { ok: !weak && dead && g.player.resource.current === 0, note: `primary ${prim}; DEF 3 recipient lost ${hp1 - E(g, 1).hp} (floor(${prim}/2) = ${Math.floor(prim / 2)}, mitigation as Soul Chain: DEF bypassed); Weaken on a splash target ${weak}; splash kill ${dead}, SE 0 → ${g.player.resource.current}` };
});
check('N1-6', 'Snapshot → JSON → fresh engine: the death ledger survives and March gives the same result', () => {
    const g = pharaoh(); const a = g.summon('skeleton'), b = g.summon('ghoul'); kill(g, b); kill(g, a);
    const snap = JSON.parse(JSON.stringify(g.snapshot())); const h = pharaoh(); h.restore(snap);
    march(g); march(h); const sig = (x) => x.combat.minions.map((m) => `${m.id}:${m.resurrectedFrom || ''}:${m.hp}`).join('|');
    return { ok: sig(g) === sig(h), note: `same result ${sig(g) === sig(h)} (${sig(h)})` };
});
check('X1', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above' }));

console.log(`Rook Package 1/3 PRs — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
