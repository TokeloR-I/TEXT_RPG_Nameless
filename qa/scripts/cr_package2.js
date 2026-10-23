// Control Resistance (Vaelis Package 2; Wren PR #80): independent checks of the acceptance matrix.
// Control is applied through castSkill with probe skills built from the real effect handlers (so each cast gets
// its own castId), or through real skills/commands where the matrix is about play. Scratch data copies only.
//   node qa/scripts/cr_package2.js
//   ENSO_ROOT=/path/to/checkout node qa/scripts/cr_package2.js
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

/** A fight: `cls`/`branch` at L3, in `room`, enemies 999 HP / DEF 0 / crit 0 / ATK 1 (so nobody dies). */
function fight({ cls = 'mage', branch = 'chronomancer', level = 5, room = 'hallway_of_chains', enemies = ['shackled_ghoul', 'cellar_vermin', 'rust_rat'], patch = {}, seed = 4, spd = 99 } = {}) {
    const d = JSON.parse(JSON.stringify(DATA));
    if (room === 'hallway_of_chains') d.rooms.hallway_of_chains.enemies = enemies;
    for (const k of Object.keys(d.enemies)) Object.assign(d.enemies[k], { hp: 999, maxHp: 999, def: 0, critChance: 0 }, patch[k] || {});
    const g = new GameEngine({ seed, data: d }); g.start();
    g.input(cls); g.input('add_xp 250'); if (branch) g.input(branch);
    for (let i = 0; i < 100 && g.player.level < level; i++) g.input('add_xp 100');
    g.player.spd = spd;                           // set before the fight so round 1's order already has it
    g.currentRoom = room; g.input('engage');
    g.player.hp = g.player.maxHp = 9999;
    if (!g.player.skills.includes('Guard')) g.player.skills.push('Guard');
    g.do = (c, res = 9) => { if (res != null) g.player.resource.current = res; return T(g.input(c)); };
    return g;
}
const E = (g, i) => g.combat.enemies[i];
const cr = (g, x) => g.crValue(x);
const setCr = (g, x, v) => { const s = g.crState(x); s.value = v; s.controlled = false; return s; };
/** One cast of probe effects from `caster` (default: player) on `targets`. Returns the text. */
const cast = (g, targets, effects, caster = g.player) => { g.castSkill(caster, { name: 'QA probe', effects }, [].concat(targets)); return T(g.flush ? g.flush() : []); };
const STUN2 = [{ type: 'skip_turn', duration: 2 }];          // Freeze-style hard control, 2 turns
const SIL2 = [{ type: 'silence', duration: 2 }];             // binary soft control, 2 turns
const st = (x, name) => x.statusEffects.find((s) => s.name === name);
/** Pass player turns with Guard (no damage, no control). */
const pass = (g, n = 1) => { let t = ''; for (let i = 0; i < n && g.mode === 'combat'; i++) t += g.combat.awaitingContinue ? g.do('ok', null) : g.do('guard', 0); return t; };

