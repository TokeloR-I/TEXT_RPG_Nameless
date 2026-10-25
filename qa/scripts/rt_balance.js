// Real-time combat (combat v2) balance + bug bot. QA only: never edits src/; data changes go on a deep copy.
// A deterministic "human": every 100 ms of fight time it looks at getAvailableActions() and may press ONE
// enabled option, limited by APM (one press per 60000/apm ms) and a reaction time (an option that just became
// ready is only noticed after --reaction ms). Priority: heal item <=45% HP > damage skills in skill-bar slot order
// > summons > haste > resource gain when short > defensive buff while an enemy winds up on you > other utility
// > the basic attack. Target: the weakest enemy the option allows.
// Turn mode runs the existing bots on the same routes (dungeon: tools/balance.js bot; ch1: qa smartbot) so the
// two modes can be compared.
//   node qa/scripts/rt_balance.js [--seeds 200] [--route dungeon|ch1|both] [--mode rt|turn|both] [--apm 120]
//        [--reaction 250] [--classes warrior,mage] [--set realtimeRules.enemy.actionSeconds=2.5 ...] [--probe]
//        [--repro class:seed[:route]] [--json out.json]
// --probe also presses DISABLED options (cooldown/GCD/stun/resource) to check act() refuses them, and checks
//   act() never refuses an option availability called enabled. Bugs print as BUG lines with a repro command.
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const BASE = require(path.join(ROOT, 'src/data.js'));

const args = process.argv.slice(2);
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const SEEDS = parseInt(opt('--seeds', '200'), 10);
const ROUTE = opt('--route', 'dungeon');
const MODE = opt('--mode', 'both');
const APM = parseFloat(opt('--apm', '120'));
const REACTION = parseFloat(opt('--reaction', '250'));
const PROBE = args.includes('--probe');
const REPRO = opt('--repro', null);
const JSON_OUT = opt('--json', null);
const SETS = args.filter((a, i) => args[i - 1] === '--set');
const DATA = JSON.parse(JSON.stringify(BASE));
for (const s of SETS) { const [p, raw] = s.split('='); const ks = p.split('.'); let o = DATA; for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = JSON.parse(raw); }
const CLASSES = (opt('--classes', null) || Object.keys(DATA.basePlayerClasses).join(',')).split(',');
const POLL = 100, SOFTLOCK_MS = 600000;
const HEALS = ['Healing Herb Bundle', 'Bandages', 'Half-full Wine Bottle', 'Moldy Bread'];
const flags = () => [`--apm ${APM}`, `--reaction ${REACTION}`, ...SETS.map((s) => `--set ${s}`)].join(' ');

// ------------------------------------------------------------------ bugs
const BUGS = {};
function bug(kind, ctx, detail) {
    const b = (BUGS[kind] = BUGS[kind] || { n: 0, examples: [] });
    b.n++;
    if (b.examples.length < 3) b.examples.push({ detail, repro: `node qa/scripts/rt_balance.js --repro ${ctx.cls}:${ctx.seed}:${ctx.route} ${flags()}${PROBE ? ' --probe' : ''}` });
}

// ------------------------------------------------------------------ instrumentation (per engine)
function instrument(g) {
    const m = { cur: null };
    const dmg = g.damage.bind(g);
    let inDot = 0;
    g.damage = (t, amount, src, o) => {
        const got = dmg(t, amount, src, o);
        const f = m.cur;
        if (f && got > 0) {
            const playerSide = src && (src.isPlayer || src.isMinion);
            if (t.isPlayer) { f.taken += got; if (inDot) f.dotTaken += got; }
            else if (playerSide && !t.isMinion) { f.dealt += got; if (inDot) f.dotDealt += got; }
        }
        return got;
    };
    for (const k of ['tickDots', 'rtTickDot']) {
        const fn = g[k].bind(g);
        g[k] = (...a) => { inDot++; try { return fn(...a); } finally { inDot--; } };
    }
    const cast = g.castSkill.bind(g);
    g.castSkill = (caster, skill, targets, ...rest) => {
        if (m.cur && caster && !caster.isPlayer && !caster.isMinion) { m.cur.enemyActs++; if (g.combat && g.combat.rt) m.cur.lastAct[caster.id] = g.combat.rt.now; }
        if (m.cur && caster && caster.isPlayer) m.cur.playerActs++;
        return cast(caster, skill, targets, ...rest);
    };
    const act = g.rtAct.bind(g);
    g.rtAct = (actor) => { if (m.cur && !actor.isMinion) m.cur.lastAct[actor.id] = g.combat.rt.now; return act(actor); };
    return m;
}
const newFight = () => ({ dealt: 0, taken: 0, dotDealt: 0, dotTaken: 0, maxStacks: 0, polls: 0, idle: 0, presses: 0, playerActs: 0, enemyActs: 0, lastAct: {}, seenStatus: new Map(), flagged: new Set() });

