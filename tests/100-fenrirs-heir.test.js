// Fenrir's Heir (Tokelo 2026-11-13, PR #256 design; docs/design/FENRIRS_HEIR.md): Chapter Two's legendary web, with
// three stances (Sköll, Hati, the neutral Fenrir), a switch cooldown and a per-wolf bond that persists between fights.
// Engine: src/engine/stance.js; data: skillWeb.legendaryWebs.fenrirs_heir; quest CL1 and its talks: src/story/chapter2.js.
const { test, assert, GameEngine, data } = require('./helpers.js');
const SkillWeb = require('../src/engine/skill-web.js');
const CH2 = require('../src/story/chapter2.js');

const FH = data.skillWeb.legendaryWebs.fenrirs_heir;
const PATHS = {
    skoll: ['solar_fang', 'firehowl', 'sunfang_rush', 'firestorm', 'ember_blood', 'devour_the_sun'],
    hati: ['black_maw', 'darkhowl', 'moonless_grasp', 'nights_dominion', 'moonhide', 'devour_the_moon'],
    fenrir: ['call_of_the_pack', 'predators_instinct', 'gleipnirs_bane', 'twin_eclipse', 'unbound']
};
const GIFTS = ['Solar Fang', 'Black Maw', 'Call of the Pack'];

function world(mode = 'turn', cls = 'warrior', seed = 100) {
    const g = new GameEngine({ seed, combatMode: mode });
    g.start(); g.input(cls); g.enterWorld();
    return g;
}
const levelTo = (g, level) => {
    while (g.player.level < level) g.addExperience(g.player.xpToNext, { quiet: true });
    if (g.pendingBranchChoice) { g.maybePromptBranch(); g.act({ type: 'choose_branch', branchId: 'free' }); }
    return g;
};
/** A Fenrir's Heir at `level`, awakened with `first` (the cheat runs the same story effects the Wolf's Wake does). */
function heir(first = 'skoll', level = 6, mode = 'turn', cls = 'warrior') {
    const g = levelTo(world(mode, cls), level);
    const r = g.act({ type: 'cheat', cheat: 'awaken_fenrir', amount: first });
    assert.ok(r.ok, r.error && r.error.message);
    return g;
}
const text = (r) => (r.events || []).filter((e) => e.type === 'text').map((e) => e.text).join('\n');
const choose = (g, re) => {
    const c = g.getAvailableActions().actions.find((x) => x.type === 'dialogue_choice' && re.test(x.text));
    assert.ok(c, `a choice matching ${re}`);
    return g.act({ type: 'dialogue_choice', choiceId: c.choiceId });
};
const fight = (g) => { g.startCombat(['hungry_wolf', 'rust_rat']); g.player.hp = g.player.maxHp = 999; return g; };
const enemy = (g) => g.alive(g.combat.enemies)[0].id;

test("Fenrir's Heir: a legendary web of a Sköll path, a Hati path and Fenrir's shared nodes; every skill defined and built", () => {
    assert.deepStrictEqual(SkillWeb.validateSkillWeb(data), []);
    const web = SkillWeb.buildSkillWeb(data);
    assert.ok(web.legendary.includes('fenrirs_heir'));
    const nodes = web.list.filter((n) => n.region === 'fenrirs_heir' && n.kind !== 'heart');
    assert.deepStrictEqual(nodes.map((n) => n.id.split('.')[1]).sort(), [...PATHS.skoll, ...PATHS.hati, ...PATHS.fenrir].sort());
    const { registry } = require('../src/effects.js');
    for (const n of nodes.filter((x) => x.skill)) {
        const def = data.skillDefinitions[n.skill];
        assert.ok(def, n.skill);
        assert.strictEqual(def.resource, 'any', `${n.skill} is paid from your own class resource`);
        assert.ok(def.liveDescription, `${n.skill} reads right in a live fight`);
        for (const e of def.effects || []) assert.ok(registry[e.type], `${n.skill}: effect ${e.type} is built`);
        const path = Object.keys(PATHS).find((p) => PATHS[p].includes(n.id.split('.')[1]));
        assert.strictEqual(def.stance || 'fenrir', path, `${n.skill} belongs to ${path}`);
        assert.ok(data.actionRules.skillShapes.bySkill[n.skill] || ['self'].includes(def.target), `${n.skill} has a live shape`);
    }
    for (const id of ['devour_the_sun', 'devour_the_moon']) assert.strictEqual(web.nodes.get(`fenrirs_heir.${id}`).minLevel, 14, `${id} is a capstone`);
    assert.deepStrictEqual(web.nodes.get('fenrirs_heir.unbound').needs, ['fenrirs_heir.devour_the_sun', 'fenrirs_heir.devour_the_moon']);
    assert.deepStrictEqual(Object.keys(FH.stances.list), ['fenrir', 'skoll', 'hati'], 'Tokelo 2026-11-13: a neutral Fenrir stance too');
    assert.strictEqual(FH.stances.list.fenrir.bond, false);
    assert.ok(data.legendaryAndSecretClasses.fenrirs_heir.name);
});

