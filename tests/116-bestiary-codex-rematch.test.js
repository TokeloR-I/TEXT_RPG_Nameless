// Bestiary, lore codex and boss rematches (research round two #8 + #9, Tokelo approved 2026-11-25;
// docs/design/BESTIARY_CODEX_REMATCH.md): the book fills as you fight, lore opens as you learn it, a boss fight opens with
// a name card and shuts the ways out, and a beaten boss can be fought again at its feather ring, grown to your level.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession, validateWorld } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const RAW = require('../src/world/zone1.js');
const WORLD = doubleWorld(RAW);
const CODEX = require('../src/story/codex.js');
const STORY = require('../src/story/chapter1.js');
const RM = require('../src/world/rematch-maps.js');
const DATA = require('../src/data.js');

const STEP = 1000 / 60;
const frames = (sim, n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
const fxOf = (outs, type) => outs.flatMap((o) => o.fx).filter((f) => f.type === type);
const freeNear = (s, x, y) => { for (let r = 0; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (!s.solidForAction(x + dx, y + dy) && !s.exitAt(x + dx, y + dy)) return [x + dx, y + dy]; throw new Error('no free cell'); };

/** A hero standing in the Warden's sanctuary, the Warden challenged. */
function sanctuary(seed = 116, cls = 'warrior') {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place('sanctuary', Object.keys(WORLD.maps.sanctuary.spawns)[0]);
    const [x, y] = freeNear(s, 22, 18);
    s.x = x; s.y = y;
    g.story.flags.push('warden_challenged');
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed });
    const outs = frames(sim, 5);
    return { g, s, sim, outs };
}
const wardenOf = (sim, id = 'sanctuary_warden') => sim.actors.find((a) => a.encounterId === id && a.key === 'crow_touched_warden');
/** Win the engaged fight at once: every enemy of `id` to 0 HP, and let the sim see it. */
/** The XP can open an evolution choice, which holds the world: take the first path. */
function pickBranch(g) { if (g.mode !== 'branch_select') return; const a = g.getAvailableActions().actions.find((x) => x.type === 'choose_branch'); g.act(a); }
function win(r, id) { for (const e of r.g.combat.enemies) if (e.encounterId === id && e.hp > 0) { e.hp = 0; r.g.onDeath(e, r.g.player); } r.g.actionCheckEnd(); const out = frames(r.sim, 3); pickBranch(r.g); return out; }

// ---------- data ----------
test('Bestiary: every creature you can meet in the world has an entry, with a real kind and lore line', () => {
    const inWorld = new Set();
    for (const m of Object.values(RAW.maps)) for (const e of m.encounters || []) for (const k of e.enemies) inWorld.add(k);
    for (const k of inWorld) {
        const b = CODEX.bestiary[k];
        assert.ok(b, `${k}: no bestiary entry`);
        assert.ok(['vale', 'north', 'dominions'].includes(b.region), `${k}: region`);
        assert.ok(b.kind && b.lore && b.lore.length > 30, `${k}: kind and lore`);
    }
    for (const k of Object.keys(CODEX.bestiary)) assert.ok(DATA.enemies[k], `${k}: not an enemy`);
});

test('Codex: no door motif, no early names (Bran only after burial), every unlock is a story condition', () => {
    const all = [...CODEX.lore.map((l) => l.text), ...Object.values(CODEX.bestiary).map((b) => b.lore), ...Object.values(CODEX.bosses).map((b) => b.epithet),
        ...Object.values(CODEX.rematches).flatMap((r) => [r.trophy.name, r.trophy.text])].join(' ');
    assert.ok(!/\bdoors?\b|threshold/i.test(all), 'lore bible 4.8: doors are just doors');
    assert.ok(!/Maren|Sealwright|Ilsabet|the Keeping|the Kept\b/.test(all), 'nothing [mid] or [late]');
    // Bran's name appears only in text gated on his burial.
    const brans = CODEX.lore.filter((l) => /Bran/.test(l.text));
    for (const l of brans) assert.deepStrictEqual(l.unlock, { flags: ['bran_buried'] }, `${l.id} names Bran early`);
    assert.ok(!/Bran/.test(CODEX.bestiary.crow_touched_warden.lore) && !/Bran/.test(CODEX.bosses.crow_touched_warden.epithet));
    const ids = new Set();
    for (const l of CODEX.lore) { assert.ok(!ids.has(l.id), `duplicate ${l.id}`); ids.add(l.id); assert.ok(l.unlock && typeof l.unlock === 'object', `${l.id}: unlock`); }
    // Every flag a codex entry waits on is one the story can set.
    const src = require('fs').readFileSync(require.resolve('../src/story/chapter1.js'), 'utf8') + require('fs').readFileSync(require.resolve('../src/story/chapter2.js'), 'utf8');
    const flags = (c) => [...(c.flags || []), ...(c.any || []).flatMap(flags)];
    for (const l of CODEX.lore) for (const f of flags(l.unlock)) assert.ok(src.includes(`'${f}'`), `${l.id}: flag ${f} is never set`);
    for (const r of Object.values(CODEX.rematches)) for (const f of flags(r.beaten)) assert.ok(src.includes(f.replace(/^(\w+)_ruler_beaten$/, '_ruler_beaten')) || src.includes(`'${f}'`), `rematch flag ${f}`);
});

