// QA-1 (approved Option A + applier-death ruling): independent checks against
// docs/design/QA_1_REACTIVE_STATUS_DECISION.md and its dev handoff test matrix.
//   node qa/scripts/qa1_expiry.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => { try { const r = fn(); out.push(`${r.ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${r.note || ''}`); } catch (e) { out.push(`FAIL  [${id}] ${what}\n        THREW ${e.stack.split('\n').slice(0, 2).join(' ')}`); } };

/** One-room fight. enemies: keys; spd: player SPD; mutate: data copy edits. */
function fight({ cls = 'rogue', branch, enemies = ['shackled_ghoul'], spd = 40, seed = 3, mutate, pre = [] } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of new Set(enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 });
    if (mutate) mutate(d);
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input(cls); if (branch) { g.input('add_xp 250'); g.input(branch); }
    g.player.spd = spd; g.player.critChance = 0;
    pre.forEach((c) => g.input(c));
    g.input('n'); g.input('engage');
    g.player.hp = g.player.maxHp = 99999;
    g.do = (c) => { g.player.resource.current = 99; return T(g.input(c)); };
    return g;
}
const consumed = (txt) => (txt.match(/\[Marked for Death\] is consumed/g) || []).length;

// ---------------------------------------------------------------- Marked for Death
check('MfD-3a', 'A 0-damage hit does not consume the mark; the next positive hit does', () => {
    const g = fight(); const e = g.combat.enemies[0];
    g.applyMark(g.player, e, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    const skill = { name: 'Poke', base_damage: [10, 10], damage_type: 'physical' };
    e.def = 999; let h = g.newHit(e); g.rollDamage(g.player, e, skill, h); const keptAfterZero = !!g.findStatus(e, 'Marked for Death');
    e.def = 0; h = g.newHit(e); g.rollDamage(g.player, e, skill, h); const gone = !g.findStatus(e, 'Marked for Death');
    return { ok: keptAfterZero && gone, note: `kept after 0-dmg hit: ${keptAfterZero}; consumed by positive hit: ${gone}` };
});
check('MfD-3b', 'A dodged attack does not consume the mark', () => {
    const g = fight(); const e = g.combat.enemies[0];
    g.applyMark(g.player, e, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    g.applyStatus(e, e, { name: 'Mirror Image', type: 'dodge', value: 1, duration: 3 });
    g.castSkill(g.player, g.playerSkill('Basic Attack'), [e]);
    return { ok: !!g.findStatus(e, 'Marked for Death'), note: 'mark still there after the dodge' };
});
check('MfD-4', 'Multi-hit (Flurry 3x): only the first hit gets +50%', () => {
    const g = fight(); const e = g.combat.enemies[0];
    g.player.skills.push('Marked for Death', 'Flurry');
    g.do('marked for death'); const txt = g.do('flurry');
    const hits = [...txt.matchAll(/uses Flurry on Shackled Ghoul for (\d+)/g)].map((m) => +m[1]);
    return { ok: consumed(txt) === 1 && hits.length === 3, note: `Flurry hits ${JSON.stringify(hits)}, consumed ${consumed(txt)}x (first should be ~1.5x the others)` };
});
check('MfD-5a', "An ally's summon can use the mark (skeleton's positive hit consumes it)", () => {
    const g = fight({ cls: 'necromancer', spd: 1 }); const e = g.combat.enemies[0];
    g.player.skills.push('Marked for Death');
    g.do('raise skeleton'); g.do('soul leech'); // skeleton joins next round
    g.applyMark(g.player, e, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    const sk = g.alive(g.combat.minions)[0];
    const txt = (() => { g.flush(); g.castSkill(sk, sk.skills[0], [e]); return T(g.flush()); })();
    return { ok: consumed(txt) === 1, note: txt.split('\n').filter((l) => /Skeleton uses|consumed/.test(l)).join(' / ') };
});
check('MfD-5b', 'A hostile hit cannot use the mark (enemy hits a player-marked enemy)', () => {
    const g = fight({ enemies: ['shackled_ghoul', 'shackled_ghoul'] }); const [a, b] = g.combat.enemies;
    g.applyMark(g.player, b, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    const h = g.newHit(b); g.rollDamage(a, b, { name: 'Bite', base_damage: [10, 10], damage_type: 'physical' }, h);
    return { ok: h.damage === 10 && !!g.findStatus(b, 'Marked for Death'), note: `enemy hit for ${h.damage} (no +50%), mark kept: ${!!g.findStatus(b, 'Marked for Death')}` };
});
check('MfD-5c', 'Re-marking refreshes one mark (no second charge)', () => {
    const g = fight(); const e = g.combat.enemies[0]; g.player.skills.push('Marked for Death');
    g.do('marked for death'); g.applyMark(g.player, e, { mark: 'Marked for Death', value: 0.5, duration: 1 });
    return { ok: e.statusEffects.filter((s) => s.name === 'Marked for Death').length === 1 };
});
check('MfD-1/2', 'Unused mark expires at the end of your NEXT turn, faster and slower', () => {
    const res = [40, 1].map((spd) => {
        const g = fight({ spd }); g.player.skills.push('Marked for Death', 'Focus');
        const e = g.combat.enemies[0]; e.def = 999; // your hits deal 0: the mark is never consumed
        g.do('marked for death'); const after0 = !!g.findStatus(e, 'Marked for Death');
        g.do('attack 1'); const after1 = !!g.findStatus(e, 'Marked for Death');
        return `${spd === 40 ? 'faster' : 'slower'}: after cast ${after0}, after next turn ${after1}`;
    });
    return { ok: res.every((r) => /after cast true, after next turn false/.test(r)), note: res.join(' | ') };
});

// ---------------------------------------------------------------- Expose
check('Exp-7', 'Every hit inside the window benefits (Flurry 3/3 boosted); none after it', () => {
    const g = fight({ cls: 'warrior', branch: 'warden' }); const e = g.combat.enemies[0];
    g.player.skills.push('Expose Weakness', 'Flurry');
    let boosted = 0, after = 0;
    const orig = g.rollDamage.bind(g);
    g.rollDamage = (a, t, s, h) => { if (a.isPlayer && t === e) { if (g.findStatus(e, 'Expose')) boosted++; else after++; } return orig(a, t, s, h); };
    g.do('expose weakness'); g.do('flurry'); g.do('flurry'); g.do('flurry');
    return { ok: boosted === 6 && after === 3, note: `boosted hits ${boosted} (2 turns x 3), unboosted after the window ${after}` };
});

// ---------------------------------------------------------------- Guard
check('Guard-8/9', 'All enemy hits between the cast and your next turn are reduced, nothing more (3 enemies, both orders)', () => {
    const res = [40, 1].map((spd) => {
        const g = fight({ cls: 'warrior', enemies: ['shackled_ghoul', 'shackled_ghoul', 'rust_rat'], spd });
        let guarded = 0; const orig = g.rollDamage.bind(g);
        g.rollDamage = (a, t, s, h) => { if (t.isPlayer && g.findStatus(t, 'Guard')) guarded++; return orig(a, t, s, h); };
        g.do('guard'); g.do('slash 1'); g.do('slash 1');
        return guarded;
    });
    return { ok: res[0] === 3 && res[1] === 3, note: `guarded hits: faster ${res[0]}, slower ${res[1]} (3 enemies -> 3 each)` };
});

// ---------------------------------------------------------------- Haste, stun, refresh, cleanse, victory
check('Haste-10', 'Haste bonus actions do not shorten Expose or end Guard', () => {
    const g = fight({ cls: 'mage', branch: 'chronomancer' }); const e = g.combat.enemies[0];
    g.player.skills.push('Expose Weakness', 'Guard');
    g.do('expose weakness');                                // turn T: applied (T never counts)
    const w = []; for (let i = 0; i < 3; i++) { g.do('haste'); w.push(g.findStatus(e, 'Expose').duration); } // T+1: 3 bonus actions
    g.do('focus');                                          // T+1 ends -> window 2 -> 1
    const afterTurn = g.findStatus(e, 'Expose').duration;
    // Guard cast with a bonus action still pending, then two more bonus actions: Guard must stay up
    g.combat.extraTurn = true; g.do('guard'); g.do('haste'); const gd1 = !!g.findStatus(g.player, 'Guard');
    g.do('haste'); const gd2 = !!g.findStatus(g.player, 'Guard');
    return { ok: w.join() === '2,2,2' && afterTurn === 1 && gd1 && gd2, note: `Expose window during 3 bonus actions ${w}, after the turn ${afterTurn}; Guard after bonus actions: ${gd1}, ${gd2}` };
});
check('Stun-11a', "A stunned (skipped) applier turn doesn't burn Marked for Death", () => {
    const g = fight({ spd: 40 }); const e = g.combat.enemies[0]; g.player.skills.push('Marked for Death');
    g.do('marked for death');
    g.applyStatus(e, g.player, { name: 'Stun', type: 'skip_turn', duration: 1 });
    let txt = g.do('focus');                               // (Focus unknown to rogue -> use attack after the skip)
    txt += g.do('continue');                               // the stunned turn pauses for input
    const alive = !!g.findStatus(e, 'Marked for Death');
    txt = g.do('attack 1');
    return { ok: alive && consumed(txt) === 1, note: `mark survived the skipped turn: ${alive}; consumed on the next real turn: ${consumed(txt) === 1}` };
});
check('Stun-11b', 'Guard ends as your next turn starts even if that turn is skipped', () => {
    const g = fight({ cls: 'warrior', spd: 40 });
    g.applyStatus(g.combat.enemies[0], g.player, { name: 'Stun', type: 'skip_turn', duration: 1 }); // skips your NEXT turn
    const txt = g.do('guard');
    const order = txt.indexOf('[Guard] wears off Warrior') >= 0 && txt.indexOf('[Guard] wears off Warrior') < txt.indexOf('Warrior is unable to act');
    return { ok: !g.findStatus(g.player, 'Guard') && order, note: `"[Guard] wears off" printed before "unable to act": ${order}` };
});
check('Refresh-12a', 'Refresh restarts the full Expose window', () => {
    const g = fight({ cls: 'warrior', branch: 'warden' }); const e = g.combat.enemies[0]; g.player.skills.push('Expose Weakness');
    g.do('expose weakness'); g.do('slash'); const mid = g.findStatus(e, 'Expose').duration;
    g.do('expose weakness'); const after = g.findStatus(e, 'Expose').duration;
    return { ok: mid === 1 && after === 2, note: `window ${mid} -> refreshed to ${after}` };
});
check('Cleanse-12b', 'Cleanse removes Expose / Guard immediately', () => {
    const g = fight({ cls: 'warrior', branch: 'warden' }); const e = g.combat.enemies[0];
    g.castSkill(g.player, g.playerSkill('Expose Weakness'), [e]);
    g.castSkill(g.player, g.playerSkill('Guard'), [g.player]);
    const a = g.cleanse(e, { statuses: ['Expose'] }).length, b = g.cleanse(g.player, { categories: ['buff'] }).map((s) => s.name);
    return { ok: a === 1 && b.includes('Guard') && !g.findStatus(e, 'Expose') && !g.findStatus(g.player, 'Guard'), note: `removed Expose ${a}, buffs [${b}]` };
});
check('Victory-12c', 'Nothing carries into the next fight', () => {
    const d = (x) => { x.rooms.collapsed_wine_cellar.enemies = ['rust_rat']; };
    const g = fight({ cls: 'warrior', branch: 'warden', mutate: d }); const e = g.combat.enemies[0];
    g.player.skills.push('Expose Weakness'); g.do('expose weakness'); g.do('guard');
    e.hp = 1; g.do('slash'); g.input('s'); g.input('e'); g.input('engage');
    return { ok: g.mode === 'combat' && g.player.statusEffects.length === 0 && g.combat.enemies.every((x) => x.statusEffects.length === 0), note: `next fight starts clean (player statuses: ${g.player.statusEffects.map((s) => s.name)})` };
});

// ---------------------------------------------------------------- Applier-death ruling
check('Death-a', 'Enemy-applied Expose on you survives its applier until the end of that round, then expires', () => {
    const g = fight({ cls: 'warrior', enemies: ['shackled_ghoul', 'shackled_ghoul'], spd: 40 });
    const [a, b] = g.combat.enemies;
    g.applyMark(a, g.player, { mark: 'Expose', value: 0.2, duration: 2 });
    a.hp = 1; g.flush();
    let boostedAfterDeath = 0; const orig = g.rollDamage.bind(g);
    g.rollDamage = (x, t, s, h) => { if (t.isPlayer && x === b && a.hp <= 0 && g.findStatus(t, 'Expose')) boostedAfterDeath++; return orig(x, t, s, h); };
    const txt = g.do('slash 1');                           // kill the applier first; b still attacks this round
    const goneNow = !g.findStatus(g.player, 'Expose');
    return { ok: boostedAfterDeath === 1 && goneNow && /\[Expose\] wears off Warrior/.test(txt), note: `hits on you still boosted after the applier died: ${boostedAfterDeath}; gone by your next turn: ${goneNow}` };
});
check('Death-b', 'Applier dies before acting in the round: same end-of-round expiry', () => {
    const g = fight({ cls: 'warrior', enemies: ['shackled_ghoul', 'shackled_ghoul'], spd: 40 });
    const [a] = g.combat.enemies;
    g.applyMark(a, g.player, { mark: 'Expose', value: 0.2, duration: 2 });
    a.hp = 1; g.do('slash 1');                              // you act first: the applier dies before its turn
    return { ok: !g.findStatus(g.player, 'Expose'), note: 'expired at the end of the round it died in' };
});
check('Death-c', 'The ruling covers only Marked for Death and Expose (Weaken from a dead applier keeps the round rule)', () => {
    const g = fight({ cls: 'warrior', enemies: ['shackled_ghoul', 'shackled_ghoul'], spd: 40 });
    const [a] = g.combat.enemies;
    g.applyMark(a, g.player, { mark: 'Weaken', value: 0.2, duration: 3 });
    a.hp = 1; g.do('slash 1');
    return { ok: !!g.findStatus(g.player, 'Weaken'), note: `Weaken still on you after its applier died: ${!!g.findStatus(g.player, 'Weaken')}` };
});
check('Death-d', 'Revival in the same round does not cancel the scheduled expiry (Hollow King applier)', () => {
    const g = fight({ cls: 'warrior', spd: 40, pre: ['become_hollow_king'] });
    const e = g.combat ? g.combat.enemies[0] : null;
    if (!e) return { ok: false, note: 'no combat' };
    g.applyMark(g.player, e, { mark: 'Expose', value: 0.2, duration: 2 });
    g.player.isHollowKing = true; g.damage(g.player, g.player.hp + 5, e); // dies...
    const revived = !g.checkBattleEnd() && g.player.hp > 0; // ...Crown of the Undying revives
    const sched = g.findStatus(e, 'Expose');
    return { ok: revived && sched && sched.orphaned === true, note: `revived: ${revived}; Expose still scheduled to expire at round end: ${!!(sched && sched.orphaned)}` };
});

console.log('QA-1 opportunity expiry — independent checks\n');
console.log(out.join('\n'));
console.log(`\n${out.filter((l) => l.startsWith('PASS')).length}/${out.length} pass`);
