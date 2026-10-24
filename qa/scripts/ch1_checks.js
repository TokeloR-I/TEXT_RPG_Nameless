// Chapter One QA checks that aren't survival rates (docs/design/ENSO_CH1_ENCOUNTERS_XP_AND_BALANCE.md, Tally plan 2, 5, 6):
// the XP timeline when every optional thing is done, save/load + re-entry never paying twice, fleeing a required fight,
// and dying in the world. Real world model + engine. Fights here are won by forcing enemy HP to 1 where noted:
// these rows check accounting and flow; survival is ch1_survival.js.
//   node qa/scripts/ch1_checks.js
const path = require('path');
const ROOT = path.resolve(process.env.ENSO_ROOT || path.join(__dirname, '..', '..'));
const { GameEngine } = require(path.join(ROOT, 'src/engine.js'));
const DATA = require(path.join(ROOT, 'src/data.js'));
const STORY = require(path.join(ROOT, 'src/story/chapter1.js'));
const { WorldSession } = require(path.join(ROOT, 'src/world/world.js'));
const ZONE1 = require(path.join(ROOT, 'src/world/zone1.js'));
const { walkTo, takeExit, inspect, contact, travel, pathTo } = require(path.join(ROOT, 'tests/world-helpers.js'));
const out = [];
const check = (id, what, fn) => {
    try { const r = fn(); out.push({ id, what, state: r.info ? 'INFO' : r.ok ? 'PASS' : 'FAIL', note: r.note || '' }); }
    catch (e) { out.push({ id, what, state: 'FAIL', note: 'THREW ' + e.stack.split('\n').slice(0, 2).join(' ') }); }
};
const say = (g, re) => { const a = g.getAvailableActions(); const c = (a.actions || []).find((x) => x.type === 'dialogue_choice' && re.test(x.text)); if (!c) throw new Error(`no choice ${re}`); return g.act({ type: 'dialogue_choice', choiceId: c.choiceId }); };
const bye = (g) => { if (g.getAvailableActions().awaiting === 'dialogue') g.act({ type: 'dialogue_leave' }); };
const total = (g) => { let t = g.player.xp, need = 100; for (let l = 1; l < g.player.level; l++) { t += need; need = Math.floor(need * 1.5); } return t; };
function run(cls = 'mage', seed = 1) {
    const g = new GameEngine({ seed }); g.start(); g.act({ type: 'choose_class', classId: cls }); g.act({ type: 'enter_world' });
    g.player.hp = g.player.maxHp = 99999;
    return { g, s: new WorldSession(ZONE1, { engine: g }) };
}
function forceWin(g, s, id) {
    const r = contact(s, id); if (!r || r.type !== 'encounter') throw new Error(`${id}: ${JSON.stringify(r).slice(0, 120)}`);
    for (let i = 0; i < 100 && g.mode === 'combat'; i++) { for (const e of g.combat.enemies) if (e.hp > 1) e.hp = 1; const a = g.getAvailableActions(); g.act(a.awaiting === 'continue' ? { type: 'continue' } : { type: 'attack', targetId: g.alive(g.combat.enemies)[0].id }); }
    s.fightOver(id, 'victory');
}