test('Rematch rings: one per boss with a name card, in the boss\'s own map, the world still validates', () => {
    assert.deepStrictEqual(Object.keys(CODEX.rematches).sort(), Object.keys(CODEX.bosses).sort());
    for (const p of RM.PLACES) {
        const m = RAW.maps[p.map];
        assert.ok(m.encounters.some((e) => e.enemies.includes(p.key) && !e.id.startsWith('rematch_')), `${p.key} was fought on ${p.map}`);
        assert.ok(m.interactables.some((o) => o.id === `rematch_ring_${p.key}` && o.station === `rematch_${p.key}`));
        assert.ok(STORY.npcs[`rematch_${p.key}`], `${p.key}: ring talk`);
    }
    const problems = validateWorld(RAW, DATA.DATA || DATA, STORY);
    assert.deepStrictEqual(problems, []);
});

// ---------- the book ----------
test('Bestiary: a creature is ??? until met; met shows lore; one kill shows conditions; three show drops', () => {
    const g = new GameEngine({ seed: 7, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    const entry = () => g.getBestiary().entries.find((e) => e.key === 'rust_rat');
    assert.strictEqual(entry().name, '???');
    assert.strictEqual(g.getBestiary().seen, 0);
    g.actionEngage('grounds_weed_rats', ['rust_rat', 'rust_rat']);
    assert.strictEqual(entry().name, 'Rust Rat');
    assert.ok(entry().lore && !entry().facts);
    const rats = g.combat.enemies.slice();
    g.onDeath(rats[0], g.player);
    assert.ok(entry().facts, 'one kill: what it does');
    assert.deepStrictEqual(entry().conditions, ['Poison']);
    assert.ok(!entry().dropsKnown);
    g.onDeath(rats[1], g.player);
    g.codexKill({ key: 'rust_rat' });
    assert.strictEqual(entry().kills, 3);
    assert.ok(entry().dropsKnown && entry().drops.length);
    // Illusions don't count.
    g.codexKill({ key: 'rust_rat', illusion: true });
    assert.strictEqual(entry().kills, 3);
});

test('Bestiary: a boss beaten in an older save (before the book) is known from the story', () => {
    const g = new GameEngine({ seed: 8, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    g.story.flags.push('warden_dead');
    const w = g.getBestiary().entries.find((e) => e.key === 'crow_touched_warden');
    assert.ok(w.seen && w.facts && w.dropsKnown, 'all known once he has fallen');
    assert.ok(/Seal-Key/.test(w.drops.join()));
    assert.ok(w.rematch && !w.rematch.ready, 'a rematch, once the crow is with you');
    assert.ok(!/Bran/.test(w.lore));
    g.story.flags.push('bran_buried', 'aspect_nahemoth');
    const w2 = g.getBestiary().entries.find((e) => e.key === 'crow_touched_warden');
    assert.ok(/Bran Ashdown/.test(w2.lore) && w2.rematch.ready);
});

test('Codex: entries open as the story goes, and stay ??? until then', () => {
    const g = new GameEngine({ seed: 9, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    const open = () => g.getCodex().groups.flatMap((x) => x.entries).filter((e) => e.open).map((e) => e.id);
    const before = open();
    assert.ok(!before.includes('caelith'));
    assert.ok(g.getCodex().groups.flatMap((x) => x.entries).every((e) => e.open || (e.title === '???' && !e.text)));
    g.story.flags.push('seraph_met');
    g.storyEvent({ type: 'talk', id: 'elian' });
    const after = open();
    assert.ok(after.includes('caelith') && after.includes('old_crown') && after.includes('sworn_band'));
    assert.strictEqual(g.getCodex().total, CODEX.lore.length);
});

test('Saves: the book and the trophies survive a save and load', () => {
    const g = new GameEngine({ seed: 10, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    g.codexSeen('pack_wolf'); g.codexKill({ key: 'pack_wolf' });
    g.stats.rematches = { crow_touched_warden: { wins: 2 } };
    const h = GameEngine.fromSave(JSON.parse(JSON.stringify(g.serialize())), { combatMode: 'action' });
    assert.strictEqual(h.getBestiary().entries.find((e) => e.key === 'pack_wolf').kills, 1);
    assert.strictEqual(h.stats.rematches.crow_touched_warden.wins, 2);
});

// ---------- boss presentation ----------
test('Boss fight: a name card with its epithet, and every way out shut until the fight ends', () => {
    const r = sanctuary();
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    frames(r.sim, 1);
    assert.ok(r.sim.view().sealed && r.sim.view().sealed.length >= 2, 'both the stair down and the seal are shut');
    // Walking onto the exit bounces you back while he stands.
    const ex = r.s.map.exits.find((e) => e.trigger === 'step');
    const p = r.sim.player;
    r.s.x = ex.x; r.s.y = ex.y - 1;
    p.x = (ex.x + 0.5) * r.sim.T; p.y = (ex.y - 0.5) * r.sim.T;
    const outs = frames(r.sim, 30, { move: { x: 0, y: 1 } });
    assert.strictEqual(r.s.mapId, 'sanctuary', 'still in the sanctuary');
    assert.ok(fxOf(outs, 'notice').some((n) => /way out is shut/.test(n.text)));
    // He falls: the way opens.
    const opened = win(r, 'sanctuary_warden');
    assert.ok(fxOf(opened, 'seal_open').length === 1);
    assert.strictEqual(r.sim.view().sealed, null);
});

test('Boss fight: the intro event carries the card; ordinary groups get no card and shut nothing', () => {
    const r = sanctuary(117);
    r.sim.fx = [];
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);   // he may already have seen you in the first frames
    const intro = [...r.sim.fx, ...fxOf(r.outs, 'boss_intro')].find((f) => f.type === 'boss_intro');
    assert.ok(intro, 'boss_intro');
    assert.strictEqual(intro.name, 'The Crow-Touched Warden');
    assert.strictEqual(intro.epithet, 'Keeper of the First Seal');
    assert.strictEqual(intro.rematch, false);
    // The rats at home: no card.
    const g = new GameEngine({ seed: 3, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 3 });
    sim.fx = [];
    sim.engageGroup(sim.groups.grounds_weed_rats);
    assert.ok(!sim.fx.some((f) => f.type === 'boss_intro'));
    assert.strictEqual(sim.view().sealed, null);
});

test('Boss fight: a stalemate never traps you (nobody hurt for the stalemate time opens the way)', () => {
    const r = sanctuary(118);
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    r.g.player.hp = r.g.player.maxHp = 99999;
    const w = wardenOf(r.sim);
    // Freeze him and keep him far away so nobody lands a blow.
    w.prof = { ...w.prof, speed: 0, attacks: [] }; w.atkReady = {}; w.attackReadyAt = Infinity;
    r.sim.rules = { ...r.sim.rules, combat: { ...(r.sim.rules.combat || {}), sealStalemateMs: 2000 } };
    const outs = frames(r.sim, 60 * 3);
    assert.ok(fxOf(outs, 'seal_open').some((f) => f.stale), 'opens after the stalemate');
});

// ---------- rematches ----------
function beatenWarden(seed = 120) {
    const r = sanctuary(seed);
    r.g.player.hp = r.g.player.maxHp = 99999;
    r.sim.engageGroup(r.sim.groups.sanctuary_warden);
    frames(r.sim, 2);
    win(r, 'sanctuary_warden');
    assert.ok(r.g.isDefeated('sanctuary_warden') && r.g.hasStoryFlag('warden_dead'));
    return r;
}

test('Rematch: the feather ring shows once he has fallen and the crow is with you', () => {
    const r = beatenWarden();
    const ring = () => r.s.visibleObjects().some((o) => o.id === 'rematch_ring_crow_touched_warden');
    assert.ok(!ring(), 'not before the crow');
    r.g.story.flags.push('aspect_nahemoth');
    assert.ok(ring(), 'the crow remembers');
    assert.ok(r.g.getBestiary().entries.find((e) => e.key === 'crow_touched_warden').kills >= 1);
});

test('Rematch: the ring\'s choice brings him back where he fell; winning keeps a trophy once, and he can be fought again', () => {
    const r = beatenWarden(121);
    r.g.story.flags.push('aspect_nahemoth');
    r.g.player.level = 4;
    r.g.act({ type: 'talk', npcId: 'rematch_crow_touched_warden' });
    const ch = r.g.getAvailableActions().actions.find((a) => a.type === 'dialogue_choice' && /Remember the fight/.test(a.text || ''));
    assert.ok(ch, 'the ring offers the fight');
    r.g.act({ type: 'dialogue_choice', choiceId: ch.choiceId });
    assert.ok(r.g.hasStoryFlag('rematch:crow_touched_warden'));
    const seen = frames(r.sim, 20);   // syncEncounters picks it up mid-map (and he sees you at once: detect 240)
    assert.ok(r.sim.groups.rematch_crow_touched_warden, 'he stands again');
    r.sim.fx = [];
    r.sim.engageGroup(r.sim.groups.rematch_crow_touched_warden);
    const intro = [...r.sim.fx, ...fxOf(seen, 'boss_intro')].find((f) => f.type === 'boss_intro');
    assert.ok(intro && intro.rematch, 'a remembered fight says so on its card');
    win(r, 'rematch_crow_touched_warden');
    assert.ok(!r.g.hasStoryFlag('rematch:crow_touched_warden'), 'the memory ends');
    assert.strictEqual(r.g.stats.rematches.crow_touched_warden.wins, 1);
    const e = r.g.getBestiary().entries.find((x) => x.key === 'crow_touched_warden');
    assert.strictEqual(e.rematch.trophy.name, 'Crooked Feather');
    assert.strictEqual(r.g.getBestiary().trophies, 1);
    // Again: a second win counts but gives no second trophy.
    assert.ok(r.g.rematchBegin('crow_touched_warden'), JSON.stringify(r.g.rejection));
    frames(r.sim, 20);
    assert.ok(r.sim.groups.rematch_crow_touched_warden && !r.sim.groups.rematch_crow_touched_warden.cleared, 'fresh bodies for the second time');
    r.sim.engageGroup(r.sim.groups.rematch_crow_touched_warden);
    win(r, 'rematch_crow_touched_warden');
    assert.strictEqual(r.g.stats.rematches.crow_touched_warden.wins, 2);
    assert.ok(!r.g.player.inventory.some((i) => /Seal-Key/.test(i) && r.g.player.inventory.filter((x) => x === i).length > 1), 'no second seal key');
});

test('Rematch: he comes back grown to your level (bosses stay hard), and falling ends the memory without a win', () => {
    const r = beatenWarden(122);
    r.g.story.flags.push('aspect_nahemoth');
    const base = (() => { const g = new GameEngine({ seed: 1, combatMode: 'action' }); g.start(); g.input('warrior'); g.enterWorld(); g.actionEngage('x', ['crow_touched_warden']); return g.combat.enemies[0]; })();
    r.g.player.level = 9;   // five over the level he was built for
    assert.ok(r.g.rematchBegin('crow_touched_warden'));
    frames(r.sim, 20);
    r.sim.engageGroup(r.sim.groups.rematch_crow_touched_warden);
    const e = r.g.combat.enemies.find((x) => x.encounterId === 'rematch_crow_touched_warden');
    const sc = r.g.data.actionRules.rematch.scale;
    assert.strictEqual(e.maxHp, Math.round(base.maxHp * (1 + sc.hp * 5)));
    assert.strictEqual(e.atk, Math.round(base.atk * (1 + sc.atk * 5)));
    // You fall: the memory fades, nothing counted.
    r.g.player.hp = 0;
    r.g.actionCheckEnd();
    frames(r.sim, 3);
    assert.ok(!r.g.hasStoryFlag('rematch:crow_touched_warden'));
    assert.ok(!(r.g.stats.rematches || {}).crow_touched_warden);
});

test('Rematch: refused before the boss has fallen, without the crow, or mid-fight', () => {
    const g = new GameEngine({ seed: 11, combatMode: 'action' });
    g.start(); g.input('warrior'); g.enterWorld();
    const tryIt = () => g.act({ type: 'talk', npcId: 'rematch_crow_touched_warden' });
    tryIt();
    const ch = g.getAvailableActions().actions.find((a) => a.type === 'dialogue_choice' && /Remember the fight/.test(a.text || ''));
    const res = g.act({ type: 'dialogue_choice', choiceId: ch.choiceId });
    assert.ok(!g.hasStoryFlag('rematch:crow_touched_warden'));
    assert.ok(!res.ok || res.events.some((e) => /not beaten it yet/.test(e.text || '') || (e.error && /not beaten/.test(e.error.message))), 'says why');
    g.story.flags.push('warden_dead');
    g.story.dialogue = null;
    assert.strictEqual(g.rematchBegin('crow_touched_warden'), false, 'no crow yet');
    g.story.flags.push('aspect_nahemoth');
    assert.strictEqual(g.rematchBegin('crow_touched_warden'), true);
});
