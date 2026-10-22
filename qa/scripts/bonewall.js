// QA: independent verification of Bone Wall (PR #17, absorb_hit) through the real command path.
//   node qa/scripts/bonewall.js
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const results = [];
const check = (id, what, fn) => {
    try { const r = fn(); results.push({ id, what, ok: !!r.ok, info: !!r.info, note: r.note || '' }); }
    catch (e) { results.push({ id, what, ok: false, note: 'THREW ' + e.message }); }
};

/** Bone Warden L3 in the hallway (3 enemies) or a custom room. spd: player speed override. */
function fight({ seed = 5, spd, mutate, room = 'n' } = {}) {
    let data = DATA;
    if (mutate) { data = JSON.parse(JSON.stringify(DATA)); mutate(data); }
    const g = new GameEngine({ seed, data }); g.start();
    g.log = [];
    g.do = (c) => { const t = T(g.input(c)); g.log.push(`> ${c}`, t); return t; };
    ['necromancer', 'add_xp 250', 'bone warden'].forEach((c) => g.input(c));
    if (spd != null) g.player.spd = spd;
    g.player.hp = g.player.maxHp = 500;
    g.do(room); g.do('engage');
    return g;
}
const hitsOnPlayer = (txt) => [...txt.matchAll(/uses .+? on Necromancer for (\d+) damage/g)].map((m) => +m[1]);
const absorbs = (txt) => (txt.match(/Bone Wall absorbs/g) || []).length;

// ---------------------------------------------------------------- 1. activation + cost
check('1a', 'Bone Warden L3 learns Bone Wall; the other necro branches do not', () => {
    const got = {};
    for (const br of ['bone warden', 'plaguecaller', 'soulbinder']) {
        const g = new GameEngine({ seed: 1 }); g.start(); ['necromancer', 'add_xp 250', br].forEach((c) => g.input(c));
        got[br] = g.player.skills.includes('Bone Wall');
    }
    return { ok: got['bone warden'] && !got.plaguecaller && !got.soulbinder, note: JSON.stringify(got) };
});
check('1b', 'Real command charges exactly 1 Soul Energy (and no Soul Energy is regained on a no-damage turn)', () => {
    const g = fight({ spd: 1 });              // slowest: the cast ends the round, so the end-of-round gain rule is exercised
    g.player.resource.current = 5;
    const out = g.do('bone wall');
    const used = /Used 1 Soul Energy/.test(out);
    return { ok: used && g.player.resource.current === 4, note: `"Used 1" shown: ${used}; Soul Energy 5 -> ${g.player.resource.current}` };
});
check('1c', 'Refused at 0 Soul Energy without spending the turn', () => {
    const g = fight({ spd: 1 }); g.player.resource.current = 0;
    const r0 = g.combat.round, out = g.do('bone wall');
    return { ok: /Not enough Soul Energy/.test(out) && g.combat.round === r0 && !g.findStatus(g.player, 'Bone Wall'), note: out.split('\n').find((l) => /Not enough/.test(l)) };
});
check('1d', 'Menu shows the cost; your status line shows the wall while it is up', () => {
    const g = fight({ spd: 40 }); g.player.resource.current = 5;
    const menu = g.do('look');
    const shows = /Bone Wall \[Cost: 1 Soul Energy\]/.test(menu);
    g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 1 });
    const out = g.do('help me');             // invalid command re-prints the turn prompt
    return { ok: shows && /Bone Wall/.test(out.slice(out.indexOf('--- Enemies ---') - 400)), note: `cost in menu ${shows}` };
});

// ------------------------------------------------- 2-4. absorb, consume, then normal damage (both speed orders)
for (const [label, spd] of [['player faster', 40], ['player slower', 1]]) {
    check(`2-4 ${label}`, `Next connecting hit fully absorbed, wall consumed, following hits deal damage (${label})`, () => {
        const g = fight({ spd, seed: 9 });
        g.player.resource.current = 5;
        const hp0 = g.player.hp, from = g.log.length;   // count only what happens after the cast
        g.do('bone wall'); g.do('attack 1');      // cast, then one more full round of enemy attacks
        // the wall must absorb exactly one enemy attack; every later attack lands normally
        const t = g.log.slice(from).join('\n');
        const hits = hitsOnPlayer(t);
        const a = absorbs(t);
        const lost = hp0 - g.player.hp;
        const sum = hits.reduce((x, y) => x + y, 0);
        return {
            ok: a === 1 && !g.findStatus(g.player, 'Bone Wall') && hits.length >= 1 && lost === sum,
            note: `absorbed ${a}; later hits ${JSON.stringify(hits)}; HP lost ${lost} = sum of shown hits ${sum}`
        };
    });
}
check('4', 'Hits after the wall land at normal damage (inside each attack\'s range, DEF 0)', () => {
    // Two identical fights; in one the wall is pre-placed and absorbs hit #1. Hit #2 in that fight must
    // equal hit #2 in the control fight shifted by... RNG paths differ, so instead compare to the attack's own range.
    const g = fight({ spd: 1, seed: 11 }); g.player.resource.current = 5; g.player.def = 0;
    g.do('bone wall'); g.do('attack 1');   // no minions: Bone Armor (-2%/minion) would shift hits below the printed range
    const t = g.log.slice(g.log.indexOf('> bone wall')).join('\n');
    const lines = [...t.matchAll(/(\w[\w -]+?) uses ([\w ]+?) on Necromancer for (\d+) damage/g)];
    const bad = lines.filter((m) => {
        const key = Object.keys(DATA.enemies).find((k) => DATA.enemies[k].name === m[1]);
        const sk = key && DATA.enemies[key].skills.find((s) => s.name === m[2]);
        const [lo, hi] = sk.base_damage; const e = DATA.enemies[key];
        return +m[3] < lo || +m[3] > Math.floor(hi * e.critMultiplier);
    });
    return { ok: lines.length >= 2 && bad.length === 0, note: `${lines.length} later hits, all inside their attack range (DEF 0)` };
});

