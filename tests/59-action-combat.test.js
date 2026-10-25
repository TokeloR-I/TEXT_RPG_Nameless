// Combat v3: the engine side of in-world action combat (src/engine/action.js, docs/ACTION_COMBAT.md).
// The sim (src/action/sim.js) decides who is hit by what; these tests play the sim's part by hand.
const { test, assert, GameEngine } = require('./helpers.js');

function actionGame(cls = 'warrior', seed = 58) {
    const g = new GameEngine({ seed, combatMode: 'action' });
    g.start();
    g.input(cls);
    assert.ok(g.act({ type: 'enter_world' }).ok);
    g.flush();
    return g;
}
const rats = (g, id = 'grounds_weed_rats', at = { mapId: 'grounds', x: 80, y: 240 }) => g.actionEngage(id, ['rust_rat', 'rust_rat'], null, at);
const hitUntilDead = (g, id, max = 60) => {
    for (let i = 0; i < max && g.mode === 'combat'; i++) {
        const e = g.combat.enemies.find((x) => x.id === id);
        if (!e || e.hp <= 0) return;
        const c = g.actionCast('attack');
        assert.ok(c.ok, JSON.stringify(c.error));
        assert.ok(g.actionResolve(c.castId, [id]).ok);
        g.tick(400);
    }
};

test('Action: engaging a group starts the fight in the world, with no enemy clock and no battle banner', () => {
    const g = actionGame();
    const r = rats(g);
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.deepStrictEqual(r.ids, ['enemy_0', 'enemy_1']);
    assert.strictEqual(g.mode, 'combat');
    assert.ok(g.combat.rt.external && g.combat.action);
    assert.ok(!r.events.some((e) => e.type === 'text' && /Real-time battle/.test(e.text)));
    const hp = g.player.hp;
    g.tick(1000); g.tick(1000); g.tick(1000);
    assert.strictEqual(g.player.hp, hp, 'enemies only attack when the sim says so');
    assert.strictEqual(g.actionView().enemies.length, 2);
    assert.strictEqual(g.canSave().error.code, 'IN_COMBAT');
});

test('Action: a second group joins the running fight with fresh ids and keeps the player statuses', () => {
    const g = actionGame();
    rats(g);
    g.player.statusEffects.push({ name: 'Test Buff', type: 'buff', value: 1, duration: null, stacks: 1 });
    const r = g.actionEngage('road_wolf', ['hungry_wolf'], null, { mapId: 'grounds', x: 10, y: 10 });
    assert.ok(r.ok, JSON.stringify(r.error));
    assert.deepStrictEqual(r.ids, ['enemy_2']);
    assert.ok(g.player.statusEffects.some((s) => s.name === 'Test Buff'));
    assert.deepStrictEqual(g.actionView().groups.sort(), ['grounds_weed_rats', 'road_wolf']);
    assert.strictEqual(g.actionEngage('road_wolf', ['hungry_wolf']).error.code, 'ALREADY_ENGAGED');
});

test('Action: cast then resolve hits the sim-chosen target; a whiff still pays and cools down', () => {
    const g = actionGame('warrior');
    rats(g);
    const c = g.actionCast('attack');
    assert.ok(c.ok && c.castId && c.shape.shape === 'arc', JSON.stringify(c));
    assert.strictEqual(g.actionCast('attack').error.code, 'BUSY');
    const before = g.combat.enemies[1].hp;
    const r = g.actionResolve(c.castId, ['enemy_1', 'enemy_0']);
    assert.ok(r.ok);
    assert.deepStrictEqual(r.hit, ['enemy_1'], 'a single-target swing hits the nearest body only');
    assert.ok(g.combat.enemies[1].hp < before || r.events.some((e) => e.type === 'text' && /miss|dodge/i.test(e.text)));
    // Basic attacks are paced by the weapon in the sim, not v2's swing timer.
    assert.ok(g.actionCast('attack').ok);
    // A skill whiffs into empty air: on cooldown anyway.
    const g2 = actionGame('warrior');
    rats(g2);
    const skill = g2.player.skills.find((s) => s !== g2.basicAttackName() && g2.skillAvailability(s, false).enabled);
    const sc = g2.actionCast(skill);
    assert.ok(sc.ok, JSON.stringify(sc.error));
    if (!sc.resolved) {
        const w = g2.actionResolve(sc.castId, []);
        assert.ok(w.ok);
        assert.deepStrictEqual(w.hit, []);
    }
    assert.strictEqual(g2.actionCast(skill).error.code, sc.resolved ? 'ON_COOLDOWN' : 'ON_COOLDOWN');
});