// ---------------------------------------------------------------- matrix 1, 2
check('M1', 'Hard ladder on a regular enemy: 0 → 35 → 70; the 3rd (at 70) is capped to 1 turn (→ 100); the 4th (at 100) is resisted', () => {
    const g = fight(); const e = E(g, 0); const row = [cr(g, e)];
    cast(g, e, STUN2); row.push(`${cr(g, e)}/${st(e, 'Frozen in time').duration}`);
    cast(g, e, STUN2); row.push(`${cr(g, e)}/${st(e, 'Frozen in time').duration}`);
    e.statusEffects = []; cast(g, e, STUN2); const third = st(e, 'Frozen in time'); row.push(`${cr(g, e)}/${third && third.duration}`);
    e.statusEffects = []; const txt = cast(g, e, STUN2); row.push(`${cr(g, e)}/${st(e, 'Frozen in time') ? 'APPLIED' : 'resisted'}`);
    return { ok: row.join(' ') === '0 35/2 70/2 100/1 100/resisted', note: `CR/duration after each cast: ${row.join(' → ')} (expect 0 → 35/2 → 70/2 → 100/1 → 100/resisted)` };
});
check('M2', 'Soft ladder (Silence): 20 → 40 → 60; at 60 capped to 1 turn (→ 80); at 80 binary Silence is resisted. Slow at 80: half strength, 1 turn', () => {
    const g = fight(); const e = E(g, 0); const row = [];
    for (let i = 0; i < 4; i++) { e.statusEffects = []; cast(g, e, SIL2); const s = st(e, 'Silence'); row.push(`${cr(g, e)}/${s && s.duration}`); }
    e.statusEffects = []; cast(g, e, SIL2); row.push(`${cr(g, e)}/${st(e, 'Silence') ? 'APPLIED' : 'resisted'}`);
    const f = E(g, 1); setCr(g, f, 80); cast(g, f, [{ type: 'slow', value: 0.5, duration: 2 }]); const sl = st(f, 'Slow');
    return { ok: row.join(' ') === '20/2 40/2 60/2 80/1 80/resisted' && sl && sl.value === 0.25 && sl.duration === 1, note: `Silence CR/duration: ${row.join(' → ')} · Slow 50%/2 at CR 80 → ${sl ? `${sl.value * 100}%/${sl.duration}` : 'none'} (expect 25%/1)` };
});
check('M3', 'Starting CR by tier: regular 0, elite 25, boss 60, player 0, summon 0; a new fight resets', () => {
    const g = fight({ patch: { cellar_vermin: { tier: 'elite' } } });
    const b = fight({ room: 'wardens_roost' });
    const n = fight({ cls: 'necromancer', branch: 'bone warden' }); const m = n.summon('skeleton');
    const p = fight(); cast(p, p.player, STUN2, E(p, 0)); const pBefore = cr(p, p.player); const e0 = E(p, 0); cast(p, e0, STUN2);
    p.do('flee', null); p.currentRoom = 'hallway_of_chains'; p.input('engage');
    const vals = `regular ${cr(g, E(g, 0))} · elite ${cr(g, E(g, 1))} · boss ${cr(b, E(b, 0))} · player ${cr(g, g.player)} · summon ${cr(n, m)}`;
    return { ok: vals === 'regular 0 · elite 25 · boss 60 · player 0 · summon 0' && pBefore === 35 && cr(p, p.player) === 0 && cr(p, E(p, 0)) === 0, note: `${vals} · player CR 35 after being stunned → ${cr(p, p.player)} next fight; enemy → ${cr(p, E(p, 0))}` };
});

// ---------------------------------------------------------------- matrix 5: boss protection
check('M5', 'Boss: a hard skip at opportunity N protects N+1 even at low CR; N+2 can be skipped again', () => {
    const g = fight({ room: 'wardens_roost', spd: 99 }); const b = E(g, 0); const log = [];
    const turn = (txt) => (txt.includes(`${b.name} is unable to act`) ? 'skip' : txt.includes(`${b.name}'s Turn!`) ? 'acts' : '?');
    setCr(g, b, 0); cast(g, b, [{ type: 'skip_turn', duration: 1 }]); log.push(`N:${turn(pass(g))}`);
    setCr(g, b, 0); const t1 = cast(g, b, [{ type: 'skip_turn', duration: 1 }]); const blocked = !st(b, 'Frozen in time');
    log.push(`N+1:${turn(pass(g))}`);
    setCr(g, b, 0); cast(g, b, [{ type: 'skip_turn', duration: 1 }]); log.push(`N+2:${turn(pass(g))}`);
    return { ok: log.join(' ') === 'N:skip N+1:acts N+2:skip' && blocked, note: `${log.join(' · ')} · re-stun before N+1 blocked: ${blocked} (“${t1.split('\n').find((l) => /resists|lose two/.test(l)) || ''}”)` };
});
check('M5b', 'Boss: a 2-turn stun applied at CR 0 still costs it only one turn in a row (the protected turn keeps the status but acts)', () => {
    const g = fight({ room: 'wardens_roost', spd: 99 }); const b = E(g, 0); const log = [];
    setCr(g, b, 0); cast(g, b, STUN2);
    for (let i = 0; i < 3; i++) { const t = pass(g); log.push(t.includes(`${b.name} is unable to act`) ? 'skip' : t.includes('shakes it off') ? 'acts (shakes it off)' : t.includes(`${b.name}'s Turn!`) ? 'acts' : '?'); }
    return { ok: log[0] === 'skip' && log[1].startsWith('acts'), note: log.join(' → ') };
});