/** Invariants checked every poll (and per round in turn mode). */
function checkState(g, f, ctx) {
    const c = g.combat; if (!c) return;
    const all = [g.player, ...c.enemies, ...(c.minions || [])];
    const now = c.rt ? c.rt.now : c.round;
    for (const x of all) {
        if (!Number.isFinite(x.hp) && !f.flagged.has('nan' + x.id)) { f.flagged.add('nan' + x.id); bug('NaN HP', ctx, `${x.name} hp=${x.hp} at ${now}`); }
        if (x.hp <= 0) continue;
        for (const s of x.statusEffects) {
            if ((s.stacks || 1) > f.maxStacks && s.type === 'dot') f.maxStacks = s.stacks || 1;
            if ((s.stacks || 0) > 99 && !f.flagged.has('stk')) { f.flagged.add('stk'); bug('Stacks above 99', ctx, `${s.name} x${s.stacks} on ${x.name}`); }
            if (!c.rt) continue;
            if (!f.seenStatus.has(s)) f.seenStatus.set(s, now);
            if (Number.isFinite(s.rtEndsAt) && s.rtEndsAt < now - 1 && !f.flagged.has('late' + s.name)) { f.flagged.add('late' + s.name); bug('Status past its end time', ctx, `${s.name} on ${x.name}: ends ${s.rtEndsAt}, now ${now}`); }
            const k = 'untimed' + s.name;
            if (s.rtEndsAt == null && now - f.seenStatus.get(s) > 60000 && !f.flagged.has(k)) { f.flagged.add(k); bug(`Status never expires (untimed, >60 s): ${s.name}`, ctx, `${s.name} (type ${s.type}) on ${x.name} since ${f.seenStatus.get(s)} ms`); }
        }
    }
    if (!c.rt) return;
    const rt = c.rt;
    for (const [name, cd] of Object.entries(rt.cooldowns)) if (cd.readyAt - rt.now > cd.totalMs && !f.flagged.has('cd' + name)) { f.flagged.add('cd' + name); bug('Cooldown longer than its total', ctx, `${name} ${cd.readyAt - rt.now}/${cd.totalMs}`); }
    if (rt.gcdUntil - rt.now > rt.gcdMs && !f.flagged.has('gcd')) { f.flagged.add('gcd'); bug('GCD longer than its total', ctx, `${rt.gcdUntil - rt.now}/${rt.gcdMs}`); }
    if (rt.basicReadyAt - rt.now > Math.max(rt.basicMs, 2500) && !f.flagged.has('basic')) { f.flagged.add('basic'); bug('Basic swing timer longer than its total', ctx, `${rt.basicReadyAt - rt.now}/${rt.basicMs}`); }
    for (const e of g.alive(c.enemies)) {
        const a = rt.actors[e.id]; if (!a) continue;
        const last = f.lastAct[e.id] != null ? f.lastAct[e.id] : 0;
        const stunned = e.statusEffects.some((s) => s.type === 'skip_turn' || s.type === 'freeze' || s.type === 'immobilize');
        if (!stunned && rt.now - last > Math.max(15000, 4 * (a.intervalMs || 0)) && !f.flagged.has('idle' + e.id)) { f.flagged.add('idle' + e.id); bug('Enemy never acts (>15 s, not stunned)', ctx, `${e.name} last acted ${last} ms, now ${rt.now}, nextActionAt ${a.nextActionAt}, windup ${JSON.stringify(a.windup)}`); }
    }
}