test("Fenrir's Heir: the Hunt of Sun and Moon runs carving, two fangs in either order, the trial, then your first wolf", () => {
    for (const [order, pick, stance] of [[['sun_marker', 'moon_hollow'], /Hati/, 'hati'], [['moon_hollow', 'sun_marker'], /Neither yet/, 'fenrir']]) {
        const g = levelTo(world('action'), 5);
        // The cairn and the hollow say nothing special before the hunt starts.
        g.act({ type: 'talk', npcId: 'sun_marker' });
        assert.strictEqual(g.story.dialogue.node, 'plain'); g.act({ type: 'dialogue_leave' });
        g.act({ type: 'world_inspect', objectId: 'gullstrand_wolf_carving' });
        assert.strictEqual(g.questState('CL1'), 'active');
        assert.ok(g.hasStoryFlag('fenrir_quest_discovered'));
        for (const npc of order) { g.act({ type: 'talk', npcId: npc }); choose(g, /Go on/); }
        assert.ok(g.player.inventory.includes('Sun Fang') && g.player.inventory.includes('Moon Fang'));
        assert.strictEqual(g.currentObjective('CL1').id, 'trial');
        // The stone takes the fangs and calls the Binding Echo; no web yet.
        g.act({ type: 'talk', npcId: 'wolfs_wake_stone' });
        assert.strictEqual(g.story.dialogue.node, 'stone');
        choose(g, /Lay the Sun Fang/); choose(g, /Face it/);
        assert.ok(g.hasStoryFlag('fenrir_trial_called'));
        assert.ok(!g.player.inventory.includes('Sun Fang') && !g.player.inventory.includes('Moon Fang'));
        assert.ok(!g.webOwns('heart.fenrirs_heir'), 'the bond only comes after the trial');
        g.storyEvent({ type: 'defeat', id: 'wolfs_wake_trial' });   // the fight itself is placed with the Wolf's Wake map
        assert.ok(g.hasStoryFlag('fenrir_trial_cleared'));
        assert.strictEqual(g.currentObjective('CL1').id, 'choose');
        g.act({ type: 'talk', npcId: 'wolfs_wake_stone' });
        assert.strictEqual(g.story.dialogue.node, 'wake');
        const picks = g.getAvailableActions().actions.filter((x) => x.type === 'dialogue_choice').map((x) => x.text);
        for (const re of [/^Sköll/, /^Hati/, /Fenrir, who holds/]) assert.ok(picks.some((t) => re.test(t)), `the waking offers ${re}`);
        choose(g, pick);
        assert.ok(g.webOwns('heart.fenrirs_heir'));
        for (const s of GIFTS) assert.ok(g.player.skills.includes(s), `${s} is a gift`);
        assert.strictEqual(g.getStance().active, stance);
        assert.strictEqual(g.questState('CL1'), 'complete');
        choose(g, /run with you/);
        g.act({ type: 'talk', npcId: 'wolfs_wake_stone' });
        assert.strictEqual(g.story.dialogue.node, 'again');
    }
});

