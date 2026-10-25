// Chapter One class survival per encounter (Wren's hand-off in docs/CHAPTER_ONE.md; Vaelis's QA plan in
// docs/design/ENSO_CH1_ENCOUNTERS_XP_AND_BALANCE.md). Plays the REAL world route with REAL combat: no forced
// HP, no cheats. Every required fight (G1 Ragpickers, G2 Root-Chewers, G3 Cultists, G4 Ritual-Scarred Ghoul) and
// then the Warden (B01) after the level-3 branch choice. HP carries between fights as in the game (level-ups heal).
// Optional fights (rats, wolf, Shane's constables) are measured in isolation at the level you meet them.
//   node qa/scripts/ch1_survival.js [seeds=100] [--bot smart|simple] [--pickups] [--set path=json ...] [--json out.json]
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const BASE = require(path.join(ROOT, 'src/data.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const ZONE1 = require(path.join(ROOT, 'src/world/zone1.js'));
const { walkTo, takeExit, inspect, contact, travel } = require(path.join(ROOT, 'tests/world-helpers.js'));
const { choose: smartChoose } = require('./smartbot.js');

const args = process.argv.slice(2);
const SEEDS = parseInt(args.find((a) => /^\d+$/.test(a)) || '100', 10);
const BOT = (args[args.indexOf('--bot') + 1] && args.includes('--bot')) ? args[args.indexOf('--bot') + 1] : 'smart';
const PICKUPS = args.includes('--pickups');
const BUY = args.includes('--buy');   // spend all Gold on healing in Shamefield after Q05 (best HP per Gold first)
const JSON_OUT = args.includes('--json') ? args[args.indexOf('--json') + 1] : null;
const DATA = JSON.parse(JSON.stringify(BASE));
args.forEach((a, i) => { if (a !== '--set') return; const [p, raw] = args[i + 1].split('='); const ks = p.split('.'); let o = DATA; for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = JSON.parse(raw); });

const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];
/** The balance tool's simple bot: heal below 45% if you can, else the biggest affordable damaging skill on the weakest enemy. */
function simpleChoose(g) {
    const p = g.player, living = g.alive(g.combat.enemies);
    if (g.combat.awaitingContinue) return 'continue';
    if (p.hp < p.maxHp * 0.45) { const it = HEALS.find((h) => p.inventory.includes(h)); if (it) return `use ${it.toLowerCase()}`; }
    const weakest = living.reduce((a, b) => (b.hp < a.hp ? b : a));
    const n = g.combat.enemies.filter((e) => e.hp > 0).indexOf(weakest) + 1;
    let best = null, bestAvg = -1;
    for (const name of p.skills) {
        const sk = g.playerSkill(name); if (!sk || !sk.base_damage || (g.isCastable && !g.isCastable(sk)) || g.skillCost(sk) > p.resource.current) continue;
        const avg = (sk.base_damage[0] + sk.base_damage[1]) / 2; if (avg > bestAvg) { bestAvg = avg; best = name; }
    }
    return best ? `${best.toLowerCase()} ${n}` : `attack ${n}`;
}
const choose = BOT === 'simple' ? simpleChoose : (g) => (g.combat.awaitingContinue ? 'continue' : smartChoose(g));
const lines = (r) => (r && r.events ? r.events : []).filter((e) => e.type === 'text').map((e) => e.text);
function say(g, re) { const a = g.getAvailableActions(); const c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text)); if (!c) throw new Error(`no choice ${re}`); return g.act({ type: 'dialogue_choice', choiceId: c.choiceId }); }
const bye = (g) => { if (g.getAvailableActions().awaiting === 'dialogue') g.act({ type: 'dialogue_leave' }); };
const total = (g) => { let t = g.player.xp, need = 100; for (let l = 1; l < g.player.level; l++) { t += need; need = Math.floor(need * 1.5); } return t; };

/** Fight an encounter for real. Returns the metrics row (and whether you survived). */
function fight(ctx, id, label) {
    const { g, s } = ctx; const p = g.player;
    const hpBefore = p.hp;
    const r = contact(s, id); if (!r || r.type !== 'encounter') throw new Error(`${id}: ${JSON.stringify(r).slice(0, 160)}`);
    const row = { label, level: p.level, hpIn: hpBefore, maxHp: p.maxHp, resIn: p.resource.current, itemsIn: p.inventory.filter((i) => HEALS.includes(i)).length, maxHit: 0, killer: null, rounds: 0 };
    const dmg = g.damage.bind(g);
    g.damage = (t, amount, src, o) => { if (t.isPlayer && src && !src.isPlayer && amount > row.maxHit) row.maxHit = amount; if (t.isPlayer && amount >= t.hp && src) row.killer = src.name; return dmg(t, amount, src, o); };
    for (let i = 0; i < 400 && g.mode === 'combat'; i++) {
        const a = g.getAvailableActions();
        if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null }); else g.input(choose(g));
        if (g.combat) row.rounds = g.combat.round;
    }
    g.damage = dmg;
    row.won = g.mode === 'explore' && g.world.lastResult === 'victory';
    row.hpOut = p.hp; row.itemsUsed = row.itemsIn - p.inventory.filter((i) => HEALS.includes(i)).length;
    row.capped = g.mode === 'combat'; if (row.capped) row.killer = 'STUCK (400 actions)';
    if (row.won) s.fightOver(id, 'victory');
    ctx.rows.push(row);
    return row.won;
}