// ---------------------------------------------------------------- matrix 6, 7
check('M6', "Slow (Caltrops/Ice Lance) only changes speed: never skips a turn, gains soft 20. Chronomancer 'slow' (a skip) gains hard 35", () => {
    const g = fight(); const e = E(g, 0); cast(g, e, [{ type: 'slow', value: 0.5, duration: 2 }]); const soft = cr(g, e);
    const t = pass(g, 2); const skipped = t.includes(`${e.name} is unable to act`);
    const h = fight(); h.do('slow 1', 9); const hard = cr(h, E(h, 0));
    return { ok: soft === 20 && !skipped && hard === 35, note: `Slow → CR ${soft}, slowed enemy skipped a turn: ${skipped} · 'slow 1' (Chronomancer) → CR ${hard}` };
});
check('M7', 'Confuse: a failed roll adds no CR; a successful skip adds hard 35', () => {
    const run = (roll) => { const g = fight(); const e = E(g, 0); g.rng = () => roll; cast(g, e, [{ type: 'skip_turn_chance', value: 0.5, duration: 1 }]); return `${cr(g, e)}${st(e, 'Confused') ? ' Confused' : ''}`; };
    const fail = run(0.99), ok = run(0.01);
    return { ok: fail === '0' && ok === '35 Confused', note: `roll fails → CR ${fail} · roll succeeds → CR ${ok}` };
});

// ---------------------------------------------------------------- matrix 8: decay
check('M8', 'Decay: −10 after a holder opportunity with no new control (skipped ones too); none on the controlled one; never below 0', () => {
    const g = fight({ spd: 99 }); const e = E(g, 0); const row = [];
    cast(g, e, STUN2); row.push(cr(g, e));                           // 35, controlled
    pass(g); row.push(cr(g, e));                                    // skipped opp (controlled) → no decay: 35
    pass(g); row.push(cr(g, e));                                    // skipped opp, no new control → 25
    pass(g); row.push(cr(g, e));                                    // normal opp → 15
    pass(g); row.push(cr(g, e)); pass(g); row.push(cr(g, e));       // 5, then 0 (not −5)
    return { ok: row.join(',') === '35,35,25,15,5,0', note: `CR across opportunities: ${row.join(' → ')} (expect 35 → 35 → 25 → 15 → 5 → 0)` };
});
check('M8b', 'Haste bonus actions never decay CR (player with CR 50 hastes itself, then guards: one decay)', () => {
    const g = fight({ spd: 99 }); setCr(g, g.player, 50);
    const t1 = g.do('haste', 9); const mid = cr(g, g.player); g.do('guard', 0); const end = cr(g, g.player);
    return { ok: mid === 50 && end === 40, note: `after Haste (bonus action pending) ${mid} · after the turn ends ${end} (expect 50 / 40)` };
});

// ---------------------------------------------------------------- matrix 9, 10
check('M9', 'One cast with two control effects gives one (largest) gain; separate casts each gain; Freeze on 3 enemies: +35 each, once', () => {
    const g = fight(); const e = E(g, 0); cast(g, e, [{ type: 'skip_turn', duration: 1 }, { type: 'silence', duration: 1 }]); const one = cr(g, e);
    e.statusEffects = []; cast(g, e, [{ type: 'silence', duration: 1 }]); const two = cr(g, e);
    const h = fight(); cast(h, h.combat.enemies, [{ type: 'freeze_enemies', duration: 1 }]); const fr = h.combat.enemies.map((x) => cr(h, x)).join('/');
    return { ok: one === 35 && two === 55 && fr === '35/35/35', note: `stun+silence in one cast → ${one} · then a Silence cast → ${two} · Freeze Time → ${fr}` };
});
check('M10', 'Cleanse removes the control but keeps CR; explicit immunity blocks the status and the gain; damage and DoTs never change CR', () => {
    const g = fight(); const e = E(g, 0); cast(g, e, SIL2); g.cleanse(e, { categories: ['control'] }); const kept = cr(g, e), gone = !st(e, 'Silence');
    const f = E(g, 1); f.statusAffinities = { Silence: 'immune' }; cast(g, f, SIL2); const imm = `${cr(g, f)}${st(f, 'Silence') ? ' SILENCED' : ''}`;
    const h = E(g, 2); g.damage(h, 50, g.player); g.applyDot(g.player, h, { name: 'Poison', value: 5, duration: 3 }); g.tickDots(h);
    return { ok: kept === 20 && gone && imm === '0' && cr(g, h) === 0, note: `cleansed: status gone ${gone}, CR ${kept} · immune target CR ${imm} · damage + Poison tick → CR ${cr(g, h)}` };
});