test("Fenrir's Heir: stance skills only in their wolf's stance; act() and the availability list agree", () => {
    const g = fight(heir('hati'));
    const opts = () => new Map(g.getAvailableActions().actions.filter((a) => a.type === 'skill').map((a) => [a.skillId, a]));
    assert.strictEqual(opts().get('Solar Fang').reason.code, 'WRONG_STANCE');
    assert.match(opts().get('Solar Fang').reason.message, /Sköll/);
    const r = g.act({ type: 'skill', skillId: 'Solar Fang', targetIds: [enemy(g)] });
    assert.strictEqual(r.error.code, 'WRONG_STANCE');
    assert.ok(opts().get('Black Maw').enabled);
    assert.ok(opts().get('Call of the Pack').enabled, "Fenrir's skills work in any stance");
    assert.ok(g.act({ type: 'skill', skillId: 'Black Maw', targetIds: [enemy(g)] }).ok);
    // The switch options are listed, and the one you stand in is not.
    const sw = g.getAvailableActions().actions.filter((a) => a.type === 'switch_stance').map((a) => a.stance);
    assert.deepStrictEqual(sw.sort(), ['fenrir', 'skoll']);
});

test("Fenrir's Heir: switching is free out of a fight and on a cooldown in one (3 turns, or 8 s live); it never uses the turn", () => {
    const g = heir('skoll');
    assert.ok(g.act({ type: 'switch_stance', stance: 'hati' }).ok);
    assert.ok(g.act({ type: 'switch_stance', stance: 'Sköll' }).ok, 'out of a fight: as often as you like, by name');
    assert.strictEqual(g.act({ type: 'switch_stance', stance: 'skoll' }).error.code, 'ALREADY_IN_STANCE');
    assert.strictEqual(g.act({ type: 'switch_stance', stance: 'garm' }).error.code, 'UNKNOWN_STANCE');
    fight(g);
    const turnsBefore = g.player.normalTurns || 0;
    assert.ok(g.act({ type: 'switch_stance', stance: 'hati' }).ok);
    assert.ok(g.combat.awaitingPlayer, 'still your turn');
    assert.strictEqual(g.player.normalTurns || 0, turnsBefore);
    const again = g.act({ type: 'switch_stance', stance: 'fenrir' });
    assert.strictEqual(again.error.code, 'STANCE_COOLDOWN');
    for (let i = 0; i < 4 && g.mode === 'combat'; i++) g.act({ type: 'skill', skillId: 'Call of the Pack', targetIds: [] }), g.act({ type: 'attack', targetIds: [enemy(g)] });
    if (g.mode === 'combat') assert.ok(g.act({ type: 'switch_stance', stance: 'fenrir' }).ok, 'ready again after three turns');
    // Live fights count seconds.
    const live = fight(heir('skoll', 6, 'realtime'));
    assert.ok(live.act({ type: 'switch_stance', stance: 'hati' }).ok);
    const cd = live.act({ type: 'switch_stance', stance: 'skoll' });
    assert.strictEqual(cd.error.code, 'STANCE_COOLDOWN');
    assert.match(cd.error.message, /8\.0s/);
    for (let t = 0; t < 81 && live.mode === 'combat'; t++) live.tick(100);
    if (live.mode === 'combat') assert.ok(live.act({ type: 'switch_stance', stance: 'skoll' }).ok);
    // The text game takes it too.
    const tg = heir('skoll');
    tg.input('stance hati');
    assert.strictEqual(tg.getStance().active, 'hati');
});

