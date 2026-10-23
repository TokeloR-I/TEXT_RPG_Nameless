// Golden master for refactors: replays 400 seeded text-game sessions (all classes, cheats, every obtainable
// skill) and hashes every event + periodic state. Same hash on two commits = identical behaviour.
//
//   node qa/scripts/golden.js [root]                       combined hash (unchanged format, comparable with old runs)
//   node qa/scripts/golden.js [root] --split               + separate EVENTS and STATE hashes (tech review F4)
//   node qa/scripts/golden.js [root] --split --ignore world,combat.awaitingContinue
//                                                          state hash without the listed getState() fields
//                                                          (for intentionally added fields; events still cover behaviour)
//   node qa/scripts/golden.js [root] --world               + 100 scripted world sessions (Zone 1 pickups and
//                                                          encounters: victory, flee/re-engage, defeat), hashed separately
//   node qa/scripts/golden.js [root] --sessions out.json   per-session hashes, to find WHICH sessions changed
//   node qa/scripts/golden.js --diff a.json b.json         list sessions whose events or state differ
//
// [root] defaults to this repository. A difference in EVENTS is a behaviour change; a difference in STATE only
// can be an added field (check with --ignore).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const argv = process.argv.slice(2);
const flag = (f) => argv.includes(f);
const opt = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);

if (flag('--diff')) {
    const [a, b] = [opt('--diff'), argv[argv.indexOf('--diff') + 2]].map((f) => JSON.parse(fs.readFileSync(f, 'utf8')));
    const byKey = (s) => new Map(s.sessions.map((x) => [x.key, x]));
    const A = byKey(a), B = byKey(b);
    const changed = [...A.keys()].filter((k) => !B.has(k) || A.get(k).events !== B.get(k).events || A.get(k).state !== B.get(k).state);
    const ev = changed.filter((k) => B.has(k) && A.get(k).events !== B.get(k).events);
    console.log(`${changed.length}/${A.size} sessions differ (${ev.length} in events, ${changed.length - ev.length} in state only)`);
    for (const k of changed) { const x = A.get(k), y = B.get(k) || {}; console.log(`  ${k.padEnd(12)} ${x.label.padEnd(36)} events ${x.events === y.events ? 'same' : 'DIFF'} · state ${x.state === y.state ? 'same' : 'DIFF'}${y.label && y.label !== x.label ? ` · now ${y.label}` : ''}`); }
    process.exit(0);
}

const rootArg = argv.find((a, i) => !a.startsWith('--') && !['--ignore', '--sessions'].includes(argv[i - 1]));
const root = path.resolve(rootArg || path.join(__dirname, '..', '..'));
const { GameEngine } = require(root + '/src/engine.js');
const data = require(root + '/src/data.js');
const IGNORE = (opt('--ignore') || '').split(',').filter(Boolean);
const sha = () => crypto.createHash('sha256');

/** getState() without the ignored dotted paths (e.g. "world", "combat.awaitingContinue"). */
function stateOf(g) {
    const s = g.getState();
    if (!IGNORE.length) return s;
    const c = JSON.parse(JSON.stringify(s));
    for (const p of IGNORE) { const ks = p.split('.'); let o = c; for (const k of ks.slice(0, -1)) o = o && o[k]; if (o) delete o[ks[ks.length - 1]]; }
    return c;
}

const classes = Object.keys(data.basePlayerClasses);
const obtainable = {};
for (const [cls, def] of Object.entries(data.basePlayerClasses)) {
    obtainable[cls] = new Set(def.startingSkills);
    for (const br of Object.values(data.evolutionPaths[cls].branches)) for (const st of br.stages) if (st.skill) obtainable[cls].add(st.skill);
}
const explore = ['n', 's', 'e', 'w', 'look', 'i', 'engage', 'engage', 'take bandages', 'take moldy bread', 'cl', 'help', 'use bandages', 'unlock_events'];

const hAll = sha(), hEv = sha(), hSt = sha();
let events = 0, errs = 0;
const sessions = [];
function session(key, label, play, textCorpus = true) {
    // world sessions (textCorpus=false) never feed the text hashes, so --world can't change them
    const sE = sha(), sS = sha();
    const rec = (evs) => { const j = JSON.stringify(evs); if (textCorpus) { events += evs.length; hAll.update(j); hEv.update(j); } sE.update(j); };
    const snap = (g) => { const j = JSON.stringify(stateOf(g)); if (textCorpus) { hAll.update(JSON.stringify(g.getState())); hSt.update(j); } sS.update(j); };
    const g = play(rec, snap);
    errs += g.errors.length;
    sessions.push({ key, label: label(g), events: sE.digest('hex').slice(0, 16), state: sS.digest('hex').slice(0, 16), errors: g.errors.length });
}