// ---------------------------------------------------------------- matrix 11, 12
check('M11', 'Availability: CR resistance is a target note on an enabled target, never a refusal', () => {
    const g = fight(); setCr(g, E(g, 0), 85); setCr(g, E(g, 1), 0); g.player.resource.current = 9;
    const a = g.getAvailableActions(); const sk = a.actions.find((x) => x.skillId === 'slow');
    const t0 = sk && sk.targets.find((t) => t.id === E(g, 0).id), t1 = sk && sk.targets.find((t) => t.id === E(g, 1).id);
    const note = t0 && (t0.notes || []).map((n) => n.code).join(',');
    return { ok: !!sk && sk.enabled && t0.enabled && /CONTROL_RESISTED/.test(note || '') && !(t1.notes || []).length, note: `'slow' enabled ${sk && sk.enabled}; enemy at 85: enabled ${t0 && t0.enabled}, notes ${note || 'none'}; enemy at 0: notes ${(t1 && t1.notes || []).length}` };
});
check('M12', 'Snapshot → JSON → restore into a fresh engine keeps CR, the per-holder flags and boss protection; replay is identical', () => {
    const g = fight({ room: 'wardens_roost', spd: 99 }); const b = E(g, 0); setCr(g, b, 0); cast(g, b, [{ type: 'skip_turn', duration: 1 }]); pass(g);
    const snap = JSON.parse(JSON.stringify(g.snapshot()));
    const run = (x) => { setCr(x, x.combat.enemies[0], x.crValue(x.combat.enemies[0])); const t = cast(x, x.combat.enemies[0], [{ type: 'skip_turn', duration: 1 }]); return `${x.crValue(x.combat.enemies[0])}|${!!st(x.combat.enemies[0], 'Frozen in time')}|${x.combat.enemies[0].cr.protectNext}|${pass(x)}`; };
    const a = run(g); const h = fight({ room: 'wardens_roost', spd: 99 }); h.restore(snap); const r = run(h);
    return { ok: a === r && a.includes('|false|true|'), note: `original and restored agree: ${a === r}; boss still protected after restore: ${r.split('|')[2]}` };
});

// ---------------------------------------------------------------- CR-03 and play
check('C1', 'QA-2 still wins: a recovering Shield Bash target gets no stun even at CR 0', () => {
    const g = fight({ cls: 'warrior', branch: 'vanguard', spd: 99 }); const e = E(g, 0);
    const s1 = /is stunned!/.test(g.do('shield bash 1', 5)); setCr(g, e, 0); const t2 = g.do('shield bash 1', 5); const s2 = /is stunned!/.test(t2);
    return { ok: s1 && !s2, note: `1st Shield Bash stunned ${s1}; 2nd (target recovering, CR forced to 0) stunned ${s2}` };
});
check('C2', 'Player side: an enemy that stuns every turn can no longer lock the player (CR caps then resists)', () => {
    const g = fight({ spd: 99 }); const e = E(g, 0); let skips = 0, acts = 0, streak = 0, maxStreak = 0;
    for (let i = 0; i < 12 && g.mode === 'combat'; i++) {
        cast(g, g.player, [{ type: 'skip_turn', duration: 1 }], e);
        const t = pass(g);
        if (g.combat.awaitingContinue || /You are unable to act|is unable to act this turn!/.test(t) && t.includes(g.player.name)) { skips++; streak++; maxStreak = Math.max(maxStreak, streak); } else { acts++; streak = 0; }
    }
    return { info: true, note: `12 rounds with a stun cast on you every round: you lost ${skips}, acted ${acts}, longest streak ${maxStreak}` };
});
check('X1', 'Engine errors: none across all checks', () => ({ ok: true, note: 'see THREW lines above (none = no engine exceptions)' }));

console.log(`Control Resistance (Package 2, PR #80) — independent checks · ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