test("Fenrir's Heir: bond grows in your wolf's stance (100 after 60 s of fighting), fades in the other, holds in Fenrir's", () => {
    const g = fight(heir('skoll', 6, 'realtime'));
    const bond = () => Object.fromEntries(g.getStance().stances.filter((s) => s.bonded).map((s) => [s.id, s.bond]));
    for (let t = 0; t < 150; t++) { g.tick(100); g.player.hp = g.player.maxHp; for (const e of g.combat.enemies) e.hp = e.maxHp; }
    assert.strictEqual(bond().skoll, 25, '15 s: 25');
    for (let t = 0; t < 600; t++) { g.tick(100); g.player.hp = g.player.maxHp; for (const e of g.combat.enemies) e.hp = e.maxHp; }
    assert.strictEqual(bond().skoll, 100, 'capped at 100');
    assert.strictEqual(g.stanceMod(g.player, 'damage'), 0.2, 'full Sköll bond: +20% damage');
    g.player.stance.active = 'hati';
    for (let t = 0; t < 100; t++) g.tick(100);
    assert.strictEqual(bond().skoll, 95, 'Sköll fades 0.5/s while Hati runs');
    assert.ok(bond().hati > 15);
    g.player.stance.active = 'fenrir';
    const held = bond();
    for (let t = 0; t < 100; t++) g.tick(100);
    assert.deepStrictEqual(bond(), held, 'the Fenrir stance neither grows nor fades a bond');
    assert.strictEqual(g.stanceMod(g.player, 'damage'), 0, 'and gives no bond bonus');
});

test("Fenrir's Heir: bond tiers feed damage, damage taken and walking speed; bond survives the fight and a save", () => {
    const g = heir('hati');
    g.player.stance.bond.hati = 100;
    assert.strictEqual(g.stanceMod(g.player, 'defence'), 0.12);
    assert.ok(Math.abs(g.playerMoveMult() - 1.12) < 1e-9, 'Hati: +12% walking speed');
    // Damage: the same hit, hurt less in Hati at full bond.
    const hit = () => { const h = g.newHit(g.player); g.rollDamage({ id: 'x', critChance: 0, statusEffects: [] }, g.player, { name: 'Test', base_damage: [100, 100] }, h); return h.damage; };
    const withBond = hit();
    g.player.stance.bond.hati = 0;
    assert.ok(withBond < hit(), 'Hati bond takes damage off');
    g.player.stance.bond.hati = 60;
    g.player.stance.bond.skoll = 40;
    // Out of a fight and through a save, the bond stays (design: never reset at combat end).
    const save = g.serialize();
    const h = new GameEngine({ seed: 1, combatMode: 'turn' });
    h.start();
    h.load(JSON.parse(JSON.stringify(save)));
    assert.deepStrictEqual(h.player.stance, { web: 'fenrirs_heir', active: 'hati', bond: { skoll: 40, hati: 60 } });
    assert.strictEqual(h.getStance().stances.find((s) => s.id === 'hati').tier, 50);
    fight(h);
    h.doFlee();
    assert.strictEqual(h.player.stance.bond.hati, 60);
});

test("Fenrir's Heir: Predator's Instinct makes the bond grow 50% faster; without the web nothing changes", () => {
    const g = fight(heir('skoll', 6));
    g.stanceAccrue(15000);
    assert.strictEqual(g.player.stance.bond.skoll, 25);
    const h = fight(heir('skoll', 6));
    h.doFlee();
    const r = h.act({ type: 'learn_node', nodeId: 'fenrirs_heir.predators_instinct' });
    assert.ok(r.ok, r.error && r.error.message);
    fight(h);
    h.stanceAccrue(15000);
    assert.strictEqual(h.player.stance.bond.skoll, 37.5);
    const plain = levelTo(world(), 6);
    assert.strictEqual(plain.getStance(), null);
    assert.strictEqual(plain.stanceMod(plain.player, 'damage'), 0);
    assert.strictEqual(plain.act({ type: 'switch_stance', stance: 'hati' }).error.code, 'NO_STANCES');
    assert.ok(!plain.getAvailableActions().actions.some((a) => a.type === 'switch_stance'));
});

test("Fenrir's Heir: the Binding Echo has turn stats, a live kit, art, and waits for the Wolf's Wake map", () => {
    const e = data.enemies.binding_echo;
    assert.ok(e && e.specialFlags.includes('boss') && e.hp > 0);
    const kit = data.actionRules.enemies.binding_echo;
    assert.ok(kit.boss && kit.attacks.some((a) => a.shape === 'ground') && kit.attacks.some((a) => a.onHit && a.onHit.pullPx), 'sun ground fire and a moon pull');
    for (const a of kit.attacks) assert.ok(a.windupMs >= 600, `${a.name}: readable tell`);
    // Placing it waits on Tokelo's pictures of Gullstrand Coast and the Wolf's Wake: exactly this content is unplaced.
    const waiting = [...Object.entries(CH2.quests), ...Object.entries(CH2.npcs)].filter(([, x]) => x.awaitsArea).map(([id]) => id).sort();
    assert.deepStrictEqual(waiting, ['CL1', 'moon_hollow', 'sun_marker', 'wolfs_wake_stone']);
});