function newRun(cls, seed) {
    const g = new GameEngine({ seed, data: JSON.parse(JSON.stringify(DATA)) }); g.start();
    g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    const s = new WorldSession(ZONE1, { engine: g });
    return { g, s, rows: [], cls, seed };
}

/** The mainline (all optional content skipped), then the branch choice and the Warden. */
function mainline(ctx, branchIdx) {
    const { g, s } = ctx;
    inspect(s, 'cellar_inscription'); travel(s, 'house');
    if (PICKUPS) { travel(s, 'grounds'); travel(s, 'shed'); inspect(s, 'shed_bandages'); travel(s, 'grounds'); travel(s, 'well'); inspect(s, 'well_bottle'); }
    travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'road'); travel(s, 'tollway');
    inspect(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/);
    if (!fight(ctx, 'tollway_ragpickers', 'G1 Ragpickers')) return 'G1';
    if (!fight(ctx, 'tollway_root_chewers', 'G2 Root-Chewers')) return 'G2';
    ctx.levelAfterG2 = g.player.level;
    takeExit(s, 'tollway_south'); inspect(s, 'village_tamsin'); bye(g); inspect(s, 'village_mara'); bye(g);
    inspect(s, 'village_captain'); bye(g); travel(s, 'tollway'); inspect(s, 'tollway_register'); travel(s, 'shamefield');
    inspect(s, 'village_captain'); say(g, /Here it is/); bye(g);
    if (BUY) { ctx.goldAtShop = g.player.gold; for (const [shop, item] of [['iona', 'Healing Herb Bundle'], ['mara', 'Bandages'], ['iona', 'Bandages'], ['mara', 'Moldy Bread']]) while (g.player.gold >= g.data.shopDefinitions[shop].stock[item].buyPrice && g.act({ type: 'buy', shopId: shop, item }).ok !== false && g.player.inventory.includes(item) && g.player.gold >= 0) { if ((ctx.bought = (ctx.bought || 0) + 1) > 20) break; } }
    travel(s, 'orchard');
    if (PICKUPS) inspect(s, 'orchard_herbs');
    if (!fight(ctx, 'orchard_cultists', 'G3 Cultists')) return 'G3';
    takeExit(s, 'orchard_north');
    if (!fight(ctx, 'featherwatch_ghoul', 'G4 Ritual Ghoul')) return 'G4';
    takeExit(s, 'featherwatch_north'); inspect(s, 'sanctuary_journal'); inspect(s, 'sanctuary_warden_npc');
    ctx.xpBeforeWarden = total(g); ctx.levelBeforeWarden = g.player.level;
    say(g, /What is behind it/); say(g, /I'll go/);
    if (g.mode === 'branch_select') { const br = Object.keys(DATA.evolutionPaths[g.player.className].branches)[branchIdx]; g.act({ type: 'choose_branch', branchId: br }); ctx.branch = br; }
    inspect(s, 'sanctuary_warden_npc'); say(g, /Stand aside/); say(g, /Draw your weapon/);
    if (!fight(ctx, 'sanctuary_warden', 'B01 Warden')) return 'B01';
    return null;
}

