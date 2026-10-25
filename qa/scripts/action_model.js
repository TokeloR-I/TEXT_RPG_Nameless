// Action combat (combat v3) paper model. Gauge (balance). No sim: pure arithmetic over src/data.js, so the
// numbers in docs/design/ENSO_ACTION_COMBAT_BALANCE.md can be re-derived after any data change.
// It uses the engine's damage rule (roll + floor(stat / gameRules.statDamagePer) - DEF, crits, x guard) and the
// timings in actionRules, plus the action-only reads: boss hpMult, attack damageMult and, on blows that land on the
// player, actionRules.defence.minDamageShare (DEF never blocks more than 1 - share of a blow).
// Uptime (how much of a fight you can spend attacking) and avoid (the share of Warden blows dodged, parried or
// outranged) are ASSUMPTIONS, not measurements: the sim-driven bot replaces them once src/action/sim.js can be driven
// headless. The Warden win estimate is a seeded Monte Carlo over those two assumptions, not a bot.
//   node qa/scripts/action_model.js [--level 1|3] [--uptime 0.4] [--avoid 0.7] [--share 0.35]
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const D = require(path.join(ROOT, 'src/data.js'));
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const LEVEL = parseInt(opt('--level', '3'), 10);
const UPTIME = parseFloat(opt('--uptime', '0.4'));
const AVOID = parseFloat(opt('--avoid', '0.7'));
const A = D.actionRules, R = D.gameRules;
const SHARE = parseFloat(opt('--share', String((A.defence || {}).minDamageShare || 0)));
const avg = (r) => (r[0] + r[1]) / 2;

function player(cls) {
    const c = D.basePlayerClasses[cls], s = c.baseStats, up = LEVEL - 1;
    const p = { cls, hp: s.hp + 10 * up, strength: s.strength + up, intelligence: s.intelligence + up, agility: s.agility + up, def: s.def + up, crit: s.critChance, critMult: s.critMultiplier };
    if (cls === 'warrior') p.def += 1; // Wooden Shield (+1 def), the only starter item with a combat stat
    return p;
}
function statBonus(p, type) {
    const stat = type === 'physical' || type == null ? (R.physicalStat[p.cls] || R.physicalStat.default) : R.magicTypes.includes(type) ? R.magicStat : null;
    return stat ? Math.floor(p[stat] / R.statDamagePer) : 0;
}
/** One outcome as the engine computes it: max(raw - DEF, raw x share), x mult, floored. */
const dealt = (raw, def, mult = 1, armorIgnore = 0, share = 0) => Math.floor(Math.max(0, raw - def * (1 - armorIgnore), raw * share) * mult);
/** Expected damage of one hit (crit-weighted). */
function hit(dmgRange, bonus, def, crit, critMult, mult = 1, armorIgnore = 0, share = 0) {
    const out = (raw) => dealt(raw, def, mult, armorIgnore, share);
    let e = 0; const n = dmgRange[1] - dmgRange[0] + 1;
    for (let d = dmgRange[0]; d <= dmgRange[1]; d++) e += (1 - crit) * out(d + bonus) + crit * out(Math.floor((d + bonus) * critMult));
    return e / n;
}
function basicSkill(cls) {
    const first = D.basePlayerClasses[cls].startingSkills[0];
    const s = D.skillDefinitions[first];
    return s && Number(s.cost) === 0 && s.base_damage ? s : D.skillDefinitions['Basic Attack'];
}
/** ms per basic hit: mean over the combo chain (startup + active + recovery of each step). */
function cadenceMs(cls) {
    const w = A.classes[cls].weapon;
    const steps = w.combo && w.combo.length ? w.combo : [w];
    return steps.reduce((t, s) => t + s.startupMs + (s.activeMs || 0) + s.recoveryMs, 0) / steps.length;
}
const CLASSES = Object.keys(D.basePlayerClasses);
const ENEMIES = Object.keys(A.enemies).filter((k) => D.enemies[k]);
const f = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');

console.log(`action_model — level ${LEVEL}, assumed uptime ${UPTIME}\n`);
console.log('### Player basic attack: hits to kill / seconds to kill at 100% uptime (and at the assumed uptime)\n');
console.log(`| Class | ms per hit | ${ENEMIES.map((k) => `${k} (${D.enemies[k].hp} HP, DEF ${D.enemies[k].def})`).join(' | ')} |`);
console.log(`|---|---:|${ENEMIES.map(() => '---:').join('|')}|`);
for (const cls of CLASSES) {
    const p = player(cls), s = basicSkill(cls), ms = cadenceMs(cls), b = statBonus(p, s.damage_type);
    const cells = ENEMIES.map((k) => {
        const e = D.enemies[k], h = hit(s.base_damage, b, e.def, p.crit, p.critMult);
        if (h <= 0.05) return '~0 dmg';
        const n = Math.ceil(e.hp / h), t = (n * ms) / 1000;
        return `${n} hits · ${f(t)} s (${f(t / UPTIME)} s)`;
    });
    console.log(`| ${cls} (${s.name}, ${f(hit(s.base_damage, b, 0, p.crit, p.critMult))} raw) | ${f(ms, 0)} | ${cells.join(' | ')} |`);
}