// ------------------------------------------------------------------ the real-time "human"
function kind(g, name) {
    const s = g.playerSkill(name) || {};
    const types = (s.effects || []).map((e) => e.type);
    if (s.base_damage && Math.max(...s.base_damage) > 0) return 'damage';
    if (types.some((t) => /aoe_damage|instant_kill|drain_hp|true_damage_attacks/.test(t))) return 'damage';
    if (types.includes('summon') || types.includes('resurrect_all_minions')) return 'summon';
    if (types.includes('extra_turn')) return 'haste';
    if (types.length && types.every((t) => /gain_resource|take_true_damage|apply_status|overchannel/.test(t))) return 'resource';
    if (types.some((t) => /damage_reduction|dodge|absorb|avoid_next|counter|taunt|zone/.test(t))) return 'defense';
    if (types.some((t) => /heal|revert_hp/.test(t))) return 'heal';
    return 'utility';
}

function pickTarget(g, o) {
    const living = g.alive(g.combat.enemies);
    if (o.targeting === 'enemy_multiple') return { targetIds: living.slice(0, (o.pick && o.pick.max) || 2).map((e) => e.id) };
    if (!Array.isArray(o.targets) || !o.targets.length || o.targeting !== 'enemy_single') return {};
    const ok = o.targets.filter((t) => t.enabled).map((t) => living.find((e) => e.id === t.id)).filter(Boolean);
    if (!ok.length) return {};
    return { targetId: ok.reduce((a, b) => (b.hp < a.hp ? b : a)).id };
}

/** Choose one press among options that are enabled AND noticed (ready for >= REACTION ms). Returns an act() payload or null. */
function rtChoose(g, avail, noticed) {
    const p = g.player, c = g.combat;
    const opts = avail.actions;
    const byId = (o) => (o.type === 'use_item' ? 'item:' + o.item : o.type === 'attack' ? 'attack' : 'skill:' + o.skillId);
    const ready = (o) => o && o.enabled && noticed(byId(o));
    if (p.hp <= p.maxHp * 0.45) for (const h of HEALS) { const o = opts.find((x) => x.type === 'use_item' && x.item === h); if (ready(o)) return { type: 'use_item', item: h, _o: o }; }
    const bar = (avail.skillBar || []).filter((s) => s.skillId);
    const sk = (name) => opts.find((x) => x.type === 'skill' && x.skillId === name);
    const enemyHp = g.alive(c.enemies).reduce((s, e) => s + e.hp, 0);
    const windupOnMe = Object.values(c.rt.actors).some((a) => a.windup && a.windup.targetId === p.id);
    const res = p.resource;
    const press = (s, o) => ({ type: 'skill_slot', slot: s.slot, ...pickTarget(g, o), _o: o });
    const tiers = { damage: [], summon: [], haste: [], resource: [], defense: [], heal: [], utility: [] };
    for (const s of bar) { const o = sk(s.skillId); if (ready(o)) tiers[kind(g, s.skillId)].push([s, o]); }
    for (const [s, o] of tiers.damage) {
        const def = g.playerSkill(s.skillId);
        if (def.cost === 'all' && res.current < res.max) continue;
        return press(s, o);
    }
    for (const [s, o] of tiers.summon) if (g.alive(c.minions).length < g.minionCap() && enemyHp > 35) return press(s, o);
    for (const [s, o] of tiers.haste) return press(s, o);
    const cheapest = Math.min(...bar.map((s) => g.playerSkill(s.skillId)).filter((d) => d && kind(g, d.name) === 'damage' && d.cost !== 'all').map((d) => g.skillCost(d)), 99);
    for (const [s, o] of tiers.resource) if (res.current < Math.min(cheapest, res.max)) return press(s, o);
    for (const [s, o] of tiers.defense) if (windupOnMe && !p.statusEffects.some((x) => x.appliedBy === p.id && x.source === s.skillId)) return press(s, o);
    for (const [s, o] of tiers.heal) if (p.hp < p.maxHp * 0.6) return press(s, o);
    for (const [s, o] of tiers.utility) return press(s, o);
    const atk = opts.find((x) => x.type === 'attack');
    if (ready(atk)) return { type: 'attack', ...pickTarget(g, atk), _o: atk };
    return null;
}