/** Optional fights in isolation: at the level you meet them, full HP, nothing else changed. */
function optional(cls, seed, which) {
    const ctx = newRun(cls, seed); const { g, s } = ctx;
    if (which === 'rats') { travel(s, 'grounds'); fight(ctx, 'grounds_weed_rats', 'Opt rats (L1)'); }
    if (which === 'wolf') { travel(s, 'road'); fight(ctx, 'road_wolf', 'Opt wolf (L1)'); }
    if (which === 'constables') {
        inspect(s, 'cellar_inscription'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'tollway');
        inspect(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/);
        // the two required tollway fights are won with forced HP here: this row isolates the constables at L2, full HP
        for (const id of ['tollway_ragpickers', 'tollway_root_chewers']) { contact(s, id); for (let i = 0; i < 60 && g.mode === 'combat'; i++) { for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1; g.input(g.combat.awaitingContinue ? 'continue' : 'attack 1'); } s.fightOver(id, 'victory'); }
        g.player.hp = g.player.maxHp; takeExit(s, 'tollway_south');
        inspect(s, 'village_crowd'); say(g, /What did he do/); bye(g);
        inspect(s, 'village_shane'); say(g, /Why are the watch after you/); say(g, /What do you need/); say(g, /I'll get your ledger/); bye(g);
        if (!g.hasStoryFlag('shane_asked_ledger')) { ctx.rows.push({ label: 'Opt constables (L2)', skipped: true }); return ctx; }
        travel(s, 'allotment'); fight(ctx, 'allotment_watch', 'Opt constables (L2)');
    }
    return ctx;
}

// ------------------------------------------------------------------ run and report
const classes = Object.keys(DATA.basePlayerClasses);
const agg = {}; const deaths = {}; const xpCheck = {}; const branchWin = {};
const add = (cls, row) => { const k = `${cls}|${row.label}`; (agg[k] = agg[k] || []).push(row); };
for (const cls of classes) {
    deaths[cls] = {}; xpCheck[cls] = { reached: 0, ok250: 0, l3: 0 }; branchWin[cls] = {};
    for (let seed = 1; seed <= SEEDS; seed++) {
        const ctx = newRun(cls, seed); let died;
        try { died = mainline(ctx, seed % 3); } catch (e) { died = 'ERR ' + e.message.slice(0, 80); }
        for (const r of ctx.rows) add(cls, r);
        deaths[cls][died || 'survived'] = (deaths[cls][died || 'survived'] || 0) + 1;
        if (ctx.xpBeforeWarden != null) { xpCheck[cls].reached++; if (ctx.xpBeforeWarden === 250) xpCheck[cls].ok250++; if (ctx.levelBeforeWarden === 3) xpCheck[cls].l3++; }
        if (ctx.branch) { const b = (branchWin[cls][ctx.branch] = branchWin[cls][ctx.branch] || { n: 0, w: 0 }); b.n++; if (!died) b.w++; }
        for (const which of ['rats', 'wolf', 'constables']) { if (seed > Math.min(SEEDS, 100)) break; const o = optional(cls, seed, which); for (const r of o.rows) if (!r.skipped) add(cls, r); }
    }
}
const avg = (xs, f) => (xs.length ? xs.reduce((a, x) => a + f(x), 0) / xs.length : 0);
function wilson(k, n, z = 1.96) { if (!n) return [0, 0]; const p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), r = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [Math.round(100 * Math.max(0, (c - r) / d)), Math.round(100 * Math.min(1, (c + r) / d))]; }
const variant = args.filter((a, i) => args[i - 1] === '--set').join(' ') || 'shipped';
console.log(`Chapter One survival — ${SEEDS} seeds per class · bot: ${BOT} · pickups: ${PICKUPS ? 'shed Bandages + well bottle + orchard herbs' : 'none'} · shopping: ${BUY ? 'all Gold on healing after Q05' : 'none'} · data: ${variant}\n`);
console.log('| Class | Encounter | Lvl | Reached | Win % (95% CI) | HP in → out (of max) | Lowest HP left (wins) | Heal items used | Biggest hit taken | Rounds | Who kills you |');
console.log('|---|---|---:|---:|---:|---|---:|---:|---:|---:|---|');
for (const cls of classes) for (const label of ['G1 Ragpickers', 'G2 Root-Chewers', 'G3 Cultists', 'G4 Ritual Ghoul', 'B01 Warden', 'Opt rats (L1)', 'Opt wolf (L1)', 'Opt constables (L2)']) {
    const rs = agg[`${cls}|${label}`] || []; if (!rs.length) continue;
    const w = rs.filter((r) => r.won).length, ci = wilson(w, rs.length);
    const killers = {}; for (const r of rs) if (!r.won && r.killer) killers[r.killer] = (killers[r.killer] || 0) + 1;
    const lv = [...new Set(rs.map((r) => r.level))].join('/');
    console.log(`| ${cls} | ${label} | ${lv} | ${rs.length} | ${Math.round(100 * w / rs.length)} (${ci[0]}–${ci[1]}) | ${avg(rs, (r) => r.hpIn).toFixed(0)} → ${avg(rs.filter((r) => r.won), (r) => r.hpOut).toFixed(0)} (${avg(rs, (r) => r.maxHp).toFixed(0)}) | ${rs.some((r) => r.won) ? Math.min(...rs.filter((r) => r.won).map((r) => r.hpOut)) : '—'} | ${avg(rs, (r) => r.itemsUsed).toFixed(2)} | ${Math.max(...rs.map((r) => r.maxHit))} | ${avg(rs, (r) => r.rounds).toFixed(1)} | ${Object.entries(killers).map(([k, v]) => `${k} ${v}`).join(', ') || '—'} |`);
}
console.log('\n| Class | Full mainline survived (to the end of B01) | Where runs ended | Reached the Warden at exactly 250 XP / L3 | Warden win % by branch (runs) |');
console.log('|---|---:|---|---|---|');
for (const cls of classes) {
    const d = deaths[cls]; const surv = d.survived || 0;
    console.log(`| ${cls} | ${Math.round(100 * surv / SEEDS)}% | ${Object.entries(d).map(([k, v]) => `${k} ${v}`).join(', ')} | ${xpCheck[cls].ok250}/${xpCheck[cls].reached} at 250, ${xpCheck[cls].l3}/${xpCheck[cls].reached} at L3 | ${Object.entries(branchWin[cls]).map(([b, x]) => `${b} ${Math.round(100 * x.w / x.n)}% (${x.n})`).join(', ')} |`);
}
if (JSON_OUT) require('fs').writeFileSync(JSON_OUT, JSON.stringify({ agg, deaths, xpCheck, branchWin }, null, 1));