test('Action: an enemy strike needs a wind-up; guard cuts the damage, a parry blocks it, a dodge misses', () => {
    const g = actionGame('warrior');
    rats(g);
    g.player.hp = g.player.maxHp = 9999;
    assert.strictEqual(g.actionEnemyStrike('enemy_0').error.code, 'NO_WINDUP');
    const w = g.actionEnemyWindup('enemy_0');
    assert.ok(w.ok && w.skill, JSON.stringify(w));
    assert.ok(w.events.some((e) => e.type === 'text' && /readies/.test(e.text)));
    assert.strictEqual(g.actionView().enemies[0].windup, w.skill);
    let hp = g.player.hp;
    assert.strictEqual(g.actionEnemyStrike('enemy_0', { hit: false }).result, 'miss');
    assert.strictEqual(g.player.hp, hp);
    g.actionEnemyWindup('enemy_0');
    const p = g.actionEnemyStrike('enemy_0', { parried: true });
    assert.strictEqual(p.result, 'parried');
    assert.ok(p.events.some((e) => e.type === 'action.parry'));
    assert.strictEqual(g.player.hp, hp);
    // Guarded vs. open over many hits: guarded takes clearly less.
    const total = (guarded) => {
        const t = actionGame('warrior', 7);
        rats(t);
        t.player.hp = t.player.maxHp = 99999;
        const start = t.player.hp;
        for (let i = 0; i < 40; i++) { t.actionEnemyWindup('enemy_0'); t.actionEnemyStrike('enemy_0', { guarded }); }
        assert.ok(!t.player.statusEffects.some((s) => s.name === 'Guarding'), 'the guard never lingers');
        return start - t.player.hp;
    };
    const open = total(false), guarded = total(true);
    assert.ok(open > 0 && guarded < open * 0.6, `open ${open} guarded ${guarded}`);
});

test('Action: a cleared group gives XP once, drops its loot on the ground and ends the fight when none is left', () => {
    const g = actionGame('warrior');
    rats(g);
    g.player.hp = g.player.maxHp = 9999;
    const xp = g.player.xp;
    hitUntilDead(g, 'enemy_0');
    assert.strictEqual(g.mode, 'combat', 'one rat still stands');
    hitUntilDead(g, 'enemy_1');
    assert.strictEqual(g.mode, 'explore');
    assert.strictEqual(g.combat, null);
    assert.ok(g.isDefeated('grounds_weed_rats'));
    assert.ok(g.player.xp > xp || g.player.level > 1);
    const drops = g.getWorldDrops('grounds');
    if (drops.length) assert.deepStrictEqual([drops[0].x, drops[0].y], [80, 240]);
    assert.strictEqual(rats(g).error.code, 'ALREADY_DEFEATED');
    assert.ok(g.canSave().ok);
});

test('Action: a group that gives up leaves the fight unhurt next time; the last one leaving ends it without a victory', () => {
    const g = actionGame();
    rats(g);
    const c = g.actionCast('attack');
    g.actionResolve(c.castId, ['enemy_0']);
    const r = g.actionDisengage('grounds_weed_rats');
    assert.ok(r.ok);
    assert.strictEqual(g.mode, 'explore');
    assert.ok(r.events.some((e) => e.type === 'action.end' && e.result === 'escaped'));
    assert.ok(!g.isDefeated('grounds_weed_rats'));
    const again = rats(g);
    assert.ok(again.ok);
    assert.strictEqual(g.combat.enemies[0].hp, g.combat.enemies[0].maxHp);
});

