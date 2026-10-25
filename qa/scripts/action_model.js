// Action combat (combat v3) paper model. Gauge (balance). No sim: pure arithmetic over src/data.js, so the
// numbers in docs/design/ENSO_ACTION_COMBAT_BALANCE.md can be re-derived after any data change.
// It uses the engine's damage rule (roll + floor(stat / gameRules.statDamagePer) - DEF, crits, x guard) and the
// timings in actionRules. Uptime (how much of a fight you can spend attacking) is an ASSUMPTION, not a measurement:
// the sim-driven bot replaces it once src/action/sim.js can be driven headless.
//   node qa/scripts/action_model.js [--level 1|3] [--uptime 0.4]
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const D = require(path.join(ROOT, 'src/data.js'));
const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const LEVEL = parseInt(opt('--level', '3'), 10);
const UPTIME = parseFloat(opt('--uptime', '0.4'));
const A = D.actionRules, R = D.gameRules;
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
/** Expected damage of one hit (crit-weighted, floored at 0 per outcome as the engine does). */
function hit(dmgRange, bonus, def, crit, critMult, mult = 1, armorIgnore = 0) {
    const out = (raw) => Math.max(0, raw - def * (1 - armorIgnore)) * mult;
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
const W = D.enemies.crow_touched_warden;
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
    console.log(`| ${cls} | ${f(basic, 2)} | ${f(skill, 2)} | ${f(W.hp / (basic * UPTIME + skill))} |`);
}

console.log('\n### Enemy damage per hit on each class (unguarded / guarded), and per second at the attack cycle\n');
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
        const p = player(c), h = hit(r.dmg, 0, p.def, r.crit, r.cm) * steps.length;
        const g = r.a.guardable === false ? h : h * gm(c);
        return `${f(h)} / ${f(g)} · ${f((h * 1000) / cyc, 2)}/s`;
    });
    console.log(`| ${r.k} (${r.dmg.join('–')}) | ${f(cyc, 0)} | ${cells.join(' | ')} |`);
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