check('X1', 'XP timeline with EVERY optional thing done as early as possible (rats, wolf, Shane, both jobs): level at each required fight', () => {
    const { g, s } = run('mage', 2); const log = [];
    const mark = (what) => { bye(g); log.push(`${what}: ${total(g)} XP, L${g.player.level}`); if (g.mode === 'branch_select') { log.push('→ branch choice offered here'); g.act({ type: 'choose_branch', branchId: Object.keys(DATA.evolutionPaths.mage.branches)[2] }); } };
    inspect(s, 'cellar_inscription'); travel(s, 'grounds'); forceWin(g, s, 'grounds_weed_rats'); mark('rats');
    inspect(s, 'grounds_foundation'); travel(s, 'road'); forceWin(g, s, 'road_wolf'); mark('wolf');
    travel(s, 'tollway'); inspect(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/); mark('Q03');
    forceWin(g, s, 'tollway_ragpickers'); mark('G1'); forceWin(g, s, 'tollway_root_chewers'); mark('G2');
    takeExit(s, 'tollway_south'); inspect(s, 'village_tamsin'); bye(g); inspect(s, 'village_mara'); bye(g); mark('Q04');
    inspect(s, 'village_notice_board'); mark('notice board (J01 completes: wolf already beaten)');
    inspect(s, 'village_crowd'); say(g, /What did he do/); bye(g);
    inspect(s, 'village_shane'); say(g, /Why are the watch after you/); say(g, /What do you need/); say(g, /I'll get your ledger/); bye(g);
    travel(s, 'allotment'); forceWin(g, s, 'allotment_watch'); mark('constables'); inspect(s, 'allotment_wagon');
    travel(s, 'shamefield'); inspect(s, 'village_shane'); say(g, /Here's your ledger/); bye(g); mark('S01');
    inspect(s, 'village_captain'); bye(g); travel(s, 'tollway'); inspect(s, 'tollway_register'); travel(s, 'shamefield'); inspect(s, 'village_captain'); say(g, /Here it is/); bye(g); mark('Q05');
    travel(s, 'orchard'); inspect(s, 'orchard_herbs'); travel(s, 'shamefield'); inspect(s, 'village_iona'); try { say(g, /herbs/i); } catch (e) { /* choice text */ } bye(g); mark('J02');
    travel(s, 'orchard'); forceWin(g, s, 'orchard_cultists'); mark('G3'); takeExit(s, 'orchard_north'); forceWin(g, s, 'featherwatch_ghoul'); mark('G4');
    takeExit(s, 'featherwatch_north'); inspect(s, 'sanctuary_journal'); inspect(s, 'sanctuary_warden_npc'); mark('Q06 (before the Warden)');
    return { info: true, note: log.join(' · ') };
});
check('X2', 'Save → JSON → GameEngine.fromSave mid-route; then re-enter every map, re-read, re-talk: no XP or item is paid twice', () => {
    const { g, s } = run('rogue', 3);
    inspect(s, 'cellar_inscription'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'road'); travel(s, 'tollway');
    inspect(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/); forceWin(g, s, 'tollway_ragpickers');
    const save = JSON.parse(JSON.stringify(g.serialize()));
    const c = GameEngine.fromSave(save); const s2 = new WorldSession(ZONE1, { engine: c, map: s.mapId, spawn: 'from_road' });
    const xp0 = total(c), inv0 = c.player.inventory.length;
    travel(s2, 'road'); travel(s2, 'grounds'); inspect(s2, 'grounds_foundation'); travel(s2, 'cellar'); inspect(s2, 'cellar_inscription'); travel(s2, 'tollway'); inspect(s2, 'tollway_elian'); bye(c);
    const ragAgain = s2.visibleObjects().some((o) => o.id === 'tollway_ragpickers');
    return { ok: total(c) === xp0 && c.player.inventory.length === inv0 && !ragAgain && total(c) === total(g), note: `XP ${xp0} → ${total(c)} after the tour (original engine ${total(g)}); items ${inv0} → ${c.player.inventory.length}; beaten Ragpickers back on the map: ${ragAgain}` };
});
check('X3', 'Flee a required fight: no XP, the gate still blocks the way on, the enemy ignores you until you step away, then the fight works', () => {
    const { g, s } = run('mage', 4);
    travel(s, 'tollway'); const xp0 = total(g);
    contact(s, 'tollway_ragpickers'); g.input('flee'); s.fightOver('tollway_ragpickers', 'fled');
    const noXp = total(g) === xp0 && g.mode === 'explore';
    const exit = s.map.exits.find((e) => e.id === 'tollway_south'); let blocked = false; try { pathTo(s, exit.x, exit.y); } catch (e) { blocked = true; }
    const again = s.visibleObjects().some((o) => o.id === 'tollway_ragpickers');
    // stepping straight back into it does nothing; stepping away and back starts it again
    const e = s.map.encounters.find((x) => x.id === 'tollway_ragpickers');
    const r1 = contact(s, 'tollway_ragpickers'); const ignored = !r1 || r1.type !== 'encounter';
    walkTo(s, s.x, s.y + 2 <= s.map.height - 1 && !s.isBlocked(s.x, s.y + 2) ? s.y + 2 : s.y); for (const d of ['down', 'down', 'left', 'left']) s.move(d);
    const r2 = contact(s, 'tollway_ragpickers'); const restarts = r2 && r2.type === 'encounter';
    if (g.mode === 'combat') { for (let i = 0; i < 100 && g.mode === 'combat'; i++) { for (const x of g.combat.enemies) if (x.hp > 1) x.hp = 1; g.input(g.combat.awaitingContinue ? 'continue' : 'attack 1'); } s.fightOver('tollway_ragpickers', 'victory'); }
    return { ok: noXp && blocked && again && ignored && restarts && total(g) === xp0 + 20, note: `fled: no XP ${noXp}; way south blocked ${blocked}; still on the map ${again}; walking straight back in ignored ${ignored}; after stepping away it starts ${restarts}; XP after the win +${total(g) - xp0}` };
});
check('X4', 'Dying in a required world fight ends the run cleanly (game over, no stuck state)', () => {
    const g = new GameEngine({ seed: 5 }); g.start(); g.act({ type: 'choose_class', classId: 'mage' }); g.act({ type: 'enter_world' });
    const s = new WorldSession(ZONE1, { engine: g }); travel(s, 'tollway'); g.player.hp = 1;
    contact(s, 'tollway_ragpickers'); for (let i = 0; i < 50 && g.mode === 'combat'; i++) g.input(g.combat.awaitingContinue ? 'continue' : 'focus');
    const a = g.getAvailableActions();
    return { ok: g.mode === 'game_over' && g.world.lastResult === 'defeat' || g.mode === 'game_over', note: `mode ${g.mode}; world result ${g.world && g.world.lastResult}; available: ${(a.actions || []).map((x) => x.type).join(',')}` };
});
check('X6', 'Q07 in real play: after the Warden and the seal, Orin hands over the ledger; can the gate actually be built (the only way to finish Chapter One)?', () => {
    const { g, s } = run('warrior', 6);
    inspect(s, 'cellar_inscription'); travel(s, 'grounds'); inspect(s, 'grounds_foundation'); travel(s, 'tollway');
    inspect(s, 'tollway_elian'); say(g, /going on to the village/); say(g, /Goodbye/); forceWin(g, s, 'tollway_ragpickers'); forceWin(g, s, 'tollway_root_chewers');
    takeExit(s, 'tollway_south'); inspect(s, 'village_tamsin'); bye(g); inspect(s, 'village_mara'); bye(g); inspect(s, 'village_captain'); bye(g);
    travel(s, 'tollway'); inspect(s, 'tollway_register'); travel(s, 'shamefield'); inspect(s, 'village_captain'); say(g, /Here it is/); bye(g);
    travel(s, 'orchard'); forceWin(g, s, 'orchard_cultists'); takeExit(s, 'orchard_north'); forceWin(g, s, 'featherwatch_ghoul'); takeExit(s, 'featherwatch_north');
    inspect(s, 'sanctuary_journal'); inspect(s, 'sanctuary_warden_npc'); say(g, /What is behind it/); say(g, /I'll go/);
    if (g.mode === 'branch_select') g.act({ type: 'choose_branch', branchId: 'berserker' });
    inspect(s, 'sanctuary_warden_npc'); say(g, /Stand aside/); say(g, /Draw your weapon/);
    contact(s, 'sanctuary_warden'); for (let i = 0; i < 100 && g.mode === 'combat'; i++) { g.combat.enemies[0].hp = Math.min(g.combat.enemies[0].hp, 1); const a = g.getAvailableActions(); g.act(a.awaiting === 'continue' ? { type: 'continue' } : { type: 'attack', targetId: 'enemy_0' }); }
    s.fightOver('sanctuary_warden', 'victory'); takeExit(s, 'sanctuary_seal'); inspect(s, 'seal_first_echo');
    travel(s, 'grounds'); inspect(s, 'grounds_orin'); say(g, /rebuilt/); bye(g);
    const cli = g.input('build homestead_gate').filter((e) => e.type === 'text').map((e) => e.text).join(' | ');
    const act = g.act({ type: 'build', upgradeId: 'homestead_gate' });
    const defs = !!(g.data.constructionDefinitions && g.data.constructionDefinitions.homestead_gate);
    return { ok: g.questState('Q07') === 'complete', note: `Q07 ${g.questState('Q07')}; constructionDefinitions.homestead_gate exists: ${defs}; CLI 'build homestead_gate' → "${cli.replace(/^> [^|]*\| /, '')}"; act(build) → ${act.ok === false || act.error ? (act.error && act.error.code) : 'ok'}; Gold ${g.player.gold}` };
});
check('X5', "Candidate optional XP and the constable kit (Wren's 'candidate' marks), as data", () => {
    const q = (id) => `${id} ${STORY.quests[id].xp}${STORY.quests[id].candidate ? ' (candidate)' : ''}`; const c = DATA.enemies.watch_constable;
    return { info: true, note: `${q('S01')}, ${q('J01')}, ${q('J02')} · watch_constable: HP ${c.hp}, DEF ${c.def}, SPD ${c.spd}, ${c.skills.map((x) => `${x.name} ${x.base_damage.join('–')}`).join(' / ')}, XP ${c.xp} each (S01 pays 20 + 2×${c.xp} = ${20 + 2 * c.xp})` };
});

console.log(`Chapter One checks — ROOT ${ROOT}\n`);
for (const r of out) console.log(`${r.state.padEnd(4)}  [${r.id}] ${r.what}\n        ${r.note}`);
const scored = out.filter((r) => r.state !== 'INFO');
console.log(`\n${scored.filter((r) => r.state === 'PASS').length}/${scored.length} pass (+${out.length - scored.length} info)`);