test('Action: dying is not game over: the fight ends, the player wakes with half HP and the group can be fought again', () => {
    const g = actionGame();
    rats(g);
    g.player.hp = 1;
    g.player.def = 0;
    let r;
    for (let i = 0; i < 30 && g.mode === 'combat'; i++) { g.actionEnemyWindup('enemy_0'); r = g.actionEnemyStrike('enemy_0'); }
    assert.strictEqual(g.mode, 'explore');
    assert.ok(r.events.some((e) => e.type === 'world.respawn'));
    assert.strictEqual(g.player.hp, Math.floor(g.player.maxHp * 0.5));
    assert.ok(!g.isDefeated('grounds_weed_rats'));
    assert.ok(rats(g).ok);
});

test('Action: v2 flee is refused (you run instead); turn and realtime modes are untouched', () => {
    const g = actionGame();
    rats(g);
    assert.strictEqual(g.act({ type: 'flee' }).error.code, 'WRONG_MODE');
    const t = new GameEngine({ seed: 1 });
    t.start(); t.input('warrior'); t.act({ type: 'enter_world' });
    assert.strictEqual(t.actionEngage('x', ['rust_rat']).error.code, 'WRONG_MODE');
    assert.strictEqual(t.actionView(), null);
});
test('Action: a boss hpMult and an attack damageMult apply in action fights only, and leave no status behind', () => {
    const g = actionGame('warrior', 59);
    const base = new GameEngine({ seed: 59 }).data.enemies.crow_touched_warden.hp;
    g.actionEngage('sanctuary_warden', ['crow_touched_warden']);
    const w = g.combat.enemies[0];
    assert.strictEqual(w.maxHp, Math.round(base * g.data.actionRules.bosses.crow_touched_warden.hpMult));
    g.player.hp = g.player.maxHp = 9999;
    const blow = (mult) => {
        assert.ok(g.actionEnemyWindup(w.id).ok);
        const hp = g.player.hp;
        assert.strictEqual(g.actionEnemyStrike(w.id, { damageMult: mult }).result, 'hit');
        return hp - g.player.hp;
    };
    const plain = [], heavy = [];
    for (let i = 0; i < 6; i++) { plain.push(blow(1)); g.tick(3000); heavy.push(blow(6)); g.tick(3000); }
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    assert.ok(sum(heavy) > sum(plain) * 3, `heavy ${heavy} vs plain ${plain}`);
    assert.ok(!g.player.statusEffects.some((s) => s.name === 'Heavy Blow'), 'the multiplier is not left on the player');
});

test('Action: DEF blocks at most part of a blow on the player in action fights; the same blow in turn mode is unchanged', () => {
    const bites = (g) => {
        g.player.def = 8;   // the level-3 Warrior with his Wooden Shield
        const rat = g.combat.enemies.find((e) => e.key === 'rust_rat'), bite = rat.skills[0], out = [];
        for (let i = 0; i < 40; i++) out.push(g.rollDamage(rat, g.player, bite, g.newHit(g.player)).damage);
        return out;
    };
    const g = actionGame('warrior', 60);
    rats(g);
    const action = bites(g);
    assert.ok(action.every((d) => d >= 1), `a rat bite always hurts: ${action}`);
    const t = new GameEngine({ seed: 60 });
    t.start(); t.input('warrior');
    t.startCombat(['rust_rat']);
    assert.ok(t.combat && !t.combat.action);
    assert.deepStrictEqual(bites(t), action.map(() => 0), 'turn mode: DEF 8 still blocks the whole 3-5 (crit 7) bite');
});