// ---------------------------------------------------------------- text-game corpus (unchanged from v1)
for (let seed = 1; seed <= 400; seed++) {
    session(`text#${seed}`, (g) => `${g.player ? g.player.className : '?'}/${(g.progression && g.progression.branch) || '-'}${seed % 4 === 0 ? ' (all skills)' : ''}${seed % 5 === 0 ? ' (hollow king)' : ''}`, (rec, snap) => {
        const g = new GameEngine({ seed });
        rec(g.start());
        let r = seed * 7919; const pick = (a) => a[(r = (r * 48271) % 2147483647) % a.length];
        const cls = classes[seed % 4]; rec(g.input(cls));
        if (seed % 2) rec(g.input(`add_xp ${[250, 400, 2000, 99999][seed % 4]}`));
        if (seed % 5 === 0) rec(g.input('become_hollow_king'));
        for (let step = 0; step < 220; step++) {
            if (g.mode === 'game_over' || g.mode === 'won') { if (seed % 3 === 0 && step < 150) { rec(g.input('start')); rec(g.input(cls)); continue; } break; }
            if (g.mode === 'branch_select') { rec(g.input(Object.keys(data.evolutionPaths[g.player.className].branches)[seed % 3].replace(/_/g, ' '))); continue; }
            if (g.mode === 'combat') {
                if (seed % 4 === 0) g.player.resource.current = 99;
                const sk = [...(seed % 4 === 0 ? obtainable[g.player.className] || [] : g.player.skills)];
                if (seed % 4 === 0) g.player.skills = [...new Set([...g.player.skills, ...sk])];
                rec(g.input(pick(['attack 1', 'attack 2', 'attack 3', 'flee', ...sk.map((s) => `${s} ${1 + (r % 3)}`), ...sk])));
            } else rec(g.input(pick(explore)));
            if (step % 20 === 0) snap(g);
        }
        snap(g);
        return g;
    });
}
const text = { all: hAll.digest('hex').slice(0, 16) };
const textEvents = hEv.copy().digest('hex').slice(0, 16), textState = hSt.copy().digest('hex').slice(0, 16);

// ---------------------------------------------------------------- world corpus (--world)
let world = null;
if (flag('--world')) {
    let zone;
    try { zone = require(root + '/src/world/zone1.js'); } catch (e) { zone = null; }
    if (!zone || typeof GameEngine.prototype.enterWorld !== 'function') world = 'n/a (no world engine on this commit)';
    else {
        const all = JSON.stringify(zone);
        const pickups = [...all.matchAll(/"id":"([a-z_0-9]+)","kind":"pickup"[^}]*?"item":"([^"]+)"/g)].map((m) => [m[1], m[2]]);
        const encounters = [...all.matchAll(/"id":"([a-z_0-9]+)","x":\d+,"y":\d+,"name":"[^"]+","enemies":(\[[^\]]*\])/g)].map((m) => [m[1], JSON.parse(m[2])]);
        const wE = sha(), wS = sha();
        for (let seed = 1; seed <= 100; seed++) {
            session(`world#${seed}`, (g) => `${g.player.className} world${seed % 7 === 0 ? ' (weak: defeat path)' : ''}`, (rec, snap) => {
                const recW = (evs) => { rec(evs); wE.update(JSON.stringify(evs)); };
                const snapW = (g) => { snap(g); wS.update(JSON.stringify(stateOf(g))); };
                const g = new GameEngine({ seed });
                recW(g.start()); recW(g.input(classes[seed % 4])); recW(g.enterWorld());
                if (seed % 7 === 0) g.player.hp = 3;                      // force a defeat path now and then
                let r = seed * 104729; const pick = (a) => a[(r = (r * 48271) % 2147483647) % a.length];
                for (let step = 0; step < 60 && g.mode !== 'game_over'; step++) {
                    if (g.mode === 'branch_select') { recW(g.input(Object.keys(data.evolutionPaths[g.player.className].branches)[seed % 3].replace(/_/g, ' '))); continue; }
                    if (g.mode === 'combat') { recW(g.input(pick(['attack 1', 'attack 2', 'attack 1', 'flee', ...g.player.skills.map((s) => `${s} 1`)]))); continue; }
                    const roll = pick([0, 1, 2, 3]);
                    if (roll === 0 && pickups.length) { const [id, item] = pick(pickups); recW(g.worldPickup(id, item)); }
                    else if (encounters.length) { const [id, en] = pick(encounters); recW(g.worldEncounter(id, en)); }   // includes re-engaging fled and defeated encounters
                    if (step % 10 === 0) snapW(g);
                }
                snapW(g);
                return g;
            }, false);
        }
        world = { events: wE.digest('hex').slice(0, 16), state: wS.digest('hex').slice(0, 16) };
    }
}

// ---------------------------------------------------------------- output
console.log(`${text.all}  events=${events} engineErrors=${errs}`);
if (flag('--split') || flag('--world')) {
    console.log(`  text  events ${textEvents} · state ${textState}${IGNORE.length ? ` (ignoring ${IGNORE.join(', ')})` : ''}`);
    if (world) console.log(`  world ${typeof world === 'string' ? world : `events ${world.events} · state ${world.state}`}`);
}
const out = opt('--sessions');
if (out) { fs.writeFileSync(out, JSON.stringify({ root, ignore: IGNORE, sessions }, null, 1)); console.log(`  per-session hashes -> ${out}`); }
