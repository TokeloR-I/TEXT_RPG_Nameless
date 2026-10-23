// World Zone 1 (PRs #45-#49) smoke checks through the engine's world intents.
//   node qa/scripts/world_smoke.js [seeds=100]
const fs = require('fs');
const path = require('path');
const ROOT = process.env.ENSO_ROOT || path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const zone = require(path.join(ROOT, 'src/world/zone1.js'));
const { choose } = require('./smartbot.js');
const SEEDS = parseInt(process.argv[2] || '100', 10);
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const all = JSON.stringify(zone);
const PICKUPS = [...all.matchAll(/"id":"([a-z_0-9]+)","kind":"pickup"[^}]*?"item":"([^"]+)"/g)].map((m) => [m[1], m[2]]);
const ENCOUNTERS = [...all.matchAll(/"id":"([a-z_0-9]+)","x":\d+,"y":\d+,"name":"[^"]+","enemies":(\[[^\]]*\])/g)].map((m) => [m[1], JSON.parse(m[2])]);
const out = [];
const check = (id, what, fn) => { try { const r = fn(); out.push(`${r.info ? 'INFO' : r.ok ? 'PASS' : 'FAIL'}  [${id}] ${what}\n        ${r.note || ''}`); } catch (e) { out.push(`FAIL  [${id}] ${what}\n        THREW ${e.stack.split('\n').slice(0, 2).join(' ')}`); } };
const world = (cls, seed = 1) => { const g = new GameEngine({ seed }); g.start(); g.input(cls); g.enterWorld(); return g; };
const fightOut = (g) => { for (let i = 0; i < 300 && g.mode === 'combat'; i++) g.input(choose(g)); };

check('1', `Zone data: ${PICKUPS.length} pickups, ${ENCOUNTERS.length} encounters, every enemy key exists`, () => {
    const missing = ENCOUNTERS.flatMap(([, en]) => en.filter((k) => !DATA.enemies[k]));
    const items = PICKUPS.filter(([, it]) => !DATA.itemDefinitions[it]);
    return { ok: !missing.length && PICKUPS.length > 0 && ENCOUNTERS.length > 0, note: `${PICKUPS.map((p) => p.join('=')).join(', ')} · ${ENCOUNTERS.map(([id, en]) => `${id}=${en}`).join(', ')}${items.length ? ` · non-usable items: ${items.map((i) => i[1])}` : ''}` };
});
check('2', `Every class at level 1 beats every encounter, one after another, with the smart bot (${SEEDS} seeds)`, () => {
    const res = {};
    for (const cls of Object.keys(DATA.basePlayerClasses)) {
        let w = 0;
        for (let s = 1; s <= SEEDS; s++) {
            const g = world(cls, s); let ok = true;
            for (const [id, en] of ENCOUNTERS) { g.input('look'); T(g.worldEncounter(id, en)); fightOut(g); if (g.mode !== 'explore') { ok = false; break; } }
            if (ok) w++;
        }
        res[cls] = w;
    }
    return { ok: Object.values(res).every((w) => w === SEEDS), note: JSON.stringify(res) + ` of ${SEEDS}` };
});
check('3', 'Pickups: each gives its item once per run; a second pickup is refused', () => {
    const g = world('rogue'); const r = [];
    for (const [id, item] of PICKUPS) { const n0 = g.player.inventory.filter((i) => i === item).length; T(g.worldPickup(id, item)); const second = T(g.worldPickup(id, item)); r.push(`${id}: +${g.player.inventory.filter((i) => i === item).length - n0}, again: ${/nothing left/.test(second) ? 'refused' : 'GIVEN'}`); }
    return { ok: r.every((x) => /\+1, again: refused/.test(x)), note: r.join(' · ') };
});
check('4', 'Victory marks the encounter defeated (no second fight); flee keeps it available; defeat is game over', () => {
    const [id, en] = ENCOUNTERS[ENCOUNTERS.length - 1];
    const a = world('warrior'); a.worldEncounter(id, en); fightOut(a); const again = T(a.worldEncounter(id, en));
    const b = world('warrior'); b.worldEncounter(id, en); b.input('flee'); const fled = b.world.lastResult; const re = T(b.worldEncounter(id, en)); const reengaged = b.mode === 'combat';
    const c = world('mage', 3); c.player.hp = 1; c.worldEncounter(id, en); for (let i = 0; i < 50 && c.mode === 'combat'; i++) c.input('focus');
    return { ok: /Nothing stirs/.test(again) && fled === 'fled' && reengaged && c.mode === 'game_over', note: `after victory: "${again.split('\n').pop()}"; flee result ${fled}, re-engage ${reengaged}; 1-HP mage ends in ${c.mode}` };
});
check('5', 'World fights and the text game give the same combat log for the same seed and commands', () => {
    const run = (inWorld) => { const g = new GameEngine({ seed: 11 }); g.start(); g.input('warrior'); let log;
        if (inWorld) { g.enterWorld(); log = T(g.worldEncounter('road_wolf', ['hungry_wolf'])); } else { g.startCombat(['hungry_wolf']); log = T(g.flush()); }
        for (let i = 0; i < 30 && g.mode === 'combat'; i++) log += T(g.input('attack 1'));
        return log.split('\n').filter((l) => /uses|defeated|VICTORY/.test(l)).join('\n'); };
    const a = run(true), b = run(false);
    return { ok: a === b && a.length > 0, note: `combat lines identical: ${a === b}` };
});
check('6', 'Tech review F3: the graphical world front end seeds its engine (replayable runs)', () => {
    const f = ['ui/world-ui.js'].map((p) => path.join(ROOT, p)).find((p) => fs.existsSync(p));
    if (!f) return { info: true, note: 'ui/world-ui.js not found' };
    const src = fs.readFileSync(f, 'utf8'); const m = src.match(/new ENSO\.GameEngine\(([^)]*)\)/);
    return { ok: !!(m && /seed/.test(m[1])), note: m ? `world-ui.js: new ENSO.GameEngine(${m[1]}) ${/seed/.test(m[1]) ? '' : '-> unseeded (Math.random): browser bugs cannot be replayed'}` : 'no engine construction found' };
});

console.log('World Zone 1 — smoke checks\n');
console.log(out.join('\n'));
const scored = out.filter((l) => !l.startsWith('INFO'));
console.log(`\n${scored.filter((l) => l.startsWith('PASS')).length}/${scored.length} pass`);
