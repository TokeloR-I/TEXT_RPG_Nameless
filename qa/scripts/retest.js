// Retest of QA report #1 against the acceptance checks in docs/design/DEV_HANDOFF_QA_2026-10-22_1.md.
// Prints FIXED / STILL OPEN per bug; design-held bugs print HELD with their current state.
//   node qa/scripts/retest.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const T = (evs) => evs.filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const copy = () => JSON.parse(JSON.stringify(DATA));
const make = (seed, data) => { const g = new GameEngine({ seed, data }); g.start(); return g; };
const rows = [];
const report = (id, state, note) => rows.push({ id, state, note });
const quiet = (fn) => { const e = console.error; console.error = () => {}; try { return fn(); } finally { console.error = e; } };
const stuck = (out) => /Not your turn!/.test(out);

// QA-1 / QA-2 / QA-8: held for Creative Director decisions. Show current state only.
{
    const g = make(1); ['rogue', 'e', 'engage'].forEach((c) => g.input(c));
    g.player.skills.push('Marked for Death');
    const out = T(g.input('marked for death 3')) + T(g.input('attack 3'));
    // QA-1 implemented (approved Option A, PR #30): Marked for Death must be usable on a slower target.
    report('QA-1', /is consumed/.test(out) ? 'FIXED' : 'STILL OPEN', `Marked for Death on a slower target ${/is consumed/.test(out) ? 'IS used' : 'expires unused'}. Full checks: speed_matrix.js, qa1_expiry.js`);
}
{
    const g = make(1); ['warrior', 'add_xp 250', 'vanguard'].forEach((c) => g.input(c));
    g.currentRoom = 'wardens_roost'; let log = T(g.input('engage'));
    for (let i = 0; i < 40 && g.mode === 'combat'; i++) log += T(g.input('shield bash'));
    // QA-2 implemented (approved, PRs #31/#38): the boss may never miss two scheduled turns in a row to Shield Bash.
    const pat = log.split('\n').map((l) => (l.includes("Warden's Turn!") ? 'A' : l.includes('Warden is unable to act') ? 'S' : '')).join('');
    report('QA-2', !/SS/.test(pat) ? 'FIXED' : 'STILL OPEN', `boss acts ${(log.match(/Warden uses/g) || []).length}x, never two Shield Bash skips in a row: ${!/SS/.test(pat)}. Full checks: qa2_shieldbash.js`);
}
{
    const g = make(1); ['warrior', 'add_xp 250', 'vanguard', 'n', 'engage'].forEach((c) => g.input(c));
    const menu = T(g.input('help me'));
    report('QA-8', 'HELD', `design decision pending. Today: Power Strike charges "${(menu.match(/Power Strike \[Cost: ([^\]]+)\]/) || [])[1]}", text says "${DATA.skillDefinitions['Power Strike'].description}"`);
}

// QA-3: after a caught exception, a valid next action or an orderly end must be possible (repro C).
quiet(() => {
    const d = copy(); d.skillDefinitions['Bad Purge'] = { name: 'Bad Purge', cost: 0, effects: [{ type: 'cleanse' }], target: 'self' };
    const g = make(1, d); ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
    g.player.skills.push('Bad Purge');
    g.input('bad purge');
    const next = T(g.input('attack 1'));
    report('QA-3', !stuck(next) || g.mode !== 'combat' ? 'FIXED' : 'STILL OPEN', stuck(next) ? '"attack 1" after the error -> "Not your turn!"' : `after the error: mode=${g.mode}, next action accepted`);
});

// QA-4: self-referential reaction -> no stack overflow, no soft-lock (repro D, through the real command path).
quiet(() => {
    const d = copy();
    d.statusReactions = [{ name: 'Loop', pair: ['Bleed', 'Poison'], baseChance: 1, outcome: [{ type: 'apply_status', status: { name: 'Poison', type: 'dot', value: 1, duration: 2 } }] }];
    const g = make(1, d); ['warrior', 'add_xp 250', 'berserker', 'n', 'engage'].forEach((c) => g.input(c));
    g.player.resource.current = 9;
    g.applyDot(g.player, g.combat.enemies[0], { name: 'Poison', value: 1, duration: 3 });
    let threw = null;
    try { g.input('hemorrhage 1'); } catch (e) { threw = e.message; }
    const overflow = threw || g.errors.some((e) => /call stack/.test(e.message));
    const next = g.mode === 'combat' ? T(g.input('attack 1')) : '';
    report('QA-4', !overflow && !stuck(next) ? 'FIXED' : 'STILL OPEN', overflow ? 'stack overflow on Bleed onto Poison' : stuck(next) ? 'no overflow, but fight is soft-locked' : 'no overflow; fight continues');
});

