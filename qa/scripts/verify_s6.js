// Independent verification of STATUS_ENGINE_REPORT.md section 6, against the approved handoff.
// Own scenarios (different seeds, statuses, numbers and code paths from tests/run-tests.js).
const { game, enemy, registry } = require('./lib.js');
const results = [];
const check = (id, claim, fn) => {
    try { const r = fn(); results.push({ id, claim, ok: r.ok, note: r.note || '' }); }
    catch (e) { results.push({ id, claim, ok: false, note: 'THREW: ' + e.message }); }
};
const CR = (d, o = {}) => {
    d.statusRules.controlResistance = { threshold: 100, recoveryPerRound: o.rec ?? 25, releaseThreshold: o.rel ?? 50, tierMultipliers: { regular: 1, elite: 1.5, boss: o.boss ?? 2, player: 1, summon: 1 } };
    for (const n of ['Stun', 'Silence', 'Frozen in time', 'Confused', 'Entranced']) d.statusDefinitions[n] = { ...d.statusDefinitions[n], control: 'hard', crGain: o.gain ?? 50 };
};
const hallway = (seed, mutate, cls = 'necromancer', branch) => {
    const g = game(seed, mutate);
    g.do(cls);
    if (branch) g.do('add_xp 250', branch);
    g.do('n', 'engage');
    g.player.hp = g.player.maxHp = 9999; g.player.resource.current = g.player.resource.max = 99;
    for (const e of g.combat.enemies) e.hp = e.maxHp = 5000;
    return g;
};

check('a', 'Stack cap never exceeded (all infection routes, incl. a single +10 application)', () => {
    const g = hallway(11, null, 'necromancer');
    g.player.skills.push('Contagion', 'Corpse Bloom', 'Plague Wind');
    const t = g.combat.enemies[1];
    g.infect(g.player, t, 10);
    const one = g.infectionOn(t).stacks;
    g.combat.corpses = 5;
    for (let i = 0; i < 4; i++) { g.player.resource.current = 99; g.do('corpse bloom'); g.do('contagion 2'); g.do('plague wind'); }
    const max = Math.max(...g.combat.enemies.map((e) => (g.infectionOn(e) || { stacks: 0 }).stacks));
    return { ok: one === 3 && max <= 3, note: `single +10 -> ${one}; max seen ${max}` };
});

check('b', 'Re-apply refreshes duration to full (also with Pestilent Sage +1)', () => {
    const g = hallway(12);
    const t = g.combat.enemies[2];
    g.infect(g.player, t, 1); g.infectionOn(t).duration = 1; g.infect(g.player, t, 1);
    const plain = g.infectionOn(t).duration;
    g.player.traits.push({ name: 'DoTs last +1 turn' });
    g.infectionOn(t).duration = 1; g.infect(g.player, t, 1);
    return { ok: plain === 3 && g.infectionOn(t).duration === 4, note: `plain ${plain}, with Sage ${g.infectionOn(t).duration}` };
});

check('c', 'Uncapped statuses refresh only (Poison from two different skills)', () => {
    const g = hallway(13, null, 'rogue');
    g.player.skills.push('Poison Trap');
    const t = g.combat.enemies[0];
    g.applyDot(g.player, t, { name: 'Poison', value: 5, duration: 3 }); // Black Spit-sized
    g.applyDot(g.player, t, { name: 'Poison', value: 4, duration: 3 }); // Poison Trap-sized
    const p = g.findStatus(t, 'Poison');
    return { ok: p.stacks === 1 && t.statusEffects.filter((s) => s.name === 'Poison').length === 1, note: `stacks ${p.stacks}; value after weaker re-apply = ${p.value} (was 5) -> see design gap` };
});

check('d', 'Overflow off by default (real Plaguecaller fight, 30 capped re-applications)', () => {
    const g = hallway(14, null, 'necromancer', 'plaguecaller');
    const t = g.combat.enemies[0];
    g.infect(g.player, t, 3);
    for (let i = 0; i < 30; i++) g.infect(g.player, t, 1);
    g.drain();
    return { ok: !/OVERFLOW/.test(g.text()) && g.infectionOn(t).overflowChance === undefined };
});