console.log('\n### Crow Warden: damage per second by source at level ' + LEVEL + ' (skills at their real-time cooldown, resource permitting)\n');
const W = D.enemies.crow_touched_warden, WB = A.bosses.crow_touched_warden, W_HP = Math.round(W.hp * (WB.hpMult || 1));
const DPS = {};
console.log(`Warden HP in action fights: ${W.hp} x hpMult ${WB.hpMult || 1} = ${W_HP}.\n`);
console.log('| Class | Basic DPS (100%) | Skill DPS | Seconds to kill, basic at assumed uptime + skills at 100% |');
console.log('|---|---:|---:|---:|');
const cdS = (n) => { const s = D.skillDefinitions[n]; const r = D.realtimeRules.cooldowns; return s.cooldown != null ? s.cooldown : r.baseSeconds + r.perCostSeconds * (Number(s.cost) || 0); };
for (const cls of CLASSES) {
    const p = player(cls), s = basicSkill(cls);
    const basic = (hit(s.base_damage, statBonus(p, s.damage_type), W.def, p.crit, p.critMult) * 1000) / cadenceMs(cls);
    let skill = 0;
    for (const n of D.basePlayerClasses[cls].startingSkills) {
        const sk = D.skillDefinitions[n];
        if (!sk.base_damage || n === s.name) continue;
        const ign = ((sk.effects || []).find((x) => x.type === 'ignore_armor_percent') || {}).value || 0;
        skill += hit(sk.base_damage, statBonus(p, sk.damage_type), W.def, p.crit, p.critMult, 1, ign) / cdS(n);
    }
    DPS[cls] = basic * UPTIME + skill;
    console.log(`| ${cls} | ${f(basic, 2)} | ${f(skill, 2)} | ${f(W_HP / DPS[cls])} |`);
}

console.log(`\n### Enemy damage per hit on each class (unguarded / guarded), and per second at the attack cycle (defence.minDamageShare ${SHARE})\n`);
const gm = (cls) => { const g = Object.assign({}, A.guard, A.classes[cls].guard || {}); return g.parryOnly ? 1 : g.damageTaken; };
console.log(`| Enemy attack | cycle ms | ${CLASSES.map((c) => `${c} (DEF ${player(c).def}, ${player(c).hp} HP)`).join(' | ')} |`);
console.log(`|---|---:|${CLASSES.map(() => '---').join('|')}|`);
const rows = [];
for (const k of ENEMIES) {
    const e = D.enemies[k], ae = A.enemies[k];
    const dmgOf = (skill) => (e.skills.find((s) => s.name === skill) || e.skills[0]).base_damage;
    if (k === 'crow_touched_warden') {
        const B = A.bosses[k];
        for (const [id, a] of Object.entries(B.attacks)) rows.push({ k: `${k} ${id}`, dmg: dmgOf(a.skill), a, gap: B.attackGapMs, crit: e.critChance, cm: e.critMultiplier });
    } else for (const a of ae.attacks || []) rows.push({ k: `${k} ${a.name || a.skill}`, dmg: dmgOf(a.skill), a, gap: 0, crit: e.critChance || 0, cm: e.critMultiplier || 1.5 });
}
for (const r of rows) {
    const steps = r.a.combo || [r.a];
    const cyc = steps.reduce((t, s) => t + s.windupMs + (s.activeMs || 0) + s.recoveryMs, 0) + Math.max(r.a.cooldownMs || 0, r.gap || 0);
    const cells = CLASSES.map((c) => {
        const p = player(c), m = r.a.damageMult || 1, h = hit(r.dmg, 0, p.def, r.crit, r.cm, m, 0, SHARE) * steps.length;
        const g = r.a.guardable === false ? h : hit(r.dmg, 0, p.def, r.crit, r.cm, m * gm(c), 0, SHARE) * steps.length;
        return `${f(h)} / ${f(g)} · ${f((h * 1000) / cyc, 2)}/s`;
    });
    console.log(`| ${r.k} (${r.dmg.join('–')}${r.a.damageMult ? ' x' + r.a.damageMult : ''}) | ${f(cyc, 0)} | ${cells.join(' | ')} |`);
}