// QA-5: repeated player stuns -> bounded computation and a recoverable state (repro E).
// NOTE: in repro E the stun hits for 0 (1 dmg - 5 DEF), so nobody can ever die. Ending it needs a design rule.
quiet(() => {
    const d = copy(); d.enemies.crow_touched_warden.skills = [{ name: 'Chain Lock', base_damage: [1, 1], effects: [{ type: 'stun', duration: 1 }] }];
    const g = make(1, d); g.input('warrior'); g.currentRoom = 'wardens_roost';
    const out = T(g.input('engage'));
    const runaway = /ran away/.test(out);
    const next = g.mode === 'combat' ? T(g.input('flee')) : '';
    report('QA-5', !runaway && !stuck(next) ? 'FIXED' : 'STILL OPEN', runaway ? '0-damage permanent stun -> "Combat loop ran away" -> soft-lock' : `no runaway; mode=${g.mode}${g.mode === 'combat' ? (stuck(next) ? ', but soft-locked' : ', control returned') : ''}`);
    // regression guard: a damaging permanent stun must still end in a normal defeat
    const d2 = copy(); d2.enemies.crow_touched_warden.skills = [{ name: 'Chain Lock', base_damage: [12, 12], effects: [{ type: 'stun', duration: 1 }] }];
    const g2 = make(1, d2); g2.input('warrior'); g2.currentRoom = 'wardens_roost';
    let out2 = T(g2.input('engage'));
    for (let i = 0; i < 200 && g2.mode === 'combat'; i++) out2 += T(g2.input('guard')); // stunned turns now pause for input (PR #6)
    report('QA-5b', g2.mode === 'game_over' && !/ran away/.test(out2) ? 'OK' : 'REGRESSED', `damaging permanent stun ends in a normal defeat (mode=${g2.mode})`);
});

// QA-6: one enemy's death must not be credited twice across flee/re-engage (repro F, then kill it again).
{
    const g = make(3); ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
    g.player.hp = g.player.maxHp = 999;
    const killRat = () => { for (let i = 0; i < 30; i++) { const r = g.combat && g.combat.enemies.find((e) => e.key === 'rust_rat'); if (!r || r.hp <= 0) break; g.input(`attack ${1 + g.alive(g.combat.enemies).indexOf(r)}`); } };
    killRat(); g.input('flee'); g.input('engage');
    const back = g.combat.enemies.find((e) => e.key === 'rust_rat');
    const backHp = back ? `${back.hp}/${back.maxHp}` : 'not present';
    killRat();
    report('QA-6', g.stats.kills === 1 ? 'FIXED' : 'STILL OPEN', `same Rust Rat killed before and after flee -> Enemies slain = ${g.stats.kills}. (After re-engage the rat is ${backHp}: persistence is a design question)`);
}

// QA-7: no article before proper names; one XP line per victory (repro G + a victory).
{
    const g = make(1); g.input('warrior'); g.currentRoom = 'wardens_roost';
    const room = T(g.input('look')) + T(g.input('engage'));
    const s = make(1); s.input('warrior');
    const start = T(s.input('look'));
    const v = make(3); ['warrior', 'n', 'engage'].forEach((c) => v.input(c)); v.player.hp = v.player.maxHp = 9999;
    let win = ''; for (let i = 0; i < 60 && v.mode === 'combat'; i++) win += T(v.input('attack 1'));
    const xpLines = win.split('\n').filter((l) => /XP|experience points/i.test(l) && /\d/.test(l)).length;
    const bad = [/A The /.test(room) && 'A The…', /A James Newton/.test(start) && 'A James Newton', xpLines !== 1 && `${xpLines} XP lines`].filter(Boolean);
    report('QA-7', bad.length ? 'STILL OPEN' : 'FIXED', bad.length ? bad.join(', ') : 'articles and XP line OK');
}

// QA-9: CLI turn prompt shows player HP, current resource and statuses.
{
    const g = make(1); ['warrior', 'n', 'engage'].forEach((c) => g.input(c));
    g.applyMark(g.combat.enemies[0], g.player, { mark: 'Weaken', value: 0.2, duration: 3 }); // lasts past your next turn start (Guard no longer does, QA-1)
    const out = T(g.input('guard'));
    const prompt = out.slice(out.lastIndexOf('--- Your Turn! ---'));
    const p = g.player;
    const hp = prompt.includes(`${p.hp}/${p.maxHp}`), res = prompt.includes(`${p.resource.current}/${p.resource.max}`) || new RegExp(`${p.resource.type}[^\\n]*${p.resource.current}`).test(prompt);
    const st = /\[Weaken/.test(prompt);
    report('QA-9', hp && res && st ? 'FIXED' : 'STILL OPEN', `turn prompt shows HP ${hp ? 'yes' : 'no'} · resource ${res ? 'yes' : 'no'} · [Weaken] ${st ? 'yes' : 'no'}`);
}

// QA-10: stale technical docs/comments.
{
    const read = (f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch (e) { return ''; } };
    const hits = [];
    for (const f of ['AGENTS.md', 'CLAUDE.md', 'README.md', 'docs/GAME_DESIGN_STATUS.md', 'src/effects.js', 'src/engine.js', 'src/statuses.js']) {
        const t = read(f);
        if (/turnStatuses/.test(t)) hits.push(`${f}: turnStatuses`);
        if (/count the APPLIER'?s turns/i.test(t)) hits.push(`${f}: "marks count the APPLIER's turns"`);
        if (/73 automated tests/.test(t)) hits.push(`${f}: "73 automated tests"`);
    }
    report('QA-10', hits.length ? 'STILL OPEN' : 'FIXED', hits.length ? hits.join(' · ') : 'no stale references found');
}

let commit = '';
try { commit = require('child_process').execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch (e) {}
console.log(`Retest of QA report #1${commit ? ` at ${commit}` : ''} (acceptance checks: docs/design/DEV_HANDOFF_QA_2026-10-22_1.md)\n`);
for (const r of rows) console.log(`${r.state.padEnd(10)} ${r.id.padEnd(6)} ${r.note}`);