/** Run the current real-time fight to its end. Returns the fight row. */
function rtFight(g, m, ctx) {
    const f = (m.cur = newFight());
    const minGap = 60000 / APM;
    let lastPress = -1e9, now = 0, probeI = 0;
    const since = {};
    while (g.mode === 'combat') {
        const a = g.getAvailableActions();
        if (a.awaiting === 'continue') { g.act({ type: 'continue' }); continue; }
        if (a.awaiting === 'turn_order') { g.act({ type: 'turn_order', order: null }); continue; }
        if (a.awaiting !== 'realtime') { bug(`Unexpected awaiting '${a.awaiting}' in a real-time fight`, ctx, JSON.stringify(a).slice(0, 200)); break; }
        now = g.combat.rt.now;
        f.polls++;
        const fightOpts = a.actions.filter((o) => o.type === 'attack' || o.type === 'skill');
        if (!fightOpts.some((o) => o.enabled)) f.idle++;
        for (const o of a.actions) { const id = o.type === 'use_item' ? 'item:' + o.item : o.type === 'attack' ? 'attack' : 'skill:' + o.skillId; if (o.enabled) { if (since[id] == null) since[id] = now; } else since[id] = null; }
        checkState(g, f, ctx);
        if (PROBE) {   // a disabled option must be refused with the same code, and change nothing
            const dis = fightOpts.filter((o) => !o.enabled && o.reason && ['ON_COOLDOWN', 'GLOBAL_COOLDOWN', 'STUNNED', 'NOT_ENOUGH_RESOURCE', 'SILENCED'].includes(o.reason.code));
            const items = a.actions.filter((o) => o.type === 'use_item' && o.enabled && g.combat.rt.gcdUntil > now);
            const o = [...dis, ...items][probeI++ % Math.max(1, dis.length + items.length)];
            if (o) {
                const before = JSON.stringify([g.player.hp, g.player.resource.current, g.player.inventory.length, g.combat.enemies.map((e) => e.hp)]);
                const payload = o.type === 'attack' ? { type: 'attack', ...pickTarget(g, o) } : o.type === 'use_item' ? { type: 'use_item', item: o.item } : { type: 'skill', skillId: o.skillId, ...pickTarget(g, o) };
                const r = g.act(payload);
                if (o.type === 'use_item') { if (r.ok === false) bug('act() refuses an item getAvailableActions() calls enabled (GCD running)', ctx, `${o.item}: ${r.error && r.error.code} "${r.error && r.error.message}" at ${now} ms`); }
                else if (r.ok !== false) bug('act() accepted an option getAvailableActions() called disabled', ctx, `${o.skillId} (${o.reason.code}) at ${now} ms`);
                else if (r.error && r.error.code !== o.reason.code) bug('Refusal code differs from availability reason', ctx, `${o.skillId}: availability ${o.reason.code}, act ${r.error.code}`);
                if (g.mode !== 'combat') break;
                const after = JSON.stringify([g.player.hp, g.player.resource.current, g.player.inventory.length, g.combat.enemies.map((e) => e.hp)]);
                if (r.ok === false && before !== after) bug('A refused act() changed state', ctx, `${o.skillId || o.item}: ${before} -> ${after}`);
                if (r.ok !== false) continue;
            }
        }
        if (now - lastPress >= minGap) {
            const choice = rtChoose(g, a, (id) => since[id] != null && now - since[id] >= REACTION);
            if (choice) {
                const o = choice._o; delete choice._o;
                const r = g.act(choice);
                if (r.ok === false) bug('act() refuses an option getAvailableActions() calls enabled', ctx, `${JSON.stringify(choice)} (${o.skillId || o.item || o.type}): ${r.error && r.error.code} "${r.error && r.error.message}" at ${now} ms`);
                else { f.presses++; lastPress = now; }
                if (g.mode !== 'combat') break;
            }
        }
        if (now > SOFTLOCK_MS) { bug('Softlock: fight past 10 min of fight time', ctx, `enemies ${g.alive(g.combat.enemies).map((e) => `${e.name} ${e.hp}/${e.maxHp}`).join(', ')}; player ${g.player.hp}/${g.player.maxHp}`); f.softlock = true; break; }
        g.tick(POLL);
        if (g.combat) now = g.combat.rt.now; else now += POLL;
    }
    f.timeS = now / 1000;
    m.cur = null;
    return f;
}