check('e', 'Overflow chance rises on failure, caps at max, resets on burst (own numbers 0.1/+0.25/max 0.6)', () => {
    const g = hallway(15, (d) => { d.statusDefinitions.Infection.overflow = { baseChance: 0.1, chanceStep: 0.25, maxChance: 0.6, burstMultiplier: 1.5 }; });
    const t = g.combat.enemies[0];
    g.infect(g.player, t, 3);
    const inf = g.infectionOn(t);
    const seq = [];
    g.rng = () => 0.999;
    for (let i = 0; i < 4; i++) { g.infect(g.player, t, 1); seq.push(+inf.overflowChance.toFixed(2)); }
    g.rng = () => 0.0;
    g.infect(g.player, t, 1); seq.push(inf.overflowChance);
    const ok = JSON.stringify(seq) === JSON.stringify([0.35, 0.6, 0.6, 0.6, 0.1]);
    return { ok, note: `chance sequence ${JSON.stringify(seq)}` };
});

check('f', 'Burst = current tick damage x multiplier (with Harbinger +2 in the tick)', () => {
    const g = hallway(16, (d) => { d.statusDefinitions.Infection.overflow = { baseChance: 1, chanceStep: 0, maxChance: 1, burstMultiplier: 1.5 }; });
    g.player.traits.push({ name: 'All infections deal +2 dmg/turn' });
    const t = g.combat.enemies[0];
    g.infect(g.player, t, 3); // tick = 3*2 + 2 = 8
    const hp = t.hp; g.infect(g.player, t, 1);
    return { ok: hp - t.hp === 12, note: `burst ${hp - t.hp} (expected floor(8*1.5)=12)` };
});

check('g', 'CR off by default (20 stuns on the boss all land)', () => {
    const g = game(17).do('warrior'); g.currentRoom = 'wardens_roost'; g.do('engage');
    const b = g.combat.enemies[0]; let landed = 0;
    for (let i = 0; i < 20; i++) if (g.applyStatus(g.player, b, { name: 'Stun', type: 'skip_turn', duration: 1 })) landed++;
    return { ok: landed === 20 && !b.cr };
});

check('h', 'The control that reaches EXACTLY 100 still succeeds; the next is resisted', () => {
    const g = hallway(18, (d) => CR(d, { gain: 50 }), 'rogue', 'assassin');
    const t = g.combat.enemies[0];
    const s1 = !!g.applyStatus(g.player, t, { name: 'Silence', type: 'silence', duration: 1 });
    const s2 = !!g.applyStatus(g.player, t, { name: 'Stun', type: 'skip_turn', duration: 1 }); // 100 exactly, different hard control
    const s3 = !!g.applyStatus(g.player, t, { name: 'Silence', type: 'silence', duration: 1 });
    return { ok: s1 && s2 && !s3 && t.cr.value === 100, note: `results ${s1}/${s2}/${s3}, CR ${t.cr.value}; CR is shared across hard-control types` };
});

check('i', 'Gradual recovery; immunity ends only BELOW the release threshold (boundary value = still immune)', () => {
    const g = hallway(19, (d) => CR(d, { gain: 50, rec: 25, rel: 50 }));
    const t = g.combat.enemies[0];
    g.applyStatus(g.player, t, { name: 'Stun', type: 'skip_turn', duration: 1 });
    g.applyStatus(g.player, t, { name: 'Stun', type: 'skip_turn', duration: 1 }); // CR 100, immune
    const trace = [];
    for (let i = 0; i < 3; i++) { g.tickStatusesEndOfRound(); trace.push(`${t.cr.value}${t.cr.immune ? 'I' : ''}`); }
    return { ok: trace.join(',') === '75I,50I,25', note: `CR after each round: ${trace.join(', ')} (I = immune)` };
});

check('j', "Boss's first control lands even when one application alone exceeds 100", () => {
    const g = game(20, (d) => CR(d, { gain: 100, boss: 3 })).do('warrior'); g.currentRoom = 'wardens_roost'; g.do('engage');
    const b = g.combat.enemies[0];
    const first = !!g.applyStatus(g.player, b, { name: 'Stun', type: 'skip_turn', duration: 1 });
    const second = !!g.applyStatus(g.player, b, { name: 'Stun', type: 'skip_turn', duration: 1 });
    return { ok: first && !second && b.cr.value === 300, note: `first ${first}, second ${second}, CR ${b.cr.value}` };
});

check('k', 'Soft control and DoTs build no CR (Slow/Blind/Pin marked soft, Bleed/Poison/Infection)', () => {
    const g = hallway(21, (d) => { CR(d); for (const n of ['Slow', 'Blind', 'Pin']) d.statusDefinitions[n] = { ...d.statusDefinitions[n], control: 'soft', crGain: 80 }; });
    const t = g.combat.enemies[0];
    g.applyStatus(g.player, t, { name: 'Slow', type: 'slow', value: 0.5, duration: 2 });
    g.applyStatus(g.player, t, { name: 'Blind', type: 'blind', value: 0.25, duration: 1 });
    g.applyMark(g.player, t, { mark: 'Pin', value: 0.5, duration: 2 });
    g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 2 });
    g.infect(g.player, t, 2);
    return { ok: !t.cr };
});