// Warden win estimate. Each Warden attack is drawn uniformly from its phase's ready attacks (openWith first on entering
// a phase); each blow lands with probability 1 - avoid at the engine's damage rule; the player deals DPS (above)
// without pause. No guard, potions or respawns: a crude read of how dangerous the Warden is, not a measured win rate.
function wardenFight(cls, share, rng) {
    const p = player(cls), dps = DPS[cls], phases = [];
    for (const ph of WB.phases) {
        const prev = phases[phases.length - 1] || {};
        phases.push(Object.assign({}, prev, ph, { openWith: ph.openWith, attacks: (ph.attacks || prev.attacks).filter((k) => !(ph.drop || []).includes(k)) }));
    }
    let hp = p.hp, t = 0, cur = -1;
    const ready = {};
    for (;;) {
        const left = 1 - (dps * t) / W_HP;
        if (left <= 0) return { win: true, t };
        let pi = 0;
        phases.forEach((ph, i) => { if (left <= ph.fromHpPct) pi = i; });
        const ph = phases[pi];
        let id = pi !== cur ? ph.openWith : null;
        cur = pi;
        if (!id) { const ok = ph.attacks.filter((k) => (ready[k] || 0) <= t); id = ok[Math.floor(rng() * ok.length)]; }
        const a = WB.attacks[id], range = (W.skills.find((s) => s.name === a.skill) || W.skills[0]).base_damage;
        const blows = id === 'halberd_sweep' && ph.sweepCombo ? ph.sweepCombo.hits : 1;
        for (let b = 0; b < blows; b++) {
            if (rng() < AVOID) continue;
            let raw = range[0] + Math.floor(rng() * (range[1] - range[0] + 1));
            if (rng() < W.critChance) raw = Math.floor(raw * W.critMultiplier);
            hp -= dealt(raw, p.def, a.damageMult || 1, 0, share);
        }
        if (hp <= 0) return { win: false, t };
        ready[id] = t + (a.cooldownMs || 0) / 1000;
        t += (a.windupMs + (a.activeMs || 0) + a.recoveryMs * (ph.recoveryMult || 1) + WB.attackGapMs + (blows > 1 ? ph.sweepCombo.gapMs : 0)) / 1000;
    }
}
const mulberry = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let x = Math.imul(seed ^ (seed >>> 15), 1 | seed); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
const N = 2000;
console.log(`\n### Crow Warden win estimate (${N} seeded fights per class; avoid ${AVOID}, uptime ${UPTIME}; no guard, potions or respawns)\n`);
console.log(`| Class | Win % without the floor (share 0) | Win % at share ${SHARE} | Fight s (median, share ${SHARE}) |`);
console.log('|---|---:|---:|---:|');
for (const cls of CLASSES) {
    const run = (share) => { const rng = mulberry(1234), r = []; for (let i = 0; i < N; i++) r.push(wardenFight(cls, share, rng)); return r; };
    const pct = (r) => (100 * r.filter((x) => x.win).length) / N;
    const now = run(SHARE), ts = now.map((x) => x.t).sort((x, y) => x - y);
    console.log(`| ${cls} | ${f(pct(run(0)), 0)} | ${f(pct(now), 0)} | ${f(ts[N >> 1])} |`);
}

console.log('\n### Stamina budget (max, regen after the delay, what one action costs)\n');
console.log('| Class | Dodge cost | Dodges from full | Seconds 0 -> full | Sustained dodges / s (regen only) | Guard block cost x | Warden sweep blocks from full |');
console.log('|---|---:|---:|---:|---:|---:|---:|');
for (const cls of CLASSES) {
    const st = A.stamina, d = Object.assign({}, A.dodge, A.classes[cls].dodge || {}), g = Object.assign({}, A.guard, A.classes[cls].guard || {});
    const refill = st.regenDelayMs / 1000 + st.max / st.regenPerSec;
    const sustain = 1 / (d.stamina / st.regenPerSec + st.regenDelayMs / 1000);
    const sweep = A.bosses.crow_touched_warden.attacks.halberd_sweep.blockCost * (g.parryOnly ? NaN : g.staminaMult || 1);
    console.log(`| ${cls} | ${d.stamina} | ${Math.floor(st.max / d.stamina)} | ${f(refill)} | ${f(sustain, 2)} | ${g.parryOnly ? 'parry only' : f(g.staminaMult || 1, 2)} | ${g.parryOnly ? '—' : Math.floor(st.max / sweep)} |`);
}