/** Turn mode: run the fight with the given chooser (text commands), same metrics (time = rounds x secondsPerTurn). */
function turnFight(g, m, ctx, choose) {
    const f = (m.cur = newFight());
    let rounds = 0;
    for (let i = 0; i < 400 && g.mode === 'combat'; i++) {
        const a = g.getAvailableActions();
        checkState(g, f, ctx);
        if (a.awaiting === 'turn_order') g.act({ type: 'turn_order', order: null });
        else if (a.awaiting === 'continue') g.act({ type: 'continue' });
        else g.input(choose(g));
        if (g.combat) rounds = g.combat.round;
    }
    if (g.mode === 'combat') { f.softlock = true; bug('Turn mode: fight past 400 actions', ctx, ''); }
    f.rounds = rounds;
    f.timeS = rounds * (DATA.realtimeRules.secondsPerTurn || 3);
    m.cur = null;
    return f;
}

// tools/balance.js bot, verbatim logic
function balanceChoose(g) {
    const p = g.player;
    if (p.hp <= p.maxHp * 0.45) { const item = HEALS.find((h) => p.inventory.includes(h)); if (item) return `use ${item}`; }
    const opts = p.skills.map((n) => g.playerSkill(n))
        .filter((s) => s && s.base_damage && g.isCastable(s) && s.cost !== 'all' && !s.oncePerFight && g.skillCost(s) <= p.resource.current)
        .sort((a, b) => (b.cost || 0) - (a.cost || 0));
    const living = g.alive(g.combat.enemies);
    const t = 1 + living.indexOf(living.reduce((a, b) => (b.hp < a.hp ? b : a)));
    return opts.length ? `${opts[0].name} ${t}` : `attack ${t}`;
}

// ------------------------------------------------------------------ routes
function engine(seed, mode) {
    const g = new GameEngine({ seed, data: JSON.parse(JSON.stringify(DATA)), ...(mode === 'rt' ? { combatMode: 'realtime' } : {}) });
    g.start();
    return g;
}