check('l', 'Immune affinity blocks (enemy data, real Garrote cast)', () => {
    const g = hallway(22, (d) => { d.enemies.shackled_ghoul.statusAffinities = { Silence: 'immune' }; }, 'rogue');
    g.player.skills.push('Garrote');
    g.do('garrote 1');
    return { ok: /immune to Silence/.test(g.text()) && !g.findStatus(g.combat.enemies[0], 'Silence') };
});

check('m', 'Same number of DoT ticks whether the applier is faster or slower (real Hemorrhage, + target stunned mid-DoT)', () => {
    const out = [];
    for (const spd of [40, 1]) for (const stunMid of [false, true]) {
        // DEF 999 so the Hemorrhage hit itself deals 0: all HP lost is Bleed. Measure from BEFORE the cast,
        // because the first tick can happen inside the same command (NPC turns run before control returns).
        const g = game(23, (d) => { d.enemies.shackled_ghoul.def = 999; }).do('warrior', 'add_xp 250', 'berserker', 'n');
        g.player.spd = spd; g.do('engage');
        g.player.hp = g.player.maxHp = 9999; g.player.resource.current = 99;
        const gh = g.combat.enemies[1]; gh.hp = gh.maxHp = 5000;
        const after = gh.hp;
        g.do('hemorrhage 2');
        if (stunMid) g.applyStatus(g.player, gh, { name: 'Stun', type: 'skip_turn', duration: 1 });
        for (let i = 0; i < 6; i++) g.do('guard');
        out.push((after - gh.hp) / 3);
    }
    return { ok: out.every((x) => x === 3), note: `ticks (fast, fast+stun, slow, slow+stun) = ${out.join(', ')}` };
});

check('n', 'Bonus turns (Haste) do not consume duration — DoT on the player too', () => {
    const g = hallway(24, null, 'mage', 'chronomancer');
    g.player.skills.push('haste');
    g.applyDot(g.combat.enemies[0], g.player, { name: 'Poison', value: 1, duration: 3 });
    const hp0 = g.player.hp;
    g.do('haste'); g.do('haste');
    const p = g.findStatus(g.player, 'Poison');
    return { ok: p && hp0 - g.player.hp <= 1, note: `poison dur ${p && p.duration}, poison dmg taken ${hp0 - g.player.hp} after 2 bonus-chained actions` };
});

check('o+p', 'Enemy skill stuns the player (data-only) and the player loses exactly one turn — enemy faster AND slower', () => {
    const out = [];
    // The enemy skill stuns ONCE (a stun on every hit would permanently lock the player with CR off — that's QA-5).
    const eff = { ...registry, stun_once: { apply(ctx) { if (ctx.engine._s) return; ctx.engine._s = true; registry.stun.apply(ctx); } } };
    for (const spd of [40, 1]) {
        const g = game(25, (d) => { d.enemies.crow_touched_warden.skills = [{ name: 'Chain Lock', base_damage: [1, 1], effects: [{ type: 'stun_once', duration: 1 }] }]; }, eff).do('warrior');
        g.currentRoom = 'wardens_roost'; g.player.spd = spd; g.do('engage');
        g.player.hp = g.player.maxHp = 9999; g.combat.enemies[0].hp = 9999;
        for (let i = 0; i < 4; i++) g.do('guard');
        const t = g.text();
        const turns = (t.match(/--- Your Turn! ---/g) || []).length, skipped = (t.match(/Warrior is unable to act/g) || []).length;
        out.push(`${spd === 40 ? 'player faster' : 'player slower'}: rounds ${g.combat.round}, your turns ${turns}, skipped ${skipped}`);
    }
    // Since PR #6 a stunned player's turn pauses for input, so one command is consumed by the skipped turn.
    // The invariant: exactly one turn lost, i.e. your turns = rounds - 1.
    const okOne = (s) => { const [r, t, k] = s.match(/\d+/g).slice(-3).map(Number); return k === 1 && t === r - 1; };
    return { ok: out.every(okOne), note: out.join(' | ') };
});

check('q', 'Enemies can mark the player — Expose on the player raises damage taken', () => {
    const g = hallway(26, null, 'warrior');
    const rat = enemy(g, 'rust_rat'); g.player.def = 0;
    const roll = () => { const h = g.newHit(g.player); rat.critChance = 0; g.rollDamage(rat, g.player, { base_damage: [10, 10], damage_type: 'physical' }, h); return h.damage; };
    const before = roll(); g.applyMark(rat, g.player, { mark: 'Expose', value: 0.2, duration: 2 });
    return { ok: before === 10 && roll() === 12 };
});

