// Shield Discipline (Rook, PR #42; issue #33): Vanguard Guard 35% instead of 25%, not additive, QA-1 timing.
//   node qa/scripts/shield_discipline.js
const path = require('path');
const ROOT = process.env.ENSO_ROOT || path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const out = [];
const check = (id, what, fn) => { try { const r = fn(); out.push(`${r.ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${r.note || ''}`); } catch (e) { out.push(`FAIL  [${id}] ${what}\n        THREW ${e.message}`); } };

function warrior(branch, { spd = 40 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    d.rooms.hallway_of_chains.enemies = ['shackled_ghoul', 'shackled_ghoul', 'shackled_ghoul'];
    Object.assign(d.enemies.shackled_ghoul, { hp: 999, maxHp: 999, critChance: 0, skills: [{ name: 'Bite', base_damage: [40, 40] }] });
    const g = new GameEngine({ seed: 2, data: d }); g.start(); g.input('warrior');
    if (branch) { g.input('add_xp 250'); g.input(branch); }
    g.player.spd = spd; g.player.def = 0; g.input('n'); g.input('engage');
    g.player.hp = g.player.maxHp = 9999;
    return g;
}
/** Every enemy hit on the player during the next command. */
const hitsDuring = (g, cmd) => [...T(g.input(cmd)).matchAll(/Bite on Warrior for (\d+) damage/g)].map((m) => +m[1]);

check('1', 'Base Warrior Guard: 25% (40 -> 30); Vanguard: 35% (40 -> 26)', () => {
    const a = warrior(null), b = warrior('vanguard');
    const ha = hitsDuring(a, 'guard'), hb = hitsDuring(b, 'guard');
    return { ok: ha.length === 3 && ha.every((x) => x === 30) && hb.every((x) => x === 26) && hb.length === 3, note: `base hits ${ha}; Vanguard hits ${hb}` };
});
check('2', 'Other Warrior branches keep 25% (Berserker, Warden)', () => {
    const hits = ['berserker', 'warden'].map((br) => [br, hitsDuring(warrior(br), 'guard')]);
    return { ok: hits.every(([, h]) => h.length === 3 && h.every((x) => x === 30)), note: hits.map(([br, h]) => `${br} ${h}`).join(' · ') };
});
check('3', 'Not additive: recasting Guard keeps one 35% instance (never 25%+35%, never stacked)', () => {
    const g = warrior('vanguard'); g.input('guard');
    g.castSkill(g.player, g.playerSkill('Guard'), [g.player]); g.flush();
    const gs = g.player.statusEffects.filter((s) => s.name === 'Guard');
    return { ok: gs.length === 1 && gs[0].value === 0.35, note: `Guard instances ${gs.length}, value ${gs[0] && gs[0].value}` };
});
check('4', 'QA-1 timing unchanged: Vanguard Guard covers the enemy turns before your next turn, in both speed orders, then expires', () => {
    const res = [40, 1].map((spd) => { const g = warrior('vanguard', { spd }); const h = hitsDuring(g, 'guard'); const after = hitsDuring(g, 'slash 1'); return `${spd === 40 ? 'faster' : 'slower'}: guarded ${h.filter((x) => x === 26).length}/3, next round unguarded ${after.filter((x) => x === 40).length}/3`; });
    return { ok: res.every((r) => /guarded 3\/3, next round unguarded 3\/3/.test(r)), note: res.join(' | ') };
});
check('5', 'Guard still grants +1 Oath Point for the Vanguard', () => {
    const g = warrior('vanguard'); g.player.resource.current = 1; const txt = T(g.input('guard'));
    return { ok: /\+1 Oath Points \(oath kept\)/.test(txt), note: `Oath now ${g.player.resource.current}` };
});
check('6', 'Data-driven? The 35% lives in data, not engine code', () => {
    const fs = require('fs');
    const eff = fs.readFileSync(path.join(ROOT, 'src/effects.js'), 'utf8');
    const hard = /hasTrait\('Shield Discipline'\)\s*\?\s*0\.35/.test(eff) || /skill\.name === 'Guard'/.test(eff);
    return { ok: !hard, note: hard ? "effects.js hardcodes skill name 'Guard' and the value 0.35 (AGENTS.md §3: content belongs in data.js); 35% exists only in the trait's description text" : 'value comes from data' };
});

console.log('Shield Discipline (PR #42) — independent checks\n');
console.log(out.join('\n'));
console.log(`\n${out.filter((l) => l.startsWith('PASS')).length}/${out.length} pass`);