function dungeonRun(cls, seed, mode) {
    const ctx = { cls, seed, route: 'dungeon', mode };
    const g = engine(seed, mode); const m = instrument(g);
    const rows = [];
    g.input(cls);
    for (const step of ['n', 'engage', 's', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage', 'e', 'engage']) {
        if (g.mode === 'branch_select') g.input(Object.keys(DATA.evolutionPaths[cls].branches)[seed % 3]);
        if (g.mode === 'game_over' || g.mode === 'won') break;
        for (const item of [...g.rooms[g.currentRoom].items]) g.input(`take ${item}`);
        g.input(step);
        if (g.mode !== 'combat') continue;
        const hpIn = g.player.hp;
        const f = mode === 'rt' ? rtFight(g, m, ctx) : turnFight(g, m, ctx, balanceChoose);
        Object.assign(f, { label: `F${rows.length + 1}`, won: g.mode !== 'game_over' && g.mode !== 'combat', hpIn, hpOut: g.player.hp, maxHp: g.player.maxHp });
        rows.push(f);
        if (f.softlock) break;
    }
    if (g.errors.length) bug('engine.errors non-empty', ctx, String(g.errors[0] && (g.errors[0].stack || g.errors[0])).slice(0, 300));
    return { won: g.mode === 'won', rows, end: g.mode === 'won' ? 'won' : g.currentRoom };
}

// Chapter One (copied from qa/scripts/ch1_survival.js mainline, pickups/shopping off)
let W = null;
function ch1Run(cls, seed, mode) {
    if (!W) W = { WorldSession: require(path.join(ROOT, 'src/world/world.js')).WorldSession, ZONE1: require(path.join(ROOT, 'src/world/zone1.js')), H: require(path.join(ROOT, 'tests/world-helpers.js')), smart: require('./smartbot.js').choose };
    const { takeExit, inspect, contact, travel } = W.H;
    const ctx = { cls, seed, route: 'ch1', mode };
    const g = engine(seed, mode); const m = instrument(g);
    g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    const s = new W.WorldSession(W.ZONE1, { engine: g });
    const rows = [];
    const say = (re) => { const c = (g.getAvailableActions().actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text)); if (!c) throw new Error(`no choice ${re}`); return g.act({ type: 'dialogue_choice', choiceId: c.choiceId }); };
    const bye = () => { if (g.getAvailableActions().awaiting === 'dialogue') g.act({ type: 'dialogue_leave' }); };
    const fight = (id, label) => {
        const hpIn = g.player.hp;
        const r = contact(s, id); if (!r || r.type !== 'encounter') throw new Error(`${id}: ${JSON.stringify(r).slice(0, 160)}`);
        const f = mode === 'rt' ? rtFight(g, m, ctx) : turnFight(g, m, ctx, (gg) => (gg.combat.awaitingContinue ? 'continue' : W.smart(gg)));
        Object.assign(f, { label, won: g.mode === 'explore' && g.world.lastResult === 'victory', hpIn, hpOut: g.player.hp, maxHp: g.player.maxHp, level: g.player.level });
        rows.push(f);
        if (f.won) s.fightOver(id, 'victory');
        return f.won;
    };
    let end = null;
    try {
        end = (() => {
            inspect(s, 'cellar_inscription'); travel(s, 'house'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'road'); travel(s, 'tollway');
            inspect(s, 'tollway_elian'); say(/going on to the village/); say(/Goodbye/);
            if (!fight('tollway_ragpickers', 'G1 Ragpickers')) return 'G1';
            if (!fight('tollway_root_chewers', 'G2 Root-Chewers')) return 'G2';
            takeExit(s, 'tollway_south'); inspect(s, 'village_tamsin'); bye(); inspect(s, 'village_mara'); bye();
            inspect(s, 'village_captain'); bye(); travel(s, 'tollway'); inspect(s, 'tollway_register'); travel(s, 'shamefield');
            inspect(s, 'village_captain'); say(/Here it is/); bye();
            travel(s, 'orchard');
            if (!fight('orchard_cultists', 'G3 Cultists')) return 'G3';
            takeExit(s, 'orchard_north');
            if (!fight('featherwatch_ghoul', 'G4 Ritual Ghoul')) return 'G4';
            takeExit(s, 'featherwatch_north'); inspect(s, 'sanctuary_journal'); inspect(s, 'sanctuary_warden_npc');
            say(/What is behind it/); say(/I'll go/);
            if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: Object.keys(DATA.evolutionPaths[g.player.className].branches)[seed % 3] });
            inspect(s, 'sanctuary_warden_npc'); say(/Stand aside/); say(/Draw your weapon/);
            if (!fight('sanctuary_warden', 'B01 Warden')) return 'B01';
            return 'won';
        })();
    } catch (e) { end = 'ERR ' + e.message.slice(0, 80); bug('Ch1 route script error', ctx, e.message.slice(0, 200)); }
    if (g.errors.length) bug('engine.errors non-empty', ctx, String(g.errors[0] && (g.errors[0].stack || g.errors[0])).slice(0, 300));
    return { won: end === 'won', rows, end };
}