check('r', 'Selective cleanse by category and by name; no default', () => {
    const g = hallway(27, null, 'warrior');
    const t = g.combat.enemies[0];
    g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 3 });
    g.applyMark(g.player, t, { mark: 'Pin', value: 0.5, duration: 2 });
    g.applyStatus(g.player, t, { name: 'Silence', type: 'silence', duration: 1 });
    const a = g.cleanse(t, { categories: ['mark'] }).map((s) => s.name).join();
    const b = g.cleanse(t, { statuses: ['Silence'] }).map((s) => s.name).join();
    let threw = false; try { g.cleanse(t, { categories: [] }); } catch (e) { threw = true; }
    return { ok: a === 'Pin' && b === 'Silence' && !!g.findStatus(t, 'Bleed') && threw, note: `removed ${a} then ${b}; Bleed kept; empty spec throws` };
});

check('s', 'Cleanse as a skill — and a misconfigured cleanse skill', () => {
    const g = hallway(28, (d) => {
        d.skillDefinitions['Purge Marks'] = { name: 'Purge Marks', cost: 0, effects: [{ type: 'cleanse', categories: ['mark'] }], target: 'self' };
        d.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' };
    }, 'warrior');
    g.player.skills.push('Purge Marks', 'Bad Purge');
    g.applyMark(g.combat.enemies[0], g.player, { mark: 'Weaken', value: 0.2, duration: 3 });
    g.do('purge marks');
    const ok1 = /cleansed of Weaken/.test(g.text());
    g.do('bad purge'); const n = g.log.length; g.do('attack 1');
    const stuck = /Not your turn/.test(g.since(n));
    return { ok: ok1, note: `works: ${ok1}; a cleanse with no spec throws inside the turn -> fight soft-locked: ${stuck}` };
});

check('t', 'Reactions: only on application of a defined pair, never from coexistence, never at 0%', () => {
    const r = { name: 'X', pair: ['Slow', 'Bleed'], baseChance: 1, outcome: [{ type: 'damage', amount: 5 }] };
    const g = hallway(29, (d) => { d.statusReactions = [r]; }, 'warrior');
    const t = g.combat.enemies[0]; const hp = () => t.hp;
    g.applyStatus(g.player, t, { name: 'Slow', type: 'slow', value: 0.5, duration: 5 }); const a = hp();
    g.applyDot(g.player, t, { name: 'Bleed', value: 1, duration: 5 }); const b = hp();
    g.tickStatusesEndOfRound(); g.tickStatusesEndOfRound(); const c = hp();
    g.applyDot(g.player, t, { name: 'Poison', value: 1, duration: 5 }); const d = hp();
    const g0 = hallway(29, (dd) => { dd.statusReactions = [{ ...r, baseChance: 0 }]; }, 'warrior'); const t0 = g0.combat.enemies[0];
    g0.applyStatus(g0.player, t0, { name: 'Slow', type: 'slow', value: 0.5, duration: 5 }); const h0 = t0.hp; g0.applyDot(g0.player, t0, { name: 'Bleed', value: 1, duration: 5 });
    return { ok: a - b === 5 && b === c && c === d && h0 === t0.hp, note: 'holds; but re-applying either status of an existing pair re-fires it, and self-feeding recipes recurse (see bugs)' };
});

check('u', 'No reactions ship; attribute hook adds 0', () => {
    const g = game(30);
    return { ok: g.data.statusReactions.length === 0 && g.reactionChanceModifier({ intelligence: 99 }, { baseChance: 0.5 }) === 0 };
});

check('rule10', 'Universal: an ENEMY can dodge and counter the player (data-only)', () => {
    const g = hallway(31, null, 'warrior');
    const t = g.combat.enemies[0];
    g.applyStatus(t, t, { name: 'Evasion', type: 'dodge', value: 1, duration: 2 });
    g.applyStatus(t, t, { name: 'Riposte', type: 'counter', value: 0.5, duration: 2 });
    const hp = g.player.hp; g.do('slash 1');
    return { ok: /Shackled Ghoul dodges/.test(g.text()) && g.player.hp < hp };
});

console.log('\nSTATUS_ENGINE_REPORT §6 — independent verification\n');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  [${r.id}] ${r.claim}${r.note ? `\n        ${r.note}` : ''}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} claims hold`);