test("Fenrir's Heir in the world sim: Black Maw drags the rats in, Solar Fang flies, Sunfang Rush dashes; T's HUD cell follows the stance", () => {
    const { WorldSession } = require('../src/world/world.js');
    const { doubleWorld } = require('../src/world/scale16.js');
    const { ActionSim } = require('../src/action/sim.js');
    const WORLD = doubleWorld(require('../src/world/zone1.js'));
    const STEP = 1000 / 60;
    const g = heir('hati', 8, 'action', 'rogue');
    g.player.hp = g.player.maxHp = 9999;
    for (const n of ['darkhowl', 'moonless_grasp', 'firehowl', 'sunfang_rush']) g.act({ type: 'learn_node', nodeId: `fenrirs_heir.${n}` });
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 41; s.y = 37;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 100 });
    const rats = () => sim.actors.filter((a) => a.encounterId === 'grounds_weed_rats' && !a.dead);
    sim.engageGroup(sim.groups.grounds_weed_rats);
    const p = sim.player;
    rats().forEach((a, i) => { a.x = p.x + 40 + i * 6; a.y = p.y + (i % 2 ? 6 : -6); a.foe = null; });
    for (const e of g.combat.enemies) e.hp = e.maxHp = 500;
    const frames = (n, input = {}) => { const out = []; for (let i = 0; i < n; i++) out.push(sim.update(STEP, input)); return out; };
    const cast = (name) => {
        g.player.skillBar = [name]; g.player.skillBarSeen = [...g.player.skills];
        g.player.resource.current = g.player.resource.max;
        if (g.combat.rt) { g.combat.rt.cooldowns = {}; g.combat.rt.gcdUntil = 0; }
        for (let i = 0; i < 120 && p.state !== 'idle' && p.state !== 'move'; i++) frames(1);   // wait out a swing or a flinch
        const t = rats()[0];
        const aim = t ? { x: t.x, y: t.y } : { x: p.x + 30, y: p.y };
        return frames(1, { slot: 0, aim }).concat(frames(60, { aim }));
    };
    const gap = () => Math.min(...rats().map((a) => Math.hypot(a.x - p.x, a.y - p.y)));
    const before = gap();
    const maw = cast('Black Maw');
    assert.ok(maw.flatMap((o) => o.engineEvents).some((e) => /Black Maw/.test(e.text || '')), 'cast');
    assert.ok(gap() < before, `pulled in (${before.toFixed(1)} -> ${gap().toFixed(1)})`);
    const refused = cast('Solar Fang').flatMap((o) => o.fx).find((f) => f.type === 'refused');
    assert.strictEqual(refused && refused.code, 'WRONG_STANCE');
    g.combat.rt.stanceReadyAt = 0;
    assert.ok(g.act({ type: 'switch_stance', stance: 'skoll' }).ok);
    const HUD = require('../ui/action-hud.js');
    const cell = HUD.stanceCell(g);
    assert.strictEqual(cell.id, 'skoll');
    assert.strictEqual(cell.next, 'hati');
    assert.ok(cell.readyInMs > 0 && !cell.enabled, 'the cell shows the switch cooldown');
    const fang = cast('Solar Fang');
    assert.ok(fang.flatMap((o) => o.engineEvents).some((e) => /Solar Fang/.test(e.text || '')));
    const x0 = p.x, y0 = p.y;
    cast('Sunfang Rush');
    assert.ok(Math.hypot(p.x - x0, p.y - y0) > 10, 'the rush moves you');
    assert.strictEqual(g.errors.length, 0);
});