// ------------------------------------------------------------------ stress mode: 10 min fight, unkillable sides, spam everything
// node qa/scripts/rt_balance.js --stress   (DoT stack cap, tick floor, runaway loop, softlock guard, enemies that stop acting)
if (args.includes('--stress')) {
    const kits = { rogue: ['Hemorrhage'], necromancer: ['Contagion', 'Black Spit'], warrior: ['Shield Bash', 'Hemorrhage'], mage: ['slow', 'confuse'] };
    for (const cls of CLASSES) {
        const ctx = { cls, seed: 7, route: 'stress' };
        const g = engine(7, 'rt'); const m = instrument(g);
        g.input(cls); g.player.skills.push(...(kits[cls] || [])); g.player.resource.max = 999;
        g.input('n'); g.input('engage');
        for (const e of g.combat.enemies) e.hp = e.maxHp = 1e6;
        g.player.hp = g.player.maxHp = 1e6;
        const f = (m.cur = newFight());
        let dotDps = 0;
        for (let t = 0; t < SOFTLOCK_MS && g.mode === 'combat'; t += POLL) {
            g.player.resource.current = 999;
            const a = g.getAvailableActions();
            const o = a.actions.find((x) => (x.type === 'skill' || x.type === 'attack') && x.enabled && x.type !== 'flee');
            if (o) { const r = g.act(o.type === 'attack' ? { type: 'attack', ...pickTarget(g, o) } : { type: 'skill', skillId: o.skillId, ...pickTarget(g, o) }); if (r.ok === false) bug('act() refuses an option getAvailableActions() calls enabled', ctx, `${o.skillId}: ${r.error.code}`); }
            checkState(g, f, ctx);
            const before = f.dotDealt; g.tick(POLL); if (t > SOFTLOCK_MS - 10000) dotDps += (f.dotDealt - before);
        }
        console.log(`${cls}: after ${g.combat ? g.combat.rt.now / 1000 : '?'} s still '${g.mode}', max DoT stacks ${f.maxStacks}, DoT damage in the last 10 s ${dotDps} (${(dotDps / 10).toFixed(0)}/s), enemy casts ${f.enemyActs}, engine errors ${g.errors.length}`);
    }
    for (const [k, b] of Object.entries(BUGS)) console.log(`BUG ${k} x${b.n}: ${b.examples[0].detail}`);
    process.exit(0);
}

// ------------------------------------------------------------------ repro mode: one seed, print the fight log
if (REPRO) {
    const [cls, seed, route = 'dungeon'] = REPRO.split(':');
    const res = (route === 'ch1' ? ch1Run : dungeonRun)(cls, parseInt(seed, 10), 'rt');
    console.log(`${cls} seed ${seed} ${route} (rt, ${flags()}): ${res.end}`);
    for (const r of res.rows) console.log(`  ${r.label}: ${r.won ? 'won' : 'LOST'} in ${r.timeS.toFixed(1)} s, HP ${r.hpIn} -> ${r.hpOut}/${r.maxHp}, dealt ${r.dealt} taken ${r.taken}, max DoT stacks ${r.maxStacks}`);
    for (const [k, b] of Object.entries(BUGS)) console.log(`BUG ${k} x${b.n}: ${b.examples[0].detail}`);
    process.exit(Object.keys(BUGS).length ? 1 : 0);
}

