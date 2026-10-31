// Bug hunt: the sim applies each class's guard profile (docs/design/ENSO_ACTION_COMBAT_DESIGN.md §2):
// the Warrior's longer parry, the Rogue's parry-only Deflect, and the Mage / Necromancer 360° wards that can't parry.
const { test, assert, GameEngine } = require('./helpers.js');
const { WorldSession } = require('../src/world/world.js');
const { doubleWorld } = require('../src/world/scale16.js');
const { ActionSim } = require('../src/action/sim.js');
const WORLD = doubleWorld(require('../src/world/zone1.js'));

/** A sim beside the engaged Grounds rats, with a probe on what the sim tells the engine about each blow. */
function fight(cls) {
    const g = new GameEngine({ seed: 69, combatMode: 'action' });
    g.start(); g.input(cls); g.enterWorld();
    g.player.hp = g.player.maxHp = 9999;
    const s = new WorldSession(WORLD, { engine: g });
    s.place('grounds', Object.keys(WORLD.maps.grounds.spawns)[0]);
    s.x = 13; s.y = 31;
    const sim = new ActionSim({ engine: g, session: s, rules: g.data.actionRules, seed: 69 });
    sim.engageGroup(sim.groups.grounds_weed_rats);
    const rat = sim.actors.find((a) => a.encounterId === 'grounds_weed_rats' && a.engineId);
    const calls = [];
    const real = g.actionEnemyStrike.bind(g);
    g.actionEnemyStrike = (id, o) => { calls.push(o); return real(id, o); };
    /** One blow from the rat: guard raised `since` ms ago (null = not guarding), facing `toward` the rat or away. */
    const blow = ({ since = null, toward = true } = {}) => {
        const p = sim.player;
        rat.x = p.x + 10; rat.y = p.y;
        p.angle = toward ? 0 : Math.PI;
        p.guarding = since != null; p.guardSince = since != null ? sim.now - since : null;
        p.stamina = 100; p.state = 'idle'; p.iframesUntil = 0;
        g.actionEnemyWindup(rat.engineId);
        sim.strikePlayer(rat, true, {});
        return calls[calls.length - 1];
    };
    return { g, sim, blow };
}

test('Guard: the Warrior parries in his own 200 ms window, and guards 140° in front only', () => {
    const { sim, blow } = fight('warrior');
    assert.strictEqual(sim.guardProfile().parry.windowMs, 200);
    assert.ok(blow({ since: 180 }).parried, '180 ms after raising the shield is still a parry for the Warrior');
    const late = blow({ since: 400 });
    assert.ok(late.guarded && !late.parried);
    assert.ok(!blow({ since: 400, toward: false }).guarded, 'a blow from behind gets past the shield');
});

test('Guard: the Mage and Necromancer wards cover 360° and never parry', () => {
    for (const cls of ['mage', 'necromancer']) {
        const { sim, blow } = fight(cls);
        assert.strictEqual(sim.guardProfile().parry, null);
        const fresh = blow({ since: 10 });
        assert.ok(fresh.guarded && !fresh.parried, `${cls}: a fresh ward blocks but does not parry`);
        assert.ok(blow({ since: 400, toward: false }).guarded, `${cls}: the ward covers the back`);
    }
});

test('Guard: the Rogue\'s Deflect is parry-only (a late Deflect takes the hit in full) and costs stamina per press', () => {
    const { sim, blow } = fight('rogue');
    assert.ok(blow({ since: 50 }).parried, 'in the window it parries');
    const late = blow({ since: 400 });
    assert.ok(!late.guarded && !late.parried, 'outside the window the blow lands in full');
    sim.player.guarding = false; sim.player.stamina = 100; sim.player.state = 'idle';
    sim.update(1000 / 60, { guard: true });
    assert.ok(sim.player.guarding);
    assert.ok(sim.player.stamina <= 91, `a Deflect costs 10 stamina (now ${sim.player.stamina})`);
});

test('Guard: the class block cost and move speed apply (Mage ward: block ×1.5, move ×0.4)', () => {
    const { g, sim, blow } = fight('mage');
    const R = g.data.actionRules;
    blow({ since: 400 });
    assert.strictEqual(sim.player.stamina, 100 - R.guard.staminaPerHit * 1.5);
    assert.strictEqual(sim.guardProfile().moveMult, 0.4);
});