// ---------------------------------------------------------------- 5. interactions
check('5a', 'Multi-hit enemy attack: only the first hit is absorbed, the rest land', () => {
    const g = fight({ spd: 40, room: 'n', mutate: (d) => {
        d.rooms.hallway_of_chains.enemies = ['shackled_ghoul'];
        d.enemies.shackled_ghoul.skills = [{ name: 'Triple Bite', base_damage: [10, 10], effects: [{ type: 'multi_hit', count: 3 }] }];
        d.enemies.shackled_ghoul.critChance = 0;
    } });
    g.player.resource.current = 5; g.player.def = 0;
    const hp = g.player.hp;
    const out = g.do('bone wall');
    return { ok: absorbs(out) === 1 && hp - g.player.hp === 20, note: `absorbed ${absorbs(out)}, HP lost ${hp - g.player.hp} (expected 20 = hits 2+3)` };
});
check('5b', 'DoT ticks are not hits: Poison damages through the wall and does not consume it', () => {
    const g = fight({ spd: 40 });
    g.player.resource.current = 5;
    g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 5 });
    g.applyDot(g.combat.enemies[0], g.player, { name: 'Poison', value: 4, duration: 3 });
    g.startTurn(g.player);
    return { ok: !!g.findStatus(g.player, 'Bone Wall') && /suffers 4 Poison/.test(T(g.flush())), note: 'tick landed, wall kept' };
});
check('5c', 'Guard: wall absorbs first, Guard is kept for the next hit (real Guard reduction applies to hit #2)', () => {
    const g = fight({ spd: 40, mutate: (d) => { d.rooms.hallway_of_chains.enemies = ['shackled_ghoul']; d.enemies.shackled_ghoul.skills = [{ name: 'Bite', base_damage: [20, 20], effects: [{ type: 'multi_hit', count: 2 }] }]; d.enemies.shackled_ghoul.critChance = 0; } });
    g.player.def = 0; g.player.resource.current = 5;
    g.applyStatus(g.player, g.player, { name: 'Guard', type: 'damage_reduction', value: 0.25, duration: 2 });
    const hp = g.player.hp; const out = g.do('bone wall');
    return { ok: absorbs(out) === 1 && hp - g.player.hp === 15, note: `HP lost ${hp - g.player.hp} (expected 15 = 20 x 0.75 on hit 2)` };
});
check('5d', 'Dodge order: a successful dodge keeps the wall; a failed one lets the wall absorb', () => {
    const g = fight({ spd: 40 }); g.combat.enemies.forEach((e) => (e.critChance = 0));
    const attacker = g.combat.enemies[0];
    g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 3 });
    g.applyStatus(g.player, g.player, { name: 'Evasion', type: 'dodge', value: 1, duration: 3 });
    g.castSkill(attacker, attacker.skills[0], [g.player]);
    const kept = !!g.findStatus(g.player, 'Bone Wall');
    g.applyStatus(g.player, g.player, { name: 'Evasion', type: 'dodge', value: 0, duration: 3 });
    const hp = g.player.hp; g.castSkill(attacker, attacker.skills[0], [g.player]);
    return { ok: kept && !g.findStatus(g.player, 'Bone Wall') && g.player.hp === hp, note: `kept after dodge: ${kept}; absorbed after failed dodge` };
});
check('5e', 'Taunting minion: enemies hit the skeleton, the wall on the player is not used up', () => {
    const g = fight({ spd: 40 }); g.player.resource.current = 10;
    g.do('raise skeleton'); g.player.resource.current = 10;
    const sk = g.alive(g.combat.minions)[0];
    g.applyStatus(g.player, sk, { name: 'Taunt', type: 'taunt', duration: 5 });
    sk.hp = sk.maxHp = 999;
    g.player.resource.current = 10;
    const out = g.do('bone wall');
    return { ok: !!g.findStatus(g.player, 'Bone Wall') && absorbs(out) === 0 && /on Skeleton/.test(out), note: 'wall survives while the minion tanks' };
});
check('5f', 'Recasting while active refreshes (never 2 absorbs) — note: the 2nd cast still costs 1', () => {
    const g = fight({ spd: 40, mutate: (d) => { d.rooms.hallway_of_chains.enemies = ['shackled_ghoul']; d.enemies.shackled_ghoul.skills = [{ name: 'Bite', base_damage: [10, 10], effects: [{ type: 'multi_hit', count: 2 }] }]; d.enemies.shackled_ghoul.critChance = 0; } });
    g.player.def = 0; g.player.resource.current = 5;
    g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 1 });
    const hp = g.player.hp; const out = g.do('bone wall');
    return { ok: g.player.statusEffects.filter((s) => s.name === 'Bone Wall').length <= 1 && absorbs(out) === 1 && hp - g.player.hp === 10, note: `absorbed ${absorbs(out)}, SE 5 -> ${g.player.resource.current}` };
});
check('5g', 'Unused wall expires after one of your own rounds (no hit came)', () => {
    const g = fight({ spd: 40 });
    g.combat.enemies.forEach((e) => g.applyStatus(g.player, e, { name: 'Stun', type: 'skip_turn', duration: 2 }));
    g.player.resource.current = 5;
    const out = g.do('bone wall') + g.do('attack 1');
    return { ok: /\[Bone Wall\] wears off Necromancer/.test(out) && !g.findStatus(g.player, 'Bone Wall'), note: 'expiry message shown' };
});
check('5h', 'Riposte on the wall holder: does an absorbed attack trigger the counter? (a dodged one does)', () => {
    const g = fight({ spd: 40 }); g.combat.enemies.forEach((e) => (e.critChance = 0));
    const attacker = g.combat.enemies[0];
    g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 3 });
    g.applyStatus(g.player, g.player, { name: 'Riposte', type: 'counter', value: 0.5, duration: 3 });
    g.castSkill(attacker, attacker.skills[0], [g.player]);
    const countered = /Riposte!/.test(T(g.flush()));
    return { ok: true, info: true, note: `counter fired on absorbed hit: ${countered} (design question, see report)` };
});
check('5i', 'Universal: an enemy holding Bone Wall vs player attacks that skip hitConnects (Lightning Arc chain, Clockwork Bomb)', () => {
    const g = new GameEngine({ seed: 3 }); g.start(); ['mage', 'n', 'engage'].forEach((c) => g.input(c));
    g.player.hp = g.player.maxHp = 999; g.player.resource.current = 99; g.player.skills.push('Lightning Arc');
    const [a, b] = g.combat.enemies; a.hp = a.maxHp = b.hp = b.maxHp = 500;
    g.applyStatus(b, b, { name: 'Bone Wall', type: 'absorb', duration: 5 });
    const hp = b.hp; g.input('lightning arc 1');
    return { ok: true, info: true, note: `chain arc onto the walled enemy: wall ${g.findStatus(b, 'Bone Wall') ? 'kept, damage dealt ' + (hp - b.hp) : 'consumed'} (pre-existing: chains also skip dodge/blind)` };
});
check('5j', 'Taxonomy: Bone Wall has a statusDefinitions entry (category for selective cleansing)', () => {
    const g = fight({ spd: 40 });
    g.applyStatus(g.player, g.player, { name: 'Bone Wall', type: 'absorb', duration: 1 });
    const cat = g.findStatus(g.player, 'Bone Wall').category;
    return { ok: cat !== 'uncategorized', note: `category = ${cat} (Guard/Evasion/Mirror Image are 'buff')` };
});

// ---------------------------------------------------------------- speed: value of the wall vs a slow / fast necro
check('speed', 'Bone Wall absorbs exactly one hit whether you act before or after the enemies', () => {
    const r = [40, 1].map((spd) => { const g = fight({ spd, seed: 21 }); g.player.resource.current = 5; g.do('bone wall'); g.do('attack 1'); return absorbs(g.log.join('\n')); });
    return { ok: r.every((x) => x === 1), note: `absorbs: faster ${r[0]}, slower ${r[1]}` };
});

console.log('Bone Wall (PR #17) — independent QA checks\n');
for (const x of results) console.log(`${x.info ? 'INFO' : x.ok ? 'PASS' : 'FAIL'}  [${x.id}] ${x.what}\n        ${x.note}`);
const scored = results.filter((x) => !x.info);
console.log(`\n${scored.filter((x) => x.ok).length}/${scored.length} pass`);