// ------------------------------------------------------------------ run and report
const routes = ROUTE === 'both' ? ['dungeon', 'ch1'] : [ROUTE];
const modes = MODE === 'both' ? ['turn', 'rt'] : [MODE];
const out = {};
const t0 = Date.now();
for (const route of routes) for (const mode of modes) for (const cls of CLASSES) {
    const runs = [];
    for (let seed = 1; seed <= SEEDS; seed++) runs.push((route === 'ch1' ? ch1Run : dungeonRun)(cls, seed, mode));
    out[`${route}|${mode}|${cls}`] = runs;
}
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fx = (v, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '—');
console.log(`rt_balance — ${SEEDS} seeds/class · APM ${APM} · reaction ${REACTION} ms · data: ${SETS.join(' ') || 'shipped'} · ${((Date.now() - t0) / 1000).toFixed(0)} s\n`);
const summary = {};
for (const route of routes) {
    console.log(`### ${route === 'ch1' ? 'Chapter One to the Warden' : 'Text dungeon (tools/balance.js route)'}\n`);
    console.log('| Class | Mode | Route win % | Fights | Fight win % | Mean fight time (s)* | Mean HP left (wins) | DPS dealt | DPS taken | Nothing ready % | DoT share of dmg | Max DoT stacks (mean / max) | Player / enemy casts per s |');
    console.log('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    for (const cls of CLASSES) for (const mode of modes) {
        const runs = out[`${route}|${mode}|${cls}`]; if (!runs) continue;
        const rows = runs.flatMap((r) => r.rows);
        const wins = rows.filter((r) => r.won);
        const T = rows.reduce((a, r) => a + r.timeS, 0);
        const dealt = rows.reduce((a, r) => a + r.dealt, 0), taken = rows.reduce((a, r) => a + r.taken, 0), dot = rows.reduce((a, r) => a + r.dotDealt, 0);
        const polls = rows.reduce((a, r) => a + r.polls, 0), idle = rows.reduce((a, r) => a + r.idle, 0);
        const row = { routeWin: 100 * runs.filter((r) => r.won).length / runs.length, fights: rows.length, fightWin: 100 * wins.length / rows.length, time: mean(rows.map((r) => r.timeS)), hpLeft: mean(wins.map((r) => r.hpOut)), dps: dealt / T, dtps: taken / T, idle: polls ? 100 * idle / polls : NaN, dotShare: dealt ? 100 * dot / dealt : 0, stacksMean: mean(rows.map((r) => r.maxStacks)), stacksMax: Math.max(0, ...rows.map((r) => r.maxStacks)), pAps: rows.reduce((a, r) => a + r.playerActs, 0) / T, eAps: rows.reduce((a, r) => a + r.enemyActs, 0) / T };
        summary[`${route}|${mode}|${cls}`] = row;
        console.log(`| ${cls} | ${mode} | ${fx(row.routeWin, 0)} | ${row.fights} | ${fx(row.fightWin, 0)} | ${fx(row.time)} | ${fx(row.hpLeft, 0)} | ${fx(row.dps, 2)} | ${fx(row.dtps, 2)} | ${fx(row.idle, 0)} | ${fx(row.dotShare, 1)}% | ${fx(row.stacksMean, 1)} / ${row.stacksMax} | ${fx(row.pAps, 2)} / ${fx(row.eAps, 2)} |`);
    }
    console.log('\n*turn mode: rounds x secondsPerTurn (an equivalent, not a clock).\n');
    // per-encounter, rt vs turn
    const labels = [...new Set(Object.entries(out).filter(([k]) => k.startsWith(route)).flatMap(([, rs]) => rs.flatMap((r) => r.rows.map((x) => x.label))))];
    console.log('| Class | Encounter | ' + modes.map((md) => `${md} reached / win % / time s / HP left`).join(' | ') + ' |');
    console.log('|---|---|' + modes.map(() => '---|').join(''));
    for (const cls of CLASSES) for (const lb of labels) {
        const cells = modes.map((md) => { const rs = (out[`${route}|${md}|${cls}`] || []).flatMap((r) => r.rows).filter((r) => r.label === lb); if (!rs.length) return '—'; const w = rs.filter((r) => r.won); return `${rs.length} / ${fx(100 * w.length / rs.length, 0)} / ${fx(mean(rs.map((r) => r.timeS)))} / ${fx(mean(w.map((r) => r.hpOut)), 0)}`; });
        console.log(`| ${cls} | ${lb} | ${cells.join(' | ')} |`);
    }
    console.log('');
}
console.log('### Bugs found\n');
if (!Object.keys(BUGS).length) console.log('none');
for (const [k, b] of Object.entries(BUGS)) { console.log(`BUG ${k} — ${b.n}x`); for (const e of b.examples) console.log(`   ${e.detail}\n   repro: ${e.repro}`); }
if (JSON_OUT) require('fs').writeFileSync(JSON_OUT, JSON.stringify({ summary, bugs: BUGS, args }, null, 1));
